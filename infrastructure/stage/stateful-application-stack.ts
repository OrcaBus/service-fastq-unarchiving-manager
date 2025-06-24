import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StatefulApplicationConfig } from './interfaces';
import { buildDynamoDbTables } from './dynamodb';

export type StatefulApplicationStackProps = cdk.StackProps & StatefulApplicationConfig;

export class StatefulApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StatefulApplicationStackProps) {
    super(scope, id, props);

    // Part 1 - Build DynamoDB Tables
    buildDynamoDbTables(this, {
      tableName: props.jobsTableName,
      indexNames: props.jobsTableIndexes,
    });
  }
}
