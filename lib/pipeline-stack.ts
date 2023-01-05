import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codecommit from 'aws-cdk-lib/aws-codecommit'
import * as codebuild from 'aws-cdk-lib/aws-codebuild'
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline'
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk'

interface PipelineStackProps extends StackProps {
    repo: codecommit.IRepository,
    ecrRepo: ecr.IRepository,
    containerName: string,
    dockerfileName?: string,
    appPath?: string,
    applicationName: string,
    environmentName: string,
}

export class PipelineStack extends Stack {
    constructor(scope: Construct, id: string, props: PipelineStackProps) {
        super(scope, id, props);
        
        const sourceOutput = new codepipeline.Artifact();
        const sourceAction = new actions.CodeCommitSourceAction({
            actionName: 'CodeCommit_SourceMerge',
            repository: props.repo,
            output: sourceOutput,
            branch: 'master'
        })
        
        const buildOutput = new codepipeline.Artifact();
        const buildAction = new actions.CodeBuildAction({
            actionName: 'CodeBuild_DockerBuild',
            project: this.createBuildProject(props),
            input: sourceOutput,
            outputs: [buildOutput],
        });

        const approvalAction = new actions.ManualApprovalAction({
            actionName: 'Manual_Approve',
        });

        // const app = new elasticbeanstalk.CfnApplication(this, "EBApplication", {
        //   applicationName: props.applicationName
        // });
        
        // // Create an app version from the S3 asset defined earlier
        // const appVersionProps = new elasticbeanstalk.CfnApplicationVersion(this, 'AppVersion', {
        //     applicationName: props.applicationName,
        //     sourceBundle: {
        //         s3Bucket: webAppZipArchive.s3BucketName,
        //         s3Key: webAppZipArchive.s3ObjectKey,
        //     },
        // });
        
        // // Make sure that Elastic Beanstalk app exists before creating an app version
        // appVersionProps.addDependsOn(app);
        
        // const elbEnv = new elasticbeanstalk.CfnEnvironment(this, "EBEnvironment", {
        //   environmentName: props.environmentName,
        //   applicationName: props.applicationName,
        //   solutionStackName: "64bit Amazon Linux 2 v3.5.3 running Docker"
        // });
        
        // // Make sure that Elastic Beanstalk app exists before creating an app version
        // elbEnv.addDependsOn(app);

        const deployAction = new actions.ElasticBeanstalkDeployAction({
            actionName: 'Deploy',
            applicationName: props.applicationName,
            environmentName: props.environmentName,
            input: buildOutput,
            // imageFile: new codepipeline.ArtifactPath(buildOutput, 'imagedefinitions.json'),
            // role: deployRole,
        });
    

        new codepipeline.Pipeline(this, 'EBServicePipeline', {
            pipelineName: `TestPipeline`,
            enableKeyRotation: true,
            stages: [
                {
                    stageName: 'Source',
                    actions: [sourceAction],
                },
                {
                    stageName: 'Build',
                    actions: [buildAction],
                },
                {
                    stageName: 'Approve',
                    actions: [approvalAction],
                },
                {
                    stageName: 'Deploy',
                    actions: [deployAction],
                }
            ]
        });
    }

    private createBuildProject(props: PipelineStackProps): codebuild.Project {
       const project = new codebuild.Project(this, 'DockerBuild', {
            projectName: `DockerBuild`,
            environment: {
                buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2,
                computeType: codebuild.ComputeType.SMALL,
                privileged: true
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: "0.2",
                phases: {
                    install: {
                        'runtime-versions': {
                            ruby: 2.6,
                        }
                    },
                    build: {
                        commands: [
                            "gem install bundler --version '1.17.3'",
                            'bundle install'
                        ]
                    },
                    post_build: {
                        commands: [
                            'echo "In Post-Build Phase"',
                            "rm Gemfile.lock",
                            "pwd; ls -al; cat Dockerrun.aws.json"
                        ]
                    }
                },
                artifacts: {
                    files: '**/*'
                }
            }),
        });

        return project;
    }

    private createBuildProjectWithDocker(props: PipelineStackProps): codebuild.Project {
        const buildCommandsBefore = [
            'echo "In Build Phase"',
            'cd $APP_PATH',
            'ls -l',
        ];
        const buildCommandsAfter = [
            '$(aws ecr get-login --no-include-email)',
            `docker build -f ${props.dockerfileName ? props.dockerfileName : 'Dockerfile'} -t $ECR_REPO_URI:$TAG .`,
            'docker push $ECR_REPO_URI:$TAG'
        ];
        
        const appPath = props.appPath ? `${props.appPath}` : '.';

       const project = new codebuild.Project(this, 'DockerBuild', {
            projectName: `DockerBuild`,
            environment: {
                buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2,
                computeType: codebuild.ComputeType.SMALL,
                privileged: true
            },
            environmentVariables: {
                'ECR_REPO_URI': {
                    value: `${props.ecrRepo.repositoryUri}`
                },
                'CONTAINER_NAME': {
                    value: `${props.containerName}`
                },
                'APP_PATH': {
                    value: appPath
                }
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: "0.2",
                phases: {
                    install: {
                        'runtime-versions': {
                            ruby: 2.6,
                        }
                    },
                    build: {
                        commands: [
                            ...buildCommandsBefore,
                            'bundle lock --add-platform ruby',
                            ...buildCommandsAfter
                        ]
                    },
                    post_build: {
                        commands: [
                            'echo "In Post-Build Phase"',
                            "rm Gemfile.lock",
                            "pwd; ls -al; cat Dockerrun.aws.json",
                            "printf '[{\"name\":\"%s\",\"imageUri\":\"%s\"}]' $CONTAINER_NAME $ECR_REPO_URI:$TAG > imagedefinitions.json",
                            "pwd; ls -al; cat imagedefinitions.json"
                        ]
                    }
                },
                artifacts: {
                    files: [
                        `${appPath}/imagedefinitions.json`
                    ]
                }
            }),
        });

        props.ecrRepo.grantPullPush(project.role!);
        this.appendEcrReadPolicy('build-policy', project.role!);

        return project;
    }
    
    private appendEcrReadPolicy(baseName: string, role: iam.IRole) {
        const statement = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ['*'],
            actions: [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage"
            ]
        });

        const policy = new iam.Policy(this, baseName);
        policy.addStatements(statement);

        role.attachInlinePolicy(policy);
    }
}