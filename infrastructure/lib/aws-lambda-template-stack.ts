import * as cdk from 'aws-cdk-lib/core'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import { Construct } from 'constructs'
import { LambdaFunction } from './constructs/lambda-function'
import { ApiGateway } from './constructs/api-gateway'
import { appConfig, EnvConfig } from '../config/environments'

export interface AwsLambdaTemplateStackProps extends cdk.StackProps {
  envConfig: EnvConfig
  serviceAssetPath?: string // override in tests to avoid requiring a built dist/
}

export class AwsLambdaTemplateStack extends cdk.Stack {
  public readonly apiUrlOutput: cdk.CfnOutput

  constructor(scope: Construct, id: string, props: AwsLambdaTemplateStackProps) {
    super(scope, id, {
      ...props,
      env: { account: props.envConfig.account, region: props.envConfig.region },
    })

    const lambdaFunction = new LambdaFunction(this, appConfig.appName, {
      functionName: `${appConfig.appName}-${props.envConfig.name}`,
      envConfig: props.envConfig,
      codeConfig: {
        type: 'asset',
        assetPath: props.serviceAssetPath ?? `../services/${appConfig.appName}/dist`,
      },
    })

    const api = new ApiGateway(this, 'Api', {
      apiName: `${appConfig.appName}-${props.envConfig.name}`,
    })
    api.addRoute(apigwv2.HttpMethod.GET, '/', lambdaFunction.alias)
    this.apiUrlOutput = api.apiUrlOutput

    cdk.Tags.of(this).add('app', appConfig.appName)
    cdk.Tags.of(this).add('owner', appConfig.owner)
    cdk.Tags.of(this).add('costCenter', appConfig.costCenter)
    cdk.Tags.of(this).add('env', props.envConfig.name)
  }
}
