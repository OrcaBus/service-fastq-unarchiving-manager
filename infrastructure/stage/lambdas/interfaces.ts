import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { IBucket } from 'aws-cdk-lib/aws-s3';

export type LambdaNameList =
  | 'createCsvForS3StepsCopy'
  | 'findOriginalIngestId'
  | 'splitFastqIdsByInstrumentRunId'
  | 'updateIngestId'
  | 'updateJobDatabase';

export const lambdaNameList: LambdaNameList[] = [
  'createCsvForS3StepsCopy',
  'findOriginalIngestId',
  'splitFastqIdsByInstrumentRunId',
  'updateIngestId',
  'updateJobDatabase',
];

export interface LambdaRequirements {
  needsOrcabusApiToolsLayer?: boolean;
  needsS3Access?: boolean;
}

export const lambdaRequirementsMap: Record<LambdaNameList, LambdaRequirements> = {
  createCsvForS3StepsCopy: {
    needsOrcabusApiToolsLayer: true,
    needsS3Access: true,
  },
  findOriginalIngestId: {
    needsOrcabusApiToolsLayer: true,
  },
  splitFastqIdsByInstrumentRunId: {
    needsOrcabusApiToolsLayer: true,
  },
  updateIngestId: {
    needsOrcabusApiToolsLayer: true,
  },
  updateJobDatabase: {
    needsOrcabusApiToolsLayer: true,
  },
};

export interface LambdaProps {
  lambdaName: LambdaNameList;
  stepsCopyBucket: IBucket;
}

export type BuildAllLambdaProps = Omit<LambdaProps, 'lambdaName'>;

export interface LambdaObject extends Omit<LambdaProps, 'stepsCopyBucket'> {
  lambdaFunction: PythonFunction;
}
