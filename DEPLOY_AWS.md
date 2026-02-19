# AfriCoin Backend - AWS Deployment Guide

## Prerequisites

- AWS account with appropriate IAM permissions
- AWS CLI v2 installed and configured
- Docker installed
- Terraform or CloudFormation templates available

---

## Deployment Options

### Option 1: Elastic Beanstalk (Recommended for Quick Setup)

#### Step 1: Install EB CLI
```bash
pip install awsebcli
```

#### Step 2: Initialize EB Application
```bash
eb init -p node.js-18 africoin-backend --region us-east-1
```

#### Step 3: Create Environment
```bash
eb create africoin-prod --instance-type t3.medium --scale 2
```

#### Step 4: Configure Environment Variables
```bash
# Create .ebextensions/options.config
mkdir -p .ebextensions
```

Create `.ebextensions/01_options.config`:
```yaml
option_settings:
  aws:autoscaling:launchconfiguration:
    InstanceType: t3.medium
  aws:elasticbeanstalk:enviroment:
    EnvironmentType: LoadBalanced
    LoadBalancerType: application
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8081

commands:
  01_install_dependencies:
    command: npm install --production
  commands_02_npm_build:
    command: npm run build
  commands_03_migrate:
    command: npm run db:migrate
```

#### Step 5: Deploy Application
```bash
eb deploy
```

#### Step 6: Monitor Deployment
```bash
eb status
eb logs
eb open  # Opens app in browser
```

---

### Option 2: EC2 with Docker

#### Step 1: Launch EC2 Instance
```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name africoin-key \
  --security-groups africoin-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=africoin-api}]'
```

#### Step 2: Configure Security Group
```bash
aws ec2 authorize-security-group-ingress \
  --group-name africoin-sg \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name africoin-sg \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP/32
```

#### Step 3: SSH and Setup
```bash
ssh -i africoin-key.pem ec2-user@your-instance-ip

# Install Docker
sudo yum update -y
sudo yum install docker -y
sudo usermod -a -G docker ec2-user

# Clone and start application
git clone https://github.com/your-repo/africoin-backend.git
cd africoin-backend
sudo docker-compose up -d
```

#### Step 4: Setup CloudWatch Agent
```bash
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm
```

---

### Option 3: ECS Fargate (Containerized)

#### Step 1: Create ECR Repository
```bash
aws ecr create-repository --repository-name africoin-backend --region us-east-1
```

#### Step 2: Build and Push Docker Image
```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t africoin-backend:latest .

# Tag image
docker tag africoin-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/africoin-backend:latest

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/africoin-backend:latest
```

#### Step 3: Create ECS Cluster
```bash
aws ecs create-cluster --cluster-name africoin-cluster
```

#### Step 4: Create Task Definition
Create `task-definition.json`:
```json
{
  "family": "africoin-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "africoin-api",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/africoin-backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "hostPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:africoin/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:africoin/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/africoin-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Step 5: Register Task Definition
```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

#### Step 6: Create Service
```bash
aws ecs create-service \
  --cluster africoin-cluster \
  --service-name africoin-service \
  --task-definition africoin-backend:1 \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=africoin-api,containerPort=3001
```

---

### Option 4: Lambda (Serverless) - API Gateway + Lambda

#### Step 1: Create Lambda Function
```bash
aws lambda create-function \
  --function-name africoin-backend \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-role \
  --handler index.handler \
  --zip-file fileb://backend.zip \
  --timeout 30 \
  --memory-size 512
```

#### Step 2: Create API Gateway
```bash
# Create REST API
API_ID=$(aws apigateway create-rest-api --name africoin-api --query 'id' --output text)

# Get root resource
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text)

# Create resource
RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part api \
  --query 'id' --output text)

# Create method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method ANY \
  --authorization-type NONE
```

---

## Database Setup (RDS)

### Create PostgreSQL Database
```bash
aws rds create-db-instance \
  --db-instance-identifier africoin-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password YourPassword123! \
  --allocated-storage 20 \
  --publicly-accessible false \
  --multi-az false
```

### Wait for Database to be Available
```bash
aws rds wait db-instance-available --db-instance-identifier africoin-db
```

### Get Connection Endpoint
```bash
aws rds describe-db-instances \
  --db-instance-identifier africoin-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

---

## Cache Setup (ElastiCache Redis)

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id africoin-cache \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --port 6379
```

---

## Load Balancer Setup (ALB)

```bash
# Create load balancer
aws elbv2 create-load-balancer \
  --name africoin-alb \
  --subnets subnet-12345 subnet-67890 \
  --security-groups sg-12345

# Create target group
aws elbv2 create-target-group \
  --name africoin-targets \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-12345

# Register targets
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=i-12345
```

---

## Auto Scaling Setup

### Create Launch Template
```bash
aws ec2 create-launch-template \
  --launch-template-name africoin-template \
  --version-description "AfriCoin backend template" \
  --launch-template-data file://launch-template.json
```

Create `launch-template.json`:
```json
{
  "ImageId": "ami-0c55b159cbfafe1f0",
  "InstanceType": "t3.medium",
  "KeyName": "africoin-key",
  "SecurityGroupIds": ["sg-12345"],
  "UserData": "base64encodedstartupscript"
}
```

### Create Auto Scaling Group
```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name africoin-asg \
  --launch-template LaunchTemplateName=africoin-template,Version='$Latest' \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 3 \
  --load-balancer-names africoin-alb \
  --availability-zones us-east-1a us-east-1b us-east-1c
```

### Create Scaling Policies
```bash
# Scale up policy
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name africoin-asg \
  --policy-name scale-up \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration \
    TargetValue=70,PredefinedMetricSpecification='{PredefinedMetricType=ASGAverageCPUUtilization}'

# Scale down policy
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name africoin-asg \
  --policy-name scale-down \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration \
    TargetValue=30,PredefinedMetricSpecification='{PredefinedMetricType=ASGAverageCPUUtilization}'
```

---

## Domain and SSL Setup

### Request SSL Certificate (ACM)
```bash
aws acm request-certificate \
  --domain-name api.africoin.com \
  --subject-alternative-names www.api.africoin.com \
  --validation-method DNS \
  --region us-east-1
```

### Create Route 53 Hosted Zone
```bash
aws route53 create-hosted-zone \
  --name africoin.com \
  --caller-reference $(date +%s)
```

### Add DNS Records
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z12345 \
  --change-batch file://change-batch.json
```

Create `change-batch.json`:
```json
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.africoin.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "africoin-alb-123456.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
```

---

## Monitoring and Logging

### CloudWatch Logs
```bash
aws logs create-log-group --log-group-name /aws/africoin/backend

aws logs put-retention-policy \
  --log-group-name /aws/africoin/backend \
  --retention-in-days 30
```

### Create CloudWatch Alarms
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name africoin-high-cpu \
  --alarm-description "Alert when CPU is high" \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=AutoScalingGroupName,Value=africoin-asg \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

aws cloudwatch put-metric-alarm \
  --alarm-name africoin-high-error-rate \
  --alarm-description "Alert when error rate is high" \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=LoadBalancer,Value=app/africoin-alb/... \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:alerts
```

---

## Backup and Disaster Recovery

### RDS Automated Backups
```bash
aws rds modify-db-instance \
  --db-instance-identifier africoin-db \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00"
```

### S3 Bucket for Backups
```bash
aws s3 mb s3://africoin-backups --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket africoin-backups \
  --versioning-configuration Status=Enabled
```

---

## CI/CD Pipeline (CodePipeline + CodeBuild)

### Create CodeBuild Project
```bash
aws codebuild create-project \
  --name africoin-build \
  --source type=GITHUB,location=https://github.com/your-repo/africoin-backend.git,gitCloneDepth=1 \
  --artifacts type=CODEPIPELINE \
  --environment type=LINUX_CONTAINER,image=aws/codebuild/nodejs:14,computeType=BUILD_GENERAL1_MEDIUM \
  --service-role arn:aws:iam::ACCOUNT_ID:role/codebuild-role
```

### Create CodePipeline
```bash
aws codepipeline create-pipeline \
  --cli-input-json file://pipeline.json
```

Create `pipeline.json`:
```json
{
  "pipeline": {
    "name": "africoin-pipeline",
    "roleArn": "arn:aws:iam::ACCOUNT_ID:role/codepipeline-role",
    "stages": [
      {
        "name": "Source",
        "actions": [
          {
            "name": "SourceAction",
            "actionTypeId": {
              "category": "Source",
              "owner": "GitHub",
              "provider": "GitHub",
              "version": "1"
            },
            "configuration": {
              "Owner": "your-github-user",
              "Repo": "africoin-backend",
              "Branch": "main",
              "OAuthToken": "YOUR_GITHUB_TOKEN"
            },
            "outputArtifacts": [
              {
                "name": "SourceOutput"
              }
            ]
          }
        ]
      },
      {
        "name": "Build",
        "actions": [
          {
            "name": "BuildAction",
            "actionTypeId": {
              "category": "Build",
              "owner": "AWS",
              "provider": "CodeBuild",
              "version": "1"
            },
            "inputArtifacts": [
              {
                "name": "SourceOutput"
              }
            ],
            "outputArtifacts": [
              {
                "name": "BuildOutput"
              }
            ],
            "configuration": {
              "ProjectName": "africoin-build"
            }
          }
        ]
      },
      {
        "name": "Deploy",
        "actions": [
          {
            "name": "DeployAction",
            "actionTypeId": {
              "category": "Deploy",
              "owner": "AWS",
              "provider": "ElasticBeanstalk",
              "version": "1"
            },
            "inputArtifacts": [
              {
                "name": "BuildOutput"
              }
            ],
            "configuration": {
              "ApplicationName": "africoin",
              "EnvironmentName": "africoin-prod"
            }
          }
        ]
      }
    ]
  }
}
```

---

## Cost Optimization

1. **Use Reserved Instances** for long-term workloads
2. **Enable Auto Scaling** to avoid overprovisioning
3. **Database**: Start with db.t3.micro, scale up as needed
4. **ElastiCache**: Use cache.t3.micro for development
5. **Spot Instances**: Use for non-critical workloads (up to 90% discount)
6. **Monitor costs** with AWS Cost Explorer

---

## Production Checklist

- [ ] Enable MFA on AWS account
- [ ] Use IAM roles (never hardcode AWS credentials)
- [ ] Enable VPC Flow Logs
- [ ] Enable CloudTrail
- [ ] Set up CloudWatch alarms
- [ ] Enable RDS Enhanced Monitoring
- [ ] Configure backup retention policies
- [ ] Enable S3 versioning and encryption
- [ ] Use Secrets Manager for sensitive data
- [ ] Configure WAF (Web Application Firewall)
- [ ] Set up CloudFront CDN
- [ ] Test disaster recovery
- [ ] Document runbooks

---

## Troubleshooting

### Check Application Logs
```bash
aws logs tail /aws/africoin/backend --follow
```

### Check EC2 Instance Status
```bash
aws ec2 describe-instance-status --instance-ids i-12345
```

### Check ECS Task Logs
```bash
aws logs tail /ecs/africoin-backend --follow
```

### Database Connection Issues
```bash
# Test connection
psql -h africoin-db.XXXX.us-east-1.rds.amazonaws.com -U admin -d africoindb
```

---

## Support

For issues, contact AWS Support or refer to AWS documentation at https://docs.aws.amazon.com/

---

## Migration from Other Providers

To migrate from Azure/Heroku/DigitalOcean:

1. Export database dump
2. Backup application code
3. Create new RDS instance
4. Restore database dump
5. Deploy new backend
6. Update DNS records
7. Monitor for issues
