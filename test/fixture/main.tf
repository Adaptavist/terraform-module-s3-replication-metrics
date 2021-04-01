/*
  Test Fixture
*/

variable "region" {
  default = "us-east-1"
}

provider "aws" {
  region = var.region
}

terraform {
  backend "s3" {
    bucket         = "product-sandbox-terraform-state-management"
    dynamodb_table = "product-sandbox-terraform-state-management"
    region         = "us-east-1"
    encrypt        = "true"
  }
}

locals {
  namespace = "tf-tests"
  stage     = "test"
  name      = "s3-replication-test"
  tags = {
    "Avst:BusinessUnit" : "platform"
    "Avst:Team" : "cloud-infra"
    "Avst:CostCenter" : "foo"
    "Avst:Project" : "foo"
    "Avst:Stage:Type" : "sandbox"
    "Avst:Stage:Name" : "sandbox"
  }
}

data "aws_caller_identity" "current" {}

resource "random_string" "random" {
  length  = 8
  special = false
  upper   = false
}

resource "aws_s3_bucket" "target_bucket" {
  bucket = "target-${random_string.random.id}"

  versioning {
    enabled = true
  }
}

data "aws_iam_policy_document" "bucket_replication_policies" {

  statement {
    sid    = "bucket-replication-object"
    effect = "Allow"
    actions = [
      "s3:ReplicateObject",
      "s3:ReplicateDelete",
      "s3:ObjectOwnerOverrideToBucketOwner",
      "s3:GetObjectVersionForReplication",
      "s3:ReplicateTags"
    ]
    resources = ["${aws_s3_bucket.target_bucket.arn}/*"]

    principals {
      identifiers = ["*"]
      type        = "AWS"
    }
  }

  statement {
    sid    = "bucket-replication"
    effect = "Allow"
    actions = [
      "s3:GetBucketVersioning",
      "s3:PutBucketVersioning"
    ]
    resources = [aws_s3_bucket.target_bucket.arn]

    principals {
      identifiers = ["*"]
      type        = "AWS"
    }
  }
}

data "aws_iam_policy_document" "assume_role_policy" {
  statement {
    effect = "Allow"

    actions = [
      "sts:AssumeRole"
    ]

    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "replication_role" {
  name               = "replication-${random_string.random.id}"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json
}

data "aws_iam_policy_document" "replication_policy" {
  statement {
    effect = "Allow"

    actions = [
      "s3:GetReplicationConfiguration",
      "s3:ListBucket"
    ]

    resources = [aws_s3_bucket.source_bucket.arn]
  }

  statement {
    effect = "Allow"

    actions = [
      "s3:GetObjectVersion",
      "s3:GetObjectVersionForReplication",
      "s3:GetObjectVersionAcl"
    ]

    resources = ["${aws_s3_bucket.source_bucket.arn}/*"]
  }

  statement {
    effect = "Allow"

    actions = [
      "s3:ReplicateObject",
      "s3:ReplicateDelete",
      "s3:ObjectOwnerOverrideToBucketOwner",
      "s3:ReplicateTags",
      "s3:GetObjectVersionTagging"
    ]

    resources = ["${aws_s3_bucket.target_bucket.arn}/*"]
  }
}

resource "aws_iam_policy" "replication_policy" {
  name   = "${aws_s3_bucket.source_bucket.id}-replication-${random_string.random.id}"
  policy = data.aws_iam_policy_document.replication_policy.json
}

resource "aws_iam_role_policy_attachment" "replication" {
  role       = aws_iam_role.replication_role.name
  policy_arn = aws_iam_policy.replication_policy.arn
}

resource "aws_s3_bucket" "source_bucket" {
  bucket = "source-${random_string.random.id}"
  acl    = "private"

  versioning {
    enabled = true
  }

  replication_configuration {
    role = aws_iam_role.replication_role.arn
    rules {
      id     = "default-replication-rule"
      status = "Enabled"

      destination {
        bucket        = aws_s3_bucket.target_bucket.arn
        storage_class = "STANDARD"
        access_control_translation {
          owner = "Destination"
        }
        account_id = data.aws_caller_identity.current.account_id
      }
    }
  }
}

resource "aws_s3_bucket_policy" "replicated_bucket_polices" {
  bucket = aws_s3_bucket.target_bucket.id
  policy = data.aws_iam_policy_document.bucket_replication_policies.json
}

module "s3_replication_metric" {
  source = "../.."

  bucket_name = aws_s3_bucket.source_bucket.id
  namespace   = local.namespace
  stage       = local.stage
  tags        = local.tags
}
