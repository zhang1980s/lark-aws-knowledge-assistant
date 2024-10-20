import json
import os
import boto3
from botocore.exceptions import ClientError
import requests
from requests_auth_aws_sigv4 import AWSSigV4
import logging

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


# Initialize AWS clients
aws_auth = AWSSigV4('q', 'us-east-1')
trans_client = boto3.client('translate')
sm_client = boto3.client('secretsmanager')
ddb_client = boto3.client('dynamodb')
bedrock_runtime = boto3.client(service_name='bedrock-runtime')

def get_secret(secret_name):
    """Retrieve a secret from AWS Secrets Manager."""
    try:
        response = sm_client.get_secret_value(SecretId=secret_name)
        return response['SecretString']
    except ClientError as e:
        logger.error(f"Error retrieving secret {secret_name}: {e}")
        raise

def translate_text(text, target_language='en'):
    """Translate text using AWS Translate."""
    try:
        response = trans_client.translate_text(
            Text=text,
            SourceLanguageCode='auto',
            TargetLanguageCode=target_language
        )
        return response['TranslatedText']
    except ClientError as e:
        logger.error(f"Error translating text: {e}")
        raise

def bedrock_translate(content):
    """Translate text using Amazon Bedrock."""
    system_prompt = 'You are a highly skilled translator with expertise in many languages. Your task is to identify the language of the text user provides and directly translate it into English while preserving the meaning, tone, and nuance of the original text. Please maintain proper grammar, spelling, and punctuation in English. Do not try to understand the content, just put the result in <res></res>. Never talk to user starting with "I apologize", just give the translated text.'

    try:
        native_request_payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2000,
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": [{"type": "text", "text": content}],
                }
            ],
            "temperature": 0
        }

        response = bedrock_runtime.invoke_model(
            body=json.dumps(native_request_payload),
            modelId='anthropic.claude-3-haiku-20240307-v1:0'
        )
        response_body = json.loads(response.get('body').read())
        return response_body
    except ClientError as e:
        logger.error(f"Error in Bedrock translation: {e}")
        raise

def send_message_to_feishu(message_id, content):
    """Send a message back to Feishu."""
    try:
        token_url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        app_id = get_secret(os.environ['APP_ID_SECRET_ARN'])
        app_secret = get_secret(os.environ['APP_SECRET_ARN'])

        payload = {
            "app_id": app_id,
            "app_secret": app_secret
        }
        headers = {'Content-type': 'application/json; charset=utf-8'}

        response = requests.post(token_url, json=payload, headers=headers)
        response.raise_for_status()
        tenant_access_token = response.json().get('tenant_access_token')

        reply_url = f"https://open.feishu.cn/open-apis/im/v1/messages/{message_id}/reply"
        headers = {
            'Content-type': 'application/json; charset=utf-8',
            'Authorization': f'Bearer {tenant_access_token}'
        }
        
        payload = {
            "content": json.dumps(content).replace('\n', '\\n'),
            "msg_type": "text",
            "reply_in_thread": True
        }

        response = requests.post(reply_url, json=payload, headers=headers)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        logger.error(f"Error sending message to Feishu: {e}")
        raise

def request_amazon_q(text):
    """Get a response from Amazon Q."""
    try:
        # Start conversation
        start_url = "https://q.us-east-1.amazonaws.com/StartConversation"
        start_payload = {"source": "CONSOLE"}
        start_response = requests.post(start_url, json=start_payload, auth=aws_auth)
        start_response.raise_for_status()
        conversation_data = start_response.json()

        # Send message
        send_url = "https://q.us-east-1.amazonaws.com/SendMessage"
        send_payload = {
            "source": "CONSOLE",
            "conversationId": conversation_data['conversationId'],
            "utterance": text,
            "conversationToken": conversation_data['conversationToken']
        }
        send_response = requests.post(send_url, json=send_payload, auth=aws_auth)
        send_response.raise_for_status()
        
        result = send_response.json()['result']['content']['text']
        
        # Format references
        references = result['references']
        ref_text = '\n'.join(f"{i+1}. [{ref['title']}]: {ref['url']}" for i, ref in enumerate(references))
        
        return result['body'], ref_text
    except requests.RequestException as e:
        logger.error(f"Error in Amazon Q request: {e}")
        raise

def lambda_handler(event, context):
    """Main Lambda function handler."""
    try:
        logger.info(f"Received event: {json.dumps(event)}")

        # Extract message content and ID
        message_content = json.loads(event['Records'][0]['body'])['content']
        message_id = event['Records'][0]['attributes']['MessageGroupId']

        logger.info(f"Processing message: {message_content}")

        # Translate to English if necessary
        english_text = bedrock_translate(f'"{message_content}" -> EN').get('content')[0].get('text')
        if '<res>' not in english_text:
            english_text = english_text.replace('<res>', '').replace('</res>', '')
        else:
            english_text = translate_text(message_content, 'en')

        logger.info(f"Translated text: {english_text}")

        # Get response from Amazon Q
        q_response, references = request_amazon_q(english_text)

        # Translate response back to original language
        translated_response = bedrock_translate(f'"{q_response}" -> CN').get('content')[0].get('text')
        if '<res>' not in translated_response:
            translated_response = translated_response.replace('<res>', '').replace('</res>', '')
        else:
            translated_response = translate_text(q_response, 'zh')

        # Prepare final response
        final_response = f"{translated_response}\n\n{q_response}\n\n{references}"

        logger.info(f"Final response prepared: {final_response}")

        # Send response back to Feishu
        send_message_to_feishu(message_id, {"text": final_response})

        logger.info("Response sent successfully")

        return {"statusCode": 200, "body": json.dumps("Message processed successfully")}

    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        return {"statusCode": 500, "body": json.dumps("Error processing message")}
