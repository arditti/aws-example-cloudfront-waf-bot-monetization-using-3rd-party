import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export interface S3StorageProps {
  bucketName?: string;
  contentPath?: string;
}

export class S3Storage extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: S3StorageProps = {}) {
    super(scope, id);

    // Create standard S3 bucket for content storage
    this.bucket = new s3.Bucket(this, 'BlogContentBucket', {
      bucketName: props.bucketName || `ai-monetization-demo-blog-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      publicReadAccess: false, // Will be accessed through CloudFront only
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
      autoDeleteObjects: true, // For demo purposes
    });

    // Deploy sample blog content to S3 bucket
    new s3deploy.BucketDeployment(this, 'BlogContentDeployment', {
      sources: [s3deploy.Source.asset(props.contentPath || './blog-content')],
      destinationBucket: this.bucket,
      destinationKeyPrefix: '',
    });
  }
}