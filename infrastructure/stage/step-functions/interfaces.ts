/*
Step Function Interfaces
*/

import { LambdaNameList, LambdaObject } from '../lambdas/interfaces';
import { IStateMachine, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { IBucket } from 'aws-cdk-lib/aws-s3';

export type StepFunctionName =
  // Job step
  'runS3StepsCopy';

export const stepFunctionNames: StepFunctionName[] = ['runS3StepsCopy'];

export interface StepFunctionRequirements {
  needsS3Access?: boolean;
  needsSfnExecutionAccessPermissions?: boolean;
}

export const stepFunctionRequirementsMap: Record<StepFunctionName, StepFunctionRequirements> = {
  runS3StepsCopy: {
    // Calls API and then writes job id and task token to table
    needsS3Access: true,
    // Needs to turn on the heartbeat scheduler
    needsSfnExecutionAccessPermissions: true,
  },
};

// Map the lambda functions to their step function names
export const stepFunctionLambdaMap: Record<StepFunctionName, LambdaNameList[]> = {
  runS3StepsCopy: [
    'createCsvForS3StepsCopy',
    'findOriginalIngestId',
    'splitFastqIdsByInstrumentRunId',
    'updateIngestId',
    'updateJobDatabase',
  ],
};

export interface SfnProps {
  // Name of the state machine
  stateMachineName: StepFunctionName;
  // List of lambda functions that are used in the state machine
  lambdaObjects: LambdaObject[];
  // Steps Copy Service
  s3StepsCopyBucket: IBucket;
  sfnStepsCopyStateMachine: IStateMachine;
  // Pipeline cache bucket
  pipelineCacheBucket: IBucket;
  pipelineCacheRestorePrefix: string;
}

export interface SfnObject extends SfnProps {
  stateMachineObj: StateMachine;
}

export type SfnsProps = Omit<SfnProps, 'stateMachineName'>;
