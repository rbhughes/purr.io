import json
import boto3
import os
import base64
from decimal import Decimal
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key

# Constants
MAX_RESULTS = 500
DEFAULT_RESULTS = 100
ALLOWED_ORIGINS = {
    "http://localhost:3000",
    f"https://{os.environ['PURR_SUBDOMAIN']}.{os.environ['PURR_DOMAIN']}",
}

VALID_RESOURCES = {"repo", "raster", "vector", "search", "job"}

dynamodb = boto3.resource("dynamodb")

fizz_table = dynamodb.Table(os.environ["FIZZ_TABLE_NAME"])  # type: ignore
jobs_table = dynamodb.Table(os.environ["JOBS_TABLE_NAME"])  # type: ignore


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)

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
    max_results = min(int(body.get("maxResults", DEFAULT_RESULTS)), MAX_RESULTS)
    uwis = body.get("uwis", [])
    wordz = body.get("wordz")

    if body.get("paginationToken"):
        token_data = json.loads(
            base64.b64decode(body.get("paginationToken", "")).decode()
        )
        exclusive_start_key = token_data.get("last_evaluated_key")
        current_uwi_prefix = token_data.get("uwi_prefix")
    else:
        exclusive_start_key = None
        current_uwi_prefix = None

    all_items = []
    last_evaluated_key = None
    last_uwi_prefix = None

    for uwi_prefix in uwis:
        if current_uwi_prefix and uwi_prefix != current_uwi_prefix:
            continue
        while len(all_items) < max_results:
            query_args = build_query_args(
                uwi_prefix, wordz, max_results - len(all_items), exclusive_start_key
            )
            response = fizz_table.query(**query_args)
            all_items.extend(response.get("Items", []))
            last_evaluated_key = response.get("LastEvaluatedKey")
            if not last_evaluated_key:
                break
            exclusive_start_key = last_evaluated_key
            last_uwi_prefix = uwi_prefix
        if len(all_items) >= max_results:
            break
        current_uwi_prefix = None
        exclusive_start_key = None

    new_token = (
        base64.b64encode(
            json.dumps(
                {
                    "last_evaluated_key": last_evaluated_key,
                    "uwi_prefix": last_uwi_prefix,
                }
            ).encode()
        ).decode()
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
    with fizz_table.batch_writer() as batch:
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
        response = fizz_table.query(KeyConditionExpression=Key("pk").eq("REPO"))
    elif resource_type == "raster":
        response = fizz_table.query(KeyConditionExpression=Key("pk").eq("RASTER"))
    else:
        response = fizz_table.query(
            KeyConditionExpression="begins_with(pk, :resource_prefix)",
            ExpressionAttributeValues={":resource_prefix": f"{resource_type.upper()}#"},
        )
    return create_response(event, 200, response["Items"])


###


def handle_create_job(event, body):
    if not isinstance(body, dict):
        raise ValueError("Job data must be a single object")

    if "ttl" not in body:
        raise ValueError("TTL attribute is required")

    processed_item = DecimalEncoder.prepare_for_dynamodb(
        {
            **body,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    jobs_table.put_item(Item=processed_item)

    return create_response(
        event,
        201,
        {
            "message": "Job created successfully",
            "jobId": processed_item["id"],
            "ttl": processed_item["ttl"],
        },
    )


def handle_get_job(event):
    job_id = event.get("pathParameters", {}).get("id")
    if not job_id:
        raise ValueError("Job ID required in path parameters")

    response = jobs_table.get_item(
        Key={"id": job_id},
        ConsistentRead=True,  # Strong consistency
    )

    if "Item" not in response:
        return create_response(event, 404, {"error": "Job not found"})

    return create_response(event, 200, response["Item"])


###

# def handler(event, context):
#     try:
#         http_method = event["httpMethod"]
#         resource_type = get_resource_type(event)
#         if not is_valid_resource(resource_type):
#             return create_response(event, 400, {"error": "Invalid resource type"})
#         if http_method == "POST":
#             body = parse_body(event)
#             if resource_type == "search":
#                 return handle_search(event, body)
#             else:
#                 return handle_create(event, body, resource_type)
#         elif http_method == "GET":
#             return handle_get(event, resource_type)
#         else:
#             return create_response(event, 405, {"error": "Method not allowed"})
#     except ValueError as ve:
#         print(ve)
#         return create_response(event, 400, {"error": str(ve)})
#     except Exception as e:
#         print(e)
#         return create_response(event, 500, {"error": str(e)})


def handler(event, context):
    try:
        http_method = event["httpMethod"]
        resource_type = get_resource_type(event)

        if not is_valid_resource(resource_type):
            return create_response(event, 400, {"error": "Invalid resource type"})

        if http_method == "POST":
            body = parse_body(event)

            if resource_type == "job":
                return handle_create_job(event, body)
            elif resource_type == "search":  # Explicit search handling
                return handle_search(event, body)
            else:
                return handle_create(event, body, resource_type)

        elif http_method == "GET":
            if resource_type == "job":
                return handle_get_job(event)
            else:
                return handle_get(event, resource_type)

        else:
            return create_response(event, 405, {"error": "Method not allowed"})

    except ValueError as ve:
        return create_response(event, 400, {"error": str(ve)})
    except Exception as e:
        return create_response(event, 500, {"error": str(e)})
