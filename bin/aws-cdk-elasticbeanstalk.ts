#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ElasticBeanstalkStack } from '../lib/elasticbeanstalk-stack';
import { RepoStack } from '../lib/repo-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

const repo = new RepoStack(app, 'RepoStack', {repositoryName : 'testrepo'});
new PipelineStack(app, 'PipelineStack', {
    repo: repo.getGitRepo(),
    ecrRepo: repo.getEcrRepo(),
    containerName: 'testContainter',
    applicationName: 'eb-deploy',//'test',
    environmentName: 'eb-deploy-dev',//'stage'
});

