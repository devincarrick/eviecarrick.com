import { deployDevEnvironment } from "../lib/deploy-validate.js";

async function validateDeployment() {
  try {
    console.log("Starting deployment validation...");
    const result = await deployDevEnvironment();
    console.log("Deployment validation successful:", result);
    return result;
  } catch (error) {
    console.error(
      "Deployment validation failed:",
      error instanceof Error ? error.message : String(error)
    );
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    throw error; // Re-throw to trigger process.exit(1)
  }
}

// Handle unhandled rejections globally
process.on("unhandledRejection", (error) => {
  console.error(
    "Unhandled rejection:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});

// Execute and handle the promise chain properly
validateDeployment()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
