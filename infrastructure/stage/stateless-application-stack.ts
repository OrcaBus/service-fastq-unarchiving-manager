import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StatelessApplicationConfig } from './interfaces';

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { buildAllLambdas } from './lambdas';
import { buildAllStepFunctions } from './step-functions';
import { API_NAME, DEFAULT_RESTORE_MIDFIX } from './constants';
import {
  addHttpRoutes,
  buildApiGateway,
  buildApiIntegration,
  buildApiInterfaceLambda,
} from './api';
import { HOSTED_ZONE_DOMAIN_PARAMETER_NAME } from '@orcabus/platform-cdk-constructs/api-gateway';

export type StatelessApplicationStackProps = cdk.StackProps & StatelessApplicationConfig;

export class StatelessApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StatelessApplicationStackProps) {
    super(scope, id, props);

    /**
     * The fastq unarchiving stateless application stack
     *
     */

    /*
    Part 0: Setup - Convert the following properties into objects
      * jobsTableName
      * eventBusName
      * s3StepsCopyBucketName
      * pipelineCacheBucketName
    */

    const jobsTable = dynamodb.TableV2.fromTableName(this, 'JobsTable', props.jobsTableName);

    const eventBus = events.EventBus.fromEventBusName(this, 'EventBus', props.eventBusName);

    const s3StepsCopyBucket = s3.Bucket.fromBucketName(
      this,
      'S3StepsCopyBucket',
      props.s3StepsCopyBucketName
    );

    const pipelineCacheBucket = s3.Bucket.fromBucketName(
      this,
      'PipelineCacheBucket',
      props.pipelineCacheBucketName
    );

    const s3StepsCopyStateMachine = sfn.StateMachine.fromStateMachineArn(
      this,
      'stepsCopyStateMachine',
      props.s3StepsCopyStateMachineArn
    );

    const hostedZoneNameSsmParameter = ssm.StringParameter.fromStringParameterName(
      this,
      'HostedZoneNameSsmParameter',
      HOSTED_ZONE_DOMAIN_PARAMETER_NAME
    );

    /*
    Part 1: Build the lambdas
    */
    const lambdaObjects = buildAllLambdas(this, {
      stepsCopyBucket: s3StepsCopyBucket,
    });

    /*
    Part 2: Build the step functions
    */
    const stepFunctionObjects = buildAllStepFunctions(this, {
      lambdaObjects: lambdaObjects,
      s3StepsCopyBucket: s3StepsCopyBucket,
      sfnStepsCopyStateMachine: s3StepsCopyStateMachine,
      pipelineCacheBucket: pipelineCacheBucket,
      pipelineCacheRestorePrefix: `${props.pipelineCacheProjectPrefix}${DEFAULT_RESTORE_MIDFIX}`,
    });

    /*
    Part 3: Build the API Gateway
    */
    // Build the API interface lambda
    const lambdaApi = buildApiInterfaceLambda(this, {
      /* Lambda props */
      lambdaName: `${API_NAME}JobApiInterface`,

      /* Table props */
      table: jobsTable,
      tableIndexNames: props.jobsTableIndexNames,

      /* Step functions triggered by the API */
      stepFunctions: stepFunctionObjects.filter((stepFunctionObject) =>
        ['runS3StepsCopy'].includes(stepFunctionObject.stateMachineName)
      ),

      /* Event bus */
      eventBus: eventBus,

      /* SSM Parameters */
      hostedZoneSsmParameter: hostedZoneNameSsmParameter,
    });

    // Build the API Gateway
    const apiGateway = buildApiGateway(this, props.apiGatewayCognitoProps);
    const apiIntegration = buildApiIntegration({
      lambdaFunction: lambdaApi,
    });

    addHttpRoutes(this, {
      apiGateway: apiGateway,
      apiIntegration: apiIntegration,
    });
  }
}
