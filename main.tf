data "aws_region" "current" {}

data "aws_s3_bucket" "target_bucket" {
  bucket = var.bucket_name
}

locals {
  lambda_inputs = {
    bucket_name = var.bucket_name
  }

  lambda_outputs = []

  stageTag = {
    "Avst:Stage:Name" = var.stage
  }

  finalTags = merge(var.tags, local.stageTag)
}

module "aws-lambda" {
  source  = "Adaptavist/aws-lambda/module"
  version = "1.8.1"

  function_name   = "set-metrics-${var.bucket_name}"
  description     = "A lambda which enables replication metrics on a bucket"
  lambda_code_dir = "${path.module}/lambda/dist"
  handler         = "app.handler"
  runtime         = "nodejs12.x"
  timeout         = "300"
  include_region  = true

  namespace = var.namespace
  stage     = var.stage
  tags      = local.finalTags
}

data "aws_iam_policy_document" "update_bucket_replication" {
  statement {

    actions = [
      "s3:PutReplicationConfiguration",
      "s3:PutMetricsConfiguration",
      "s3:GetReplicationConfiguration",
      "s3:GetMetricsConfiguration"
    ]

    resources = [
      data.aws_s3_bucket.target_bucket.arn
    ]
  }

  statement {
    actions = [
      "iam:PassRole"
    ]

    resources = [
      "*"
    ]
  }
}

resource "aws_iam_role_policy" "lambda_exec_role_policy" {
  name = "secret_generator_lambda_role_policy"
  role = module.aws-lambda.lambda_role_name

  policy = data.aws_iam_policy_document.update_bucket_replication.json
}

data "template_file" "cf_document" {
  template = file("${path.module}/template/cloudformation_custom_resource.tpl")
  vars = {
    properties = jsonencode(merge(map("ServiceToken", module.aws-lambda.lambda_arn), local.lambda_inputs))
    outputs    = join(",", formatlist("\"%s\":{\"Value\": {\"Fn::GetAtt\":[\"ExecuteLambda\", \"%s\"]}}", local.lambda_outputs, local.lambda_outputs))
  }
}

resource "aws_cloudformation_stack" "execute_lambda" {
  name = "update-bucket-replication-metrics${replace(var.bucket_name, "/[:/.]/", "-")}-execution-stack"

  timeout_in_minutes = "3"
  template_body      = data.template_file.cf_document.rendered
  tags               = local.finalTags

  depends_on = [aws_iam_role_policy.lambda_exec_role_policy]
}
