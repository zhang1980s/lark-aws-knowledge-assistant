import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { CfnParameters } from './parameters';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';



export class Secrets {
  public readonly AppIDSecret: secretsmanager.Secret;
  public readonly AppSecretSecret: secretsmanager.Secret;

  constructor(scope: Construct, params: CfnParameters) {
    this.AppIDSecret = new secretsmanager.Secret(scope, 'AppIDSecret', {
      description: 'The Secret to store the value of App ID',
      secretStringValue: cdk.SecretValue.cfnParameter(params.appID),
    });

    this.AppSecretSecret = new secretsmanager.Secret(scope, 'AppSecretSecret', {
      description: 'The Secret to store the value of App Secret',
      secretStringValue: cdk.SecretValue.cfnParameter(params.appSecret),
    });
  }
}