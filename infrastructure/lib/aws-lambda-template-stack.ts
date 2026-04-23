import * as cdk from 'aws-cdk-lib/core'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import { Construct } from 'constructs'
import { LambdaFunction } from './constructs/lambda-function'
import { ApiGateway } from './constructs/api-gateway'
import { appConfig, EnvConfig } from '../config/environments'

export interface AwsLambdaTemplateStackProps extends cdk.StackProps {
  envConfig: EnvConfig
  serviceAssetPath?: string
  bffAssetPath?: string
}

export class AwsLambdaTemplateStack extends cdk.Stack {
  public readonly apiUrlOutput: cdk.CfnOutput
  public readonly bffApiUrlOutput: cdk.CfnOutput

  constructor(scope: Construct, id: string, props: AwsLambdaTemplateStackProps) {
    super(scope, id, {
      ...props,
      env: { account: props.envConfig.account, region: props.envConfig.region },
    })

    // ── Backend service ──────────────────────────────────────────────
    const backendLambda = new LambdaFunction(this, appConfig.appName, {
      functionName: `${appConfig.appName}-${props.envConfig.name}`,
      envConfig: props.envConfig,
      codeConfig: {
        type: 'asset',
        assetPath: props.serviceAssetPath ?? `../services/${appConfig.appName}/dist`,
      },
    })

    const backendApi = new ApiGateway(this, 'BackendApi', {
      apiName: `${appConfig.appName}-backend-${props.envConfig.name}`,
    })
    backendApi.addRoute(apigwv2.HttpMethod.GET, '/', backendLambda.alias)
    backendApi.addRoute(apigwv2.HttpMethod.GET, '/{proxy+}', backendLambda.alias)
    backendApi.addRoute(apigwv2.HttpMethod.POST, '/{proxy+}', backendLambda.alias)
    backendApi.addRoute(apigwv2.HttpMethod.PUT, '/{proxy+}', backendLambda.alias)
    backendApi.addRoute(apigwv2.HttpMethod.DELETE, '/{proxy+}', backendLambda.alias)

    this.apiUrlOutput = backendApi.apiUrlOutput

    // ── BFF service ──────────────────────────────────────────────────
    const bffLambda = new LambdaFunction(this, 'bff', {
      functionName: `${appConfig.appName}-bff-${props.envConfig.name}`,
      envConfig: props.envConfig,
      codeConfig: {
        type: 'asset',
        assetPath: props.bffAssetPath ?? '../services/bff/dist',
      },
      environment: {
        BACKEND_API_URL: backendApi.httpApi.apiEndpoint,
      },
    })

    const bffApi = new ApiGateway(this, 'BffApi', {
      apiName: `${appConfig.appName}-bff-${props.envConfig.name}`,
    })
    bffApi.addRoute(apigwv2.HttpMethod.GET, '/', bffLambda.alias)
    bffApi.addRoute(apigwv2.HttpMethod.GET, '/{proxy+}', bffLambda.alias)
    bffApi.addRoute(apigwv2.HttpMethod.POST, '/{proxy+}', bffLambda.alias)
    bffApi.addRoute(apigwv2.HttpMethod.PUT, '/{proxy+}', bffLambda.alias)
    bffApi.addRoute(apigwv2.HttpMethod.DELETE, '/{proxy+}', bffLambda.alias)

    this.bffApiUrlOutput = new cdk.CfnOutput(this, 'BffApiUrl', {
      value: bffApi.httpApi.apiEndpoint,
    })

    // ── Tags ─────────────────────────────────────────────────────────
    cdk.Tags.of(this).add('app', appConfig.appName)
    cdk.Tags.of(this).add('owner', appConfig.owner)
    cdk.Tags.of(this).add('costCenter', appConfig.costCenter)
    cdk.Tags.of(this).add('env', props.envConfig.name)
  }
}
