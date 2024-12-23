# Operations Runbook

## Environment Management

### Deployment
1. Deploy to dev environment:
```bash
npx ts-node lib/deploy-dev.ts
```

2. Deploy to specific environment:
```bash
npx ts-node lib/deploy-dev.ts [stage]
```
Valid stages: dev, staging, prod

### CloudFront Operations

#### Clear Cache
To invalidate CloudFront cache:
```bash
aws cloudfront create-invalidation --distribution-id [DISTRIBUTION_ID] --paths "/*"
```

#### Verify Security Headers
```bash
curl -I https://[CLOUDFRONT_DOMAIN]
```

Expected headers:
- x-xss-protection
- x-frame-options
- referrer-policy
- content-security-policy
- x-content-type-options
- strict-transport-security
- permissions-policy

### Content Management

#### Upload Content to S3
```bash
aws s3 cp [LOCAL_FILE] s3://[BUCKET_NAME]/[PATH] --content-type [CONTENT_TYPE]
```

Example:
```bash
aws s3 cp index.html s3://portfolio-dev-296823332599/index.html --content-type "text/html"
```

### Monitoring

#### Cost Alarms
- Dev/Staging threshold: $5
- Prod threshold: $20
- CloudFront requests monitoring enabled in prod

#### View CloudWatch Alarms
```bash
aws cloudwatch describe-alarms
```

### Troubleshooting

#### Distribution Not Serving Content
1. Check S3 bucket permissions
2. Verify CloudFront OAC configuration
3. Check object exists in S3
4. Clear CloudFront cache

#### Security Headers Missing
1. Verify response headers policy in CloudFront console
2. Check distribution behavior settings
3. Clear CloudFront cache
4. Redeploy if needed

### Infrastructure Updates
1. Make changes to infrastructure-stack.ts
2. Deploy using deployment command
3. Verify changes in AWS Console
4. Test functionality
5. Clear cache if needed

### Rollback Procedure
In case of deployment issues:
1. Stack will automatically attempt rollback
2. Check CloudFormation console for rollback status
3. If needed, deploy previous known working version

## Resource Information

### Dev Environment
- CloudFront Domain: dz1msirpyjkj8.cloudfront.net
- S3 Bucket: portfolio-dev-296823332599
- Distribution ID: E2JPV9LHZF6OGL

### Important Notes
- All changes should be made through Infrastructure as Code
- Manual changes in console may be overwritten by deployments
- Always verify security headers after deployment
- Keep costs optimized by using dev environment features