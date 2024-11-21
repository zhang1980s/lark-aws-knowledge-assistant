import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';

export class LambdaFunctions {
  public readonly msgEventAlias: lambda.Alias;

  constructor(
    scope: Construct,
    dynamoDBTables: { auditTable: dynamodb.Table; botCasesTable: dynamodb.Table; botConfigTable: dynamodb.Table },
    sqsQueues: { qContentQ: sqs.Queue },
    secrets: { AppIDSecret: secretsmanager.Secret; AppSecretSecret: secretsmanager.Secret },
    params: { configKey: cdk.CfnParameter; caseLanguage: cdk.CfnParameter; logLevel: cdk.CfnParameter; userWhitelist: cdk.CfnParameter; supportRegion: cdk.CfnParameter; botEndpoint: cdk.CfnParameter }
  ) {
    // Define msgEvent handler
    const msgEventFunction = new lambda.Function(scope, 'larkbot-msg-event', {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      architecture: lambda.Architecture.ARM_64,
      handler: 'bootstrap',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/msg-event'), {
        bundling: {
          image: lambda.Runtime.PROVIDED_AL2023.bundlingImage,
          command: [
            'bash',
            '-c',
            'export GOARCH=arm64 GOOS=linux && ' +
            'export GOPATH=/tmp/go && ' +
            'mkdir -p /tmp/go && ' +
            'go build -tags lambda.norpc -o bootstrap && ' +
            'cp bootstrap /asset-output/'
          ],
          user: 'root',
        },
      }),
      timeout: cdk.Duration.minutes(1),
      environment: {
        AUDIT_TABLE: dynamoDBTables.auditTable.tableName,
        CASES_TABLE: dynamoDBTables.botCasesTable.tableName,
        CFG_TABLE: dynamoDBTables.botConfigTable.tableName,
        CFG_KEY: params.configKey.valueAsString,
        CASE_LANGUAGE: params.caseLanguage.valueAsString,
        LOG_LEVEL: params.logLevel.valueAsString,
        ENABLE_USER_WHITELIST: params.userWhitelist.valueAsString,
        SUPPORT_REGION: params.supportRegion.valueAsString,
        SQS_URL: sqsQueues.qContentQ.queueUrl,
        BOT_ENDPOINT: params.botEndpoint.valueAsString
      }
    });

    const msgEventVersion = msgEventFunction.currentVersion;

    this.msgEventAlias = new lambda.Alias(scope, 'msg-event-prod', {
      aliasName: 'Prod',
      version: msgEventVersion,
    });

    // Grant the RO access of AppID and AppSecret to msgEvent function
    secrets.AppIDSecret.grantRead(this.msgEventAlias);
    secrets.AppSecretSecret.grantRead(this.msgEventAlias);

    // Attach the policy document that allow to assume the support role in others accounts to the lambda function's role
    this.msgEventAlias.addToRolePolicy(new iam.PolicyStatement({
      sid: 'AllowToAssumeToRoleWithSupportAPIAccess',
      effect: iam.Effect.ALLOW,
      actions: ['sts:AssumeRole'],
      resources: ['arn:aws:iam::*:role/FeishuSupportCaseApiAll*']
    }));

    // Grant RW access of ddb tables to msgEvent function 
    dynamoDBTables.auditTable.grantReadWriteData(this.msgEventAlias);
    dynamoDBTables.botCasesTable.grantReadWriteData(this.msgEventAlias);
    dynamoDBTables.botConfigTable.grantReadWriteData(this.msgEventAlias);

    // Grant send SQS message permission to msgEvent function
    sqsQueues.qContentQ.grantSendMessages(this.msgEventAlias);



    // Define qEvent handler
    const qEventFunction = new lambda.Function(scope, 'q-event', {
      runtime: lambda.Runtime.PYTHON_3_11,
      architecture: lambda.Architecture.ARM_64,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('lambda/q-event'),
      timeout: cdk.Duration.seconds(20),
      environment: {
        CFG_TABLE: dynamoDBTables.botConfigTable.tableName,
        CFG_KEY: params.configKey.valueAsString,
        BOT_ENDPOINT: params.botEndpoint.valueAsString
      }
    });

    const qEventVersion = qEventFunction.currentVersion;

    const qEventAlias = new lambda.Alias(scope, 'q-event-prod', {
      aliasName: 'Prod',
      version: qEventVersion,
    });

    // Adding qContentQ as event source
    qEventAlias.addEventSource(new lambdaEventSources.SqsEventSource(sqsQueues.qContentQ));

    // Grant consume message permission to qEvent Function
    sqsQueues.qContentQ.grantConsumeMessages(qEventAlias);

    // Grant RO access of config table to qEvent function 
    dynamoDBTables.botConfigTable.grantReadData(qEventAlias);

    // Grant RO access of AppID and AppSecret to qEventFunction
    secrets.AppIDSecret.grantRead(qEventAlias);
    secrets.AppSecretSecret.grantRead(qEventAlias);

    // Create an IAM policy for full AWS Translate access
    const translateAccessPolicy = new iam.PolicyStatement({
      actions: [
        'translate:*',
        'comprehend:DetectDominantLanguage',
      ],
      resources: ['*'],
    });

    // Attach the translate policy to the qEvent Function
    qEventAlias.role?.attachInlinePolicy(
      new iam.Policy(scope, 'TranslateAccessPolicy', {
        statements: [translateAccessPolicy]
      })
    );

    // Create an IAM policy for full AmazonQ access
    const amazonQAccessPolicy = new iam.PolicyStatement({
      actions: ['q:*'],
      resources: ['*'],
    });

    // Attach the amazonQ policy to the qEvent Function
    qEventAlias.role?.attachInlinePolicy(
      new iam.Policy(scope, 'AmazonQAccessPolicy', {
        statements: [amazonQAccessPolicy]
      })
    );

    // Create an IAM policy for Bedrock access
    const amazonBedrockPolicy = new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    });

    // Attach the Bedrock policy to the qEvent Function
    qEventAlias.role?.attachInlinePolicy(
      new iam.Policy(scope, 'AmazonBedrockPolicy', {
        statements: [amazonBedrockPolicy]
      })
    );
  }
}