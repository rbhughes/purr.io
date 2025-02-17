# #!/usr/bin/env python3

import os
from dotenv import load_dotenv
from aws_cdk import App, Environment
from site_stack.site_stack import SiteStack
from api_stack.api_stack import ApiStack

load_dotenv()

aws_account = os.getenv("AWS_ACCOUNT")
aws_region = os.getenv("AWS_REGION")
purr_subdomain = os.getenv("PURR_SUBDOMAIN")

cdk_env = Environment(account=aws_account, region=aws_region)


app = App()

# purr_subdomain = app.node.try_get_context("purr_subdomain")

SiteStack(
    app,
    "SiteStack",
    stack_name=f"{purr_subdomain}-site-stack",
    env=cdk_env,
)
ApiStack(
    app,
    "ApiStack",
    stack_name=f"{purr_subdomain}-api-stack",
    env=cdk_env,
)

app.synth()
