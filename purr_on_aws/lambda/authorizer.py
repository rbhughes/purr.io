import json
import re


def handler(event, context):
    try:
        token = event.get("authorizationToken")
        print("Authorization Token:", token)

        is_valid = validate_token(token)

        effect = "Allow" if is_valid else "Deny"
        policy = generate_policy(effect, get_resources(event))

        print("Generated policy:", json.dumps(policy))
        return policy

    except Exception as e:
        print("Error in authorizer:", str(e))
        return generate_policy("Deny", event["methodArn"])


# TODO: implement the thing!
def validate_token(token):
    """
    Validate the token.
    """
    if not token:
        print("No token provided")
        return False

    if re.match(
        r"^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$", token
    ):
        print("Token is valid")
        return True

    # print("Token is invalid")
    # return False
    return True


def generate_policy(effect, resources):
    """
    Generate an IAM policy for API Gateway authorization.
    """
    return {
        "principalId": "user",
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "execute-api:Invoke",
                    "Effect": effect,
                    "Resource": resources,
                }
            ],
        },
    }


def get_resources(event):
    method_arn = event["methodArn"]
    arn_parts = method_arn.split(":")
    api_gateway_part = arn_parts[5].split("/")
    return [
        f"{arn_parts[0]}:{arn_parts[1]}:{arn_parts[2]}:{arn_parts[3]}:{arn_parts[4]}:{api_gateway_part[0]}/prod/*/*"
    ]
