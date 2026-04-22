import * as cdk from 'aws-cdk-lib/core'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import { Template } from 'aws-cdk-lib/assertions'
import { ApiGateway } from '../lib/constructs/api-gateway'

function buildTemplate(cb: (stack: cdk.Stack) => void): Template {
  const app = new cdk.App()
  const stack = new cdk.Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  })
  cb(stack)
  return Template.fromStack(stack)
}

function stubFn(stack: cdk.Stack, id: string): lambda.IFunction {
  return new lambda.Function(stack, id, {
    runtime: lambda.Runtime.NODEJS_22_X,
    handler: 'index.handler',
    code: lambda.Code.fromInline('exports.handler = () => {}'),
  })
}

describe('ApiGateway — defaults', () => {
  let template: Template

  beforeAll(() => {
    template = buildTemplate((stack) => {
      new ApiGateway(stack, 'Subject')
    })
  })

  test('creates one HTTP API with ProtocolType HTTP', () => {
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1)
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', { ProtocolType: 'HTTP' })
  })

  test('outputs ApiUrl', () => {
    const outputs = template.findOutputs('*')
    expect(Object.keys(outputs)).toHaveLength(1)
  })

  test('no CorsConfiguration when corsAllowOrigins is omitted', () => {
    const apis = template.findResources('AWS::ApiGatewayV2::Api')
    const apiResource = Object.values(apis)[0] as { Properties: Record<string, unknown> }
    expect(apiResource.Properties['CorsConfiguration']).toBeUndefined()
  })
})

describe('ApiGateway — apiName prop', () => {
  test('Name property matches provided apiName', () => {
    const template = buildTemplate((stack) => {
      new ApiGateway(stack, 'Subject', { apiName: 'my-api' })
    })

    template.hasResourceProperties('AWS::ApiGatewayV2::Api', { Name: 'my-api' })
  })
})

describe('ApiGateway — CORS', () => {
  test('CorsConfiguration.AllowOrigins matches corsAllowOrigins', () => {
    const template = buildTemplate((stack) => {
      new ApiGateway(stack, 'Subject', {
        corsAllowOrigins: ['https://example.com'],
      })
    })

    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      CorsConfiguration: {
        AllowOrigins: ['https://example.com'],
      },
    })
  })
})

describe('ApiGateway — addRoute', () => {
  test('GET / produces RouteKey GET /, AWS_PROXY integration, PayloadFormatVersion 2.0', () => {
    const template = buildTemplate((stack) => {
      const gw = new ApiGateway(stack, 'Subject')
      gw.addRoute(apigwv2.HttpMethod.GET, '/', stubFn(stack, 'Fn'))
    })

    template.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: 'GET /' })
    template.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
      IntegrationType: 'AWS_PROXY',
      PayloadFormatVersion: '2.0',
    })
  })

  test('POST /users produces RouteKey POST /users', () => {
    const template = buildTemplate((stack) => {
      const gw = new ApiGateway(stack, 'Subject')
      gw.addRoute(apigwv2.HttpMethod.POST, '/users', stubFn(stack, 'Fn'))
    })

    template.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: 'POST /users' })
  })

  test('two routes produce two Route and two Integration resources without logical ID collision', () => {
    const template = buildTemplate((stack) => {
      const gw = new ApiGateway(stack, 'Subject')
      gw.addRoute(apigwv2.HttpMethod.GET, '/users', stubFn(stack, 'Fn1'))
      gw.addRoute(apigwv2.HttpMethod.POST, '/users', stubFn(stack, 'Fn2'))
    })

    template.resourceCountIs('AWS::ApiGatewayV2::Route', 2)
    template.resourceCountIs('AWS::ApiGatewayV2::Integration', 2)
  })

  test('GET /users/{id} preserves braces in RouteKey', () => {
    const template = buildTemplate((stack) => {
      const gw = new ApiGateway(stack, 'Subject')
      gw.addRoute(apigwv2.HttpMethod.GET, '/users/{id}', stubFn(stack, 'Fn'))
    })

    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'GET /users/{id}',
    })
  })
})
