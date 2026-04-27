import * as cdk from 'aws-cdk-lib/core'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import { Construct } from 'constructs'

export interface StaticSiteProps {
  /** Path to the built static assets (e.g. ../vue3/dist) */
  assetPath: string
  /** Optional: custom error responses for SPA routing */
  spaRouting?: boolean
}

export class StaticSite extends Construct {
  public readonly bucket: s3.Bucket
  public readonly distribution: cloudfront.Distribution
  public readonly distributionUrl: cdk.CfnOutput

  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id)

    this.bucket = new s3.Bucket(this, 'SiteBucket', {
      // Omit blockPublicAccess — the org SCP already enforces it
      // and explicitly setting it triggers a denied PutBucketPublicAccessBlock call
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      ...(props.spaRouting !== false && {
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(0),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(0),
          },
        ],
      }),
    })

    new s3deploy.BucketDeployment(this, 'DeployAssets', {
      sources: [s3deploy.Source.asset(props.assetPath)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    })

    this.distributionUrl = new cdk.CfnOutput(scope, 'SiteUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
    })
  }
}
