import { Construct } from 'constructs';

import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';


export class ApiGateway {
  constructor(scope: Construct, msgEventAlias: lambda.Alias) {
    const msgEventApi = new apigateway.LambdaRestApi(scope, 'msgEventapi', {
      handler: msgEventAlias,
      proxy: false,
      endpointTypes: [apigateway.EndpointType.EDGE]
    });

    const eventMessages = msgEventApi.root.addResource('messages');

    eventMessages.addMethod(
      'POST',
      new apigateway.LambdaIntegration(msgEventAlias, {
        proxy: false,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '',
            }
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseModels: {
              "application/json": apigateway.Model.EMPTY_MODEL
            }
          },
          {
            statusCode: "400",
            responseModels: {
              "application/json": apigateway.Model.ERROR_MODEL
            }
          },
          {
            statusCode: "500",
            responseModels: {
              "application/json": apigateway.Model.ERROR_MODEL
            }
          }
        ]
      }
    );
  }
}