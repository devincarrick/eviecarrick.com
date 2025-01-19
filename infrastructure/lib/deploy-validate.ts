import {
  CloudFormationClient,
  DescribeStacksCommand,
  Output,
} from "@aws-sdk/client-cloudformation";

interface ValidationResult {
  bucketName: string;
  distributionId: string;
}

export async function deployDevEnvironment(): Promise<ValidationResult> {
  const client = new CloudFormationClient({ region: process.env.AWS_REGION });
  const stackName = process.env.STACK_NAME || "PortfolioInfraStack";

  try {
    const { Stacks } = await client.send(
      new DescribeStacksCommand({ StackName: stackName })
    );

    if (!Stacks || Stacks.length === 0) {
      throw new Error(`Stack ${stackName} not found`);
    }

    const outputs = Stacks[0].Outputs;
    if (!outputs) {
      throw new Error("No outputs found in stack");
    }

    const bucketName = getOutputValue(outputs, "WebsiteBucketName");
    const distributionId = getOutputValue(outputs, "DistributionId");

    return {
      bucketName,
      distributionId,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to validate deployment: ${error.message}`);
    }
    throw new Error("Failed to validate deployment: Unknown error");
  }
}

function getOutputValue(outputs: Output[], key: string): string {
  const output = outputs.find((o) => o.OutputKey === key);
  if (!output?.OutputValue) {
    throw new Error(`Required output '${key}' not found in stack outputs`);
  }
  return output.OutputValue;
}
