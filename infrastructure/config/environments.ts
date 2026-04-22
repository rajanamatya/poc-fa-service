export type EnvName = 'sandbox' | 'dev' | 'test' | 'prod'

export interface EnvConfig {
  name: EnvName
  account: string
  region: string
}

export interface PipelineConfig {
  account: string
  region: string
  sourceRepo: string // 'workspace/repo' — Bitbucket workspace slug + repo slug
  sourceBranch: string
  connectionArn: string // AWS Code Connections ARN
}

export interface AppConfig {
  appName: string
  owner: string
  costCenter: string
  qualifier: string
  infraAccount: PipelineConfig
  envs: Partial<Record<EnvName, EnvConfig>>
}

export const appConfig: AppConfig = {
  appName: 'my-app', // rename to your app
  owner: 'platform-team', // your team
  costCenter: 'shared', // your cost center
  qualifier: 'wc-devops', // ≤10 chars, alphanumeric + hyphens; must match --qualifier in cdk bootstrap
  infraAccount: {
    // AWS Deploy account where the pipeline lives
    account: '111111111111',
    region: 'us-east-1',
    sourceRepo: 'your-org/your-repo', // Bitbucket/GitHub workspace + repo slug
    sourceBranch: 'main', // branch that triggers the pipeline
    connectionArn: 'arn:aws:codeconnections:REGION:111111111111:connection/CONNECTION-ID',
  },
  envs: {
    // sandbox: { name: 'sandbox', account: '021399176731', region: 'us-east-1'}
    // dev:  { name: 'dev',  account: '222222222222', region: 'us-east-1' },
    // test: { name: 'test', account: '333333333333', region: 'us-east-1' },
    // prod: { name: 'prod', account: '444444444444', region: 'us-east-1' },
  },
}
