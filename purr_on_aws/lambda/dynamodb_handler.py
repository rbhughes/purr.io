import json
import boto3
import os
from decimal import Decimal

from datetime import datetime, timezone
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])


# class DecimalEncoder(json.JSONEncoder):
#     def default(self, obj):
#         if isinstance(obj, Decimal):
#             # Convert Decimal to int if whole number, otherwise to float
#             return int(obj) if obj % 1 == 0 else float(obj)
#         # Let base class default handle the rest
#         return super().default(obj)


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        """For GET responses: Convert Decimals to JSON-friendly types"""
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)

    @classmethod
    def prepare_for_dynamodb(cls, data):
        """For POST requests: Convert floats to Decimals recursively"""
        if isinstance(data, float):
            return Decimal(str(data)) if not data.is_integer() else int(data)
        if isinstance(data, dict):
            return {k: cls.prepare_for_dynamodb(v) for k, v in data.items()}
        if isinstance(data, (list, tuple)):
            return [cls.prepare_for_dynamodb(item) for item in data]
        return data


def handler(event, context):
    try:
        http_method = event["httpMethod"]
        resource_path = event["path"].split("/")
        resource_type = resource_path[-1].lower()

        # Normalize resource type to singular form
        if resource_type.endswith("s"):
            resource_type = resource_type[:-1]

        valid_resources = {"repo", "raster", "vector"}
        if resource_type not in valid_resources:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Invalid resource type"}),
            }

        if http_method == "POST":
            items = json.loads(event["body"])

            if not isinstance(items, list):
                return {
                    "statusCode": 400,
                    "headers": {"Content-Type": "application/json"},
                    "body": json.dumps({"error": "Request body must be an array"}),
                }

            with table.batch_writer() as batch:
                for item in items:
                    # if not all(key in item for key in ["pk", "sk"]):
                    #     return {
                    #         "statusCode": 400,
                    #         "headers": {"Content-Type": "application/json"},
                    #         "body": json.dumps(
                    #             {"error": "Items must contain pk, sk"}
                    #         ),
                    #     }

                    now = datetime.now(timezone.utc).isoformat()
                    item.update({"created_at": now, "updated_at": now})

                    processed_item = DecimalEncoder.prepare_for_dynamodb(item)

                    batch.put_item(Item=processed_item)

            return {
                "statusCode": 201,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(
                    {
                        "message": f"Successfully created {len(items)} {resource_type}(s)",
                        "resource_type": resource_type,
                        "count": len(items),
                    }
                ),
            }

        elif http_method == "GET":
            if resource_type == "repo":
                response = table.scan(FilterExpression=Attr("pk").begins_with("REPO#"))
            else:
                response = table.query(
                    KeyConditionExpression="begins_with(pk, :resource_prefix)",
                    ExpressionAttributeValues={
                        ":resource_prefix": f"{resource_type.upper()}#"
                    },
                )
            # items = json.dumps(response["Items"], cls=DecimalEncoder)
            items = response["Items"]
            print("items____________")
            print(items)

            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"data": items}, cls=DecimalEncoder),
                # "body": json.dumps(
                #     {"data": response["items"], "count": len(response["items"])},
                #     cls=DecimalEncoder,
                # ),
            }

        return {
            "statusCode": 405,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Method not allowed"}),
        }

    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Invalid JSON format"}),
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)}),
        }
