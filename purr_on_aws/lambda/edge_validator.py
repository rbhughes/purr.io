def handler(event, context):
    # DOMAIN = "canvasenergy.com"

    request = event["Records"][0]["cf"]["request"]
    headers = request["headers"]
    headers["x-lambda-invoked"] = [{"key": "X-Lambda-Invoked", "value": "true"}]

    client_ip = event["Records"][0]["cf"]["request"]["clientIp"]
    print("eeeeeeeeeeee")
    print(event)
    print("------")
    print("client_ip", client_ip)
    print("eeeeeeeeeeee")

    # host_header = headers.get("host", [{}])[0].get("value", "")
    # print("************ IN EDGE HOST HANDLER")
    # if host_header != DOMAIN:
    #     return {
    #         "status": "403",
    #         "statusDescription": "Forbidden",
    #         "headers": {"content-type": [{"value": "text/plain"}]},
    #         "body": "Invalid Host header",
    #     }

    return request
