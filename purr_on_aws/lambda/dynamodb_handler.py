import json
import boto3
import os
import base64
from decimal import Decimal
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key, Attr, Or

# Constants
MAX_RESULTS = 500
DEFAULT_RESULTS = 100
ALLOWED_ORIGINS = {
    "http://localhost:3000",
    f"https://{os.environ['PURR_SUBDOMAIN']}.{os.environ['PURR_DOMAIN']}",
}
VALID_RESOURCES = {"repo", "raster", "vector", "search"}

# DynamoDB setup
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])


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


def get_resource_type(event):
    resource_path = event["path"].split("/")
    return resource_path[-1].lower().rstrip("s")


def is_valid_resource(resource_type):
    return resource_type in VALID_RESOURCES


def parse_body(event):
    try:
        return json.loads(event["body"])
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON format")


def handle_search(event, body):
    # We could supply a count, but it might not be accurate and isn't free
    # count_args = build_query_args(uwis[0], wordz, max_results, None)
    # count_args["Select"] = "COUNT"
    # count_response = table.query(**count_args)
    # estimated_total = count_response.get('Count', 0)

    max_results = min(int(body.get("maxResults", DEFAULT_RESULTS)), MAX_RESULTS)
    uwis = body.get("uwis", [])
    wordz = body.get("wordz")
    exclusive_start_key = (
        json.loads(base64.b64decode(body.get("paginationToken", "")).decode())
        if body.get("paginationToken")
        else None
    )

    all_items = []
    last_evaluated_key = None

    for uwi_prefix in uwis:
        while len(all_items) < max_results:
            query_args = build_query_args(
                uwi_prefix, wordz, max_results - len(all_items), exclusive_start_key
            )
            response = table.query(**query_args)

            all_items.extend(response.get("Items", []))
            last_evaluated_key = response.get("LastEvaluatedKey")

            if not last_evaluated_key:
                break
            exclusive_start_key = last_evaluated_key

        if len(all_items) >= max_results:
            break

    new_token = (
        base64.b64encode(json.dumps(last_evaluated_key).encode()).decode()
        if last_evaluated_key
        else None
    )

    metadata = {
        "returnedCount": len(all_items[:max_results]),
        "totalRequested": max_results,
        "paginationToken": new_token,
        "generatedAt": datetime.now().isoformat(),
    }

    return create_response(
        event, 200, {"data": all_items[:max_results], "metadata": metadata}
    )


def build_query_args(uwi_prefix, wordz, max_results, exclusive_start_key):
    query_args = {
        "IndexName": "pk-uwi-index",
        "KeyConditionExpression": Key("pk").eq("RASTER")
        & Key("uwi").begins_with(uwi_prefix),
        "Limit": max_results,
    }

    if wordz:
        query_args["FilterExpression"] = "contains(wordz, :wordz)"
        query_args["ExpressionAttributeValues"] = {":wordz": wordz.lower()}

    if exclusive_start_key:
        query_args["ExclusiveStartKey"] = exclusive_start_key

    return query_args


def handle_create(event, body, resource_type):
    if not isinstance(body, list):
        raise ValueError("Request body must be an array")

    with table.batch_writer() as batch:
        for item in body:
            now = datetime.now(timezone.utc).isoformat()
            processed_item = DecimalEncoder.prepare_for_dynamodb(
                {**item, "created_at": now, "updated_at": now}
            )
            batch.put_item(Item=processed_item)

    return create_response(
        event,
        201,
        {
            "message": f"Successfully created {len(body)} {resource_type}(s)",
            "resource_type": resource_type,
            "count": len(body),
        },
    )


def handle_get(event, resource_type):
    if resource_type == "repo":
        response = table.query(KeyConditionExpression=Key("pk").eq("REPO"))
    elif resource_type == "raster":
        response = table.query(KeyConditionExpression=Key("pk").eq("RASTER"))
    else:
        response = table.query(
            KeyConditionExpression="begins_with(pk, :resource_prefix)",
            ExpressionAttributeValues={":resource_prefix": f"{resource_type.upper()}#"},
        )
    return create_response(event, 200, response["Items"])


def handler(event, context):
    try:
        http_method = event["httpMethod"]
        resource_type = get_resource_type(event)

        if not is_valid_resource(resource_type):
            return create_response(event, 400, {"error": "Invalid resource type"})

        if http_method == "POST":
            body = parse_body(event)
            if resource_type == "search":
                return handle_search(event, body)
            else:
                return handle_create(event, body, resource_type)
        elif http_method == "GET":
            return handle_get(event, resource_type)
        else:
            return create_response(event, 405, {"error": "Method not allowed"})

    except ValueError as ve:
        print(ve)
        return create_response(event, 400, {"error": str(ve)})
    except Exception as e:
        print(e)
        return create_response(event, 500, {"error": str(e)})
