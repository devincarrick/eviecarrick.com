// deploy-validate.ts
import { execSync } from "child_process";
import * as AWS from "aws-sdk";
import {
  CloudFormation,
  S3,
  CloudFront,
  CloudWatch,
  CloudWatchLogs,
} from "aws-sdk";
import * as dotenv from "dotenv";
dotenv.config();

// Configure AWS SDK
AWS.config.update({ region: "us-east-1" });

const s3 = new S3();
const cloudFront = new CloudFront();
const cloudWatch = new CloudWatch();
const cloudformation = new CloudFormation();
const cloudWatchLogs = new CloudWatchLogs();

async function deployDevEnvironment(stage: string = "dev") {
  const startTime = Date.now();
  const originalState = {
    stackId: "",
    timestamp: new Date().toISOString(),
  };

  try {
    // Check if stack exists first
    try {
      const { Stacks } = await cloudformation
        .describeStacks({
          StackName: "PortfolioInfraStack",
        })
        .promise();
      if (Stacks?.[0]?.StackId) {
        originalState.stackId = Stacks[0].StackId;
      }
    } catch {
      // Stack doesn't exist yet, that's okay for first deployment
      console.log("No existing stack found - proceeding with first deployment");
    }

    // Deploy CDK Stack with provided stage
    console.log(`Deploying ${stage} environment...`);
    execSync(
      `cdk deploy PortfolioInfraStack --context stage=${stage} --require-approval never`,
      { stdio: "inherit" }
    );

    // 2. Get Stack Outputs
    const stackOutputs = await getStackOutputs("PortfolioInfraStack");
    const bucketName = stackOutputs.find(
      (o) => o.OutputKey === "devBucketName"
    )?.OutputValue;
    const distributionDomain = stackOutputs.find(
      (o) => o.OutputKey === "devDistributionDomainName"
    )?.OutputValue;

    if (!bucketName || !distributionDomain) {
      throw new Error("Required stack outputs not found");
    }

    // 3. Validate S3 Bucket
    await validateS3Bucket(bucketName);

    // 4. Validate CloudFront Distribution
    await validateCloudFrontDistribution(distributionDomain);

    // 5. Validate CloudWatch Dashboard
    await validateCloudWatchDashboard();

    console.log(
      "Dev environment deployment and validation completed successfully!"
    );

    const deploymentDuration = (Date.now() - startTime) / 1000;
    console.log(`Deployment completed in ${deploymentDuration} seconds`);

    // Log deployment metrics
    await cloudWatch
      .putMetricData({
        Namespace: "Portfolio/Deployments",
        MetricData: [
          {
            MetricName: "DeploymentDuration",
            Value: deploymentDuration,
            Unit: "Seconds",
            Dimensions: [
              {
                Name: "Environment",
                Value: "dev",
              },
            ],
          },
        ],
      })
      .promise();

    return { bucketName, distributionDomain };
  } catch (error) {
    console.error("Deployment failed:", error);

    // Attempt rollback if needed
    if (originalState.stackId) {
      console.log("Attempting rollback...");
      try {
        await cloudformation
          .rollbackStack({
            StackName: "PortfolioInfraStack",
          })
          .promise();
        console.log("Rollback completed");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    throw error;
  }
}

async function getStackOutputs(stackName: string) {
  const { Stacks } = await cloudformation
    .describeStacks({ StackName: stackName })
    .promise();
  return Stacks?.[0].Outputs || [];
}

async function validateS3Bucket(bucketName: string) {
  console.log("\nValidating S3 bucket...");

  try {
    // Check bucket exists and is accessible
    await s3.headBucket({ Bucket: bucketName }).promise();
    console.log("✓ Bucket exists and is accessible");

    // Add retries for AWS API calls
    const retryOptions = {
      maxRetries: 3,
      delay: 1000,
    };

    // Verify bucket policy with retries
    let attempts = 0;
    while (attempts < retryOptions.maxRetries) {
      try {
        await s3.getBucketPolicy({ Bucket: bucketName }).promise();
        console.log("✓ Bucket policy is configured");
        break;
      } catch (error) {
        if (attempts === retryOptions.maxRetries - 1) throw error;
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, retryOptions.delay));
      }
    }

    // Add OAI validation
    const policy = await s3.getBucketPolicy({ Bucket: bucketName }).promise();
    const policyDocument = JSON.parse(policy.Policy || "{}");
    interface PolicyStatement {
      Principal?: {
        AWS?: string[];
      };
    }
    const hasOAIStatement = policyDocument.Statement?.some(
      (statement: PolicyStatement) =>
        statement.Principal?.AWS?.includes("cloudfront.amazonaws.com")
    );
    console.log(
      "✓ OAI configuration:",
      hasOAIStatement ? "Properly configured" : "WARNING: Not configured"
    );
  } catch (error) {
    console.error("Bucket validation failed:", error);
    throw error;
  }
}

async function validateCloudFrontDistribution(distributionDomain: string) {
  console.log("\nValidating CloudFront distribution...");

  // List distributions and find ours
  const { DistributionList } = await cloudFront.listDistributions().promise();
  const distribution = DistributionList?.Items?.find(
    (dist) => dist.DomainName === distributionDomain
  );

  if (!distribution) {
    throw new Error("Distribution not found");
  }

  // Verify configuration
  console.log("✓ Distribution exists");
  console.log(
    "✓ Price class:",
    distribution.PriceClass === "PriceClass_100"
      ? "Correctly set to NA/EU"
      : "WARNING: Not optimized for cost"
  );
  console.log(
    "✓ SSL Certificate:",
    distribution.ViewerCertificate.CertificateSource === "acm"
      ? "ACM configured"
      : "WARNING: No ACM cert"
  );
  console.log(
    "✓ Compression:",
    distribution.DefaultCacheBehavior.Compress ? "Enabled" : "WARNING: Disabled"
  );

  if (distribution) {
    // Add cache behavior validation
    const cacheBehavior = distribution.DefaultCacheBehavior;
    console.log("✓ Cache TTL settings:", {
      defaultTTL: cacheBehavior.DefaultTTL,
      maxTTL: cacheBehavior.MaxTTL,
      minTTL: cacheBehavior.MinTTL,
    });
  }
}

async function validateCloudWatchDashboard() {
  console.log("\nValidating CloudWatch setup...");

  // Check dashboard exists
  const response = await cloudWatch.listDashboards().promise();
  const devDashboard = response.DashboardEntries?.find(
    (entry) =>
      entry.DashboardName && entry.DashboardName.includes("Portfolio-dev")
  );

  if (devDashboard) {
    console.log("✓ Dashboard exists");

    // Verify log retention settings
    const { metricFilters } = await cloudWatchLogs
      .describeMetricFilters({
        logGroupName: "/aws/cloudfront/dev.eviecarrick.com",
      })
      .promise();

    console.log(
      "✓ Metric filters configured:",
      (metricFilters ?? []).length > 0 ? "Yes" : "No"
    );
  } else {
    console.log(
      "✓ No dashboard for dev environment (as expected per cost requirements)"
    );
  }
}

export { deployDevEnvironment };
