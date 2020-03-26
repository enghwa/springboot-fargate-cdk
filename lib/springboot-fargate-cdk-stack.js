"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = require("@aws-cdk/core");
const ec2 = require("@aws-cdk/aws-ec2");
const ecs = require("@aws-cdk/aws-ecs");
const rds = require("@aws-cdk/aws-rds");
const secretsmanager = require("@aws-cdk/aws-secretsmanager");
const ecs_patterns = require("@aws-cdk/aws-ecs-patterns");
class SpringbootFargateCdkStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Our VPC
        const vpc = new ec2.Vpc(this, "springboot-vpc", {
            maxAzs: 2,
            natGateways: 1
        });
        //Our ECS Fargate Cluster in this VPC
        const springbootEcsCluster = new ecs.Cluster(this, "springboot-ecs", {
            vpc,
            clusterName: "springbootCluster"
        });
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
        });
        dbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3306));
        const auroraServerlessRds = new rds.CfnDBCluster(this, "aurora-serverless", {
            engine: "aurora",
            engineMode: "serverless",
            engineVersion: "5.6",
            databaseName: 'notes_app',
            dbClusterIdentifier: "notes-app-dbcluster",
            masterUsername: 'dbaadmin',
            masterUserPassword: mySQLPassword.secretValue.toString(),
            dbSubnetGroupName: new rds.CfnDBSubnetGroup(this, "db-subnet-group", {
                dbSubnetGroupDescription: `notes_app_db_cluster subnet group`,
                subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE }).subnetIds
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
        });
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
        });
        //customize healthcheck on ALB
        springbootApp.targetGroup.configureHealthCheck({
            "port": 'traffic-port',
            "path": '/',
            "interval": cdk.Duration.seconds(5),
            "timeout": cdk.Duration.seconds(4),
            "healthyThresholdCount": 2,
            "unhealthyThresholdCount": 2,
            "healthyHttpCodes": "200,301,302"
        });
        //autoscaling - cpu
        const springbootAutoScaling = springbootApp.service.autoScaleTaskCount({
            maxCapacity: 6,
            minCapacity: 1
        });
        springbootAutoScaling.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 45,
            policyName: "cpu autoscaling",
            scaleInCooldown: cdk.Duration.seconds(30),
            scaleOutCooldown: cdk.Duration.seconds(30)
        });
    }
}
exports.SpringbootFargateCdkStack = SpringbootFargateCdkStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ByaW5nYm9vdC1mYXJnYXRlLWNkay1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNwcmluZ2Jvb3QtZmFyZ2F0ZS1jZGstc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBcUM7QUFDckMsd0NBQXlDO0FBQ3pDLHdDQUF5QztBQUN6Qyx3Q0FBeUM7QUFDekMsOERBQStEO0FBQy9ELDBEQUEyRDtBQUUzRCxNQUFhLHlCQUEwQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3RELFlBQVksS0FBb0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEIsVUFBVTtRQUNWLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDOUMsTUFBTSxFQUFFLENBQUM7WUFDVCxXQUFXLEVBQUUsQ0FBQztTQUNmLENBQUMsQ0FBQTtRQUNGLHFDQUFxQztRQUNyQyxNQUFNLG9CQUFvQixHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDbkUsR0FBRztZQUNILFdBQVcsRUFBRSxtQkFBbUI7U0FDakMsQ0FBQyxDQUFBO1FBQ0YsY0FBYztRQUNkLE1BQU0sYUFBYSxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ2hFLFVBQVUsRUFBRSx5QkFBeUI7WUFDckMsb0JBQW9CLEVBQUU7Z0JBQ3BCLGtCQUFrQixFQUFFLElBQUk7YUFDekI7U0FDRixDQUFDLENBQUM7UUFDSCxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRTtZQUMxRCxHQUFHO1lBQ0gsV0FBVyxFQUFFLHdDQUF3QztTQUN0RCxDQUFDLENBQUE7UUFDRixlQUFlLENBQUMs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LENBQUMsRUFBRSxDQUFDO1lBQ3pDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztTQUMzQyxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUEzRkQsOERBMkZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0IGVjMiA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1lYzInKTtcbmltcG9ydCBlY3MgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtZWNzJyk7XG5pbXBvcnQgcmRzID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXJkcycpO1xuaW1wb3J0IHNlY3JldHNtYW5hZ2VyID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXNlY3JldHNtYW5hZ2VyJyk7XG5pbXBvcnQgZWNzX3BhdHRlcm5zID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWVjcy1wYXR0ZXJucycpO1xuXG5leHBvcnQgY2xhc3MgU3ByaW5nYm9vdEZhcmdhdGVDZGtTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG4gICAgLy8gT3VyIFZQQ1xuICAgIGNvbnN0IHZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsIFwic3ByaW5nYm9vdC12cGNcIiwge1xuICAgICAgbWF4QXpzOiAyLFxuICAgICAgbmF0R2F0ZXdheXM6IDFcbiAgICB9KVxuICAgIC8vT3VyIEVDUyBGYXJnYXRlIENsdXN0ZXIgaW4gdGhpcyBWUENcbiAgICBjb25zdCBzcHJpbmdib290RWNzQ2x1c3RlciA9IG5ldyBlY3MuQ2x1c3Rlcih0aGlzLCBcInNwcmluZ2Jvb3QtZWNzXCIsIHtcbiAgICAgIHZwYyxcbiAgICAgIGNsdXN0ZXJOYW1lOiBcInNwcmluZ2Jvb3RDbHVzdGVyXCJcbiAgICB9KVxuICAgIC8vT3VyIERhdGFiYXNlXG4gICAgY29uc3QgbXlTUUxQYXNzd29yZCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0RCU2VjcmV0Jywge1xuICAgICAgc2VjcmV0TmFtZTogXCJTcHJpbmdib290REItREJQYXNzd29yZFwiLFxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcbiAgICAgICAgZXhjbHVkZVB1bmN0dWF0aW9uOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gICAgY29uc3QgZGJTZWN1cml0eUdyb3VwID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKHRoaXMsICdkYnNnJywge1xuICAgICAgdnBjLFxuICAgICAgZGVzY3JpcHRpb246IFwic3ByaW5nYm9vdCBhcHAgZGF0YWJhc2Ugc2VjdXJpdHkgZ3JvdXBcIlxuICAgIH0pXG4gICAgZGJTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKGVjMi5QZWVyLmFueUlwdjQoKSwgZWMyLlBvcnQudGNwKDMzMDYpKTtcbiAgICBjb25zdCBhdXJvcmFTZXJ2ZXJsZXNzUmRzID0gbmV3IHJkcy5DZm5EQkNsdXN0ZXIodGhpcywgXCJhdXJvcmEtc2VydmVybGVzc1wiLCB7XG4gICAgICBlbmdpbmU6IFwiYXVyb3JhXCIsXG4gICAgICBlbmdpbmVNb2RlOiBcInNlcnZlcmxlc3NcIixcbiAgICAgIGVuZ2luZVZlcnNpb246IFwiNS42XCIsXG4gICAgICBkYXRhYmFzZU5hbWU6ICdub3Rlc19hcHAnLFxuICAgICAgZGJDbHVzdGVySWRlbnRpZmllcjogXCJub3Rlcy1hcHAtZGJjbHVzdGVyXCIsXG4gICAgICBtYXN0ZXJVc2VybmFtZTogJ2RiYWFkbWluJyxcbiAgICAgIG1hc3RlclVzZXJQYXNzd29yZDogbXlTUUxQYXNzd29yZC5zZWNyZXRWYWx1ZS50b1N0cmluZygpLFxuXG4gICAgICBkYlN1Ym5ldEdyb3VwTmFtZTogbmV3IHJkcy5DZm5EQlN1Ym5ldEdyb3VwKHRoaXMsIFwiZGItc3VibmV0LWdyb3VwXCIsIHtcbiAgICAgICAgZGJTdWJuZXRHcm91cERlc2NyaXB0aW9uOiBgbm90ZXNfYXBwX2RiX2NsdXN0ZXIgc3VibmV0IGdyb3VwYCxcbiAgICAgICAgc3VibmV0SWRzOiB2cGMuc2VsZWN0U3VibmV0cyh7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEUgfSkuc3VibmV0SWRzXG4gICAgICB9KS5yZWYsXG4gICAgICB2cGNTZWN1cml0eUdyb3VwSWRzOiBbZGJTZWN1cml0eUdyb3VwLnNlY3VyaXR5R3JvdXBJZF0sXG5cbiAgICAgIHN0b3JhZ2VFbmNyeXB0ZWQ6IHRydWUsXG4gICAgICBkZWxldGlvblByb3RlY3Rpb246IGZhbHNlLFxuICAgICAgYmFja3VwUmV0ZW50aW9uUGVyaW9kOiAxNCxcblxuICAgICAgc2NhbGluZ0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgYXV0b1BhdXNlOiB0cnVlLFxuICAgICAgICBzZWNvbmRzVW50aWxBdXRvUGF1c2U6IDkwMCxcbiAgICAgICAgbWluQ2FwYWNpdHk6IDEsXG4gICAgICAgIG1heENhcGFjaXR5OiAyXG4gICAgICB9XG4gICAgfSlcbiAgICAvL091ciBhcHBsaWNhdGlvbiBpbiBBV1MgRmFyZ2F0ZSArIEFMQlxuICAgIGNvbnN0IHNwcmluZ2Jvb3RBcHAgPSBuZXcgZWNzX3BhdHRlcm5zLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VkRmFyZ2F0ZVNlcnZpY2UodGhpcywgJ3NwcmluZ2Jvb3QgYXBwIHN2YycsIHtcbiAgICAgIGNsdXN0ZXI6IHNwcmluZ2Jvb3RFY3NDbHVzdGVyLFxuICAgICAgZGVzaXJlZENvdW50OiAxLFxuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlMaW1pdE1pQjogNTEyLFxuICAgICAgdGFza0ltYWdlT3B0aW9uczoge1xuICAgICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21Bc3NldCgnLi9zcHJpbmdib290LWFwcCcpLFxuICAgICAgICBjb250YWluZXJQb3J0OiA4MDgwLFxuICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICdzcHJpbmdkYXRhc291cmNldXJsJzogYGpkYmM6bXlzcWw6Ly9gICsgYXVyb3JhU2VydmVybGVzc1Jkcy5hdHRyRW5kcG9pbnRBZGRyZXNzICsgYDozMzA2L25vdGVzX2FwcD9hdXRvUmVjb25uZWN0PXRydWUmdXNlVW5pY29kZT10cnVlJmNoYXJhY3RlckVuY29kaW5nPVVURi04JmFsbG93TXVsdGlRdWVyaWVzPXRydWVgLFxuICAgICAgICAgICdzcHJpbmdkYXRhc291cmNldXNlcm5hbWUnOiAnZGJhYWRtaW4nXG4gICAgICAgIH0sXG4gICAgICAgIHNlY3JldHM6IHtcbiAgICAgICAgICAnbXlzcWxwYXNzd29yZCc6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKG15U1FMUGFzc3dvcmQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIC8vY3VzdG9taXplIGhlYWx0aGNoZWNrIG9uIEFMQlxuICAgIHNwcmluZ2Jvb3RBcHAudGFyZ2V0R3JvdXAuY29uZmlndXJlSGVhbHRoQ2hlY2soe1xuICAgICAgXCJwb3J0XCI6ICd0cmFmZmljLXBvcnQnLFxuICAgICAgXCJwYXRoXCI6ICcvJyxcbiAgICAgIFwiaW50ZXJ2YWxcIjogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXG4gICAgICBcInRpbWVvdXRcIjogY2RrLkR1cmF0aW9uLnNlY29uZHMoNCksXG4gICAgICBcImhlYWx0aHlUaHJlc2hvbGRDb3VudFwiOiAyLFxuICAgICAgXCJ1bmhlYWx0aHlUaHJlc2hvbGRDb3VudFwiOiAyLFxuICAgICAgXCJoZWFsdGh5SHR0cENvZGVzXCI6IFwiMjAwLDMwMSwzMDJcIlxuICAgIH0pXG4gICAgLy9hdXRvc2NhbGluZyAtIGNwdVxuICAgIGNvbnN0IHNwcmluZ2Jvb3RBdXRvU2NhbGluZyA9IHNwcmluZ2Jvb3RBcHAuc2VydmljZS5hdXRvU2NhbGVUYXNrQ291bnQoe1xuICAgICAgbWF4Q2FwYWNpdHk6IDYsXG4gICAgICBtaW5DYXBhY2l0eTogMVxuICAgIH0pXG4gICAgc3ByaW5nYm9vdEF1dG9TY2FsaW5nLnNjYWxlT25DcHVVdGlsaXphdGlvbignQ3B1U2NhbGluZycsIHtcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNDUsXG4gICAgICBwb2xpY3lOYW1lOiBcImNwdSBhdXRvc2NhbGluZ1wiLFxuICAgICAgc2NhbGVJbkNvb2xkb3duOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBzY2FsZU91dENvb2xkb3duOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICB9KVxuICB9XG59XG4iXX0=