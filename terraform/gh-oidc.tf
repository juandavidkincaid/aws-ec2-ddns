# ---------- GitHub OIDC Provider (existing) ----------

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

# ---------- IAM Role for GitHub Actions ----------

resource "aws_iam_role" "gh_actions" {
  name = "aws-ec2-ddns-gh-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = data.aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:ref:refs/tags/*"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "gh_actions_s3" {
  name = "s3-upload"
  role = aws_iam_role.gh_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.assets.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = aws_cloudfront_distribution.site.arn
      }
    ]
  })
}
