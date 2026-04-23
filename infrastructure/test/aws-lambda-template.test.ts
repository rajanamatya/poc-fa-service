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
      bffAssetPath: stubAssetPath,
      skipDatabase: true,
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

  test('creates BFF Lambda function with correct name', () => {
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

describe('AwsLambdaTemplateStack with database', () => {
  let template: Template

  beforeAll(() => {
    const app = new cdk.App()
    const stack = new AwsLambdaTemplateStack(app, 'TestStackWithDb', {
      envConfig: devEnv,
      serviceAssetPath: stubAssetPath,
      bffAssetPath: stubAssetPath,
      // skipDatabase defaults to false — creates VPC + RDS
    })
    template = Template.fromStack(stack)
  })

  test('creates a VPC', () => {
    template.resourceCountIs('AWS::EC2::VPC', 1)
  })

  test('creates an RDS PostgreSQL instance', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      DBInstanceClass: 'db.t3.micro',
    })
  })

  test('creates a Secrets Manager secret for DB credentials', () => {
    template.resourceCountIs('AWS::SecretsManager::Secret', 1)
  })

  test('backend Lambda has DB environment variables', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: `${appConfig.appName}-dev`,
      Environment: {
        Variables: Match.objectLike({
          DB_SECRET_ARN: Match.anyValue(),
          DB_NAME: Match.anyValue(),
        }),
      },
    })
  })
})
