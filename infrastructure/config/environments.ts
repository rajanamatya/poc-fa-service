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
  appName: 'rep',
  owner: 'platform-rxa',
  costCenter: 'shared',
  qualifier: 'wc-devops',
  infraAccount: {
    account: '864899834457',
    region: 'us-east-2',
    sourceRepo: 'bitbucket/rep',
    sourceBranch: 'main',
    connectionArn: 'arn:aws:codeconnections:us-east-2:864899834457:connection/f31d9a2a-1eef-4887-836e-800268dca2e5',
  },
  envs: {
    sandbox: { name: 'sandbox', account: '471744311207', region: 'us-east-2' },
    //dev: { name: 'dev', account: '043206427225', region: 'us-east-2' },
    // test: { name: 'test', account: 'REPLACE_ME', region: 'us-east-2' },
    // prod: { name: 'prod', account: 'REPLACE_ME', region: 'us-east-2' },
  }
};
