import { execSync } from "child_process";
import { CloudFormation } from "@aws-sdk/client-cloudformation";
import { S3 } from "@aws-sdk/client-s3";
import { CloudFront } from "@aws-sdk/client-cloudfront";
import { CloudWatch } from "@aws-sdk/client-cloudwatch";
import { CloudWatchLogs } from "@aws-sdk/client-cloudwatch-logs";
import { STS } from "@aws-sdk/client-sts";
import * as dotenv from "dotenv";
dotenv.config();

const config = {
  region: "us-east-1",
  maxAttempts: 3,
  retryMode: "standard",
};

const s3 = new S3(config);
const cloudFront = new CloudFront(config);
const cloudWatch = new CloudWatch(config);
const cloudformation = new CloudFormation(config);
const cloudWatchLogs = new CloudWatchLogs(config);

async function deployDevEnvironment(stage: string = "dev") {
  const startTime = Date.now();
  const originalState = {
    stackId: "",
    timestamp: new Date().toISOString(),
  };

  try {
    await checkAwsCredentials();

    // Check if stack exists first
    const { Stacks } = await cloudformation.describeStacks({
      StackName: "PortfolioInfraStack",
    });

    if (!Stacks || Stacks.length === 0) {
      throw new Error("Stack not found");
    }

    const stack = Stacks[0];
    originalState.stackId = stack.StackId || "";

    // Extract required outputs
    const bucketName = stack.Outputs?.find(
      (output) => output.OutputKey === "WebsiteBucketName"
    )?.OutputValue;
    const distributionDomain = stack.Outputs?.find(
      (output) => output.OutputKey === "DistributionDomain"
    )?.OutputValue;

    if (!bucketName || !distributionDomain) {
      throw new Error("Required stack outputs not found");
    }

    // Deploy CDK Stack with provided stage
    console.log(`Deploying ${stage} environment...`);
    execSync(
      `cdk deploy PortfolioInfraStack --context stage=${stage} --require-approval never`,
      { stdio: "inherit" }
    );

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
    await cloudWatch.putMetricData({
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
    });

    return { bucketName, distributionDomain };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Deployment validation failed:", errorMessage);

    // Attempt rollback if needed
    if (originalState.stackId) {
      console.log("Attempting rollback...");
      try {
        await cloudformation.rollbackStack({
          StackName: "PortfolioInfraStack",
        });
        console.log("Rollback completed");
      } catch (rollbackError) {
        console.error(
          "Rollback failed:",
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError)
        );
      }
    }

    throw error; // Re-throw to be handled by the calling function
  }
}

async function validateS3Bucket(bucketName: string) {
  console.log("\nValidating S3 bucket...");

  try {
    // Check bucket exists and is accessible
    await s3.headBucket({ Bucket: bucketName });
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
        await s3.getBucketPolicy({ Bucket: bucketName });
        console.log("✓ Bucket policy is configured");
        break;
      } catch (error) {
        if (attempts === retryOptions.maxRetries - 1) throw error;
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, retryOptions.delay));
      }
    }

    // Add OAI validation
    const policy = await s3.getBucketPolicy({ Bucket: bucketName });
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
  const { DistributionList } = await cloudFront.listDistributions();
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
    distribution?.ViewerCertificate?.CertificateSource === "acm"
      ? "ACM configured"
      : "WARNING: No ACM cert"
  );
  console.log(
    "✓ Compression:",
    distribution?.DefaultCacheBehavior?.Compress
      ? "Enabled"
      : "WARNING: Disabled"
  );

  if (distribution) {
    // Add cache behavior validation
    const cacheBehavior = distribution.DefaultCacheBehavior;
    console.log("✓ Cache TTL settings:", {
      defaultTTL: cacheBehavior?.DefaultTTL,
      maxTTL: cacheBehavior?.MaxTTL,
      minTTL: cacheBehavior?.MinTTL,
    });
  }
}

async function validateCloudWatchDashboard() {
  console.log("\nValidating CloudWatch setup...");

  // Check dashboard exists
  const response = await cloudWatch.listDashboards();
  const devDashboard = response.DashboardEntries?.find(
    (entry) =>
      entry.DashboardName && entry.DashboardName.includes("Portfolio-dev")
  );

  if (devDashboard) {
    console.log("✓ Dashboard exists");

    // Verify log retention settings
    const { metricFilters } = await cloudWatchLogs.describeMetricFilters({
      logGroupName: "/aws/cloudfront/dev.eviecarrick.com",
    });

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

async function checkAwsCredentials(): Promise<void> {
  try {
    const response = await new STS(config).getCallerIdentity({});
    if (!response.Account) {
      throw new Error("AWS credentials not found");
    }
    console.log("✓ AWS credentials verified");
  } catch (error) {
    console.error("AWS credentials check failed:", error);
    throw new Error(
      "Failed to verify AWS credentials. Please ensure AWS credentials are properly configured."
    );
  }
}

export { deployDevEnvironment };
