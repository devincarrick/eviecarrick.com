# Dev Environment Configuration Documentation

## Overview

This document outlines the configuration and setup of the development environment for the portfolio website infrastructure.

## Infrastructure Components

### S3 Configuration

- **Bucket Name**: `portfolio-dev-296823332599`
- **Access**: Private bucket with CloudFront access only
- **Security Features**:
  - Block all public access enabled
  - SSE-S3 encryption for all objects
  - CORS configured for GET and HEAD requests
  - SSL/TLS enforcement for all requests
- **Cost Optimization**:
  - No lifecycle rules (using Git for version control)
  - Minimal storage costs for static website content

### CloudFront Configuration

- **Access Control**: Origin Access Control (OAC) implemented
- **Security**:
  - HTTPS only (redirect HTTP to HTTPS)
  - TLS 1.2 minimum protocol version
  - CORS headers properly configured
- **Performance**:
  - Compression enabled
  - Caching optimized for static content
- **Cost Optimization**:
  - PRICE_CLASS_100 (North America and Europe only)
  - Basic monitoring in dev environment

### Monitoring & Alerts

- **Cost Alarms**:
  - Basic monthly cost alarm (threshold: $5)
  - CloudFront requests monitoring (when detailed monitoring enabled)
- **Validation**:
  - S3 bucket configuration validation
  - CloudFront distribution validation
  - CloudWatch setup validation

## Deployment Process

### Environment Validation

- Valid stages: `dev`, `staging`, `prod`
- Stage validation implemented in deployment scripts
- Default stage: `dev`

### Deployment Command

```bash
npx ts-node lib/deploy-dev.ts [stage]
```

### Deployment Validation Steps

1. Validates AWS credentials
2. Confirms stack deployment
3. Verifies S3 bucket configuration
4. Checks CloudFront distribution setup
5. Validates monitoring configuration

## Security Measures

- Private S3 bucket with no public access
- CloudFront OAC for secure S3 access
- SSL/TLS enforcement
- All bucket objects encrypted
- No public endpoints except CloudFront distribution

### Security Headers

CloudFront is configured with a custom response headers policy that includes:

- Content Security Policy (CSP): Restricts resource loading
  - default-src 'self'
  - img-src 'self' data: https:
  - script-src 'self' 'unsafe-inline' 'unsafe-eval'
  - style-src 'self' 'unsafe-inline'
  - font-src 'self' data: https:
- Strict Transport Security (HSTS): Forces HTTPS with 2-year duration
- Content Type Options: Prevents MIME type sniffing
- Frame Options: Prevents clickjacking (DENY)
- XSS Protection: Additional cross-site scripting protection
- Referrer Policy: Strict origin for cross-origin requests
- Permissions Policy: Restricts browser features (camera, microphone, geolocation)

## Cost Optimization Features

- Limited geographic distribution (PRICE_CLASS_100)
- Basic monitoring only
- No lifecycle rules or versioning
- Cost alarms for early warning
- Environment-specific configurations

## Known Limitations

- Domain configuration pending (using CloudFront domain for now)
- Basic monitoring only in dev environment
- Security headers to be implemented in future update

## Next Steps

1. Implement security headers
2. Set up CI/CD pipeline
3. Configure automated testing
4. Implement remaining Phase 2 tasks

## Resource URLs

- CloudFront Distribution: `d3ezhefaj69srx.cloudfront.net`
- S3 Bucket: `portfolio-dev-296823332599`

## DNS Configuration
- Hosted Zone ID: Z029633570U83WANWX5K
- Nameservers:
```bash
ns-1635.awsdns-12.co.uk
ns-1483.awsdns-57.org
ns-696.awsdns-23.net
ns-11.awsdns-01.com
```

Domain Transfer ID:
- OperationId": "859b5176-d902-4996-b11e-801299a97be2"

Command to check domain transfer status
- aws route53domains get-operation-detail --operation-id 859b5176-d902-4996-b11e-801299a97be2