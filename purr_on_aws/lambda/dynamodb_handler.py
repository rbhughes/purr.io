import base64
import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

# Constants
MAX_RESULTS = 500
DEFAULT_RESULTS = 100
VALID_RESOURCES = {"repo", "raster", "vector", "search", "job"}
ALLOWED_ORIGINS = {
    "http://localhost:3000",
    f"https://{os.environ['PURR_SUBDOMAIN']}.{os.environ['PURR_DOMAIN']}",
}


dynamodb = boto3.resource("dynamodb")

fizz_table = dynamodb.Table(os.environ["FIZZ_TABLE_NAME"])  # type: ignore
jobs_table = dynamodb.Table(os.environ["JOBS_TABLE_NAME"])  # type: ignore


class DecimalHandler(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)

    @classmethod
    def encode_decimal(cls, data):
        if isinstance(data, float):
            return Decimal(str(data)) if not data.is_integer() else int(data)
        if isinstance(data, dict):
            return {k: cls.encode_decimal(v) for k, v in data.items()}
        if isinstance(data, (list, tuple)):
            return [cls.encode_decimal(item) for item in data]
        return data

    @classmethod
    def decode_decimal(cls, data):
        if isinstance(data, Decimal):
            return int(data) if data % 1 == 0 else float(data)
        if isinstance(data, dict):
            return {k: cls.decode_decimal(v) for k, v in data.items()}
        if isinstance(data, (list, tuple)):
            return [cls.decode_decimal(item) for item in data]
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
        "body": json.dumps(body, cls=DecimalHandler)
        if not isinstance(body, str)
        else body,
    }


def get_resource_type(event):
    # Remove stage prefix if present
    path = event["path"]
    # Remove leading slash and split
    parts = path.lstrip("/").split("/")
    # Find the resource part (after stage, e.g., 'prod')
    if parts[0] in {"prod", "dev", "test"}:  # or dynamically get stage name
        parts = parts[1:]
    # If path is /jobs/123, parts = ['jobs', '123']
    if len(parts) >= 2 and parts[0] == "jobs" and parts[1]:
        return "job"
    elif len(parts) >= 1:
        return parts[0].rstrip("s")
    return ""


def is_valid_resource(resource_type):
    return resource_type in VALID_RESOURCES


def parse_body(event):
    try:
        return json.loads(event["body"])
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON format")


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


###############################################################################

##### REPO


def get_repos(event):
    response = fizz_table.query(KeyConditionExpression=Key("pk").eq("REPO"))
    decoded_items = DecimalHandler.decode_decimal(response["Items"])
    return create_response(event, 200, decoded_items)


def post_repo(event, body):
    now = datetime.now(timezone.utc).isoformat()
    item = {**body, "created_at": now, "updated_at": now}
    encoded_item = DecimalHandler.encode_decimal(item)
    fizz_table.put_item(Item=encoded_item)

    return create_response(
        event,
        201,
        {
            "message": f"Successfully created a repo: {item['fs_path']}",
            "resource_type": "repo",
            "count": 1,
            "item": item,
        },
    )


##### RASTER


def post_rasters(event, body):
    if not isinstance(body, list):
        raise ValueError("Request body must be an array")

    return_items = []

    with fizz_table.batch_writer() as batch:
        for item in body:
            now = datetime.now(timezone.utc).isoformat()
            o = {**item, "created_at": now, "updated_at": now}

            encoded_item = DecimalHandler.encode_decimal(o)
            batch.put_item(Item=encoded_item)

            return_items.append(o)

    return create_response(
        event,
        201,
        {
            "message": f"Successfully created {len(body)} raster(s)",
            "resource_type": "raster",
            "count": len(body),
            "items": return_items,
        },
    )


##### JOB


def get_job_by_id(event):
    job_id = event.get("pathParameters", {}).get("id")
    if not job_id:
        raise ValueError("Job ID required in path parameters")

    response = jobs_table.get_item(
        Key={"id": job_id},
        ConsistentRead=True,
    )

    if "Item" not in response:
        return create_response(event, 404, {"error": "Job not found"})

    decoded_item = DecimalHandler.decode_decimal(response["Item"])
    return create_response(event, 200, decoded_item)


def post_job_create_or_update(event, body):
    if not isinstance(body, dict):
        raise ValueError("Job data must be a single object")

    if "ttl" not in body:
        raise ValueError("TTL attribute is required")

    current_time = datetime.now(timezone.utc).isoformat()
    is_update = "id" in body and body["id"]

    if is_update:
        # UPDATE JOB

        job_id = body["id"]

        update_data = body.copy()
        del update_data["id"]  # Remove ID as it's part of the key
        update_data["updated_at"] = current_time

        update_data = DecimalHandler.encode_decimal(update_data)

        update_parts = []
        expr_names = {}
        expr_values = {}

        for key, value in update_data.items():
            update_parts.append(f"#{key} = :{key}")
            expr_names[f"#{key}"] = key
            expr_values[f":{key}"] = value

        update_expression = "SET " + ", ".join(update_parts)

        try:
            jobs_table.update_item(
                Key={"id": job_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_values,
                ReturnValues="UPDATED_NEW",
            )

            return create_response(
                event,
                200,
                {
                    "message": "Job updated successfully",
                    "id": job_id,
                    "ttl": body["ttl"],
                },
            )
        except ClientError as err:
            print(
                f"Job Update FAIL: {job_id}. Error Code: {err.response['Error']['Code']}"
            )
            print(f"{err.response['Error']['Message']}")
            raise
    else:
        # CREATE JOB
        if "id" not in body or not body["id"]:
            body["id"] = str(uuid.uuid4())

        processed_item = DecimalHandler.encode_decimal(
            {**body, "created_at": current_time, "updated_at": current_time}
        )

        try:
            # Create new item using put_item
            jobs_table.put_item(Item=processed_item)

            return create_response(
                event,
                201,
                {
                    "message": "Job created successfully",
                    "id": processed_item["id"],
                    "ttl": processed_item["ttl"],
                },
            )
        except ClientError as err:
            print(f"Job Create FAIL! Error Code: {err.response['Error']['Code']}")
            print(f"{err.response['Error']['Message']}")
            raise


##### SEARCH


def post_search(event, body):
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
        event,
        200,
        {
            "data": DecimalHandler.decode_decimal(all_items[:max_results]),
            "metadata": metadata,
        },
    )


###############################################################################


def handler(event, context):
    try:
        http_method = event["httpMethod"]
        resource_type = get_resource_type(event)

        if not is_valid_resource(resource_type):
            return create_response(event, 400, {"error": "Invalid resource type"})

        if http_method == "POST":
            body = parse_body(event)

            if resource_type == "job":
                return post_job_create_or_update(event, body)

            elif resource_type == "search":
                return post_search(event, body)

            elif resource_type == "repo":
                return post_repo(event, body)

            elif resource_type == "raster":
                return post_rasters(event, body)

            else:
                return handle_create(event, body, resource_type)

        elif http_method == "GET":
            if resource_type == "repo":
                return get_repos(event)

            elif resource_type == "job":
                return get_job_by_id(event)

        else:
            return create_response(event, 405, {"error": "Method not allowed"})

    except ValueError as ve:
        return create_response(event, 400, {"error": str(ve)})
    except Exception as e:
        return create_response(event, 500, {"error": str(e)})
