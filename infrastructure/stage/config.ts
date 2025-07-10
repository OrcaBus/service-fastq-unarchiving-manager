import { getDefaultApiGatewayConfiguration } from '@orcabus/platform-cdk-constructs/api-gateway';
import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import { StatefulApplicationConfig, StatelessApplicationConfig } from './interfaces';
import { EVENT_BUS_NAME } from '@orcabus/platform-cdk-constructs/shared-config/event-bridge';
import {
  API_NAME,
  FASTQ_UNARCHIVING_SUBDOMAIN_NAME,
  JOB_API_TABLE_INDEXES,
  JOB_API_TABLE_NAME,
  S3_COPY_STEPS_BUCKET,
  S3_COPY_STEPS_FUNCTION_ARN,
} from './constants';
import {
  PIPELINE_CACHE_BUCKET,
  PIPELINE_CACHE_PREFIX,
} from '@orcabus/platform-cdk-constructs/shared-config/s3';

export const getStatefulStackProps = (): StatefulApplicationConfig => {
  return {
    // Table stuff
    jobsTableIndexes: JOB_API_TABLE_INDEXES,
    jobsTableName: JOB_API_TABLE_NAME,
  };
};

export const getStatelessStackProps = (stage: StageName): StatelessApplicationConfig => {
  return {
    // Table stuff
    jobsTableName: JOB_API_TABLE_NAME,
    jobsTableIndexNames: JOB_API_TABLE_INDEXES,

    // Event Stuff
    eventBusName: EVENT_BUS_NAME,

    // S3 Steps Copy Stuff
    s3StepsCopyBucketName: S3_COPY_STEPS_BUCKET[stage],
    s3StepsCopyStateMachineArn: S3_COPY_STEPS_FUNCTION_ARN[stage],

    // S3 Cache Bucket Stuff
    pipelineCacheBucketName: PIPELINE_CACHE_BUCKET[stage],
    pipelineCacheProjectPrefix: PIPELINE_CACHE_PREFIX[stage],

    // API Prefix
    apiGatewayCognitoProps: {
      ...getDefaultApiGatewayConfiguration(stage),
      apiName: API_NAME,
      customDomainNamePrefix: FASTQ_UNARCHIVING_SUBDOMAIN_NAME,
    },
  };
};
