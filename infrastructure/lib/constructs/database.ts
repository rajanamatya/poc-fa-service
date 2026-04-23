import * as cdk from 'aws-cdk-lib/core'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import { Construct } from 'constructs'

export interface DatabaseProps {
  /** VPC to place the database in */
  vpc: ec2.IVpc
  /** Database name */
  databaseName: string
  /** Environment name for naming resources */
  envName: string
  /** Instance type — defaults to t3.micro for cost savings */
  instanceType?: ec2.InstanceType
  /** Removal policy — defaults to DESTROY for non-prod */
  removalPolicy?: cdk.RemovalPolicy
}

export class Database extends Construct {
  public readonly instance: rds.DatabaseInstance
  public readonly securityGroup: ec2.SecurityGroup
  public readonly secret: rds.DatabaseSecret

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id)

    this.securityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc: props.vpc,
      description: `Security group for ${props.databaseName} RDS`,
      allowAllOutbound: false,
    })

    this.secret = new rds.DatabaseSecret(this, 'DbSecret', {
      username: 'app_user',
      dbname: props.databaseName,
    })

    this.instance = new rds.DatabaseInstance(this, 'Instance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_4,
      }),
      instanceType: props.instanceType ?? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      databaseName: props.databaseName,
      credentials: rds.Credentials.fromSecret(this.secret),
      securityGroups: [this.securityGroup],
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 50,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false,
      removalPolicy: props.removalPolicy ?? cdk.RemovalPolicy.DESTROY,
    })
  }

  /** Allow a security group to connect to the database on port 5432 */
  allowFrom(peer: ec2.ISecurityGroup): void {
    this.securityGroup.addIngressRule(peer, ec2.Port.tcp(5432), 'Allow Lambda access to RDS')
  }
}
