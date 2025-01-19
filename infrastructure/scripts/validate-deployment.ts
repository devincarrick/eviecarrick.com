import { deployDevEnvironment } from "../lib/deploy-validate.js";

async function validateDeployment() {
  try {
    console.log("Starting deployment validation...");
    const result = await deployDevEnvironment();
    console.log("Deployment validation successful:", result);
    process.exit(0);
  } catch (error) {
    console.error(
      "Deployment validation failed:",
      error instanceof Error ? error.message : error
    );
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

// Handle unhandled rejections globally
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  process.exit(1);
});

validateDeployment();
