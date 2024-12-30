// test/infrastructure-stack.test.ts
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PortfolioInfraStack } from '../lib/infrastructure-stack';

describe('PortfolioInfraStack', () => {
  let app: cdk.App;
  let stack: PortfolioInfraStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App({
      context: {
        stage: 'dev'
      }
    });
    stack = new PortfolioInfraStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('creates S3 bucket with correct configuration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: {
        'Fn::Join': [
          '',
          [
            'portfolio-dev-',
            {
              Ref: 'AWS::AccountId'
            }
          ]
        ]
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true
      },
      VersioningConfiguration: {
        Status: 'Enabled'
      }
    });
  });

  test('creates CloudFront distribution with security headers', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultCacheBehavior: {
          ResponseHeadersPolicyId: {
            Ref: expect.stringMatching(/SecurityHeadersPolicy-dev/)
          },
          ViewerProtocolPolicy: 'redirect-to-https',
          Compress: true
        },
        PriceClass: 'PriceClass_100'
      }
    });
  });

  test('has required security headers policy', () => {
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: {
        SecurityHeadersConfig: {
          ContentSecurityPolicy: {
            ContentSecurityPolicy: expect.stringContaining("default-src 'self'"),
            Override: true
          },
          StrictTransportSecurity: {
            Override: true,
            Preload: true
          }
        }
      }
    });
  });

  test('creates cost alarms for dev environment', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      MetricName: 'EstimatedCharges',
      Threshold: 5
    });
  });
});