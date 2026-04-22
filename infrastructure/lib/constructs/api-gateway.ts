import * as cdk from 'aws-cdk-lib/core'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as apigwv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import { Construct } from 'constructs'

export interface ApiGatewayProps {
  apiName?: string
  corsAllowOrigins?: string[]
}

export class ApiGateway extends Construct {
  public readonly httpApi: apigwv2.HttpApi
  public readonly apiUrlOutput: cdk.CfnOutput

  constructor(scope: Construct, id: string, props: ApiGatewayProps = {}) {
    super(scope, id)

    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: props.apiName,
      corsPreflight: props.corsAllowOrigins
        ? {
            allowOrigins: props.corsAllowOrigins,
            allowMethods: [apigwv2.CorsHttpMethod.ANY],
            allowHeaders: ['Authorization', 'Content-Type'],
          }
        : undefined,
    })

    this.apiUrlOutput = new cdk.CfnOutput(this, 'ApiUrl', { value: this.httpApi.apiEndpoint })
  }

  addRoute(method: apigwv2.HttpMethod, path: string, target: lambda.IFunction): void {
    const integrationId = `${method}${path}`.replace(/[^a-zA-Z0-9]/g, '') + 'Integration'

    this.httpApi.addRoutes({
      path,
      methods: [method],
      integration: new apigwv2integrations.HttpLambdaIntegration(integrationId, target),
    })
  }
}
