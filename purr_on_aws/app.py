# #!/usr/bin/env python3

import os
from dotenv import load_dotenv
from aws_cdk import App, Environment
from site_stack.site_stack import SiteStack
from api_stack.api_stack import ApiStack
from waf_stack.waf_stack import WafStack

load_dotenv()

aws_account = os.getenv("AWS_ACCOUNT")
aws_region = os.getenv("AWS_REGION")
purr_subdomain = os.getenv("PURR_SUBDOMAIN")

cdk_env = Environment(account=aws_account, region=aws_region)
waf_env = Environment(account=aws_account, region="us-east-1")


app = App()

waf_stack = WafStack(
    app, "WafStack",
    stack_name=f"{purr_subdomain}-waf-stack",
    env=waf_env,
    cross_region_references=True,
)

site_stack = SiteStack(
    app,
    "SiteStack",
    stack_name=f"{purr_subdomain}-site-stack",
    waf_acl_arn=waf_stack.waf_acl_arn,
    env=cdk_env,
    cross_region_references=True,
)
site_stack.add_dependency(waf_stack)

ApiStack(
    app,
    "ApiStack",
    stack_name=f"{purr_subdomain}-api-stack",
    env=cdk_env,
)

app.synth()
