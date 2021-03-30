#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SpringbootFargateCdkStack } from '../lib/springboot-fargate-cdk-stack';

const app = new cdk.App();
const springbootApp = new SpringbootFargateCdkStack(app, 'SpringbootFargateCdkStack');
cdk.Tags.of(springbootApp).add('Project', 'Java-PRJ1');
