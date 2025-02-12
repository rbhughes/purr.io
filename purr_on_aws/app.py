# #!/usr/bin/env python3

from aws_cdk import App, Environment
from site_stack.site_stack import SiteStack
from api_stack.api_stack import ApiStack

cdk_env = Environment(account="434980069942", region="us-east-2")

###
# prerequisites:
#    1. ~/.aws/credentials exit for IAM admin for this subdomain [lord_purrio]
#    2. cdk bootstrap for this subdomain
#    3. react dist in site_stack is defined
#    4. cdk.json has purr_domain and purr_cert_arn defined
#
# To deploy all stacks...
# cdk deploy SiteStack --context purr_subdomain=skunk
# cdk deploy ApiStack --context purr_subdomain=skunk
# python3 api_stack/add_indexes.py


app = App()

purr_subdomain = app.node.try_get_context("purr_subdomain")

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
