#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core'
import { PipelineStack } from '../lib/pipeline-stack'
import { appConfig } from '../config/environments'

const app = new cdk.App()
new PipelineStack(app, `${appConfig.appName}-PipelineStack`, {
  env: {
    account: appConfig.infraAccount.account,
    region: appConfig.infraAccount.region,
  },
})
