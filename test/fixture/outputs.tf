output "random_id" {
  value       = random_string.random.result
  description = "random id which has been used for internal resource generation, this is exposed for use in any other related resources."
}

output "bucket_name" {
  value       = aws_s3_bucket.source_bucket.id
  description = "Bucket name of the bucket which has had the replication metrics enabled."
}

output "region" {
  value       = var.region
  description = "Region the infra has been created in"
}

