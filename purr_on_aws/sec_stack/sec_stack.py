from aws_cdk import CfnOutput, Duration, Stack
from aws_cdk import aws_iam as iam
from aws_cdk import aws_lambda as lambda_
from constructs import Construct


class SecStack(Stack):
    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Create a role with the correct trust policy
        lambda_role = iam.Role(
            self,
            "HostHeaderValidatorRole",
            assumed_by=iam.CompositePrincipal(
                iam.ServicePrincipal("lambda.amazonaws.com"),
                iam.ServicePrincipal("edgelambda.amazonaws.com"),
            ),
        )

        # Attach logging permissions to the role
        lambda_role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                ],
                resources=["arn:aws:logs:*:*:*"],
            )
        )

        # Python Lambda@Edge function
        self.host_validator = lambda_.Function(
            self,
            "HostHeaderValidator",
            code=lambda_.Code.from_asset("lambda"),
            handler="edge_validator.handler",
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(5),
            role=lambda_role,
        )

        # Export Lambda version ARN for cross-stack reference
        self.lambda_version_arn = self.host_validator.current_version.function_arn
        CfnOutput(
            self,
            "LambdaVersionArnExport",
            value=self.lambda_version_arn,
            export_name="HostValidatorLambdaArn",
        )
