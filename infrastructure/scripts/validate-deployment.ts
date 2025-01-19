import { deployDevEnvironment } from "../lib/deploy-validate.js";

async function validateDeployment() {
  try {
    console.log("Starting deployment validation...");
    console.log("AWS Region:", process.env.AWS_REGION);
    console.log("Node Environment:", process.env.NODE_ENV);

    const result = await deployDevEnvironment();

    if (!result) {
      console.error("Validation failed: No result returned");
      process.exit(1);
    }

    console.log("Validation successful:", {
      bucketName: result.bucketName,
      distributionId: result.distributionId,
    });

    process.exit(0);
  } catch (error: unknown) {
    console.error("Validation failed with error:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "No stack trace",
    });

    // Log additional context
    console.error("Environment context:", {
      nodeEnv: process.env.NODE_ENV,
      awsRegion: process.env.AWS_REGION,
      awsSdkVersion: process.env.AWS_SDK_JS_VERSION,
    });

    process.exit(1);
  }
}

// Ensure we catch any unhandled rejections
process.on("unhandledRejection", (reason: unknown) => {
  console.error(
    "Unhandled rejection:",
    reason instanceof Error ? reason.message : String(reason)
  );
  process.exit(1);
});

// Run the validation
validateDeployment().catch((error) => {
  console.error("Top-level error:", error);
  process.exit(1);
});
