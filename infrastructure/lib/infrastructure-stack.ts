import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cf from "aws-cdk-lib/aws-cloudfront";
import { Construct } from "constructs";

interface EnvironmentConfig {
  removalPolicy: cdk.RemovalPolicy;
  autoDeleteObjects: boolean;
  enableDetailedMonitoring: boolean;
}

export class PortfolioInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Environment validation
    const validStages = ["dev", "staging", "prod"];
    const stage = this.node.tryGetContext("stage") || "dev";

    if (!validStages.includes(stage)) {
      throw new Error(
        `Invalid stage: ${stage}. Must be one of: ${validStages.join(", ")}`
      );
    }

    // Environment-specific configurations
    const envConfigs: { [key: string]: EnvironmentConfig } = {
      dev: {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        enableDetailedMonitoring: false,
      },
      staging: {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        enableDetailedMonitoring: false,
      },
      prod: {
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        autoDeleteObjects: false,
        enableDetailedMonitoring: true,
      },
    };

    const config = envConfigs[stage];

    // Create S3 bucket with blocked public access
    const websiteBucket = new s3.Bucket(this, `WebsiteBucket-${stage}`, {
      bucketName: `portfolio-${stage}-${this.account}`.toLowerCase(),
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: config.removalPolicy,
      autoDeleteObjects: config.autoDeleteObjects,
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ["*"],
          maxAge: 3000,
        },
      ],
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });

    // Add security policy for SSL enforcement
    websiteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ["s3:*"],
        resources: [websiteBucket.bucketArn, `${websiteBucket.bucketArn}/*`],
        principals: [new iam.AnyPrincipal()],
        conditions: {
          Bool: {
            "aws:SecureTransport": "false",
          },
        },
      })
    );

    // Create security headers function
    const securityHeadersFunction = new cf.Function(
      this,
      `SecurityHeadersFunction-${stage}`,
      {
        code: cf.FunctionCode.fromInline(`
        function handler(event) {
          var response = event.response;
          var headers = response.headers;
          
          headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload' };
          headers['x-content-type-options'] = { value: 'nosniff' };
          headers['x-frame-options'] = { value: 'DENY' };
          headers['x-xss-protection'] = { value: '1; mode=block' };
          headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
          headers['permissions-policy'] = { 
            value: 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()' 
          };
          
          return response;
        }
      `),
      }
    );

    // Create cache policy
    const cachePolicy = new cloudfront.CachePolicy(
      this,
      `CachePolicy-${stage}`,
      {
        defaultTtl: cdk.Duration.days(1),
        minTtl: cdk.Duration.minutes(1),
        maxTtl: cdk.Duration.days(365),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList("Accept"),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      }
    );

    // Create CloudFront distribution
    const distribution = new cloudfront.Distribution(
      this,
      `Distribution-${stage}`,
      {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
          compress: true,
          functionAssociations: [
            {
              function: securityHeadersFunction,
              eventType: cf.FunctionEventType.VIEWER_RESPONSE,
            },
          ],
        },
        defaultRootObject: "index.html",
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.minutes(5),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.minutes(5),
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        enableLogging: config.enableDetailedMonitoring,
        logBucket: config.enableDetailedMonitoring
          ? new s3.Bucket(this, `LogBucket-${stage}`, {
              removalPolicy: config.removalPolicy,
              autoDeleteObjects: config.autoDeleteObjects,
              lifecycleRules: [
                {
                  expiration: cdk.Duration.days(7),
                },
              ],
            })
          : undefined,
      }
    );

    // Create CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, `Dashboard-${stage}`, {
      dashboardName: `Portfolio-${stage}-Metrics`,
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "CloudFront Requests",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/CloudFront",
            metricName: "Requests",
            dimensionsMap: {
              DistributionId: distribution.distributionId,
              Region: "Global",
            },
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: "CloudFront Error Rate",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/CloudFront",
            metricName: "4xxErrorRate",
            dimensionsMap: {
              DistributionId: distribution.distributionId,
              Region: "Global",
            },
            statistic: "Average",
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: "AWS/CloudFront",
            metricName: "5xxErrorRate",
            dimensionsMap: {
              DistributionId: distribution.distributionId,
              Region: "Global",
            },
            statistic: "Average",
            period: cdk.Duration.minutes(5),
          }),
        ],
      })
    );

    // Add CloudFront request monitoring only when detailed monitoring is enabled
    if (config.enableDetailedMonitoring) {
      new cloudwatch.Alarm(this, `CloudFrontCostAlarm-${stage}`, {
        metric: new cloudwatch.Metric({
          namespace: "AWS/CloudFront",
          metricName: "Requests",
          dimensionsMap: {
            DistributionId: distribution.distributionId,
            Region: "Global",
          },
          period: cdk.Duration.hours(24),
          statistic: "Sum",
        }),
        threshold: stage === "prod" ? 1000000 : 100000,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        alarmDescription: `High number of CloudFront requests in ${stage} environment`,
      });
    }

    // Add basic cost monitoring alarm
    new cloudwatch.Alarm(this, `CostAlarm-${stage}`, {
      metric: new cloudwatch.Metric({
        namespace: "AWS/Billing",
        metricName: "EstimatedCharges",
        dimensionsMap: { Currency: "USD" },
        period: cdk.Duration.hours(6),
        statistic: "Maximum",
      }),
      threshold: stage === "prod" ? 20 : 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: `Monthly cost alarm for ${stage} environment`,
    });

    // Stack outputs
    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
      description: `CloudFront Distribution ID for ${stage} environment`,
      exportName: `DistributionId-${stage}`,
    });

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
      description: `CloudFront Domain Name for ${stage} environment`,
      exportName: `DistributionDomainName-${stage}`,
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
      description: `S3 Bucket Name for ${stage} environment`,
      exportName: `BucketName-${stage}`,
    });

    new cdk.CfnOutput(this, "DashboardURL", {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: "URL for the CloudWatch Dashboard",
    });
  }
}
