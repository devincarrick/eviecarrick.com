// deploy-dev.ts
import { deployDevEnvironment } from "./deploy-validate.js";

async function main() {
  console.log("Starting deployment process...");
  const startTime = Date.now();

  try {
    // Get stage from command line arguments or default to dev
    const stage = process.argv[2] || "dev";
    console.log(`Deploying to ${stage} environment`);

    // Validate stage here before proceeding
    const validStages = ["dev", "staging", "prod"];
    if (!validStages.includes(stage)) {
      throw new Error(
        `Invalid stage: ${stage}. Must be one of: ${validStages.join(", ")}`
      );
    }

    // Check AWS credentials before deployment
    if (!process.env.AWS_PROFILE && !process.env.AWS_ACCESS_KEY_ID) {
      throw new Error(
        "AWS credentials not found. Please configure AWS credentials."
      );
    }

    // Execute deployment
    const result = await deployDevEnvironment(stage);

    // Calculate deployment duration
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n=== Deployment Summary ===");
    console.log(`✅ Deployment successful`);
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log("📦 Deployed Resources:");
    console.log(`   - Bucket: ${result.bucketName}`);
    console.log(`   - Distribution: ${result.distributionDomain}`);
    console.log("=====================\n");

    return result;
  } catch (error) {
    console.error("\n❌ Deployment failed");
    console.error(
      "Error details:",
      error instanceof Error ? error.message : error
    );

    // Log stack trace for debugging
    if (error instanceof Error && error.stack) {
      console.debug("\nStack trace:", error.stack);
    }

    process.exit(1);
  } finally {
    // Cleanup or additional logging if needed
    console.log("Deployment process completed");
  }
}

// Handle unhandled rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

// Execute main function
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { main };
