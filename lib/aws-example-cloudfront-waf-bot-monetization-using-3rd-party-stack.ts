import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { S3Storage } from './constructs/s3-storage';
import { WafSecurity } from './constructs/waf-security';
import { CloudFrontDistribution } from './constructs/cloudfront-distribution';

export class AwsExampleCloudfrontWafBotMonetizationUsing3RdPartyStack extends cdk.Stack {
  // Public properties for accessing created resources
  public readonly s3Storage: S3Storage;
  public readonly wafSecurity: WafSecurity;
  public readonly cloudfrontDistribution: CloudFrontDistribution;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Stack configuration
    this.templateOptions.description = 'AI Crawler Monetization Demo - CloudFront, WAF, and S3 integration for bot detection and monetization';

    // Create S3 storage for static website hosting
    this.s3Storage = new S3Storage(this, 'S3Storage');

    // Create WAF security for AI bot detection
    this.wafSecurity = new WafSecurity(this, 'WafSecurity');

    // Create CloudFront distribution with function
    this.cloudfrontDistribution = new CloudFrontDistribution(this, 'CloudFrontDistribution', {
      s3Bucket: this.s3Storage.bucket,
      webAclArn: this.wafSecurity.webAcl.attrArn,
    });

    // Create additional outputs
    this.createAdditionalOutputs();
  }

  private createAdditionalOutputs(): void {
    // No additional outputs needed - keeping only endpoint outputs
  }
}
