#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core'
import { PipelineStack } from '../lib/pipeline-stack'
import { AwsLambdaTemplateStack } from '../lib/aws-lambda-template-stack'
import { appConfig } from '../config/environments'

const app = new cdk.App()

// ── Pipeline stack (CI/CD) ───────────────────────────────────────────
new PipelineStack(app, `${appConfig.appName}-PipelineStack`, {
  env: {
    account: appConfig.infraAccount.account,
    region: appConfig.infraAccount.region,
  },
})

// ── Direct deploy stack (for testing) ────────────────────────────────
// Usage: cd infrastructure && npx cdk deploy rep-sandbox-Stack
// Requires: AWS credentials for the sandbox account (471744311207)
const sandboxEnv = appConfig.envs.sandbox
if (sandboxEnv) {
  new AwsLambdaTemplateStack(app, `${appConfig.appName}-${sandboxEnv.name}-Stack`, {
    envConfig: sandboxEnv,
  })
}
