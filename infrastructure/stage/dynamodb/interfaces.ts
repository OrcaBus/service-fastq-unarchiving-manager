/**
 * Two DynamoDB tables are used to store the data:
 * The first one links with the FastAPI interface to store the job data
 */

export interface BuildUnarchivingDbProps {
  /* The name of the table */
  tableName: string;

  /* The names of the indexes */
  indexNames: string[];
}

export type BuildDynamoDbProps = BuildUnarchivingDbProps;
