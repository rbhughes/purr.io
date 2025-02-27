import json
import boto3
import os
import base64
from decimal import Decimal
from datetime import datetime
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
        resource_type = resource_path[-1].lower().rstrip("s")

        valid_resources = {"repo", "raster", "vector", "search"}
        if resource_type not in valid_resources:
            return create_response(event, 400, {"error": "Invalid resource type"})

        if http_method == "POST":
            try:
                body = json.loads(event["body"])
            except json.JSONDecodeError:
                return create_response(event, 400, {"error": "Invalid JSON format"})

            # simple body
            # {'resource': 'rasters', 'uwis': ['05009060720000'], 'curves': []}

            if resource_type == "search":
                # pagination parameters
                MAX = 500
                max_results = min(int(body.get("maxResults", 100)), MAX)
                pagination_token = (
                    json.loads(
                        base64.b64decode(body.get("paginationToken", "")).decode()
                    )
                    if body.get("paginationToken")
                    else None
                )

                # PAGINATION FIX: Maintain original prefix list across requests
                if pagination_token:
                    prefixes = pagination_token.get("prefixes", [])
                    current_prefix_idx = pagination_token.get("prefix_idx", 0)
                    last_evaluated_key = pagination_token.get("last_evaluated_key")
                else:
                    prefixes = body.get("uwis", [])
                    current_prefix_idx = 0
                    last_evaluated_key = None

                accumulated = []
                remaining = max_results

                while remaining > 0 and current_prefix_idx < len(prefixes):
                    prefix = prefixes[current_prefix_idx]
                    query_args = {
                        "IndexName": "pk-uwi-index",
                        "KeyConditionExpression": Key("pk").eq("RASTER")
                        & Key("uwi").begins_with(prefix),
                        "Limit": min(remaining, 100),
                    }

                    if last_evaluated_key:
                        query_args["ExclusiveStartKey"] = last_evaluated_key

                    response = table.query(**query_args)
                    batch_items = response.get("Items", [])
                    accumulated.extend(batch_items)
                    remaining -= len(batch_items)
                    last_evaluated_key = response.get("LastEvaluatedKey")

                    if last_evaluated_key:
                        break  # preserve state if more items exist
                    else:
                        current_prefix_idx += 1  # Move to next prefix
                        last_evaluated_key = None

                # Build next token with original prefixes
                new_token = None
                if (last_evaluated_key and remaining > 0) or current_prefix_idx < len(
                    prefixes
                ):
                    new_token = {
                        "prefixes": prefixes,
                        "prefix_idx": current_prefix_idx,
                        "last_evaluated_key": last_evaluated_key,
                    }

                metadata = {
                    "returnedCount": len(accumulated),
                    "totalRequested": max_results,
                    "paginationToken": base64.b64encode(
                        json.dumps(new_token).encode()
                    ).decode()
                    if new_token
                    else None,
                    "generatedAt": datetime.now().isoformat(),
                }
                print("______metadata_____")
                print(metadata)
                print("___________________")

                return create_response(
                    event, 200, {"data": accumulated, "metadata": metadata}
                )

        elif http_method == "GET":
            # Existing GET handling remains unchanged
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
            return create_response(event, 200, response["Items"])

        return create_response(event, 405, {"error": "Method not allowed"})

    except Exception as e:
        return create_response(event, 500, {"error": str(e)})
