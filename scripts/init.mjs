#!/usr/bin/env node

/**
 * Interactive init script run once after cloning aws-lambda-template.
 * Collects project config, writes files, and prints bootstrap/deploy commands.
 */

import { createInterface } from 'readline/promises'
import { readFileSync, writeFileSync, renameSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const rl = createInterface({ input: process.stdin, output: process.stdout })

async function ask(label, { defaultValue, validate } = {}) {
  const hint = defaultValue ? ` [${defaultValue}]` : ''
  while (true) {
    const raw = (await rl.question(`${label}${hint}: `)).trim()
    const value = raw === '' && defaultValue ? defaultValue : raw
    if (!value) {
      console.log('  ✗ Required')
      continue
    }
    if (validate) {
      const err = validate(value)
      if (err) {
        console.log(`  ✗ ${err}`)
        continue
      }
    }
    return value
  }
}

async function multiSelect(label, choices, defaults = []) {
  const defaultIdxs = defaults.map((d) => choices.findIndex((c) => c.value === d) + 1)
  console.log(`\n${label}`)
  choices.forEach((c, i) => console.log(`  ${i + 1}) ${c.name}`))
  while (true) {
    const hint = defaultIdxs.length ? ` [${defaultIdxs.join(',')}]` : ''
    const raw = (await rl.question(`  Select numbers (comma-separated)${hint}: `)).trim()
    if (raw === '' && defaults.length) return defaults
    const nums = [
      ...new Set(
        raw
          .split(/[\s,]+/)
          .map(Number)
          .filter((n) => n >= 1 && n <= choices.length && !isNaN(n)),
      ),
    ]
    if (!nums.length) {
      console.log(`  ✗ Enter numbers 1–${choices.length}`)
      continue
    }
    return nums.map((n) => choices[n - 1].value)
  }
}

const is12Digits = (v) => (/^\d{12}$/.test(v) ? null : 'Must be exactly 12 digits')
const isAppName = (v) =>
  /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(v)
    ? null
    : 'Must be 3–40 chars: lowercase letters, digits, hyphens (no leading/trailing hyphen)'

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf-8')
}
function write(rel, content) {
  writeFileSync(join(ROOT, rel), content, 'utf-8')
  console.log(`  ✓  ${rel}`)
}

function updatePkgName(rel, name) {
  const pkg = JSON.parse(read(rel))
  pkg.name = name
  write(rel, JSON.stringify(pkg, null, 2) + '\n')
}

// ── Prompts ───────────────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(' AWS Lambda Template — Project Init')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const owner = await ask('Owner / team', { defaultValue: 'platform-team' })
const costCenter = 'shared'
const QUALIFIER = 'wc-devops'
const workspace = await ask('Bitbucket workspace slug', { defaultValue: 'wealthcounsel' })
const repoSlug = await ask('Repository slug', { validate: isAppName })
const appName = repoSlug
const branch = await ask('Pipeline trigger branch', { defaultValue: 'main' })
const infraAccount = '864899834457'
const region = await ask('Pipeline region', { defaultValue: 'us-east-1' })
const connectionArn =
  'arn:aws:codeconnections:us-east-2:864899834457:connection/f31d9a2a-1eef-4887-836e-800268dca2e5' // Default BitBucket AWSconnecation

const enabledEnvs = await multiSelect(
  'Environments to enable (≥ 1):',
  [
    { value: 'sandbox', name: 'sandbox' },
    { value: 'dev', name: 'dev  — development' },
    { value: 'test', name: 'test — testing / staging' },
    { value: 'prod', name: 'prod — production' },
  ],
  ['dev'],
)

const envAccounts = {}
console.log('')
for (const env of enabledEnvs) {
  envAccounts[env] = await ask(`Account ID for ${env} (12 digits)`, { validate: is12Digits })
}

rl.close()

// ── Write files ───────────────────────────────────────────────────────────────

console.log('\nWriting files...')

// 1. environments.ts — replace the appConfig export, keep type/interface block above it
const envsLines = ['sandbox', 'dev', 'test', 'prod'].map((env) => {
  const entry = `{ name: '${env}', account: '${envAccounts[env] ?? 'REPLACE_ME'}', region: '${region}' }`
  return enabledEnvs.includes(env) ? `    ${env}: ${entry},` : `    // ${env}: ${entry},`
})

const newAppConfig = [
  `export const appConfig: AppConfig = {`,
  `  appName: '${appName}',`,
  `  owner: '${owner}',`,
  `  costCenter: '${costCenter}',`,
  `  qualifier: '${QUALIFIER}',`,
  `  infraAccount: {`,
  `    account: '${infraAccount}',`,
  `    region: '${region}',`,
  `    sourceRepo: '${workspace}/${repoSlug}',`,
  `    sourceBranch: '${branch}',`,
  `    connectionArn: '${connectionArn}',`,
  `  },`,
  `  envs: {`,
  ...envsLines,
  `  }`,
  `};`,
  ``,
].join('\n')

const existing = read('infrastructure/config/environments.ts')
const splitIdx = existing.indexOf('\nexport const appConfig')
write('infrastructure/config/environments.ts', existing.slice(0, splitIdx + 1) + newAppConfig)

// 2. Rename service directory (services/sample-api → services/<appName>)
const oldSvcDir = 'services/sample-api'
const newSvcDir = `services/${appName}`
if (appName !== 'sample-api') {
  renameSync(join(ROOT, oldSvcDir), join(ROOT, newSvcDir))
  console.log(`  ✓  ${oldSvcDir}/ → ${newSvcDir}/`)
}

// 3. package.json name fields
updatePkgName('package.json', appName)
updatePkgName('infrastructure/package.json', `${appName}-infra`)
updatePkgName(`${newSvcDir}/package.json`, `@services/${appName}`)

// 4. pipeline-stack.ts — update workspace package ref and service directory path
write(
  'infrastructure/lib/pipeline-stack.ts',
  read('infrastructure/lib/pipeline-stack.ts')
    .replaceAll('@services/sample-api', `@services/${appName}`)
    .replaceAll('services/sample-api/', `services/${appName}/`),
)

// 5. test file — update environment config stub account
// (FunctionName and asset paths are derived from appConfig.appName at synth time)

// ── Next steps ────────────────────────────────────────────────────────────────

const SEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

const envBootstraps = enabledEnvs
  .map((env) =>
    [
      `   # ${env}`,
      `   cdk bootstrap aws://${envAccounts[env]}/${region} \\`,
      `     --trust ${infraAccount} \\`,
      `     --qualifier ${QUALIFIER} \\`,
      `     --toolkit-stack-name CDKToolkit-${QUALIFIER} \\`,
      `     --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \\`,
      `     --profile YOUR_PROFILE`,
    ].join('\n'),
  )
  .join('\n')

console.log(`
${SEP}
 Next steps
${SEP}

1. Install dependencies
   npm install

2. Bootstrap pipeline account (skip if CDKToolkit-${QUALIFIER} already exists):
   cdk bootstrap aws://${infraAccount}/${region} \\
     --qualifier ${QUALIFIER} \\
     --toolkit-stack-name CDKToolkit-${QUALIFIER} \\
     --without-public-access-block-configuration \\
     --profile YOUR_PROFILE

3. Bootstrap each application account:
${envBootstraps}
   (Add --without-public-access-block-configuration if an SCP blocks S3 public access block)

4. Deploy the pipeline (first time only):
   npm --workspace @services/${appName} run build
   npm --workspace infrastructure run build
   npm --workspace infrastructure run synth
   npm --workspace infrastructure run deploy
   
   Note: The Bitbucket AWS connection has already been configured — no changes
   to connectionArn in environments.ts are needed.

After the first deploy, push to '${branch}' to trigger the pipeline automatically.
${SEP}`)
