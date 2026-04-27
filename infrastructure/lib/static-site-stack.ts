import * as cdk from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { StaticSite } from './constructs/static-site'
import { appConfig, EnvConfig } from '../config/environments'

export interface StaticSiteStackProps extends cdk.StackProps {
  envConfig: EnvConfig
  assetPath?: string
}

export class StaticSiteStack extends cdk.Stack {
  public readonly siteUrlOutput: cdk.CfnOutput

  constructor(scope: Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, {
      ...props,
      env: { account: props.envConfig.account, region: props.envConfig.region },
    })

    const site = new StaticSite(this, 'Vue3Site', {
      assetPath: props.assetPath ?? '../vue3/dist',
      spaRouting: true,
    })

    this.siteUrlOutput = site.distributionUrl

    cdk.Tags.of(this).add('app', appConfig.appName)
    cdk.Tags.of(this).add('owner', appConfig.owner)
    cdk.Tags.of(this).add('costCenter', appConfig.costCenter)
    cdk.Tags.of(this).add('env', props.envConfig.name)
  }
}
