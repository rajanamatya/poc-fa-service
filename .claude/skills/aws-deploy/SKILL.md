---
name: aws-deploy
description: Scaffold AWS infrastructure (CDK stacks, Lambda functions, shared API types) and deploy to AWS. Two phases — Phase 1 scaffolds code with no AWS account needed; Phase 2 deploys. Run after all domains are working locally with localStorage.
---

# AWS Deploy Skill

Two-phase skill for moving a locally-working Vue + localStorage app to AWS.

**Phase 1 — Scaffold** creates all infrastructure code. No AWS account or
credentials needed. Run this to review and customise the infrastructure before
committing to a deployment.

**Phase 2 — Deploy** runs the CDK commands to provision and deploy. Requires
an AWS account, the AWS CLI configured, and CDK bootstrapped in the target account.

---

## When to run this skill

Run after:
- All domains are built and working locally with localStorage
- Storybook stories cover all components
- Store tests pass

Do not run until the app is working end-to-end locally. The skill assumes
all domain stores exist in `src/stores/`.

---

## Phase 1 — Scaffold

### What it reads before writing

Before generating any files, read:
- `src/stores/` — to identify all domains (one folder = one domain)
- `shared/types/` — to understand existing shared types

Each domain needs:
- A DynamoDB table in `api-stack.ts`
- API Gateway routes in `api-stack.ts`
- Environment variables passed to the Lambda functions
- API-layer types in `shared/types/[domain].ts` (dates as strings, not Date objects)

### Files created by Phase 1

```
cdk/
  cdk.json
  tsconfig.json
  package.json
  bin/app.ts
  lib/api-stack.ts      ← DynamoDB tables, Lambda integrations, all routes
  lib/hosting-stack.ts  ← S3 + CloudFront with /api/* behavior

functions/
  query/index.ts        ← GET /[domain] — DynamoDB Scan per domain
  command/index.ts      ← POST/PUT/DELETE — DynamoDB Put/Delete per domain

shared/types/
  [domain].ts           ← API-layer type per domain (dates as strings)
  commands.ts           ← discriminated union command types per domain
  index.ts              ← updated to export all new types
```

`.gitignore` is updated with CDK and `vite.config.js` entries.

---

### cdk/cdk.json

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "watch": {
    "include": ["**"],
    "exclude": ["README.md", "cdk*.json", "**/*.d.ts", "**/*.js", "tsconfig.json", "package*.json", "node_modules", "dist"]
  },
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/core:target-partitions": ["aws", "aws-cn"],
    "@aws-cdk/aws-apigateway:disableCloudWatchRole": true,
    "@aws-cdk/core:enablePartitionLiterals": true,
    "@aws-cdk/aws-iam:minimizePolicies": true,
    "@aws-cdk/aws-s3:createDefaultLoggingPolicy": true,
    "@aws-cdk/aws-cloudfront:defaultSecurityPolicyTLSv1.2_2021": true,
    "@aws-cdk/customresources:installLatestAwsSdkDefault": false
  }
}
```

---

### cdk/tsconfig.json

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "Node16",
    "moduleResolution": "node16",
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "types": ["node"]
  },
  "include": ["bin/**/*.ts", "lib/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

`module` must be `Node16` when `moduleResolution` is `node16` — both must match.
`outDir` is `dist` (inside `cdk/`) so compiled output never reaches the project root.

---

### cdk/package.json

```json
{
  "name": "[project-name]-infra",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "tsc",
    "cdk": "cdk"
  },
  "dependencies": {
    "aws-cdk-lib": "^2.160.0",
    "constructs": "^10.4.0",
    "source-map-support": "^0.5.21"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.0",
    "@types/node": "^22.0.0",
    "aws-cdk": "^2.160.0",
    "esbuild": "^0.24.0",
    "ts-node": "^10.9.0",
    "typescript": "~5.6.0"
  }
}
```

`ts-node` is required — `npx cdk synth` uses it to compile `bin/app.ts` at runtime.

---

### cdk/bin/app.ts

```ts
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { ApiStack } from '../lib/api-stack'
import { HostingStack } from '../lib/hosting-stack'

const app = new cdk.App()
const stageName = app.node.tryGetContext('stage') ?? 'dev'

const apiStack = new ApiStack(app, `App-Api-${stageName}`, {
  stageName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})

new HostingStack(app, `App-Hosting-${stageName}`, {
  stageName,
  apiUrl: apiStack.apiUrl,
  apiDomainName: apiStack.apiDomainName,
  apiStagePath: apiStack.apiStagePath,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})
```

---

### cdk/lib/api-stack.ts

Adapt the DynamoDB tables, Lambda env vars, and API Gateway routes for every
domain found in `src/stores/`. The template below shows the contacts + matters
pattern — replicate for each domain.

```ts
import * as cdk from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'
import * as path from 'path'

interface ApiStackProps extends cdk.StackProps {
  stageName: string
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string
  /** Hostname only — e.g. abc123.execute-api.us-east-1.amazonaws.com */
  public readonly apiDomainName: string
  /** Stage path prefix — e.g. /V1 */
  public readonly apiStagePath: string

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    // --- DynamoDB tables (one per domain) ---

    const contactsTable = new dynamodb.Table(this, 'ContactsTable', {
      tableName: `contacts-${props.stageName}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        props.stageName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    })

    const mattersTable = new dynamodb.Table(this, 'MattersTable', {
      tableName: `matters-${props.stageName}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        props.stageName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    })

    // --- Lambda functions (CQRS split) ---

    const sharedLambdaProps = {
      runtime: lambda.Runtime.NODEJS_22_X,
      bundling: { minify: true, sourceMap: false },
      environment: {
        CONTACTS_TABLE: contactsTable.tableName,
        MATTERS_TABLE: mattersTable.tableName,
        // add one entry per domain table
      },
    }

    const queryFn = new NodejsFunction(this, 'QueryFunction', {
      ...sharedLambdaProps,
      entry: path.join(__dirname, '../../functions/query/index.ts'),
      handler: 'handler',
      functionName: `query-${props.stageName}`,
    })

    const commandFn = new NodejsFunction(this, 'CommandFunction', {
      ...sharedLambdaProps,
      entry: path.join(__dirname, '../../functions/command/index.ts'),
      handler: 'handler',
      functionName: `command-${props.stageName}`,
    })

    // --- IAM permissions ---

    contactsTable.grantReadData(queryFn)
    mattersTable.grantReadData(queryFn)
    contactsTable.grantWriteData(commandFn)
    mattersTable.grantWriteData(commandFn)

    // --- API Gateway ---

    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `api-${props.stageName}`,
      // V1 is the API version stage — separate from the environment (dev/prod)
      deployOptions: { stageName: 'V1' },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    })

    const queryIntegration = new apigateway.LambdaIntegration(queryFn)
    const commandIntegration = new apigateway.LambdaIntegration(commandFn)

    // /contacts
    const contacts = api.root.addResource('contacts')
    contacts.addMethod('GET', queryIntegration)
    contacts.addMethod('POST', commandIntegration)
    const contactById = contacts.addResource('{id}')
    contactById.addMethod('PUT', commandIntegration)
    contactById.addMethod('DELETE', commandIntegration)

    // /matters
    const matters = api.root.addResource('matters')
    matters.addMethod('GET', queryIntegration)
    matters.addMethod('POST', commandIntegration)
    const matterById = matters.addResource('{id}')
    matterById.addMethod('PUT', commandIntegration)
    matterById.addMethod('DELETE', commandIntegration)

    // add one resource block per domain

    this.apiUrl = api.url
    this.apiDomainName = `${api.restApiId}.execute-api.${this.region}.amazonaws.com`
    this.apiStagePath = `/${api.deploymentStage.stageName}`

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url })
  }
}
```

---

### cdk/lib/hosting-stack.ts

This file is the same for every project — it does not change per domain.

```ts
import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import { Construct } from 'constructs'
import * as path from 'path'
import * as fs from 'fs'

interface HostingStackProps extends cdk.StackProps {
  stageName: string
  apiUrl: string
  /** Hostname of the API Gateway — e.g. abc123.execute-api.us-east-1.amazonaws.com */
  apiDomainName: string
  /** Stage path prefix — e.g. /V1 */
  apiStagePath: string
}

export class HostingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HostingStackProps) {
    super(scope, id, props)

    const bucket = new s3.Bucket(this, 'SpaBucket', {
      // blockPublicAccess omitted — enforced at account level via SCP
      removalPolicy:
        props.stageName === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stageName !== 'prod',
    })

    // CloudFront Function: strip /api prefix before forwarding to API Gateway
    const apiRewriteFn = new cloudfront.Function(this, 'ApiRewriteFunction', {
      functionName: `api-rewrite-${props.stageName}`,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  request.uri = request.uri.replace(/^\\/api/, '');
  if (request.uri === '' || request.uri === '/') {
    request.uri = '/';
  }
  return request;
}
      `.trim()),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    })

    // API Gateway origin — routes /api/* after prefix is stripped
    const apiOrigin = new origins.HttpOrigin(props.apiDomainName, {
      originPath: props.apiStagePath,
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    })

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          functionAssociations: [
            {
              function: apiRewriteFn,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
      defaultRootObject: 'index.html',
    })

    // Only deploy SPA assets if dist/ exists — skipped during first synth before build
    const distPath = path.join(__dirname, '../../dist')
    if (fs.existsSync(distPath)) {
      new s3deploy.BucketDeployment(this, 'DeployApp', {
        sources: [s3deploy.Source.asset(distPath)],
        destinationBucket: bucket,
        distribution,
        distributionPaths: ['/*'],
      })
    }

    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: `https://${distribution.distributionDomainName}`,
    })
  }
}
```

**Key points:**
- `S3BucketOrigin.withOriginAccessControl(bucket)` — use this, not the deprecated `S3Origin`
- `blockPublicAccess` is omitted — SCPs at the account level handle this; adding it causes a deploy failure if an SCP blocks `PutBucketPublicAccessBlock`
- `fs.existsSync(distPath)` guard prevents a deploy failure when `dist/` doesn't exist yet (first synth before first build)
- The CloudFront Function runs at `JS_2_0` runtime — no Node APIs available

---

### functions/query/index.ts

Dispatches on `event.resource`. Add one branch per domain.

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const resource = event.resource

  try {
    let tableName: string | undefined

    if (resource === '/contacts') tableName = process.env.CONTACTS_TABLE
    if (resource === '/matters') tableName = process.env.MATTERS_TABLE
    // add one line per domain

    if (!tableName) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) }
    }

    const result = await client.send(new ScanCommand({ TableName: tableName }))
    return {
      statusCode: 200,
      body: JSON.stringify({ data: result.Items ?? [] }),
    }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

---

### functions/command/index.ts

Dispatches on `event.httpMethod` + `event.resource`. Add branches per domain.

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { httpMethod, resource, pathParameters } = event
  const body = event.body ? JSON.parse(event.body) : {}

  try {
    let tableName: string | undefined

    if (resource.startsWith('/contacts')) tableName = process.env.CONTACTS_TABLE
    if (resource.startsWith('/matters')) tableName = process.env.MATTERS_TABLE
    // add one line per domain

    if (!tableName) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) }
    }

    if (httpMethod === 'POST') {
      const item = { id: crypto.randomUUID(), ...body }
      await client.send(new PutCommand({ TableName: tableName, Item: item }))
      return { statusCode: 201, body: JSON.stringify({ data: item }) }
    }

    if (httpMethod === 'PUT') {
      const item = { id: pathParameters?.id, ...body }
      await client.send(new PutCommand({ TableName: tableName, Item: item }))
      return { statusCode: 200, body: JSON.stringify({ data: item }) }
    }

    if (httpMethod === 'DELETE') {
      await client.send(new DeleteCommand({
        TableName: tableName,
        Key: { id: pathParameters?.id },
      }))
      return { statusCode: 204, body: '' }
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

---

### shared/types/[domain].ts

One file per domain. Mirrors the Vue module type but with dates as ISO strings
(not `Date` objects) — this is the API contract. The service layer in the Vue app
converts between the two at the HTTP boundary.

```ts
// shared/types/contact.ts — example, adapt per domain
export type ContactType = 'individual' | 'company'

export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  company: string
  contactType: ContactType
  status: 'active' | 'inactive' | 'lead'
  phone?: string
  jobTitle?: string
  birthday?: string | null   // ISO string, not Date
  tags?: string[]
}

export interface ContactFormValues extends Omit<Contact, 'id'> {}
```

```ts
// shared/types/commands.ts
import type { ContactFormValues } from './contact'
import type { MatterFormValues } from './matter'

export type ContactCommand =
  | { action: 'create'; payload: ContactFormValues }
  | { action: 'update'; id: string; payload: Partial<ContactFormValues> }
  | { action: 'delete'; id: string }

export type MatterCommand =
  | { action: 'create'; payload: MatterFormValues }
  | { action: 'update'; id: string; payload: Partial<MatterFormValues> }
  | { action: 'delete'; id: string }

// add one union type per domain
```

Update `shared/types/index.ts` to export all new types.

---

### .gitignore additions

```
# CDK
cdk/cdk.out/
cdk/dist/

# Prevent stale CDK tsc output from shadowing vite.config.ts
# CDK's tsc compiles bin/ and lib/ but can emit vite.config.js to the project root.
# Vite loads .js before .ts — this file silently wins and all config changes are ignored.
vite.config.js
```

---

## Phase 2 — Deploy

### Prerequisites

- AWS CLI installed and configured (`aws configure`)
- CDK bootstrapped in the target account/region (first time only):

```bash
cd cdk
pnpm install
npx cdk bootstrap
```

### Deploy order

Always deploy `App-Api` first — `App-Hosting` depends on its outputs.

```bash
# 1. Deploy the API (DynamoDB + Lambda + API Gateway)
cd cdk
npx cdk deploy App-Api-dev

# 2. Capture the invoke URL from the stack output — looks like:
#    https://abc123.execute-api.us-east-1.amazonaws.com/V1

# 3. Update .env.local with the invoke URL (without trailing slash):
#    API_URL=https://abc123.execute-api.us-east-1.amazonaws.com/V1

# 4. Build the SPA (from project root)
cd ..
pnpm build

# 5. Deploy the hosting stack
cd cdk
npx cdk deploy App-Hosting-dev
```

### Smoke test before updating services

Test all endpoints before switching services away from localStorage:

```bash
# Via the Vite dev proxy (restart pnpm dev first to pick up the new API_URL)
curl http://localhost:5173/api/contacts
curl http://localhost:5173/api/matters

# Direct API Gateway (bypasses proxy)
curl https://abc123.execute-api.us-east-1.amazonaws.com/V1/contacts
```

All should return `{ "data": [] }`.

### Update services

Once the API is confirmed working, update each domain service from localStorage
to `fetch`. The serialization boundary stays in the service — convert ISO string
dates to `Date` objects in `fromRecord`, and back to strings in `toRecord`.

```ts
// Example: contactsService.ts after switching to fetch
async getAll(): Promise<Contact[]> {
  const res = await fetch('/api/contacts')
  const { data } = await res.json()
  return data.map(fromRecord)
},

async create(values: ContactFormValues): Promise<Contact> {
  const res = await fetch('/api/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toRecord(values)),
  })
  const { data } = await res.json()
  return fromRecord(data)
},
```

`fromRecord` converts ISO string dates → `Date | null`.
`toRecord` converts `Date | null` → ISO strings.
Both already exist in the localStorage service — they do not change.

### Production deploy

```bash
cd cdk
npx cdk deploy App-Api-prod --context stage=prod
pnpm build  # from project root
npx cdk deploy App-Hosting-prod --context stage=prod
```

---

## CDK command reference

All commands run from the `cdk/` directory.

| Command | What it does |
|---|---|
| `npx cdk synth` | Compile and preview CloudFormation — no AWS calls |
| `npx cdk diff` | Show what will change before deploying |
| `npx cdk deploy App-Api-dev` | Deploy API stack only |
| `npx cdk deploy App-Hosting-dev` | Deploy hosting stack only |
| `npx cdk deploy --all` | Deploy all stacks |
| `npx cdk destroy App-Api-dev` | Tear down (non-prod only — DESTROY removal policy) |
