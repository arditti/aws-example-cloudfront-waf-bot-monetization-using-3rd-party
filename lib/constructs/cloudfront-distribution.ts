import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export interface CloudFrontDistributionProps {
  s3Bucket: s3.Bucket;
  webAclArn: string;
}

export class CloudFrontDistribution extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly function: cloudfront.Function;

  constructor(scope: Construct, id: string, props: CloudFrontDistributionProps) {
    super(scope, id);

    // Create CloudFront Function for AI bot request processing
    this.function = new cloudfront.Function(this, 'AiBotRedirectFunction', {
      functionName: 'ai-bot-redirect-function',
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(__dirname, '../functions/ai-bot-redirect.js'),
      }),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: 'Function to detect AI bots via WAF header and redirect to monetization service with comprehensive error handling',
    });

    // Create Origin Access Control (OAC) for secure S3 access
    const originAccessControl = new cloudfront.S3OriginAccessControl(this, 'S3OriginAccessControl', {
      description: 'OAC for AI Monetization Demo S3 bucket access',
    });
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(props.s3Bucket, { originAccessControl });
    // Create CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'AiMonetizationDistribution', {
      comment: 'AI Crawler Monetization Demo - CloudFront Distribution',
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        // Attach CloudFront Function to viewer request trigger
        functionAssociations: [
          {
            function: this.function,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      // Additional behavior for assets (CSS, JS, images) with longer caching and no function
      additionalBehaviors: {
        '/assets/*': {
          origin: s3Origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          compress: true,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: this.getErrorResponses(),
      enabled: true,
      // Associate WAF Web ACL with the distribution
      webAclId: props.webAclArn,
    });

    // Grant CloudFront OAC access to S3 bucket
    props.s3Bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowCloudFrontServicePrincipal',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        actions: ['s3:GetObject'],
        resources: [props.s3Bucket.arnForObjects('*')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${this.distribution.distributionId}`,
          },
        },
      })
    );

    this.createOutputs();
  }



  private getErrorResponses(): cloudfront.ErrorResponse[] {
    const clientErrorCodes = [403, 404];
    const serverErrorCodes = [500, 502, 503, 504];

    return [
      ...clientErrorCodes.map(code => ({
        httpStatus: code,
        responseHttpStatus: code === 403 ? 404 : code,
        responsePagePath: '/error.html',
        ttl: cdk.Duration.minutes(5),
      })),
      ...serverErrorCodes.map(code => ({
        httpStatus: code,
        responseHttpStatus: code,
        responsePagePath: '/error.html',
        ttl: cdk.Duration.minutes(1), // Shorter TTL for server errors
      })),
    ];
  }

  private createOutputs(): void {
    new cdk.CfnOutput(this, 'TestingEndpoints', {
      value: JSON.stringify({
        homepage: `https://${this.distribution.distributionDomainName}/`,
        page1: `https://${this.distribution.distributionDomainName}/page1`,
        page2: `https://${this.distribution.distributionDomainName}/page2`,
        page3: `https://${this.distribution.distributionDomainName}/page3`,
        about: `https://${this.distribution.distributionDomainName}/about`,
        contact: `https://${this.distribution.distributionDomainName}/contact`
      }),
      description: 'JSON object containing all testing endpoints for the demo blog',
    });
  }
}