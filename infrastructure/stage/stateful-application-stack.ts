import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StatefulApplicationConfig } from './interfaces';
import { buildDynamoDbTables } from './dynamodb';
import { GitStack } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';

export type StatefulApplicationStackProps = cdk.StackProps & StatefulApplicationConfig;

export class StatefulApplicationStack extends GitStack {
  constructor(scope: Construct, id: string, props: StatefulApplicationStackProps) {
    super(scope, id, props);

    // Part 1 - Build DynamoDB Tables
    buildDynamoDbTables(this, {
      tableName: props.jobsTableName,
      indexNames: props.jobsTableIndexes,
    });
  }
}
