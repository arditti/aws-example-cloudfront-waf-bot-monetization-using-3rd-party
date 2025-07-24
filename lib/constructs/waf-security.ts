import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

export interface WafSecurityProps {
  webAclName?: string;
}

export class WafSecurity extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: WafSecurityProps = {}) {
    super(scope, id);

    // Create WAF Web ACL with Bot Control v3.2
    this.webAcl = new wafv2.CfnWebACL(this, 'AiCrawlerDetectionWebACL', {
      name: props.webAclName || 'ai-crawler-monetization-demo-webacl',
      description: 'WAF Web ACL for AI crawler detection and monetization demo',
      scope: 'CLOUDFRONT', // Must be CLOUDFRONT for CloudFront distributions
      defaultAction: {
        allow: {}, // Default action is to allow requests
      },
      rules: [
        {
          name: 'AWS-AWSManagedRulesBotControlRuleSet',
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesBotControlRuleSet',
              version: 'Version_3.2',
              managedRuleGroupConfigs: [
                {
                  awsManagedRulesBotControlRuleSet: {
                    inspectionLevel: 'COMMON'
                  }
                }
              ],
            }
          },
          overrideAction: {
            count: {}
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesBotControlRuleSet',
          },
        },
        {
          name: 'if-bot-control-match-add-header',
          priority: 3,
          statement: {
            labelMatchStatement: {
              scope: 'NAMESPACE',
              key: 'awswaf:managed:aws:bot-control:'
            }
          },
          action: {
            count: {
              customRequestHandling: {
                insertHeaders: [
                  {
                    name: 'bot', // x-amzn-waf- prefix is auto added by waf = x-amzn-waf-bot
                    value: 'true'
                  }
                ]
              }
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'if-bot-control-match-add-header',
          },
        }
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AiCrawlerMonetizationWebACL',
      },
    });


  }


}