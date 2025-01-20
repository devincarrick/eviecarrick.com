#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PortfolioInfraStack } from "../lib/infrastructure-stack.js";

const app = new cdk.App();
const stage = app.node.tryGetContext("stage") || "dev";
const stackName = `PortfolioInfraStack-${stage}`;

new PortfolioInfraStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || "296823332599",
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
  stackName: stackName,
});
