import * as cdk from 'aws-cdk-lib/core'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import { Construct } from 'constructs'
import { LambdaFunction } from './constructs/lambda-function'
import { ApiGateway } from './constructs/api-gateway'
import { Database } from './constructs/database'
import { appConfig, EnvConfig } from '../config/environments'

export interface AwsLambdaTemplateStackProps extends cdk.StackProps {
  envConfig: EnvConfig
  serviceAssetPath?: string
  bffAssetPath?: string
  /** Skip VPC/RDS creation for lightweight test synthesis */
  skipDatabase?: boolean
}

export class AwsLambdaTemplateStack extends cdk.Stack {
  public readonly apiUrlOutput: cdk.CfnOutput
  public readonly bffApiUrlOutput: cdk.CfnOutput

  constructor(scope: Construct, id: string, props: AwsLambdaTemplateStackProps) {
    super(scope, id, {
      ...props,
      env: { account: props.envConfig.account, region: props.envConfig.region },
    })

    // ── Networking + Database ────────────────────────────────────────
    let vpc: ec2.IVpc | undefined
    let db: Database | undefined
    let backendEnv: Record<string, string> = {}

    if (!props.skipDatabase) {
      vpc = new ec2.Vpc(this, 'Vpc', {
        maxAzs: 2,
        natGateways: 1,
        subnetConfiguration: [
          { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
          { name: 'Private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
          { name: 'Isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
        ],
      })

      db = new Database(this, 'Database', {
        vpc,
        databaseName: `${appConfig.appName}_${props.envConfig.name}`.replace(/-/g, '_'),
        envName: props.envConfig.name,
      })

      backendEnv = {
        DB_SECRET_ARN: db.secret.secretArn,
        DB_HOST: db.instance.dbInstanceEndpointAddress,
        DB_PORT: db.instance.dbInstanceEndpointPort,
        DB_NAME: `${appConfig.appName}_${props.envConfig.name}`.replace(/-/g, '_'),
      }
    }

    // ── Backend service ──────────────────────────────────────────────
    const backendLambda = new LambdaFunction(this, appConfig.appName, {
      functionName: `${appConfig.appName}-${props.envConfig.name}`,
      envConfig: props.envConfig,
      codeConfig: {
        type: 'asset',
        assetPath: props.serviceAssetPath ?? `../services/${appConfig.appName}/dist`,
      },
      environment: backendEnv,
      vpc,
      vpcSubnets: vpc ? { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS } : undefined,
    })

    // Grant Lambda access to RDS
    if (db && backendLambda.securityGroup) {
      db.allowFrom(backendLambda.securityGroup)
      db.secret.grantRead(backendLambda.fn)
    }

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
