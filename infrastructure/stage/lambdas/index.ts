/**
 * Use the PythonUvFunction script to build the lambda functions
 */
import {
  lambdaNameList,
  LambdaProps,
  lambdaRequirementsMap,
  LambdaObject,
  BuildAllLambdaProps,
} from './interfaces';
import { PythonUvFunction } from '@orcabus/platform-cdk-constructs/lambda';
import { Construct } from 'constructs';
import { camelCaseToSnakeCase } from '../utils';
import * as path from 'path';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LAMBDA_DIR } from '../constants';
import { NagSuppressions } from 'cdk-nag';

function buildLambdaFunction(scope: Construct, props: LambdaProps): LambdaObject {
  const lambdaNameToSnakeCase = camelCaseToSnakeCase(props.lambdaName);
  const lambdaRequirements = lambdaRequirementsMap[props.lambdaName];
  const lambdaObject = new PythonUvFunction(scope, props.lambdaName, {
    entry: path.join(LAMBDA_DIR, lambdaNameToSnakeCase + '_py'),
    runtime: lambda.Runtime.PYTHON_3_12,
    architecture: lambda.Architecture.ARM_64,
    index: lambdaNameToSnakeCase + '.py',
    handler: 'handler',
    timeout: Duration.seconds(60),
    includeOrcabusApiToolsLayer: lambdaRequirements.needsOrcabusApiToolsLayer,
  });

  if (lambdaRequirements.needsS3Access) {
    props.stepsCopyBucket.grantReadWrite(lambdaObject);

    // Add nag suppression for S3 access
    NagSuppressions.addResourceSuppressions(
      lambdaObject,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'The lambda function needs access to the S3 bucket for reading and writing data.',
        },
      ],
      true
    );
  }

  return {
    lambdaName: props.lambdaName,
    lambdaFunction: lambdaObject,
  };
}

export function buildAllLambdas(scope: Construct, props: BuildAllLambdaProps): LambdaObject[] {
  const lambdaList: LambdaObject[] = [];
  for (const lambdaName of lambdaNameList) {
    lambdaList.push(
      buildLambdaFunction(scope, {
        lambdaName: lambdaName,
        stepsCopyBucket: props.stepsCopyBucket,
      })
    );
  }

  // Add cdk nag stack suppressions
  NagSuppressions.addResourceSuppressions(
    lambdaList.map((lambdaObject) => lambdaObject.lambdaFunction),
    [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'We use the AWS Lambda basic execution role to run the lambdas.',
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'Were currently using Python 3.12',
      },
    ],
    true
  );

  return lambdaList;
}
