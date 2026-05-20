import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { IBucket } from 'aws-cdk-lib/aws-s3';

export type LambdaNameType =
  | 'findOriginalIngestId'
  | 'checkSuccessfulStepsCopy'
  | 'generateJsonl'
  | 'updateIngestId'
  | 'updateJobDatabase';

export const lambdaNameList: LambdaNameType[] = [
  'findOriginalIngestId',
  'checkSuccessfulStepsCopy',
  'updateIngestId',
  'updateJobDatabase',
];

export interface LambdaRequirements {
  needsOrcabusApiToolsLayer?: boolean;
  needsS3Access?: boolean;
}

export const lambdaRequirementsMap: Record<LambdaNameType, LambdaRequirements> = {
  findOriginalIngestId: {
    needsOrcabusApiToolsLayer: true,
  },
  checkSuccessfulStepsCopy: {
    needsS3Access: true,
  },
  generateJsonl: {
    needsOrcabusApiToolsLayer: true,
    needsS3Access: true,
  },
  updateIngestId: {
    needsOrcabusApiToolsLayer: true,
  },
  updateJobDatabase: {
    needsOrcabusApiToolsLayer: true,
  },
};

export interface BuildAllLambdaProps {
  stepsCopyBucket: IBucket;
  stepsCopyPrefix: string;
}

export interface BuildLambdaProps extends BuildAllLambdaProps {
  lambdaName: LambdaNameType
}

export interface LambdaObject {
  lambdaName: LambdaNameType;
  lambdaFunction: PythonFunction;
}
