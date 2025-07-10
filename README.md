Fastq Unarchiving Service
================================================================================

<!-- TOC -->
* [Fastq Unarchiving Service](#fastq-unarchiving-service)
  * [Service Description](#service-description)
    * [API Endpoints](#api-endpoints)
    * [Step Functions](#step-functions)
    * [Consumed Events](#consumed-events)
    * [Published Events](#published-events)
    * [Change Management](#change-management)
      * [Versioning strategy](#versioning-strategy)
      * [Release management](#release-management)
  * [Infrastructure & Deployment](#infrastructure--deployment-)
    * [Stateful](#stateful)
    * [Stateless](#stateless)
    * [CDK Commands](#cdk-commands)
    * [Stacks](#stacks)
  * [Development](#development)
    * [Project Structure](#project-structure)
    * [Setup](#setup)
      * [Requirements](#requirements)
      * [Install Dependencies](#install-dependencies)
      * [First Steps](#first-steps)
    * [Conventions](#conventions)
    * [Linting & Formatting](#linting--formatting)
    * [Testing](#testing)
  * [Glossary & References](#glossary--references)
<!-- TOC -->

Service Description
--------------------------------------------------------------------------------

![Fastq Unarchiving Service](docs/drawio-exports/fastq-unarchiving-service.drawio.svg)

### API Endpoints

This service provides a RESTful API following OpenAPI conventions.
The Swagger documentation of the production endpoint is available at [https://fastq-unarchiving.dev.umccr.org/schema/swagger-ui#/](https://fastq-unarchiving.dev.umccr.org/schema/swagger-ui#/)


### Step Functions

The main step function calls the [s3-steps-copy](https://github.com/umccr/steps-s3-copy) service to copy the fastq files from the archive bucket
back to the original cache bucket.

Then the fastq unarchiving service updates the ingest id of the restored fastq files to match those of the original fastq files in archive.

This means that when accessed by the fastq manager, the s3 uris will now point to the restored fastq files in the cache bucket, rather than the archived ones.

![Fastq Unarchiving Step Function](docs/workflow-studio-exports/fastq-unarchiving-sfn.svg)


### Consumed Events

There are no consumed events for this service. Jobs are expected to be triggered via the REST API endpoints.

### Published Events

| Name / DetailType                | Source                     | Schema Link                                                                                 | Description                      |
|----------------------------------|----------------------------|---------------------------------------------------------------------------------------------|----------------------------------|
| `FastqUnarchivingJobStateChange` | `orcabus.fastqunarchiving` | [fastq-unarchiving-job-state-change](event-schemas/fastq-unarchiving-job-state-change.json) | Announces job state changes |

### Change Management

#### Versioning strategy

E.g. Manual tagging of git commits following Semantic Versioning (semver) guidelines.

#### Release management

The service employs a fully automated CI/CD pipeline that automatically builds and releases all changes to the `main` code branch.

Usage
--------------------------------------------------------------------------------

To use the fastq unarchiving service, you will need to know the fastq ids of the fastq files you want to unarchive.

Given a library id, you can find the fastq ids by querying the fastq manager service:

### Part 1: Getting the Fastq IDs to unarchive

```shell
# Globals
AWS_PROFILE='umccr-production'
FASTQ_SET_API_ENDPOINT="https://fastq.prod.umccr.org/api/v1/fastqSet"
FASTQ_UNARCHIVING_ENDPOINT="https://fastq-unarchiving.prod.umccr.org/api/v1/jobs"

ORCABUS_TOKEN="$( \
  aws secretsmanager get-secret-value \
    --secret-id orcabus/token-service-jwt \
    --output json \
    --query SecretString | \
  jq --raw-output \
    'fromjson | .id_token' \
)"

# Glocals
LIBRARY_ID_LIST=( \
  "L2301201" \
  "L2301202" \
)

# Get the query parameters
QUERY_PARAMS="$( \
  jq --raw-output --null-input \
    --arg libraryIdListStr "${LIBRARY_ID_LIST[*]}" \
    '
      $libraryIdListStr | split(" ") |
      map(
        "library[]=\(.)"
      ) |
      . += [
        # We want to know which fastq sets have fastq files in DeepArchive
        # So we need to include the s3 details to get the storage class
        "includeS3Details=true",
        # And we only want the current fastq sets for each library
        "currentFastqSet=true"
      ] |
      join("&")
    ' \
)"

fastq_id_list="$( \
  curl --request GET \
    --fail --silent --show-error --location \
    --header "Accept: application/json" \
    --header "Authorization: ${ORCABUS_TOKEN}" \
    --url "${FASTQ_SET_API_ENDPOINT}?${QUERY_PARAMS}" | \
  jq --raw-output \
    '
      .results |
      # Iterate over the fastq sets
      map(
        # Filter for fastq sets with readSet.r1.storageClass == "DeepArchive"
        .fastqSet |
        map(
          select(
            .readSet.r1.storageClass == "DeepArchive"
          )
        ) |
        # And get the fastq ids in the fastq set
        map(
          .id
        )
      ) |
      # Flatten the list of fastq ids (since weve mapped within a map)
      flatten
    ' \
)"
```

### Part 2: Unarchiving the Fastq Files

Now we have our list, we can generate the JSON body for the unarchiving post request,
and send it to the fastq unarchiving service to trigger the unarchiving job.

This will take around 10 hours to complete.

```shell

fastq_unarchiving_job_json_body="$( \
  jq --null-input \
    --argjson fastqIdList "${fastq_id_list}" \
    '
      {
          "fastqIdList": $fastqIdList,
          "jobType": "S3_UNARCHIVING"
      }
    ' \
)"

curl --request POST \
  --fail --silent --show-error --location \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --header "Authorization: ${ORCABUS_TOKEN}" \
  --data "${fastq_unarchiving_job_json_body}" \
  --url "${FASTQ_UNARCHIVING_ENDPOINT}" | \
jq --raw-output
```

Infrastructure & Deployment
--------------------------------------------------------------------------------

Short description with diagrams where appropriate.
Deployment settings / configuration (e.g. CodePipeline(s) / automated builds).

Infrastructure and deployment are managed via CDK. This template provides two types of CDK entry points: `cdk-stateless` and `cdk-stateful`.


### Stateful

- Queues
- Buckets
- Database
- ...

### Stateless
- Lambdas
- StepFunctions


### CDK Commands

You can access CDK commands using the `pnpm` wrapper script.

- **`cdk-stateless`**: Used to deploy stacks containing stateless resources (e.g., AWS Lambda), which can be easily redeployed without side effects.
- **`cdk-stateful`**: Used to deploy stacks containing stateful resources (e.g., AWS DynamoDB, AWS RDS), where redeployment may not be ideal due to potential side effects.

The type of stack to deploy is determined by the context set in the `./bin/deploy.ts` file. This ensures the correct stack is executed based on the provided context.

For example:

```sh
# Deploy a stateless stack
pnpm cdk-stateless <command>

# Deploy a stateful stack
pnpm cdk-stateful <command>
```

### Stacks

This CDK project manages multiple stacks. The root stack (the only one that does not include `DeploymentPipeline` in its stack ID) is deployed in the toolchain account and sets up a CodePipeline for cross-environment deployments to `beta`, `gamma`, and `prod`.

To list all available stacks, run:

```sh
pnpm cdk-stateless ls
```

Example output:

```sh
OrcaBusStatelessServiceStack
OrcaBusStatelessServiceStack/DeploymentPipeline/OrcaBusBeta/DeployStack (OrcaBusBeta-DeployStack)
OrcaBusStatelessServiceStack/DeploymentPipeline/OrcaBusGamma/DeployStack (OrcaBusGamma-DeployStack)
OrcaBusStatelessServiceStack/DeploymentPipeline/OrcaBusProd/DeployStack (OrcaBusProd-DeployStack)
```


Development
--------------------------------------------------------------------------------

### Project Structure

The root of the project is an AWS CDK project where the main application logic lives inside the `./app` folder.

The project is organized into the following key directories:

- **`./app`**: Contains the main application logic. You can open the code editor directly in this folder, and the application should run independently.

- **`./bin/deploy.ts`**: Serves as the entry point of the application. It initializes two root stacks: `stateless` and `stateful`. You can remove one of these if your service does not require it.

- **`./infrastructure`**: Contains the infrastructure code for the project:
  - **`./infrastructure/toolchain`**: Includes stacks for the stateless and stateful resources deployed in the toolchain account. These stacks primarily set up the CodePipeline for cross-environment deployments.
  - **`./infrastructure/stage`**: Defines the stage stacks for different environments:
    - **`./infrastructure/stage/config.ts`**: Contains environment-specific configuration files (e.g., `beta`, `gamma`, `prod`).
    - **`./infrastructure/stage/stack.ts`**: The CDK stack entry point for provisioning resources required by the application in `./app`.

- **`.github/workflows/pr-tests.yml`**: Configures GitHub Actions to run tests for `make check` (linting and code style), tests defined in `./test`, and `make test` for the `./app` directory. Modify this file as needed to ensure the tests are properly configured for your environment.

- **`./test`**: Contains tests for CDK code compliance against `cdk-nag`. You should modify these test files to match the resources defined in the `./infrastructure` folder.


### Setup

#### Requirements

```sh
node --version
v22.9.0

# Update Corepack (if necessary, as per pnpm documentation)
npm install --global corepack@latest

# Enable Corepack to use pnpm
corepack enable pnpm

```

#### Install Dependencies

To install all required dependencies, run:

```sh
make install
```

#### First Steps

Before using this template, search for all instances of `TODO:` comments in the codebase and update them as appropriate for your service. This includes replacing placeholder values (such as stack names).


### Conventions

### Linting & Formatting

Automated checks are enforces via pre-commit hooks, ensuring only checked code is committed. For details consult the `.pre-commit-config.yaml` file.

Manual, on-demand checking is also available via `make` targets (see below). For details consult the `Makefile` in the root of the project.


To run linting and formatting checks on the root project, use:

```sh
make check
```

To automatically fix issues with ESLint and Prettier, run:

```sh
make fix
```

### Testing


Unit tests are available for most of the business logic. Test code is hosted alongside business in `/tests/` directories.

```sh
make test
```

Glossary & References
--------------------------------------------------------------------------------

For general terms and expressions used across OrcaBus services, please see the platform [documentation](https://github.com/OrcaBus/wiki/blob/main/orcabus-platform/README.md#glossary--references).

Service specific terms:

| Term      | Description                                      |
|-----------|--------------------------------------------------|
| Foo | ... |
| Bar | ... |
