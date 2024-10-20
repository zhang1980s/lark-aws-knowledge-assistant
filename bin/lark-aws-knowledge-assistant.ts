#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LarkAwsKnowledgeAssistantStack } from '../lib/lark-aws-knowledge-assistant-stack';

const app = new cdk.App();
const stackname = app.node.tryGetContext('stackName')
new LarkAwsKnowledgeAssistantStack(app, 'LarkAwsKnowledgeAssistantStack', {
  stackName: stackname,
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION
  }
});

