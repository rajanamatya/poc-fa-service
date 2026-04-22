import * as cdk from 'aws-cdk-lib'
import * as codebuild from 'aws-cdk-lib/aws-codebuild'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export interface BitbucketPrValidationProps {
  owner: string
  repo: string
  projectName: string
  /** AWS Code Connections ARN — reuses the same connection as the pipeline source. */
  connectionArn: string
  installCommands: string[]
  buildCommands: string[]
  /** Node.js runtime version. Defaults to '22'. */
  nodeVersion?: string
  /** CodeBuild compute type. Defaults to ComputeType.MEDIUM. */
  computeType?: codebuild.ComputeType
  /** CodeBuild build image. Defaults to LinuxBuildImage.STANDARD_7_0. */
  buildImage?: codebuild.IBuildImage
  /** Build timeout. Defaults to 30 minutes. */
  timeout?: cdk.Duration
  /** Only trigger on PRs targeting this branch (e.g. 'main', 'sandbox'). */
  baseBranch: string
  /**
   * Webhook filter groups controlling which PR events trigger the build.
   * Defaults to created + updated events, scoped to baseBranch when provided.
   */
  webhookFilters?: codebuild.FilterGroup[]
}

export class BitbucketPrValidation extends Construct {
  readonly project: codebuild.Project

  constructor(scope: Construct, id: string, props: BitbucketPrValidationProps) {
    super(scope, id)

    const {
      owner,
      repo,
      projectName,
      connectionArn,
      baseBranch,
      installCommands,
      buildCommands,
      nodeVersion = '22',
      computeType = codebuild.ComputeType.MEDIUM,
      buildImage = codebuild.LinuxBuildImage.STANDARD_7_0,
      timeout = cdk.Duration.minutes(30),
    } = props

    const webhookFilters = props.webhookFilters ?? [
      codebuild.FilterGroup.inEventOf(
        codebuild.EventAction.PULL_REQUEST_CREATED,
        codebuild.EventAction.PULL_REQUEST_UPDATED,
      ).andBaseBranchIs(baseBranch),
    ]

    this.project = new codebuild.Project(this, 'CIforPR', {
      projectName,
      description: 'Runs CI checks on every Bitbucket pull request',
      source: codebuild.Source.bitBucket({
        owner,
        repo,
        webhook: true,
        webhookFilters,
        reportBuildStatus: true,
      }),
      environment: { buildImage, computeType },
      timeout,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': { nodejs: nodeVersion },
            commands: installCommands,
          },
          build: { commands: buildCommands },
        },
      }),
    })

    // Override source auth to use Code Connections instead of OAuth
    const cfnProject = this.project.node.defaultChild as codebuild.CfnProject
    cfnProject.addPropertyOverride('Source.Auth', {
      Type: 'CODECONNECTIONS',
      Resource: connectionArn,
    })

    // Explicit policy resource so we can add a DependsOn from the project,
    // ensuring permissions are in place before CodeBuild registers the webhook
    const connectionPolicy = new iam.Policy(this, 'CodeConnectionPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'codeconnections:GetConnectionToken',
            'codeconnections:GetConnection',
            'codeconnections:UseConnection',
          ],
          resources: [connectionArn],
        }),
      ],
    })

    connectionPolicy.attachToRole(this.project.role as iam.Role)

    cfnProject.addDependency(connectionPolicy.node.defaultChild as cdk.CfnResource)
  }
}
