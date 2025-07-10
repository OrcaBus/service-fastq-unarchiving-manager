import { RemovalPolicy } from 'aws-cdk-lib';
import * as path from 'path';
import {
  StageName,
  ACCOUNT_ID_ALIAS,
  REGION,
} from '@orcabus/platform-cdk-constructs/shared-config/accounts';

// Directory constants
export const APP_ROOT = path.join(__dirname, '../../app');
export const LAMBDA_DIR = path.join(APP_ROOT, 'lambdas');
export const STEP_FUNCTIONS_DIR = path.join(APP_ROOT, 'step-functions-templates');
export const INTERFACE_DIR = path.join(APP_ROOT, 'interface');

// Table constants
export const TABLE_REMOVAL_POLICY = RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE; // We need to retain the table on update or delete to avoid data loss
export const JOB_API_TABLE_NAME = 'FastqUnarchivingJobsTable';
export const JOB_API_TABLE_INDEXES = ['status'];

// Stack constants
export const STACK_EVENT_SOURCE = 'orcabus.fastqunarchiving';
export const FASTQ_UNARCHIVING_STATE_CHANGE_DETAIL_TYPE = 'FastqUnarchivingJobStateChange';

// API Constants
export const API_VERSION = 'v1';
export const API_NAME = 'FastqUnarchiving';
export const FASTQ_UNARCHIVING_SUBDOMAIN_NAME = 'fastq-unarchiving';

// S3 Constants
// Use PIPELINE_CACHE_PREFIX, and PIPELINE_CACHE_BUCKET in the config file
export const DEFAULT_RESTORE_MIDFIX = 'restored/14d/';

// Steps Constants
export const SFN_PREFIX = 'fastq-unarchiving';

// Steps Copy Constants
export const S3_COPY_STEPS_BUCKET: Record<StageName, string> = {
  BETA: 'stepss3copy-working66f7dd3f-x4jwbnt6qvxc', // pragma: allowlist secret
  GAMMA: 'stg-stepss3copystack-stepss3copyworking01b34927-szqxpff5lsbx', // pragma: allowlist secret
  PROD: 'prod-stepss3copystack-stepss3copyworking01b34927-mp9y88d9e1py', // pragma: allowlist secret
};

export const S3_COPY_STEPS_BUCKET_PREFIX: string = 'FASTQ_UNARCHIVING/';

export const S3_COPY_STEPS_FUNCTION_ARN: Record<StageName, string> = {
  BETA: `arn:aws:states:${REGION}:${ACCOUNT_ID_ALIAS.BETA}:stateMachine:StepsS3CopyStateMachine157A1409-jx4WNxpdckgQ`, // pragma: allowlist secret
  GAMMA: `arn:aws:states:${REGION}:${ACCOUNT_ID_ALIAS.GAMMA}:stateMachine:StepsS3CopyStateMachine157A1409-ikBos7HzwDtL`, // pragma: allowlist secret
  PROD: `arn:aws:states:${REGION}:${ACCOUNT_ID_ALIAS.PROD}:stateMachine:StepsS3CopyStateMachine157A1409-YbCgUX7dCZRm`, // pragma: allowlist secret
};
