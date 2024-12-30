// test/setup.ts
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';

// Global test utilities
export const createTestStack = () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');
  return stack;
};

// Helper to capture CloudFormation template
export const getTemplateFromStack = (stack: cdk.Stack): Template => {
  return Template.fromStack(stack);
};

// Common matchers
export const hasResourceWithProperties = (
  template: Template,
  type: string,
  props: Record<string, any>
) => {
  template.hasResourceProperties(type, props);
};

// Mock context values
process.env.NODE_ENV = 'test';