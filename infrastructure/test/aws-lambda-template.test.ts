import * as path from 'path'
import * as cdk from 'aws-cdk-lib/core'
import { Template, Match } from 'aws-cdk-lib/assertions'
import { AwsLambdaTemplateStack } from '../lib/aws-lambda-template-stack'
import { appConfig, EnvConfig } from '../config/environments'

const devEnv: EnvConfig = { name: 'dev', account: '123456789012', region: 'us-east-1' }

// Use the test directory as a stub asset — always present, no service build required
const stubAssetPath = path.join(__dirname)

describe('AwsLambdaTemplateStack', () => {
  let template: Template

  beforeAll(() => {
    const app = new cdk.App()
    const stack = new AwsLambdaTemplateStack(app, 'TestStack', {
      envConfig: devEnv,
      serviceAssetPath: stubAssetPath,
    })
    template = Template.fromStack(stack)
  })

  test('creates Lambda function with correct name, runtime, and handler', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: `${appConfig.appName}-dev`,
      Runtime: 'nodejs22.x',
      Handler: 'handler.handler',
    })
  })

  test('creates Lambda alias named after the environment', () => {
    template.hasResourceProperties('AWS::Lambda::Alias', {
      Name: 'dev',
    })
  })

  test('creates CodeDeploy application', () => {
    template.resourceCountIs('AWS::CodeDeploy::Application', 1)
  })

  test('creates CodeDeploy deployment group with ALL_AT_ONCE config', () => {
    template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
      DeploymentConfigName: 'CodeDeployDefault.LambdaAllAtOnce',
    })
  })

  test('creates one HTTP API via ApiGateway construct', () => {
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1)
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', { ProtocolType: 'HTTP' })
  })

  test('wires GET / route to the Lambda alias', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: 'GET /' })
    template.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
      IntegrationType: 'AWS_PROXY',
      PayloadFormatVersion: '2.0',
    })
  })

  test('outputs ApiUrl', () => {
    const outputs = template.findOutputs('*')
    expect(Object.keys(outputs)).toHaveLength(1)
  })

  test('applies required tags to Lambda function', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      // CDK sorts tags alphabetically by key
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'app', Value: appConfig.appName }),
        Match.objectLike({ Key: 'costCenter', Value: appConfig.costCenter }),
        Match.objectLike({ Key: 'env', Value: 'dev' }),
        Match.objectLike({ Key: 'owner', Value: appConfig.owner }),
      ]),
    })
  })
})
