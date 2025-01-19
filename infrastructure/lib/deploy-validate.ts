import { CloudFormation } from "@aws-sdk/client-cloudformation";
import { STS } from "@aws-sdk/client-sts";

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
    console.error("AWS credentials check failed:", error);
    throw new Error(
      "Failed to verify AWS credentials. Please ensure AWS credentials are properly configured."
    );
  }
}

async function deployDevEnvironment(stage: string = "dev") {
  try {
    console.log("Starting deployment validation for stage:", stage);

    try {
      await checkAwsCredentials();
    } catch (error) {
      console.error("AWS credentials check failed:", error);
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

      // Extract required outputs with correct keys
      const bucketName = stack.Outputs?.find(
        (output) => output.OutputKey === "devBucketName"
      )?.OutputValue;
      const distributionId = stack.Outputs?.find(
        (output) => output.OutputKey === "devDistributionId"
      )?.OutputValue;

      if (!bucketName || !distributionId) {
        console.error("Missing outputs:", {
          bucketName: !!bucketName,
          distributionId: !!distributionId,
        });
        throw new Error("Required stack outputs not found");
      }

      console.log("Stack validation successful");
      return { bucketName, distributionId };
    } catch (error) {
      console.error("Stack validation failed:", error);
      throw new Error(
        `Stack validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
