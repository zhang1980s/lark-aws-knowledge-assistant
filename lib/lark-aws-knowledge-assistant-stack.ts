import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnParameters } from './constructs/parameters';
import { Secrets } from './constructs/secrets';
import { DynamoDBTables } from './constructs/dynamodb-tables';
import { SQSQueues } from './constructs/sqs-queues';
import { LambdaFunctions } from './constructs/lambda-functions';
import { ApiGateway } from './constructs/apigateway';
import { EventBridgeRules } from './constructs/eventbridge';

export class LarkAwsKnowledgeAssistantStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const parameters = new CfnParameters(this);
    const secrets = new Secrets(this, parameters);
    const dynamoDBTables = new DynamoDBTables(this);
    const sqsQueues = new SQSQueues(this);
    const lambdaFunctions = new LambdaFunctions(this, dynamoDBTables, sqsQueues, secrets, parameters);
    new ApiGateway(this, lambdaFunctions.msgEventAlias);
    new EventBridgeRules(this, lambdaFunctions.msgEventAlias, parameters.refreshInterval);
  }
}