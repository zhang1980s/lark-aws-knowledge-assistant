import { Construct } from 'constructs';

import * as sqs from 'aws-cdk-lib/aws-sqs';


export class SQSQueues {
  public readonly qContentQ: sqs.Queue;

  constructor(scope: Construct) {
    this.qContentQ = new sqs.Queue(scope, 'qContentQ', {
      fifo: true,
      contentBasedDeduplication: true
    });
  }
}