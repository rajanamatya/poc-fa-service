import * as cdk from 'aws-cdk-lib/core'
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
}

export class LambdaFunction extends Construct {
  public readonly alias: lambda.Alias
  public readonly fn: lambda.Function

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
