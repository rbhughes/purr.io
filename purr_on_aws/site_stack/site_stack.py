import os
from dotenv import load_dotenv
from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_iam as iam,
    aws_certificatemanager as acm,
    aws_route53 as route53,
    aws_route53_targets as route53_targets,
    aws_s3_deployment as s3_deployment,
    RemovalPolicy,
)
from constructs import Construct

load_dotenv()

purr_domain = os.getenv("PURR_DOMAIN")
purr_subdomain = os.getenv("PURR_SUBDOMAIN")
purr_cert_arn = os.getenv("PURR_CERT_ARN")
aws_account = os.getenv("AWS_ACCOUNT")
purr_site_bucket_name = f"{purr_subdomain}-site-{aws_account}"


class SiteStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        purr_local_dist = "../site/dist"

        ###
        # NOTE: assumes you already have a valid certificate
        certificate = acm.Certificate.from_certificate_arn(
            self, "ExistingCertificate", purr_cert_arn
        )

        # Create an S3 bucket for static site/ssets
        # TODO: check if versioned is necessary
        bucket = s3.Bucket(
            self,
            "StaticAssetsBucket",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            versioned=True,
            bucket_name=purr_site_bucket_name,
        )

        # Create an Origin Access Control (OAC) for CloudFront
        oac = cloudfront.CfnOriginAccessControl(
            self,
            "OAC",
            origin_access_control_config=cloudfront.CfnOriginAccessControl.OriginAccessControlConfigProperty(
                # name="StaticAssetsOAC",
                name=f"{purr_subdomain}-site-OAC",
                origin_access_control_origin_type="s3",
                signing_behavior="always",
                signing_protocol="sigv4",
            ),
        )

        # Create a CloudFront distribution using S3BucketOrigin
        distribution = cloudfront.Distribution(
            self,
            "CloudFrontDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin(bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            ),
            default_root_object="index.html",
            domain_names=[f"{purr_subdomain}.{purr_domain}"],
            certificate=certificate,
        )

        # Associate the OAC with the CloudFront distribution
        cfn_distribution = distribution.node.default_child
        cfn_distribution.add_property_override(
            "DistributionConfig.Origins.0.OriginAccessControlId", oac.attr_id
        )

        # Deploy the contents of the local "dist" directory to the S3 bucket
        s3_deployment.BucketDeployment(
            self,
            "DeployWebsite",
            sources=[
                s3_deployment.Source.asset(purr_local_dist, exclude=[".DS_Store"])
            ],
            destination_bucket=bucket,
            destination_key_prefix="",
            distribution=distribution,
            distribution_paths=["/*"],
        )

        # Grant CloudFront access to the S3 bucket
        bucket_policy = iam.PolicyStatement(
            actions=["s3:GetObject"],
            resources=[bucket.arn_for_objects("*")],
            principals=[iam.ServicePrincipal("cloudfront.amazonaws.com")],
        )
        bucket_policy.add_condition(
            "StringEquals",
            {
                "AWS:SourceArn": f"arn:aws:cloudfront::{self.account}:distribution/{distribution.distribution_id}"
            },
        )
        bucket.add_to_resource_policy(bucket_policy)

        # Enable CloudTrail logging to the S3 bucket
        # trail = cloudtrail.Trail(
        #     self,
        #     "CloudTrail",
        #     bucket=bucket,
        #     enable_file_validation=True,
        # )

        # Define A record for subdomain, e.g. "stuff.purr.io"
        hosted_zone = route53.HostedZone.from_lookup(
            self, "HostedZone", domain_name=purr_domain
        )
        route53.ARecord(
            self,
            "AliasRecord",
            zone=hosted_zone,
            target=route53.RecordTarget.from_alias(
                route53_targets.CloudFrontTarget(distribution)
            ),
            record_name=f"{purr_subdomain}.{purr_domain}",
        )

        # Output the CloudFront distribution domain name
        self.output_props = {}
        self.output_props["cloudfront_domain_name"] = distribution.domain_name

    @property
    def outputs(self):
        return self.output_props
