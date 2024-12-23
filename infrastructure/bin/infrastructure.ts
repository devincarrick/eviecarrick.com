#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PortfolioInfraStack } from '../lib/infrastructure-stack';

const app = new cdk.App();
new PortfolioInfraStack(app, 'PortfolioInfraStack', {
  env: {
    account: '296823332599',
    region: 'us-east-1'
  },
});