# AWS Lambda Template

A monorepo template for deploying TypeScript Lambda functions to multiple AWS accounts via a CDK
Pipeline (CodePipeline + CodeBuild). Each Lambda function is a reusable CDK construct with a
versioned alias and CodeDeploy blue/green rollout built in.

---

## Using this template

1. In Bitbucket, create a new repository from the **aws-lambda-template** template.
2. Clone it locally.
3. Run the init script — it collects your config and prints the exact commands needed:
   ```bash
   npm run init
   ```
4. Follow the printed instructions.

---

## Repo layout

```
.
├── infrastructure/          # CDK app — stacks, constructs, pipeline
│   ├── bin/
│   │   └── aws-lambda-template.ts   # Entry point — creates PipelineStack
│   ├── config/
│   │   └── environments.ts          # All configuration — accounts, region, pipeline source
│   ├── lib/
│   │   ├── aws-lambda-template-stack.ts   # Application stack (add resources here)
│   │   ├── pipeline-stack.ts              # CDK Pipeline definition
│   │   └── constructs/
│   │       ├── api-gateway.ts             # Reusable HTTP API Gateway construct
│   │       └── lambda-function.ts         # Reusable Lambda + CodeDeploy construct
│   └── test/
│       ├── api-gateway.test.ts
│       ├── aws-lambda-template.test.ts
│       └── lambda-function.test.ts
│
└── services/
    └── sample-api/          # Lambda function implementation
        ├── src/
        │   └── handler.ts   # Lambda handler — export a function named `handler`
        └── test/
            └── handler.test.ts
```

Two test frameworks are used intentionally:

- `infrastructure/` uses **Jest** with `ts-jest` (CDK assertion tests)
- `services/*` use **Vitest** (unit tests, compiled to CommonJS for Lambda compatibility)

---

## Prerequisites

| Tool        | Version                                           |
| ----------- | ------------------------------------------------- |
| Node.js     | >= 20                                             |
| AWS CDK CLI | `npm install -g aws-cdk`                          |
| AWS CLI     | configured with credentials for the infra account |

---

## First-time setup

### 1. Fill in configuration

Run `npm run init` (see [Using this template](#using-this-template)) to populate
`infrastructure/config/environments.ts` automatically, or edit it by hand.
`infraAccount` is where the pipeline lives; `envs` are the application target accounts.

To get the `connectionArn`: go to **AWS Console → CodePipeline → Settings → Connections** in the
infra account, create a connection to your Git provider (GitHub, Bitbucket, etc.), and copy the ARN.

### 2. Install dependencies

```bash
npm install
```

### 3. Bootstrap all accounts

CDK must be bootstrapped in every account/region before the first deploy. The `--qualifier` and
`--toolkit-stack-name` flags must match the `qualifier` value you set in `environments.ts`.

Run with credentials for each respective account:

```bash
# Infra account (pipeline account)
cdk bootstrap aws://111111111111/us-east-1 \
  --qualifier my-app \
  --toolkit-stack-name CDKToolkit-my-app

# Each application account (trust the infra account to deploy into them)
cdk bootstrap aws://222222222222/us-east-1 \
  --trust 111111111111 \
  --qualifier my-app \
  --toolkit-stack-name CDKToolkit-my-app \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

> **SCP note:** If your organization has a Service Control Policy that blocks
> `s3:PutBucketPublicAccessBlock`, add `--no-public-access-block-configuration` to both commands.

### 4. Deploy the pipeline (once)

Build the Lambda service first (CDK packages the `dist/` folder as the Lambda asset), then deploy
the pipeline stack to the infra account:

```bash
npm --workspace @services/sample-api run build
npm --workspace infrastructure run build
npm --workspace infrastructure run synth
npm --workspace infrastructure run deploy
```

After the first deploy, every push to the configured branch triggers the pipeline automatically.
The pipeline is self-mutating — changes to `pipeline-stack.ts` take effect on the next run.

---

## Daily development commands

```bash
# Install deps
npm install

# Build everything
npm run build

# Run all tests (infra Jest + service Vitest)
npm run test

# Lint workspaces that have a lint script
npm run lint

# Synthesize the CDK CloudFormation template (requires service to be built first)
npm --workspace @services/sample-api run build && npm run synth

# ── Scoped to a single workspace ─────────────────────────────────────────────

npm --workspace @services/sample-api run build
npm --workspace @services/sample-api run test
npm --workspace @services/sample-api run lint

npm --workspace infrastructure run build
npm --workspace infrastructure run test
```

---

## Local database (Postgres + Drizzle)

The `rep` service uses [Drizzle ORM](https://orm.drizzle.team/) on top of `node-postgres`.
For local development, a `docker-compose.yml` at the repo root spins up a Postgres
instance that mirrors the production RDS engine version.

```bash
# 1. Start Postgres (defaults: localhost:5432, db=todos, user=postgres, password=postgres)
npm run db:up

# 2. Apply pending migrations
npm run db:migrate

# 3. Open Drizzle Studio (optional — browser UI for the data)
npm run db:studio

# Stop the database
npm run db:down

# Wipe data and start fresh
npm run db:reset
```

Override connection settings by exporting `DB_HOST`, `DB_PORT`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME` (see `services/rep/.env.example`). In production the
service reads credentials from AWS Secrets Manager via `DB_SECRET_ARN`.

### Schema changes

1. Edit `services/rep/src/db/schema.ts`.
2. Generate a migration: `npm run db:generate`.
3. Review the SQL in `services/rep/migrations/` and commit it.
4. Apply it locally with `npm run db:migrate`.

Migrations are tracked in `__drizzle_migrations` and are **not** auto-applied on
Lambda cold start — they're meant to run as a deploy step.

---

## Adding a new Lambda service

### Step 1 — Create the service package

```bash
mkdir -p services/my-service/src services/my-service/test
```

`services/my-service/package.json`:

```json
{
  "name": "@services/my-service",
  "private": true,
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

`services/my-service/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "noEmit": false
  },
  "include": ["src/**/*.ts"]
}
```

> **Important:** Do not add `"type": "module"` to the package.json and do not include
> `test/**/*.ts` in the tsconfig `include` list. Both cause Lambda runtime or build errors.

`services/my-service/src/handler.ts`:

```typescript
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

export async function handler(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'ok', service: 'my-service' }),
  }
}
```

### Step 2 — Wire it into the CDK stack

In `infrastructure/lib/aws-lambda-template-stack.ts`:

```typescript
const myService = new LambdaFunction(this, 'MyService', {
  functionName: `my-service-${props.envConfig.name}`,
  envConfig: props.envConfig,
  codeConfig: { type: 'asset', assetPath: '../services/my-service/dist' },
})
api.addRoute(apigwv2.HttpMethod.GET, '/my-service', myService.alias)
```

### Step 3 — Add a build step in the pipeline

In `infrastructure/lib/pipeline-stack.ts`, add a build step and inject its output into Synth:

```typescript
const buildMyService = new pipelines.CodeBuildStep('BuildMyService', {
  input: source,
  commands: ['npm ci', 'npm --workspace @services/my-service run build'],
  primaryOutputDirectory: 'services/my-service/dist',
})

const synth = new pipelines.ShellStep('Synth', {
  input: source,
  additionalInputs: {
    'services/sample-api/dist': buildService,
    'services/my-service/dist': buildMyService, // ← add this
  },
  // ... rest unchanged
})
```

---

## Exposing a service via HTTP API

`ApiGateway` owns the `HttpApi`. `LambdaFunction` owns the function. The stack wires them.

```typescript
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { ApiGateway } from './constructs/api-gateway';

const sampleApi = new LambdaFunction(this, 'SampleApi', { ... });
const api = new ApiGateway(this, 'Api', { apiName: `my-app-${props.envConfig.name}` });
api.addRoute(apigwv2.HttpMethod.GET, '/', sampleApi.alias);
```

A `ApiUrl` CloudFormation output is emitted automatically with the endpoint URL.

Optional CORS:

```typescript
const api = new ApiGateway(this, 'Api', {
  corsAllowOrigins: ['https://example.com'],
})
```

---

## Using a container image instead of a zip asset

```typescript
import * as ecr from 'aws-cdk-lib/aws-ecr'

const repo = ecr.Repository.fromRepositoryName(this, 'MyRepo', 'my-service')

new LambdaFunction(this, 'MyService', {
  functionName: `my-service-${props.envConfig.name}`,
  envConfig: props.envConfig,
  codeConfig: { type: 'container', repository: repo, tagOrDigest: 'latest' },
})
```

No `BuildService` pipeline step needed — CodeDeploy pulls the image from ECR at deploy time.

---

## Changing the deployment strategy

```typescript
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy'

new LambdaFunction(this, 'SampleApi', {
  // ...
  deploymentConfig: codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
})
```

| Config                             | Behaviour                   |
| ---------------------------------- | --------------------------- |
| `ALL_AT_ONCE`                      | Instant cutover (default)   |
| `CANARY_10PERCENT_5MINUTES`        | 10 % for 5 min, then 100 %  |
| `CANARY_10PERCENT_30MINUTES`       | 10 % for 30 min, then 100 % |
| `LINEAR_10PERCENT_EVERY_1MINUTE`   | +10 % every minute          |
| `LINEAR_10PERCENT_EVERY_10MINUTES` | +10 % every 10 min          |

---

## Environment model

```
┌──────────────────────────────┐
│  Infra account (111111111111)│
│  ┌────────────────────────┐  │
│  │  PipelineStack         │  │
│  │  CodePipeline          │──┼──► dev  account (222222222222)
│  │  (self-mutating)       │──┼──► test account (333333333333)
│  └────────────────────────┘  │  └──► prod account (444444444444)
└──────────────────────────────┘
```

- The **infra account** is where the pipeline lives. No application code runs there.
- Each **env account** receives an `AwsLambdaTemplateStack` scoped to that environment.
- Tags `app`, `owner`, `costCenter`, and `env` are applied to every resource in the stack.

---

## Pipeline flow

```
Source (Git push to configured branch)
  │
  ├─► BuildService  — npm ci && npm run build   → outputs services/sample-api/dist/
  │
  └─► Synth         — npm ci && npm run build   → outputs infrastructure/cdk.out/
        (receives dist/ as additionalInput)
              │
              ├─► UpdatePipeline  (self-mutation)
              │
              ├─► dev stage   → AwsLambdaTemplateStack
              ├─► test stage  → AwsLambdaTemplateStack
              └─► prod stage  → AwsLambdaTemplateStack
```

Each stage deploys via CloudFormation. Lambda updates route through CodeDeploy using the alias,
shifting traffic according to the configured `deploymentConfig`.
