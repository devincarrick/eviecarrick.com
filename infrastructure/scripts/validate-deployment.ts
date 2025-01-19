console.log('Starting validation script...');

try {
  const { deployDevEnvironment } = await import("../lib/deploy-validate.js");
  
  interface ValidationResult {
    bucketName: string;
    distributionId: string;
    region: string;
  }

  async function validateDeployment(): Promise<ValidationResult> {
    console.log('Entering validateDeployment function...');
    
    const region = process.env.AWS_REGION;
    if (!region) {
      throw new Error('AWS_REGION environment variable is not set');
    }

    console.log(`AWS Region: ${region}`);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    try {
      console.log('Attempting to deploy dev environment...');
      const result = await deployDevEnvironment();
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
      console.error('Deploy error:', error);
      throw error;
    }
  }

  // Execute validation
  console.log('Starting validation...');
  validateDeployment()
    .then(result => {
      console.log('Validation successful:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });

} catch (error) {
  console.error('Script initialization error:', error);
  process.exit(1);
}