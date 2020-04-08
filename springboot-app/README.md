# springgroot-note

## local build and run
```
docker build -t spjpa .
docker run --name mysql -e MYSQL_ROOT_PASSWORD=password -d mysql:5.7
# need to run:
docker run -ti --link mysql:mysql mysql:5.7 bash
# and create a db
# CREATE database notes_app

docker run -ti --link mysql:mysql -e mysqlpassword=password -e springdatasourceurl='jdbc:mysql://mysql:3306/notes_app?autoReconnect=true&useUnicode=true&characterEncoding=UTF-8&allowMultiQueries=true&useSSL=false' -e springdatasourceusername=root -p 8080:8080 spjpa
```

### test:
http http://localhost:8080

docker run -ti --link mysql:mysql mysql:5.7 bash



## Prep
create an SSM "mysqlpassword" with kms encr using alias/aws/ssm

## CDK

npx cdk bootstrap

//base infra
npx cdk synth springgroot-base-infra |wc -l

// 3-4 minutes
npx cdk deploy springgroot-base-infra


//RDS
// 9 minutes
cdk deploy springgroot-db
//switch acct..don't wait for paint to dry.

// fg svc
// secret
// override
//healthcheck customize
//autoscaling

npx cdk deploy springgroot

while true; do aws cloudwatch put-metric-data --metric-name CDKTestingCustomMetric --namespace "CDK/Testing" --value $(( ( RANDOM % 10 ) + 180 )); sleep 60; done


CW Log Insight:
fields @timestamp, @message
|filter @message like /JVM running for/
| sort @timestamp desc

