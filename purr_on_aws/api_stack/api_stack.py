import os
from dotenv import load_dotenv
from aws_cdk import (
    Duration,
    Stack,
    aws_dynamodb as dynamodb,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_iam as iam,
    RemovalPolicy,
    CfnOutput,
)
from constructs import Construct

load_dotenv()

purr_domain = os.getenv("PURR_DOMAIN")
purr_subdomain = os.getenv("PURR_SUBDOMAIN")
aws_account = os.getenv("AWS_ACCOUNT")
purr_dynamodb_table_name = f"{purr_subdomain}-table-{aws_account}"
purr_api_lambda_name = f"{purr_subdomain}-api-lambda-{aws_account}"


class ApiStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Create Lambda authorizer function
        auth_handler = _lambda.Function(
            self,
            "AuthHandler",
            runtime=_lambda.Runtime.PYTHON_3_9,
            handler="authorizer.handler",
            code=_lambda.Code.from_asset("lambda"),
        )

        auth_handler.grant_invoke(iam.ServicePrincipal("apigateway.amazonaws.com"))

        # Permit logging
        logging_policy = iam.PolicyStatement(
            actions=[
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
            ],
            resources=["*"],
        )

        auth_handler.add_to_role_policy(logging_policy)

        # Set auth_handler lambda as authorizer for API
        authorizer = apigw.TokenAuthorizer(
            self,
            "ApiAuthorizer",
            handler=auth_handler,
            identity_source="method.request.header.Authorization",
            results_cache_ttl=Duration.minutes(5),
        )

        # Create DynamoDB table. (GSIs are created later)
        table = dynamodb.Table(
            self,
            "FizzTable",
            partition_key=dynamodb.Attribute(
                name="pk", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(name="sk", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            table_name=purr_dynamodb_table_name,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # Create Lambda API + DynamoDB handler function
        api_handler = _lambda.Function(
            self,
            "FizzTableHandler",
            runtime=_lambda.Runtime.PYTHON_3_9,
            code=_lambda.Code.from_asset("lambda"),
            handler="dynamodb_handler.handler",
            environment={
                "TABLE_NAME": table.table_name,
                "PURR_SUBDOMAIN": purr_subdomain,
                "PURR_DOMAIN": purr_domain,
            },
            function_name=purr_api_lambda_name,
        )

        # Permit DynamoDB (and GSI) access
        # NOTE that index names should match add_indexes.py
        dynamodb_policy = iam.PolicyStatement(
            actions=[
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:BatchGetItem",
                "dynamodb:BatchWriteItem",
            ],
            resources=[
                table.table_arn,
                f"{table.table_arn}/index/pk-uwi-index",
                f"{table.table_arn}/index/pk-calib-index",
            ],
        )

        # Ensure that api_handler can do logging, DynamoDB stuff
        api_handler.add_to_role_policy(dynamodb_policy)
        api_handler.add_to_role_policy(logging_policy)

        # Create API Gateway with safe CORS
        api = apigw.RestApi(
            self,
            "FizzApi",
            rest_api_name="Fizz API",
            description="API for fizzy operations",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=[
                    "http://localhost:3000",
                    f"https://{purr_subdomain}.{purr_domain}",
                ],
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=[
                    "Content-Type",
                    "Authorization",
                    "token",
                ],
                max_age=Duration.minutes(5),
                status_code=200,
            ),
        )

        # Set lambda handler for API Gateway (proxy=True for CORS)
        integration = apigw.LambdaIntegration(
            api_handler,
            proxy=True,
            integration_responses=[
                {
                    "statusCode": "200",
                    "responseParameters": {
                        "method.response.header.Access-Control-Allow-Origin": "'*'"
                    },
                }
            ],
        )

        # Add resources and methods for all resource endpoints
        resources = ["repos", "rasters", "vectors", "search"]

        method_response = {
            "statusCode": "200",
            "responseParameters": {
                "method.response.header.Access-Control-Allow-Origin": True
            },
        }

        for resource in resources:
            api_resource = api.root.add_resource(resource)

            if resource != "search":
                api_resource.add_method(
                    "GET",
                    integration=integration,
                    authorizer=authorizer,
                    authorization_type=apigw.AuthorizationType.CUSTOM,
                    method_responses=[method_response],
                )
            api_resource.add_method(
                "POST",
                integration=integration,
                authorizer=authorizer,
                authorization_type=apigw.AuthorizationType.CUSTOM,
                method_responses=[method_response],
            )

        ######################################################################

        CfnOutput(
            self,
            "ApiUrl",
            value=api.url,
            description="API endpoint root URL",
        )
        CfnOutput(
            self,
            "TableName",
            value=table.table_name,
            description="DynamoDB table name",
        )
