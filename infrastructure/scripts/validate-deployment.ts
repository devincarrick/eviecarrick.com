// infrastructure/scripts/validate-deployment.ts
import { deployDevEnvironment } from "../lib/deploy-validate.js";

async function validateDeployment() {
  try {
    await deployDevEnvironment();
    console.log("Deployment validation successful");
    process.exit(0);
  } catch (error) {
    console.error("Deployment validation failed:", error);
    process.exit(1);
  }
}

validateDeployment();
