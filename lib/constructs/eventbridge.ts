import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class EventBridgeRules {
  constructor(scope: Construct, msgEventAlias: lambda.Alias, refreshInterval: cdk.CfnParameter) {
    // Create a new EventBus
    const larkbotCaseEventBus = new events.EventBus(scope, 'larkbot-case-event-bus', {
    });

    // Create a new rule for the EventBus
    const larkbotCaseEventRule = new events.Rule(scope, 'larkbot-case-event-rule', {
      eventBus: larkbotCaseEventBus,
      eventPattern: {
        source: ['custom.source']
},
      description: 'Rule to trigger Lambda on case event',
    });

    // Add target to the rule
    larkbotCaseEventRule.addTarget(new targets.LambdaFunction(msgEventAlias, {
      event: events.RuleTargetInput.fromObject({
        schema: "2.0",
        event: {
          message: {
            message_type: "fresh_comment"
          }
        }
      })
    }));

    // Create a resource-based policy for the EventBus
    // const eventBusPolicy = new events.CfnEventBusPolicy(scope, 'EventBusPolicy', {
    //   eventBusName: larkbotCaseEventBus.eventBusName,
    //   statementId: 'AllowExternalAccounts',
    //   action: 'events:PutEvents',
    //   principal: '*',
    //   statement: JSON.stringify({
    //     Version: "2012-10-17",
    //     Statement: [
    //       {
    //         Effect: "Allow",
    //         Principal: "*",
    //         Action: "events:PutEvents",
    //         Resource: larkbotCaseEventBus.eventBusArn,
    //         Condition: {
    //           ArnEquals: {
    //             "aws:SourceArn": [
    //               `arn:aws:events:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:event-bus/${larkbotCaseEventBus.eventBusName}`
    //             ]
    //           },
    //           StringEqualsIfExists: {
    //             "aws:PrincipalAccount": ["123", "456"]
    //           }
    //         }
    //       }
    //     ]
    //   })
    // });

    // Existing refresh case rule
    const refreshEventRule = new events.Rule(scope, 'refreshCaseRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(refreshInterval.valueAsNumber)),
      description: `Refresh case update every ${refreshInterval.valueAsString} minutes`,
      enabled: false // Adjust this based on your requirements
    });

    refreshEventRule.addTarget(new targets.LambdaFunction(msgEventAlias, {
      event: events.RuleTargetInput.fromObject({
        schema: "2.0",
        event: {
          message: {
            message_type: "fresh_comment"
          }
        }
      })
    }));
  }
}