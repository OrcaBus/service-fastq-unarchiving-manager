#!/usr/bin/env python3

"""
Either 'count' the number of s3 steps copy we will generate
OR 'generate' the jsonl and upload to s3 for the given package / file.
"""

# Imports
import typing
from functools import reduce
from operator import concat
from typing import List
from pathlib import Path
from urllib.parse import urlparse
import pandas as pd
from tempfile import NamedTemporaryFile
import boto3
from typing import TypedDict

# OrcaBus API Tools
from orcabus_api_tools.fastq import to_fastq_list_row, get_fastq

# Type hints
if typing.TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client


def get_read_uris(fastq_id: str) -> List[str]:
    """
    Get read uris for a given fastq_id
    """
    fastq_list_row =  to_fastq_list_row(fastq_id)
    return list(filter(
        lambda read_uri_iter_: read_uri_iter_ is not None,
        [
            fastq_list_row['read1FileUri'],
            fastq_list_row.get('read2FileUri', None),
        ]
    ))


def get_jsonl_rows(
        restore_prefix: str,
        fastq_id: str
) -> List[TypedDict]:
    """
    Get the jsonl rows for a given fastq id
    """
    # Get the instrument run id
    fastq_obj = get_fastq(fastq_id)

    # Get the restore midfix
    restore_midfix = Path(fastq_obj['instrumentRunId']) / f"Lane_{fastq_obj['lane']}"

    relative_path_prefix = str(Path(restore_prefix).joinpath(restore_midfix)) + "/"

    return list(map(
        lambda read_uri_iter_: {
            "sourceBucket": urlparse(read_uri_iter_).netloc,
            "sourceKey": urlparse(read_uri_iter_).path.lstrip("/"),
            "destinationRelativeFolderKey": relative_path_prefix
        },
        get_read_uris(fastq_id)
    ))


def handler(event, context):
    """
    Given the following inputs:
      * jobId
      * pushLocation

    Generate the following outputs:
      * destinationAndSourceUriMappingsList

    This performs the following:
    * Queries the files in the dynamodb database for this packaging job id
    * For each subfolder, it generates a destination and source uri mapping based on a common parent location
    * Returns the destination and source uri mappings list for each folder
    :param event:
    :param context:
    :return:
    """

    # Get inputs
    fastq_id_list = event.get("fastqIdList", None)
    s3_steps_copy_bucket = event.get("s3StepsCopyBucket", None)
    s3_steps_copy_prefix = event.get("s3StepsCopyPrefix", None)
    s3_steps_copy_jsonl_key = event.get("s3StepsCopyJsonlKey", None)
    restore_prefix = event.get("restorePrefix", None)

    # Okay we mean business and were uploading
    s3_client: S3Client = boto3.client("s3")

    # Get data df
    data_df = pd.DataFrame(
        list(reduce(
            concat,
            list(map(
                lambda fastq_id_iter_: get_jsonl_rows(
                    restore_prefix=restore_prefix,
                    fastq_id=fastq_id_iter_,
                ),
                fastq_id_list
            ))
        ))
    )

    # Now generate the jsonl data
    with NamedTemporaryFile(suffix="*.jsonl", mode='w', encoding='utf-8') as temp_file:
        data_df.to_json(
            temp_file,
            orient="records",
            lines=True
        )

        temp_file.flush()

        # Upload the file to S3
        s3_client.upload_file(
            Bucket=s3_steps_copy_bucket,
            Key=str(Path(s3_steps_copy_prefix) / s3_steps_copy_jsonl_key),
            Filename=temp_file.name
        )
