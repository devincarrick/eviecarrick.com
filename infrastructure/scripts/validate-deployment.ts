import { deployDevEnvironment } from "../lib/deploy-validate.js";

async function main() {
  try {
    console.log("Starting deployment validation...");
    console.log("AWS Region:", process.env.AWS_REGION);
    console.log("Node Environment:", process.env.NODE_ENV);

    const result = await deployDevEnvironment();
    console.log("Validation successful:", {
      bucketName: result.bucketName,
      distributionId: result.distributionId,
    });
    console.log("Deployment validation completed successfully");
  } catch (error) {
    console.error(
      "Validation failed:",
      error instanceof Error ? error.message : String(error)
    );
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

// Call the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
