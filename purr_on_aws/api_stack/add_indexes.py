import boto3
from botocore.exceptions import ClientError


def add_dynamodb_indexes():
    gsi_data = {
        "table": "ghost-table-434980069942",
        "indices": [
            ("pk", "uwi"),
            ("pk", "state"),
            ("pk", "county"),
            ("pk", "calib_log_description"),
        ],
    }

    table_name = gsi_data["table"]

    for i in gsi_data["indices"]:
        index_name = f"{i[0]}-{i[1]}-index"
        safe_create_gsi(table_name, index_name)


def safe_create_gsi(table_name, index_name):
    try:
        dynamodb = boto3.client("dynamodb")

        # Check existing indexes
        table_desc = dynamodb.describe_table(TableName=table_name)
        existing_indices = [
            idx["IndexName"]
            for idx in table_desc.get("Table", {}).get("GlobalSecondaryIndexes", [])
        ]

        if index_name in existing_indices:
            print(f"Index {index_name} already exists")
            return

        # Create index if not found
        dynamodb.update_table(
            TableName=table_name,
            AttributeDefinitions=[
                {"AttributeName": "pk", "AttributeType": "S"},
                {"AttributeName": "uwi", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexUpdates=[
                {
                    "Create": {
                        "IndexName": index_name,
                        "KeySchema": [
                            {"AttributeName": "pk", "KeyType": "HASH"},
                            {"AttributeName": "uwi", "KeyType": "RANGE"},
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                    }
                }
            ],
        )
        print(f"Creating index {index_name} (will take a few minutes)...")

    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceInUseException":
            print(f"Index {index_name} creation already in progress")
        else:
            raise


add_dynamodb_indexes()
