import * as cdk from 'aws-cdk-lib/core'
import * as codebuild from 'aws-cdk-lib/aws-codebuild'
import * as pipelines from 'aws-cdk-lib/pipelines'
import { Construct } from 'constructs'
import { appConfig, EnvConfig } from '../config/environments'
import { AwsLambdaTemplateStack } from './aws-lambda-template-stack'
import { BitbucketPrValidation } from './constructs/bitbucket-pr-validation'

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const source = pipelines.CodePipelineSource.connection(
      appConfig.infraAccount.sourceRepo,
      appConfig.infraAccount.sourceBranch,
      { connectionArn: appConfig.infraAccount.connectionArn },
    )

    // Build backend service
    const buildService = new pipelines.CodeBuildStep(`${appConfig.appName}BuildService`, {
      input: source,
      commands: ['npm ci', `npm --workspace @services/${appConfig.appName} run build`],
      primaryOutputDirectory: `services/${appConfig.appName}/dist`,
    })

    // Build BFF service
    const buildBff = new pipelines.CodeBuildStep('BffBuildService', {
      input: source,
      commands: ['npm ci', 'npm --workspace @services/bff run build'],
      primaryOutputDirectory: 'services/bff/dist',
    })

    // Build CDK
    const synth = new pipelines.ShellStep('Synth', {
      input: source,
      additionalInputs: {
        [`services/${appConfig.appName}/dist`]: buildService,
        ['services/bff/dist']: buildBff,
      },
      commands: [
        'npm ci',
        `[ -d "services/${appConfig.appName}/dist" ] || npm --workspace @services/${appConfig.appName} run build`,
        '[ -d "services/bff/dist" ] || npm --workspace @services/bff run build',
        'npm run format:check',
        'npm --workspace infrastructure run build',
        'npm --workspace infrastructure run synth',
      ],
      primaryOutputDirectory: 'infrastructure/cdk.out',
    })

    // Unit tests
    const unitTests = new pipelines.CodeBuildStep('UnitTests', {
      input: source,
      commands: [
        'npm ci',
        `npm --workspace @services/${appConfig.appName} run build`,
        'npm --workspace @services/bff run build',
        'npm --workspace infrastructure run test',
        `npm --workspace @services/${appConfig.appName} run test`,
        'npm --workspace @services/bff run test',
      ],
    })

    const pipeline = new pipelines.CodePipeline(this, `${appConfig.appName}Pipeline`, {
      pipelineName: appConfig.appName,
      crossAccountKeys: true,
      synth,
      codeBuildDefaults: {
        partialBuildSpec: codebuild.BuildSpec.fromObject({
          phases: { install: { 'runtime-versions': { nodejs: '22' } } },
        }),
      },
    })

    // One stage per environment
    Object.values(appConfig.envs).forEach((envConfig) => {
      const stage = new AppStage(this, `${appConfig.appName}-${envConfig.name}`, { envConfig })

      // Smoke test hits the BFF API (the frontend-facing endpoint)
      const smokeTest = new pipelines.CodeBuildStep('SmokeTest', {
        envFromCfnOutputs: { BFF_API_URL: stage.bffApiUrlOutput },
        commands: ['curl -sf "$BFF_API_URL"'],
      })

      const requiresApproval = envConfig.name === 'prod'
      const preSteps: pipelines.Step[] = requiresApproval
        ? [
            unitTests,
            new pipelines.ManualApprovalStep(
              `Approve${envConfig.name.charAt(0).toUpperCase() + envConfig.name.slice(1)}Deploy`,
            ),
          ]
        : [unitTests]

      pipeline.addStage(stage, {
        pre: preSteps,
        post: [smokeTest],
      })
    })

    const [bbWorkspace, bbRepo] = appConfig.infraAccount.sourceRepo.split('/')
    new BitbucketPrValidation(this, 'PrValidation', {
      owner: bbWorkspace,
      repo: bbRepo,
      projectName: `${appConfig.appName}-pr-validation`,
      connectionArn: appConfig.infraAccount.connectionArn,
      baseBranch: appConfig.infraAccount.sourceBranch,
      installCommands: ['npm ci'],
      buildCommands: [
        'npm run format:check',
        'npm run lint',
        `npm --workspace @services/${appConfig.appName} run build`,
        'npm --workspace @services/bff run build',
        'npm --workspace infrastructure run build',
        'npm run test',
      ],
    })
  }
}

// Stage wraps the Lambda stack for a given environment
class AppStage extends cdk.Stage {
  public readonly apiUrlOutput: cdk.CfnOutput
  public readonly bffApiUrlOutput: cdk.CfnOutput

  constructor(scope: Construct, id: string, props: { envConfig: EnvConfig } & cdk.StageProps) {
    super(scope, id, props)
    const stack = new AwsLambdaTemplateStack(this, `${props.envConfig.name}LambdaAPI-Stack`, {
      envConfig: props.envConfig,
    })
    this.apiUrlOutput = stack.apiUrlOutput
    this.bffApiUrlOutput = stack.bffApiUrlOutput
  }
}
