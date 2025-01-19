import {
  CloudFormation,
  CloudFormationServiceException,
} from "@aws-sdk/client-cloudformation";
import { STS, STSServiceException } from "@aws-sdk/client-sts";

const config = {
  region: "us-east-1",
  maxAttempts: 3,
  retryMode: "standard",
};

const cloudformation = new CloudFormation(config);

async function checkAwsCredentials(): Promise<void> {
  try {
    const response = await new STS(config).getCallerIdentity({});
    if (!response.Account) {
      throw new Error("AWS credentials not found");
    }
    console.log("✓ AWS credentials verified");
  } catch (error) {
    if (error instanceof STSServiceException) {
      throw new Error(`AWS credentials check failed: ${error.message}`);
    }
    throw new Error(`AWS credentials check failed: ${String(error)}`);
  }
}

async function deployDevEnvironment(stage: string = "dev") {
  try {
    console.log("Starting deployment validation for stage:", stage);

    try {
      await checkAwsCredentials();
    } catch (error) {
      throw new Error(
        `AWS credentials validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      console.log("Checking CloudFormation stack...");
      const response = await cloudformation.describeStacks({
        StackName: "PortfolioInfraStack",
      });

      const Stacks = response?.Stacks || [];

      if (!Stacks || Stacks.length === 0) {
        throw new Error("Stack not found");
      }

      const stack = Stacks[0];
      console.log(
        "Found stack outputs:",
        JSON.stringify(stack.Outputs, null, 2)
      );

      const bucketName = stack.Outputs?.find(
        (output) => output.OutputKey === "devBucketName"
      )?.OutputValue;
      const distributionId = stack.Outputs?.find(
        (output) => output.OutputKey === "devDistributionId"
      )?.OutputValue;

      if (!bucketName || !distributionId) {
        throw new Error(
          `Required stack outputs not found. Found outputs: ${JSON.stringify(
            stack.Outputs
          )}`
        );
      }

      console.log("Stack validation successful");
      return { bucketName, distributionId };
    } catch (error) {
      if (error instanceof CloudFormationServiceException) {
        throw new Error(`CloudFormation service error: ${error.message}`);
      }
      throw error;
    }
  } catch (error) {
    console.error(
      "Deployment validation failed:",
      error instanceof Error ? error.message : String(error)
    );
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    throw error;
  }
}

export { deployDevEnvironment };
