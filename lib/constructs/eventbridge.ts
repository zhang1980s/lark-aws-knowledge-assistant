import { Construct } from 'constructs';

import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';


export class EventBridgeRules {
  constructor(scope: Construct, msgEventAlias: lambda.Alias, refreshInterval: cdk.CfnParameter) {
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