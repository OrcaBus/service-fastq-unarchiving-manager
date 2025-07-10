/*
Add in step functions
*/

// Imports
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';

// Local interfaces
import {
  SfnObject,
  SfnProps,
  SfnsProps,
  stepFunctionLambdaMap,
  stepFunctionNames,
  stepFunctionRequirementsMap,
} from './interfaces';
import { camelCaseToSnakeCase } from '../utils';
import { S3_COPY_STEPS_BUCKET_PREFIX, SFN_PREFIX, STEP_FUNCTIONS_DIR } from '../constants';
import { NagSuppressions } from 'cdk-nag';

/** Step Function stuff */
function createStateMachineDefinitionSubstitutions(props: SfnProps): {
  [key: string]: string;
} {
  const definitionSubstitutions: { [key: string]: string } = {};

  const sfnRequirements = stepFunctionRequirementsMap[props.stateMachineName];
  const lambdaFunctionNamesInSfn = stepFunctionLambdaMap[props.stateMachineName];
  const lambdaFunctions = props.lambdaObjects.filter((lambdaObject) =>
    lambdaFunctionNamesInSfn.includes(lambdaObject.lambdaName)
  );

  /* Substitute lambdas in the state machine definition */
  for (const lambdaObject of lambdaFunctions) {
    const sfnSubtitutionKey = `__${camelCaseToSnakeCase(lambdaObject.lambdaName)}_lambda_function_arn__`;
    definitionSubstitutions[sfnSubtitutionKey] =
      lambdaObject.lambdaFunction.currentVersion.functionArn;
  }

  definitionSubstitutions['__aws_s3_copy_steps_bucket__'] = props.s3StepsCopyBucket.bucketName;
  definitionSubstitutions['__aws_s3_copy_steps_key_prefix__'] = S3_COPY_STEPS_BUCKET_PREFIX;

  /* Sfn Requirements */
  if (sfnRequirements.needsS3Access) {
    definitionSubstitutions['__aws_s3_pipeline_cache_bucket__'] =
      props.pipelineCacheBucket.bucketName;
    definitionSubstitutions['__aws_s3_pipeline_cache_restore_prefix__'] =
      props.pipelineCacheRestorePrefix;
  }

  if (sfnRequirements.needsSfnExecutionAccessPermissions) {
    definitionSubstitutions['__aws_s3_steps_copy_sfn_arn__'] =
      props.sfnStepsCopyStateMachine.stateMachineArn;
  }

  return definitionSubstitutions;
}

function wireUpStateMachinePermissions(props: SfnObject): void {
  /* Wire up lambda permissions */
  const sfnRequirements = stepFunctionRequirementsMap[props.stateMachineName];

  const lambdaFunctionNamesInSfn = stepFunctionLambdaMap[props.stateMachineName];
  const lambdaFunctions = props.lambdaObjects.filter((lambdaObject) =>
    lambdaFunctionNamesInSfn.includes(lambdaObject.lambdaName)
  );

  /* Sfn Requirements */
  if (sfnRequirements.needsS3Access) {
    props.pipelineCacheBucket.grantReadWrite(props.stateMachineObj);
    // Will need cdk nag suppressions for this
    // Because we are using a wildcard for an IAM Resource policy
    NagSuppressions.addResourceSuppressions(
      props.stateMachineObj,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Need ability to send task success/failure/heartbeat to any state machine',
        },
      ],
      true
    );
  }

  if (sfnRequirements.needsSfnExecutionAccessPermissions) {
    // Grant start execution permissions
    props.sfnStepsCopyStateMachine.grantStartExecution(props.stateMachineObj);

    // Because we run a nested state machine, we need to add the permissions to the state machine role
    // See https://stackoverflow.com/questions/60612853/nested-step-function-in-a-step-function-unknown-error-not-authorized-to-cr
    props.stateMachineObj.addToRolePolicy(
      new iam.PolicyStatement({
        resources: [
          `arn:aws:events:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:rule/StepFunctionsGetEventsForStepFunctionsExecutionRule`,
        ],
        actions: ['events:PutTargets', 'events:PutRule', 'events:DescribeRule'],
      })
    );

    // Because this will include 'describeExecution' we need to suppress the cdk nag
    NagSuppressions.addResourceSuppressions(
      props.stateMachineObj,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Need ability to execute the sfn steps copy state machine',
        },
      ],
      true
    );
  }

  /* Allow the state machine to invoke the lambda function */
  for (const lambdaObject of lambdaFunctions) {
    lambdaObject.lambdaFunction.currentVersion.grantInvoke(props.stateMachineObj);
  }
}

function buildStepFunction(scope: Construct, props: SfnProps): SfnObject {
  const sfnNameToSnakeCase = camelCaseToSnakeCase(props.stateMachineName);

  /* Create the state machine definition substitutions */
  const stateMachine = new sfn.StateMachine(scope, props.stateMachineName, {
    stateMachineName: `${SFN_PREFIX}-${props.stateMachineName}`,
    definitionBody: sfn.DefinitionBody.fromFile(
      path.join(STEP_FUNCTIONS_DIR, sfnNameToSnakeCase + `_sfn_template.asl.json`)
    ),
    definitionSubstitutions: createStateMachineDefinitionSubstitutions(props),
  });

  /* Grant the state machine permissions */
  wireUpStateMachinePermissions({
    stateMachineObj: stateMachine,
    ...props,
  });

  /* Nag Suppressions */
  /* AwsSolutions-SF1 - We don't need ALL events to be logged */
  /* AwsSolutions-SF2 - We also don't need X-Ray tracing */
  NagSuppressions.addResourceSuppressions(
    stateMachine,
    [
      {
        id: 'AwsSolutions-SF1',
        reason: 'We do not need all events to be logged',
      },
      {
        id: 'AwsSolutions-SF2',
        reason: 'We do not need X-Ray tracing',
      },
    ],
    true
  );

  /* Return as a state machine object property */
  return {
    ...props,
    stateMachineObj: stateMachine,
  };
}

export function buildAllStepFunctions(scope: Construct, props: SfnsProps): SfnObject[] {
  // Initialize the step function objects
  const sfnObjects = [] as SfnObject[];

  // Iterate over lambdaLayerToMapping and create the lambda functions
  for (const sfnName of stepFunctionNames) {
    sfnObjects.push(
      buildStepFunction(scope, {
        stateMachineName: sfnName,
        ...props,
      })
    );
  }

  return sfnObjects;
}
