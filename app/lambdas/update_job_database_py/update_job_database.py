#!/usr/bin/env python3

"""
Use the fastq unarchiving layer construct to update the job database with a job success event

We expect either a 'RUNNING' update

{
    "jobId": "string",
    "status": "RUNNING",
}

OR

{
    "jobId": "string",
    "hasError": false,
    "errorMessages": "",
    "status": "SUCCEEDED"
}

OR

{
    "jobId": "string",
    "hasError": true,
    "errorMessages": "string",
    "status": "FAILED"
}

"""
from typing import Any, Dict

from orcabus_api_tools.fastq_unarchiving import update_status
from orcabus_api_tools.fastq_unarchiving.models import Job


def handler(event, context) -> Job:
    """
    Get inputs then use the fastq unarchiving tools layer to update the status of a job in the database
    :param event:
    :param context:
    :return:
    """
    # Get inputs
    job_id = event.get('jobId')
    status = event.get('status')
    has_error = event.get('hasError', False)

    if not has_error:
        return update_status(job_id, status)
    else:
        error_message = event.get('errorMessages', None)
        return update_status(job_id, status, error_message)


# if __name__ == '__main__':
#     import json
#     from os import environ
#     environ['AWS_PROFILE'] = 'umccr-development'
#     environ['HOSTNAME_SSM_PARAMETER'] = '/hosted_zone/umccr/name'
#     environ['ORCABUS_TOKEN_SECRET_ID'] = 'orcabus/token-service-jwt'
#     # Test the handler
#     event = {
#         "jobId": "ufj.01JPF0KV3DBJHJFKYZVSDF6DEC",
#         "status": "RUNNING",
#     }
#     print(json.dumps(
#         handler(event, None),
#         indent=2
#     ))
