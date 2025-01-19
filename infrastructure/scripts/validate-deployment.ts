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
  console.log('Attempting to deploy dev environment...');

  try {
    const result = await deployDevEnvironment().catch(err => {
      const errorDetails = err instanceof Error ? err : JSON.stringify(err, null, 2);
      console.error('Deploy error details:', errorDetails);
      throw err;
    });
    
    console.log('Deploy result:', JSON.stringify(result, null, 2));
    
    if (!result?.bucketName || !result?.distributionId) {
      throw new Error('Deployment validation failed: Missing required deployment outputs');
    }

    return {
      bucketName: result.bucketName,
      distributionId: result.distributionId,
      region
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : JSON.stringify(error, null, 2);
      
    console.error('Deployment validation error:', errorMessage);
    throw error;
  }
}

// IIFE to handle top-level await and ensure proper error handling
(async () => {
  try {
    const validationResult = await validateDeployment();
    console.log('Deployment validation successful:', {
      ...validationResult,
      timestamp: new Date().toISOString()
    });
    process.exit(0);
  } catch (error) {
    console.error('Validation failed:', error instanceof Error ? error.message : JSON.stringify(error, null, 2));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
})();