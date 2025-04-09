from aws_cdk import (
    Stack,
    aws_wafv2 as wafv2,
    aws_ssm as ssm,
    CfnOutput,
    RemovalPolicy
)
from constructs import Construct

domain = "canvasenergy.com"
waf_name= "AllowCanvasEnergyDomain"

class WafStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Create WAF WebACL with required configuration
        self.waf_acl = wafv2.CfnWebACL(
            self,
            "DomainRestrictionWebACL",
            scope="CLOUDFRONT",  # Must be in us-east-1
            default_action=wafv2.CfnWebACL.DefaultActionProperty(
                block={}
            ),
            visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                cloud_watch_metrics_enabled=True,
                metric_name="DomainRestrictionWAF",
                sampled_requests_enabled=True
            ),
            rules=[
                wafv2.CfnWebACL.RuleProperty(
                    name=waf_name,
                    priority=1,
                    action=wafv2.CfnWebACL.RuleActionProperty(allow={}),
                    statement=wafv2.CfnWebACL.StatementProperty(
                        byte_match_statement=wafv2.CfnWebACL.ByteMatchStatementProperty(
                            field_to_match=wafv2.CfnWebACL.FieldToMatchProperty(
                                single_header={"Name": "Referer"}
                            ),
                            positional_constraint="CONTAINS",
                            search_string=domain,
                            text_transformations=[
                                wafv2.CfnWebACL.TextTransformationProperty(
                                    priority=0,
                                    type="NONE"
                                )
                            ]
                        )
                    ),
                    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                        cloud_watch_metrics_enabled=True,
                        metric_name=waf_name,
                        sampled_requests_enabled=True
                    )
                )
            ]
        )

        self.waf_acl_arn = self.waf_acl.attr_arn  # Expose ARN as a property

        # Create SSM Parameter with proper removal handling
        waf_param = ssm.CfnParameter(
            self,
            "WafAclArnParameter",
            name="/Purr/WAF/CloudFrontACLArn",
            type="String",
            value=self.waf_acl.attr_arn
        )
        waf_param.apply_removal_policy(RemovalPolicy.DESTROY)

        # Output for cross-stack reference
        CfnOutput(
            self,
            "WafAclArnOutput",
            value=self.waf_acl.attr_arn,
            export_name="WafAclArn"
        )
