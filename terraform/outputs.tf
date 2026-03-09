output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.site.id
}

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.assets.id
}

output "gh_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions (set as repo variable AWS_ROLE_ARN)"
  value       = aws_iam_role.gh_actions.arn
}

output "site_url" {
  description = "Public URL for the install site"
  value       = "https://${var.subdomain}.${var.domain_name}"
}
