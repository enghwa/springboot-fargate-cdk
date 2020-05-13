
This repo is about deploying spring boot app on AWS Fargate using AWS CDK.
Are u looking for similar content on ASP.NET Core?

Come tune in at Twitch 14 May 2020 https://www.twitch.tv/code4kopi and we will cover .Net Core ! Subscribe and be notify when we stream.
```
CI/CD for ASP.NET Core 3 apps on Kubernetes on Twitch 14/May 2020 3pm GMT+8
In this session, we will learn how to provision a Amazon EKS cluster using AWS Cloud Development Kit (CDK), 
setup CI/CD pipeline and deploy a ASP.NET Core application to Kubernetes.
We will also learn how to setup Operation dashboard and perform troubleshooting.
```

## Get Started

##

```bash
npm i
npm install @aws-cdk/aws-ecs @aws-cdk/aws-ec2 @aws-cdk/aws-ecs-patterns @aws-cdk/aws-rds @aws-cdk/aws-secretsmanager
npx cdk@1.30.0 synth
npx cdk@1.30.0 deploy 

```

## slides
aurora serverless -> https://aws.amazon.com/rds/aurora/serverless/
fargate sizing -> https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html
