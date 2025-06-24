import { OrcaBusApiGatewayProps } from '@orcabus/platform-cdk-constructs/api-gateway';

export interface StatefulApplicationConfig {
  // Table Stuff
  jobsTableName: string;
  jobsTableIndexes: string[];
}

export interface StatelessApplicationConfig {
  // Table Stuff
  jobsTableName: string;
  jobsTableIndexNames: string[];

  // Event Stuff
  eventBusName: string;

  // S3 Steps Copy stuff
  s3StepsCopyBucketName: string;
  s3StepsCopyStateMachineArn: string;

  // Pipeline Cache Stuff
  pipelineCacheBucketName: string;
  pipelineCacheProjectPrefix: string;

  // API Stuff
  apiGatewayCognitoProps: OrcaBusApiGatewayProps;
}
