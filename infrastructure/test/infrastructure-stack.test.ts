// test/infrastructure-stack.test.ts
import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { PortfolioInfraStack } from "../lib/infrastructure-stack.js";

describe("PortfolioInfraStack", () => {
  let app: cdk.App;
  let stack: PortfolioInfraStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App({
      context: {
        stage: "dev",
      },
    });
    // Mock the account ID
    const testEnv = {
      account: "123456789012",
      region: "us-east-1",
    };
    stack = new PortfolioInfraStack(app, "TestStack", { env: testEnv });
    template = Template.fromStack(stack);
  });

  test("creates S3 bucket with correct configuration", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketName: "portfolio-dev-123456789012",
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: "AES256",
            },
          },
        ],
      },
    });
  });

  test("creates CloudFront distribution with security headers", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        DefaultCacheBehavior: {
          ResponseHeadersPolicyId: Match.anyValue(),
          ViewerProtocolPolicy: "redirect-to-https",
          Compress: true,
        },
        PriceClass: "PriceClass_100",
      },
    });
  });

  test("has required security headers policy", () => {
    template.hasResourceProperties("AWS::CloudFront::ResponseHeadersPolicy", {
      ResponseHeadersPolicyConfig: {
        SecurityHeadersConfig: {
          ContentSecurityPolicy: {
            ContentSecurityPolicy: Match.stringLikeRegexp("default-src.*self"),
            Override: true,
          },
          StrictTransportSecurity: {
            Override: true,
            Preload: true,
          },
        },
      },
    });
  });

  test("creates cost alarms for dev environment", () => {
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      MetricName: "EstimatedCharges",
      Threshold: 5,
    });
  });
});
