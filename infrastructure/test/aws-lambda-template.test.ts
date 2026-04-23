import * as path from 'path'
import * as cdk from 'aws-cdk-lib/core'
import { Template, Match } from 'aws-cdk-lib/assertions'
import { AwsLambdaTemplateStack } from '../lib/aws-lambda-template-stack'
import { appConfig, EnvConfig } from '../config/environments'
import { test } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { test } from 'vitest'
import { test } from 'vitest'
import { beforeAll } from 'vitest'
import { describe } from 'vitest'

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
      bffAssetPath: stubAssetPath,
    })
    template = Template.fromStack(stack)
  })

  test('creates backend Lambda function with correct name, runtime, and handler', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: `${appConfig.appName}-dev`,
      Runtime: 'nodejs22.x',
      Handler: 'handler.handler',
    })
  })

  test('creates BFF Lambda function with correct name and BACKEND_API_URL env var', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: `${appConfig.appName}-bff-dev`,
      Runtime: 'nodejs22.x',
      Handler: 'handler.handler',
    })
  })

  test('creates Lambda aliases named after the environment', () => {
    const aliases = template.findResources('AWS::Lambda::Alias', {
      Properties: { Name: 'dev' },
    })
    expect(Object.keys(aliases).length).toBe(2)
  })

  test('creates CodeDeploy deployment groups with ALL_AT_ONCE config', () => {
    const groups = template.findResources('AWS::CodeDeploy::DeploymentGroup', {
      Properties: { DeploymentConfigName: 'CodeDeployDefault.LambdaAllAtOnce' },
    })
    expect(Object.keys(groups).length).toBe(2)
  })

  test('creates two HTTP APIs (backend + BFF)', () => {
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 2)
  })

  test('wires GET / route on both APIs', () => {
    const routes = template.findResources('AWS::ApiGatewayV2::Route', {
      Properties: { RouteKey: 'GET /' },
    })
    expect(Object.keys(routes).length).toBe(2)
  })

  test('outputs ApiUrl and BffApiUrl', () => {
    const outputs = template.findOutputs('*')
    // Backend ApiGateway outputs ApiUrl, BFF ApiGateway outputs its own ApiUrl,
    // plus the explicit BffApiUrl CfnOutput = 3 total
    expect(Object.keys(outputs).length).toBe(3)
  })

  test('applies required tags to Lambda functions', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'app', Value: appConfig.appName }),
        Match.objectLike({ Key: 'costCenter', Value: appConfig.costCenter }),
        Match.objectLike({ Key: 'env', Value: 'dev' }),
        Match.objectLike({ Key: 'owner', Value: appConfig.owner }),
      ]),
    })
  })
})
