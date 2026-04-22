import * as cdk from 'aws-cdk-lib/core'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import { Template, Match } from 'aws-cdk-lib/assertions'
import * as path from 'path'
import { LambdaFunction } from '../lib/constructs/lambda-function'
import { EnvConfig } from '../config/environments'

const devEnv: EnvConfig = { name: 'dev', account: '123456789012', region: 'us-east-1' }

// Use the test directory itself as a stub asset — always present, no build required
const stubAssetPath = path.join(__dirname)

function buildTemplate(cb: (stack: cdk.Stack) => void): Template {
  const app = new cdk.App()
  const stack = new cdk.Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  })
  cb(stack)
  return Template.fromStack(stack)
}

describe('LambdaFunction — asset code defaults', () => {
  let template: Template

  beforeAll(() => {
    template = buildTemplate((stack) => {
      new LambdaFunction(stack, 'Subject', {
        functionName: 'my-fn-dev',
        envConfig: devEnv,
        codeConfig: { type: 'asset', assetPath: stubAssetPath },
      })
    })
  })

  test('creates Lambda function with nodejs22.x runtime and default handler', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'my-fn-dev',
      Runtime: 'nodejs22.x',
      Handler: 'handler.handler',
    })
  })

  test('creates Lambda alias with env name', () => {
    template.hasResourceProperties('AWS::Lambda::Alias', {
      Name: 'dev',
    })
  })

  test('creates CodeDeploy deployment group with ALL_AT_ONCE', () => {
    template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
      DeploymentConfigName: 'CodeDeployDefault.LambdaAllAtOnce',
    })
  })

  test('does not create HTTP API by default', () => {
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 0)
  })
})

describe('LambdaFunction — asset code overrides', () => {
  test('uses custom handler and runtime when provided', () => {
    const template = buildTemplate((stack) => {
      new LambdaFunction(stack, 'Subject', {
        functionName: 'my-fn-dev',
        envConfig: devEnv,
        codeConfig: {
          type: 'asset',
          assetPath: stubAssetPath,
          handler: 'dist/index.handler',
          runtime: lambda.Runtime.NODEJS_20_X,
        },
      })
    })

    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'dist/index.handler',
      Runtime: 'nodejs20.x',
    })
  })

  test('uses custom deployment config when provided', () => {
    const template = buildTemplate((stack) => {
      new LambdaFunction(stack, 'Subject', {
        functionName: 'my-fn-dev',
        envConfig: devEnv,
        codeConfig: { type: 'asset', assetPath: stubAssetPath },
        deploymentConfig: codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      })
    })

    template.hasResourceProperties('AWS::CodeDeploy::DeploymentGroup', {
      DeploymentConfigName: 'CodeDeployDefault.LambdaLinear10PercentEvery1Minute',
    })
  })

  test('creates prod alias when prod envConfig is used', () => {
    const prodEnv: EnvConfig = { name: 'prod', account: '123456789012', region: 'us-east-1' }
    const template = buildTemplate((stack) => {
      new LambdaFunction(stack, 'Subject', {
        functionName: 'my-fn-prod',
        envConfig: prodEnv,
        codeConfig: { type: 'asset', assetPath: stubAssetPath },
      })
    })

    template.hasResourceProperties('AWS::Lambda::Alias', { Name: 'prod' })
  })
})

describe('LambdaFunction — container code', () => {
  test('uses FROM_IMAGE package type', () => {
    const template = buildTemplate((stack) => {
      const repo = ecr.Repository.fromRepositoryName(stack, 'Repo', 'my-service')
      new LambdaFunction(stack, 'Subject', {
        functionName: 'my-fn-dev',
        envConfig: devEnv,
        codeConfig: { type: 'container', repository: repo, tagOrDigest: 'latest' },
      })
    })

    template.hasResourceProperties('AWS::Lambda::Function', {
      PackageType: 'Image',
    })
  })
})
