import { Construct } from 'constructs';
import { StackProps, Stack, RemovalPolicy } from 'aws-cdk-lib';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as ecr from 'aws-cdk-lib/aws-ecr';

interface RepoStackProps extends StackProps {
    repositoryName: string
}

export class RepoStack extends Stack {
    private gitRepo: codecommit.Repository;
    private ecrRepo: ecr.Repository;

    /**
     * getGitRepo
     */
    public getGitRepo(): codecommit.Repository {
        return this.gitRepo;
    }

    /**
     * getEcrRepo
     */
    public getEcrRepo(): ecr.Repository {
       return this.ecrRepo; 
    }

    constructor(scope: Construct, id: string, props: RepoStackProps) {
        super(scope, id, props);

        // const repoSuffix = 'repo';

        this.gitRepo = new codecommit.Repository(this, `${props.repositoryName}Repository`, {
            repositoryName: props.repositoryName.toLowerCase(),
            description: props.repositoryName,
        });
        
        this.ecrRepo = new ecr.Repository(this, `${props.repositoryName}EcrRepository`, {
            repositoryName: props.repositoryName.toLowerCase(),
            removalPolicy: RemovalPolicy.DESTROY,
            imageScanOnPush: true,
        });
    }
}