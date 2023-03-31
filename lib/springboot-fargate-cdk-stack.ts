import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class SpringbootFargateCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);

    // Our VPC
    const vpc = new ec2.Vpc(this, "springboot-vpc", {
      maxAzs: 2,
      natGateways: 1
    })
    //Our ECS Fargate Cluster in this VPC
    const springbootEcsCluster = new ecs.Cluster(this, "springboot-ecs", {
      vpc,
      clusterName: "springbootCluster"
    })
    //Our Database
    const mySQLPassword = new secretsmanager.Secret(this, 'DBSecret', {
      secretName: "SpringbootDB-DBPassword",
      generateSecretString: {
        excludePunctuation: true
      }
    });
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'dbsg', {
      vpc,
      description: "springboot app database security group"
    })
    dbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3306));
    const auroraServerlessRds = new rds.CfnDBCluster(this, "aurora-serverless", {
      engine: "aurora-mysql",
      engineMode: "serverless",
      engineVersion: "5.7.mysql_aurora.2.08.2",
      databaseName: 'notes_app',
      dbClusterIdentifier: "notes-app-dbcluster",
      masterUsername: 'dbaadmin',
      masterUserPassword: mySQLPassword.secretValue.unsafeUnwrap(),

      dbSubnetGroupName: new rds.CfnDBSubnetGroup(this, "db-subnet-group", {
        dbSubnetGroupDescription: `notes_app_db_cluster subnet group`,
        subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds
      }).ref,
      vpcSecurityGroupIds: [dbSecurityGroup.securityGroupId],

      storageEncrypted: true,
      deletionProtection: false,
      backupRetentionPeriod: 14,

      scalingConfiguration: {
        autoPause: true,
        secondsUntilAutoPause: 900,
        minCapacity: 1,
        maxCapacity: 2
      }
    })
    //Our application in AWS Fargate + ALB
    const springbootApp = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'springboot app svc', {
      cluster: springbootEcsCluster,
      desiredCount: 1,
      cpu: 256,
      memoryLimitMiB: 512,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('./springboot-app'),
        containerPort: 8080,
        environment: {
          'springdatasourceurl': `jdbc:mysql://` + auroraServerlessRds.attrEndpointAddress + `:3306/notes_app?autoReconnect=true&useUnicode=true&characterEncoding=UTF-8&allowMultiQueries=true`,
          'springdatasourceusername': 'dbaadmin'
        },
        secrets: {
          'mysqlpassword': ecs.Secret.fromSecretsManager(mySQLPassword)
        }
      }
    })
    //customize healthcheck on ALB
    springbootApp.targetGroup.configureHealthCheck({
      "port": 'traffic-port',
      "path": '/',
      "interval": cdk.Duration.seconds(5),
      "timeout": cdk.Duration.seconds(4),
      "healthyThresholdCount": 2,
      "unhealthyThresholdCount": 2,
      "healthyHttpCodes": "200,301,302"
    })
    //autoscaling - cpu
    const springbootAutoScaling = springbootApp.service.autoScaleTaskCount({
      maxCapacity: 6,
      minCapacity: 1
    })
    springbootAutoScaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 45,
      policyName: "cpu autoscaling",
      scaleInCooldown: cdk.Duration.seconds(30),
      scaleOutCooldown: cdk.Duration.seconds(30)
    })
  }
}
