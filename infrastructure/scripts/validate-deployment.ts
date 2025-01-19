import { deployDevEnvironment } from "../lib/deploy-validate.js";

interface ValidationResult {
  bucketName: string;
  distributionId: string;
  region: string;
}

async function validateDeployment(): Promise<ValidationResult> {
  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error('AWS_REGION environment variable is not set');
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`Starting deployment validation in ${nodeEnv} environment...`);
  console.log(`AWS Region: ${region}`);

  try {
    const result = await deployDevEnvironment();
    
    if (!result?.bucketName || !result?.distributionId) {
      throw new Error('Deployment validation failed: Missing required deployment outputs');
    }

    return {
      bucketName: result.bucketName,
      distributionId: result.distributionId,
      region
    };
  } catch (error) {
    // Enhance error message with deployment context
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown deployment validation error';
      
    throw new Error(`Deployment validation failed: ${errorMessage}`);
  }
}

async function main() {
  try {
    const validationResult = await validateDeployment();
    console.log('Deployment validation successful:', {
      ...validationResult,
      timestamp: new Date().toISOString()
    });
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error instanceof Error ? error.message : 'Unknown error occurred');
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Use IIFE to handle top-level await
(async () => {
  try {
    await main();
  } catch (error) {
    console.error('Fatal error in main execution:', error);
    process.exit(1);
  }
})();