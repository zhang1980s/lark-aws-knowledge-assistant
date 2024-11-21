import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CfnParameters {
  public readonly appID: cdk.CfnParameter;
  public readonly appSecret: cdk.CfnParameter;
  public readonly caseLanguage: cdk.CfnParameter;
  public readonly configKey: cdk.CfnParameter;
  public readonly userWhitelist: cdk.CfnParameter;
  public readonly supportRegion: cdk.CfnParameter;
  public readonly logLevel: cdk.CfnParameter;
  public readonly refreshInterval: cdk.CfnParameter;
  public readonly botEndpoint: cdk.CfnParameter;

  constructor(scope: Construct) {
    this.appID = new cdk.CfnParameter(scope, 'AppID', {
      type: 'String',
      description: 'The AppID of larkbot app',
      noEcho: true,
      default: 'cli_xxxxxxxxxxxxxxxx',
    });

    this.appSecret = new cdk.CfnParameter(scope, 'AppSecret', {
      type: 'String',
      description: 'The Secret ID of larkbot app',
      noEcho: true,
      default: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    });

    this.caseLanguage = new cdk.CfnParameter(scope, 'CaseLanguage', {
      type: 'String',
      description: 'Case Language queue. Should be in "zh", "ja", "ko", "en"',
      noEcho: false,
      allowedValues: ["zh", "ja", "ko", "en"],
      default: 'zh'
    });

    this.configKey = new cdk.CfnParameter(scope, 'ConfigKey', {
      type: 'String',
      description: 'The default config profile',
      noEcho: false,
      default: 'LarkBotProfile-0'
    });

    this.userWhitelist = new cdk.CfnParameter(scope, 'UserWhitelist', {
      type: 'String',
      description: 'Enable user white list function',
      noEcho: false,
      allowedValues: ["true", "false"],
      default: 'false'
    });

    this.supportRegion = new cdk.CfnParameter(scope, 'SupportRegion', {
      type: 'String',
      description: 'The default support region',
      noEcho: false,
      allowedValues: ['en', 'cn'],
      default: 'en'
    });

    this.logLevel = new cdk.CfnParameter(scope, 'LogLevel', {
      type: 'String',
      description: 'The default log level',
      noEcho: false,
      allowedValues: ['DEBUG', 'INFO'],
      default: 'DEBUG'
    });

    this.refreshInterval = new cdk.CfnParameter(scope, 'RefreshInterval', {
      type: 'Number',
      description: 'Case refresh interval (in minutes)',
      noEcho: false,
      default: 10
    });

    this.botEndpoint = new cdk.CfnParameter(scope, 'LarkEndpoint', {
      type: 'String',
      description: 'Lark endpoint',
      noEcho: false,
      allowedValues: ['lark', 'feishu'],
      default: 'lark'
    });
  }
}