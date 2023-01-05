# Welcome to your CDK TypeScript project

You should explore the contents of this project. It demonstrates a CDK app with an instance of a stack (`AwsCdkElasticbeanstalkStack`)
which contains an Amazon SQS queue that is subscribed to an Amazon SNS topic.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

### Prerequisites
- AWS Account: prepare your personal AWS Account through
- AWS CDK CLI: The AWS CDK Toolkit, the CLI command cdk , is the primary tool for interacting with your AWS CDK app.

In this project root directory, execute the following commands:

* `npn install`
* `cdk bootstrap` 
This command is optional. If this is the first deployment in your Account/Region through CDK, you must execute once at the first time.

* `cdk list`
```
❯ cdk list
RepoStack
PipelineStack
```

### Deployment Steps
* First of all, we need to deploy a repository stack. Because the repository will trigger next step in the pipeline.
`cdk deploy RepoStack`
* Deploy the pipeline to deploy ruby application automatically.
`cdk deploy PipelineStack`