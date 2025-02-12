import aws_cdk as core
import aws_cdk.assertions as assertions

from purr_on_aws.purr_on_aws_stack import PurrOnAwsStack

# example tests. To run these tests, uncomment this file along with the example
# resource in purr_on_aws/purr_on_aws_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = PurrOnAwsStack(app, "purr-on-aws")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
