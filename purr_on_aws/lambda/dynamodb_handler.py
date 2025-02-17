import json
import boto3
import os
from decimal import Decimal
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])
purr_subdomain = dynamodb.Table(os.environ["PURR_SUBDOMAIN"])
purr_domain = dynamodb.Table(os.environ["PURR_DOMAIN"])


ALLOWED_ORIGINS = {"http://localhost:3000", f"https://{purr_subdomain}.{purr_domain}"}


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)

    @classmethod
    def prepare_for_dynamodb(cls, data):
        if isinstance(data, float):
            return Decimal(str(data)) if not data.is_integer() else int(data)
        if isinstance(data, dict):
            return {k: cls.prepare_for_dynamodb(v) for k, v in data.items()}
        if isinstance(data, (list, tuple)):
            return [cls.prepare_for_dynamodb(item) for item in data]
        return data


def create_response(event, status_code, body, extra_headers=None):
    """Helper function to create standardized responses with CORS headers"""

    request_origin = event["headers"].get("origin", "")

    cors_origin = request_origin if request_origin in ALLOWED_ORIGINS else ""

    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": cors_origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Api-Key,token",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Credentials": "true",
    }

    if extra_headers:
        headers.update(extra_headers)

    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body, cls=DecimalEncoder)
        if not isinstance(body, str)
        else body,
    }


def handler(event, context):
    try:
        http_method = event["httpMethod"]
        resource_path = event["path"].split("/")
        resource_type = resource_path[-1].lower().rstrip("s")  # Normalize to singular

        valid_resources = {"repo", "raster", "vector"}
        if resource_type not in valid_resources:
            return create_response(event, 400, {"error": "Invalid resource type"})

        if http_method == "POST":
            try:
                items = json.loads(event["body"])
            except json.JSONDecodeError:
                return create_response(event, 400, {"error": "Invalid JSON format"})

            if not isinstance(items, list):
                return create_response(
                    event, 400, {"error": "Request body must be an array"}
                )

            with table.batch_writer() as batch:
                for item in items:
                    now = datetime.now(timezone.utc).isoformat()
                    processed_item = DecimalEncoder.prepare_for_dynamodb(
                        {**item, "created_at": now, "updated_at": now}
                    )
                    batch.put_item(Item=processed_item)

            return create_response(
                event,
                201,
                {
                    "message": f"Successfully created {len(items)} {resource_type}(s)",
                    "resource_type": resource_type,
                    "count": len(items),
                },
            )

        elif http_method == "GET":
            if resource_type == "repo":
                response = table.query(KeyConditionExpression=Key("pk").eq("REPO"))
            elif resource_type == "raster":
                response = table.query(KeyConditionExpression=Key("pk").eq("RASTER"))
            else:
                response = table.query(
                    KeyConditionExpression="begins_with(pk, :resource_prefix)",
                    ExpressionAttributeValues={
                        ":resource_prefix": f"{resource_type.upper()}#"
                    },
                )

            return create_response(event, 200, {"data": response["Items"]})

        return create_response(event, 405, {"error": "Method not allowed"})

    except Exception as e:
        return create_response(event, 500, {"error": str(e)})
