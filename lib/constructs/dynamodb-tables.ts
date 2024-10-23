import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DynamoDBTables {
  public readonly auditTable: dynamodb.Table;
  public readonly botCasesTable: dynamodb.Table;
  public readonly botConfigTable: dynamodb.Table;

  constructor(scope: Construct) {
    this.auditTable = new dynamodb.Table(scope, 'audit', {
      partitionKey: { name: 'key', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    this.botCasesTable = new dynamodb.Table(scope, 'bot_cases', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    this.botCasesTable.addGlobalSecondaryIndex(
        {
          indexName: 'status-type-index',
          partitionKey: {
            name: 'status',
            type: dynamodb.AttributeType.STRING,
          },
          sortKey: {
            name: 'type',
            type: dynamodb.AttributeType.STRING,
          },
          projectionType: dynamodb.ProjectionType.ALL,
        }
      );
    
    this.botConfigTable = new dynamodb.Table(scope, 'bot_config', {
        partitionKey: {name: 'key', type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
      })
  }
}