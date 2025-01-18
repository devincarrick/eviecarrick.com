import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as iam from "aws-cdk-lib/aws-iam";
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
    const validStages = ['dev', 'staging', 'prod'];
    const stage = this.node.tryGetContext("stage") || "dev";
    
    if (!validStages.includes(stage)) {
      throw new Error(`Invalid stage: ${stage}. Must be one of: ${validStages.join(', ')}`);
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
      // Block all public access
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      
      // Cost optimization configurations
      removalPolicy: config.removalPolicy,
      autoDeleteObjects: config.autoDeleteObjects,
      
      // CORS configuration
      cors: [{
        allowedHeaders: ['*'],
        allowedMethods: [
          s3.HttpMethods.GET,
          s3.HttpMethods.HEAD,
        ],
        allowedOrigins: ['*'],
        maxAge: 3000,
      }],

      // Security configurations
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });

    // Add security policy for SSL enforcement
    websiteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ['s3:*'],
        resources: [websiteBucket.bucketArn, `${websiteBucket.bucketArn}/*`],
        principals: [new iam.AnyPrincipal()],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false',
          },
        },
      })
    );

    // Create security headers policy
    const securityHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, `SecurityHeadersPolicy-${stage}`, {
      responseHeadersPolicyName: `SecurityHeadersPolicy-${stage}`,
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          override: true,
          contentSecurityPolicy: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data: https:;"
        },
        strictTransportSecurity: {
          override: true,
          accessControlMaxAge: cdk.Duration.days(2 * 365),
          includeSubdomains: true,
          preload: true
        },
        contentTypeOptions: {
          override: true
        },
        frameOptions: {
          override: true,
          frameOption: cloudfront.HeadersFrameOption.DENY
        },
        xssProtection: {
          override: true,
          protection: true,
          modeBlock: true
        },
        referrerPolicy: {
          override: true,
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN
        }
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
            override: true
          }
        ]
      }
    });

    // Create CloudFront distribution
    const distribution = new cloudfront.Distribution(this, `Distribution-${stage}`, {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        compress: true,
        responseHeadersPolicy: securityHeadersPolicy
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/error.html',
          ttl: cdk.Duration.hours(1),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableLogging: config.enableDetailedMonitoring,
      logBucket: config.enableDetailedMonitoring ? new s3.Bucket(this, `LogBucket-${stage}`, {
        removalPolicy: config.removalPolicy,
        autoDeleteObjects: config.autoDeleteObjects,
        lifecycleRules: [{
          expiration: cdk.Duration.days(7),
        }],
      }) : undefined,
    });

    // Add CloudFront request monitoring only when detailed monitoring is enabled
    if (config.enableDetailedMonitoring) {
      new cloudwatch.Alarm(this, `CloudFrontCostAlarm-${stage}`, {
        metric: new cloudwatch.Metric({
          namespace: "AWS/CloudFront",
          metricName: "Requests",
          dimensionsMap: { 
            DistributionId: distribution.distributionId,
            Region: 'Global'
          },
          period: cdk.Duration.hours(24),
          statistic: "Sum",
        }),
        threshold: stage === "prod" ? 1000000 : 100000,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
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
    new cdk.CfnOutput(this, `${stage}DistributionId`, {
      value: distribution.distributionId,
      description: `${stage} CloudFront Distribution ID`,
    });

    new cdk.CfnOutput(this, `${stage}BucketName`, {
      value: websiteBucket.bucketName,
      description: `${stage} S3 Bucket Name`,
    });
  }
}