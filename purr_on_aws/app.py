# #!/usr/bin/env python3

import os

from api_stack.api_stack import ApiStack
from aws_cdk import App, Environment
from dotenv import load_dotenv
from sec_stack.sec_stack import SecStack
from site_stack.site_stack import SiteStack

load_dotenv()

aws_account = os.getenv("AWS_ACCOUNT", "")
aws_region = os.getenv("AWS_REGION", "")
purr_subdomain = os.getenv("PURR_SUBDOMAIN", "")

cdk_env = Environment(account=aws_account, region=aws_region)
sec_env = Environment(account=aws_account, region="us-east-1")


app = App()

sec_stack = SecStack(
    app,
    "SecStack",
    stack_name=f"{purr_subdomain}-sec-stack",
    env=sec_env,
)

site_stack = SiteStack(
    app,
    "SiteStack",
    lambda_edge_arn=sec_stack.host_validator.current_version.function_arn,
    stack_name=f"{purr_subdomain}-site-stack",
    env=cdk_env,
    cross_region_references=True,
)

ApiStack(
    app,
    "ApiStack",
    stack_name=f"{purr_subdomain}-api-stack",
    env=cdk_env,
)


app.synth()
