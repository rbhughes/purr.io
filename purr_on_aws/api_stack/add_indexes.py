import boto3
import os
import time
from dotenv import load_dotenv
from botocore.exceptions import ClientError

load_dotenv()

aws_account = os.getenv("AWS_ACCOUNT")
purr_subdomain = os.getenv("PURR_SUBDOMAIN")


def wait_for_index_active(
    table_name, index_name, dynamodb_client, delay=10, max_attempts=60
):
    attempts = 0
    while attempts < max_attempts:
        table_desc = dynamodb_client.describe_table(TableName=table_name)
        gsis = table_desc.get("Table", {}).get("GlobalSecondaryIndexes", [])
        for gsi in gsis:
            if gsi["IndexName"] == index_name:
                if gsi["IndexStatus"] == "ACTIVE":
                    print(f"Index {index_name} is now ACTIVE")
                    return
                else:
                    print(f"Index {index_name} status: {gsi['IndexStatus']}")
        time.sleep(delay)
        attempts += 1
    raise Exception(f"Timeout waiting for index {index_name} to become active.")


def safe_create_gsi(table_name, index_name, partition_key, sort_key):
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

    try:
        # Create index with dynamic attribute names and schema
        dynamodb.update_table(
            TableName=table_name,
            AttributeDefinitions=[
                {"AttributeName": partition_key, "AttributeType": "S"},
                {"AttributeName": sort_key, "AttributeType": "S"},
            ],
            GlobalSecondaryIndexUpdates=[
                {
                    "Create": {
                        "IndexName": index_name,
                        "KeySchema": [
                            {"AttributeName": partition_key, "KeyType": "HASH"},
                            {"AttributeName": sort_key, "KeyType": "RANGE"},
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                    }
                }
            ],
        )
        print(f"Creating index {index_name} (this may take a few minutes)...")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceInUseException":
            print(f"Index {index_name} creation already in progress")
        elif e.response["Error"]["Code"] == "LimitExceededException":
            print(
                f"Another index operation is in progress. Waiting to create {index_name}..."
            )
            time.sleep(20)
            safe_create_gsi(table_name, index_name, partition_key, sort_key)
            return
        else:
            raise

    # Wait until the index becomes active
    wait_for_index_active(table_name, index_name, dynamodb)


# 2025-02-23 | modified to hard-code and shorten index name
def add_dynamodb_indexes():
    gsi_data = {
        "table": f"{purr_subdomain}-table-{aws_account}",
        "indices": [
            ("pk", "uwi", "pk-uwi-index"),
            ("pk", "calib_log_description_lc", "pk-calib-index"),
        ],
    }

    table_name = gsi_data["table"]
    for partition_key, sort_key, index_name in gsi_data["indices"]:
        # index_name = f"{partition_key}-{sort_key}-index"
        safe_create_gsi(table_name, index_name, partition_key, sort_key)


add_dynamodb_indexes()
