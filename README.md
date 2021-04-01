## module-s3-replication-metrics.

Plugs gap which is Terraform does not currently support enabling S3 replication metrics on a Bucket,
this is tracked by [this issue](https://github.com/hashicorp/terraform-provider-aws/issues/10974).
This module uses a Lambda to enable the metrics using the AWS SDK. Before this module is used the buckets should be
setup and the replication should also be setup.

## Providers

| Name | Version |
|------|---------|
| aws | n/a |
| template | n/a |

## Modules

| Name | Source | Version |
|------|--------|---------|
| aws-lambda | Adaptavist/aws-lambda/module | 1.8.1 |

## Resources

| Name |
|------|
| [aws_cloudformation_stack](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudformation_stack) |
| [aws_iam_policy_document](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) |
| [aws_iam_role_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy) |
| [aws_region](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region) |
| [aws_s3_bucket](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/s3_bucket) |
| [template_file](https://registry.terraform.io/providers/hashicorp/template/latest/docs/data-sources/file) |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| bucket\_name | n/a | `string` | n/a | yes |
| namespace | n/a | `string` | n/a | yes |
| regions | n/a | `list(string)` | `[]` | no |
| stage | n/a | `string` | n/a | yes |
| tags | n/a | `map(string)` | n/a | yes |

## Outputs

No output.
