import * as cdk from 'aws-cdk-lib/core'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import { Construct } from 'constructs'
import { EnvConfig } from '../../config/environments'

export type LambdaCodeConfig =
  | { type: 'asset'; assetPath: string; handler?: string; runtime?: lambda.Runtime }
  | { type: 'container'; repository: ecr.IRepository; tagOrDigest?: string }

export interface LambdaFunctionProps {
  codeConfig: LambdaCodeConfig
  functionName: string
  envConfig: EnvConfig
  deploymentConfig?: codedeploy.ILambdaDeploymentConfig
  environment?: Record<string, string>
  /** VPC to place the Lambda in (required for RDS access) */
  vpc?: ec2.IVpc
  /** VPC subnets for the Lambda */
  vpcSubnets?: ec2.SubnetSelection
  /** Security groups for the Lambda */
  securityGroups?: ec2.ISecurityGroup[]
  /** Timeout — defaults to 30s */
  timeout?: cdk.Duration
}

export class LambdaFunction extends Construct {
  public readonly alias: lambda.Alias
  public readonly fn: lambda.Function
  public readonly securityGroup?: ec2.SecurityGroup

  constructor(scope: Construct, id: string, props: LambdaFunctionProps) {
    super(scope, id)

    const { codeConfig, functionName, envConfig, deploymentConfig } = props

    let code: lambda.Code
    let handler: string
    let runtime: lambda.Runtime

    if (codeConfig.type === 'asset') {
      code = lambda.Code.fromAsset(codeConfig.assetPath)
      handler = codeConfig.handler ?? 'handler.handler'
      runtime = codeConfig.runtime ?? lambda.Runtime.NODEJS_22_X
    } else {
      code = lambda.Code.fromEcrImage(codeConfig.repository, {
        tagOrDigest: codeConfig.tagOrDigest,
      })
      handler = lambda.Handler.FROM_IMAGE
      runtime = lambda.Runtime.FROM_IMAGE
    }

    // Create a security group for the Lambda if it's in a VPC
    if (props.vpc && !props.securityGroups?.length) {
      this.securityGroup = new ec2.SecurityGroup(this, 'LambdaSg', {
        vpc: props.vpc,
        description: `Security group for ${functionName} Lambda`,
        allowAllOutbound: true,
      })
    }

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${functionName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    this.fn = new lambda.Function(this, 'Function', {
      functionName,
      code,
      handler,
      runtime,
      logGroup,
      environment: props.environment,
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: props.securityGroups ?? (this.securityGroup ? [this.securityGroup] : undefined),
      timeout: props.timeout ?? cdk.Duration.seconds(30),
    })

    const version = this.fn.currentVersion

    this.alias = new lambda.Alias(this, 'Alias', {
      aliasName: envConfig.name,
      version,
    })

    new codedeploy.LambdaDeploymentGroup(this, 'DeploymentGroup', {
      alias: this.alias,
      deploymentConfig: deploymentConfig ?? codedeploy.LambdaDeploymentConfig.ALL_AT_ONCE,
    })
  }
}
