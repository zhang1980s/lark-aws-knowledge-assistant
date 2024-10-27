import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnParameters } from './constructs/parameters';
import { Secrets } from './constructs/secrets';
import { DynamoDBTables } from './constructs/dynamodb-tables';
import { SQSQueues } from './constructs/sqs-queues';
import { LambdaFunctions } from './constructs/lambda-functions';
import { ApiGateway } from './constructs/apigateway';
import { EventBridgeBusAndRules } from './constructs/eventbridge';

export class LarkAwsKnowledgeAssistantStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const parameters = new CfnParameters(this);
    const secrets = new Secrets(this, parameters);
    const dynamoDBTables = new DynamoDBTables(this);
    const sqsQueues = new SQSQueues(this);
    const lambdaFunctions = new LambdaFunctions(this, dynamoDBTables, sqsQueues, secrets, parameters);
    new ApiGateway(this, lambdaFunctions.msgEventAlias);
    const eventBridgeBusAndRules = new EventBridgeBusAndRules(this, lambdaFunctions.msgEventAlias, parameters.refreshInterval);

    // Output the arn of the msgEventRole
    new cdk.CfnOutput(this,'msgEventRoleArn', {
      value: lambdaFunctions.msgEventAlias.role!.roleArn,
      description: 'The arn of msgEventfunction',      
    })

    // Output the arn of the larkbotCaseEventBus
    new cdk.CfnOutput(this,'larkbotCaseEventBusArn',{
      value: eventBridgeBusAndRules.larkbotCaseEventBus.eventBusArn,
      description: 'The arn of larkbotCaseEventBus',
    })

  }
}