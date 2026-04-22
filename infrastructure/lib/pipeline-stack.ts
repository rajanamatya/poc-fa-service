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

    // [ADD-SERVICE 1/4] Duplicate this CodeBuildStep for each new service (change appName to the new service name).
    // See also: 2/4 (additionalInputs), 3/4 (fallback build), 4/4 (unitTests commands).
    const buildService = new pipelines.CodeBuildStep(`${appConfig.appName}BuildService`, {
      input: source,
      commands: ['npm ci', `npm --workspace @services/${appConfig.appName} run build`],
      primaryOutputDirectory: `services/${appConfig.appName}/dist`,
    })

    // Build CDK
    const synth = new pipelines.ShellStep('Synth', {
      input: source,
      additionalInputs: {
        // [ADD-SERVICE 2/4] Add an entry here for each new service's dist output.
        // See also: 1/4 (buildService), 3/4 (fallback build), 4/4 (unitTests commands).
        [`services/${appConfig.appName}/dist`]: buildService, // consumed by Code.fromAsset
      },
      commands: [
        'npm ci',
        // [ADD-SERVICE 3/4] Add a fallback build line here for each new service.
        // See also: 1/4 (buildService), 2/4 (additionalInputs), 4/4 (unitTests commands).
        `[ -d "services/${appConfig.appName}/dist" ] || npm --workspace @services/${appConfig.appName} run build`,
        'npm run format:check',
        'npm --workspace infrastructure run build',
        'npm --workspace infrastructure run synth',
      ],
      primaryOutputDirectory: 'infrastructure/cdk.out',
    })

    // Unit test hook
    const unitTests = new pipelines.CodeBuildStep('UnitTests', {
      input: source,
      commands: [
        'npm ci',
        // [ADD-SERVICE 4/4] Add build + test commands here for each new service.
        // See also: 1/4 (buildService), 2/4 (additionalInputs), 3/4 (fallback build).
        `npm --workspace @services/${appConfig.appName} run build`,
        'npm --workspace infrastructure run test',
        `npm --workspace @services/${appConfig.appName} run test`,
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

    // One stage per environment, unit tests before, smoke test after
    Object.values(appConfig.envs).forEach((envConfig) => {
      const stage = new AppStage(this, `${appConfig.appName}-${envConfig.name}`, { envConfig })

      const smokeTest = new pipelines.CodeBuildStep('SmokeTest', {
        envFromCfnOutputs: { API_URL: stage.apiUrlOutput },
        commands: ['curl -sf "$API_URL" | grep -q \'"status":"ok"\''],
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
        'npm --workspace infrastructure run build',
        'npm run test',
      ],
    })
  }
}

// Stage wraps the Lambda stack for a given environment
class AppStage extends cdk.Stage {
  public readonly apiUrlOutput: cdk.CfnOutput

  constructor(scope: Construct, id: string, props: { envConfig: EnvConfig } & cdk.StageProps) {
    super(scope, id, props)
    const stack = new AwsLambdaTemplateStack(this, `${props.envConfig.name}LambdaAPI-Stack`, {
      envConfig: props.envConfig,
    })
    this.apiUrlOutput = stack.apiUrlOutput
  }
}
