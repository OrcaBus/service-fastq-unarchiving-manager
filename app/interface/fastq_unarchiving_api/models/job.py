#!/usr/bin/env python3

"""
Job model, used to for job management
"""

# Standard imports
import typing
from copy import deepcopy
from typing import List, Literal
from os import environ
from typing import Optional, Self, ClassVar

from dyntastic import Dyntastic
from fastapi.encoders import jsonable_encoder
from pydantic import Field, BaseModel, model_validator, ConfigDict
from datetime import datetime, timezone, timedelta

from fastapi_tools import QueryPaginatedResponse
from . import JobStatus

# Util imports
from ..utils import (
    to_camel, get_ulid, get_unarchiver_endpoint_url
)
from ..globals import UNARCHIVE_FASTQ_JOB_PREFIX


JobType = Literal['S3_UNARCHIVING']


def default_start_time_factory() -> datetime:
    """
    Default factory for the start time of the job
    :return: The current datetime
    """
    return datetime.now(timezone.utc)


def default_ttl_factory() -> int:
    """
    Default factory for the TTL of the job
    :return: The current datetime in ISO format
    """
    return int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp())


class JobBase(BaseModel):
    fastq_ids: List[str]
    job_type: JobType


class JobOrcabusId(BaseModel):
    # fqr.ABCDEFGHIJKLMNOP
    # BCLConvert Metadata attributes
    id: str = Field(default_factory=lambda: f"{UNARCHIVE_FASTQ_JOB_PREFIX}.{get_ulid()}")


class JobWithId(JobBase, JobOrcabusId):
    """
    Order class inheritance this way to ensure that the id field is set first
    """
    # We also have the steps execution id as an attribute to add
    steps_execution_arn: Optional[str] = None
    status: JobStatus = Field(default='PENDING')
    start_time: datetime = Field(default_factory=default_start_time_factory)
    ttl: int = Field(default_factory=default_ttl_factory)
    end_time: Optional[datetime] = None
    error_messages: Optional[str] = None


class JobResponse(JobWithId):
    model_config = ConfigDict(
        alias_generator=to_camel
    )

    # Set keys to camel case
    @model_validator(mode='before')
    def convert_keys_to_camel(cls, values):
        return {to_camel(k): v for k, v in values.items()}

    # Set the model_dump method response
    def model_dump(self, **kwargs) -> Self:
        kwargs = deepcopy(kwargs)
        if 'exclude' not in kwargs:
            kwargs['exclude'] = set()
        else:
            # Coerce to a set
            kwargs['exclude'] = set(kwargs['exclude'])

        # We dont care for the ttl in the response
        kwargs['exclude'].add('ttl')

        # Remove 'outputs' from the exclude list if it is not set
        if 'exclude_none' not in kwargs:
            kwargs['exclude_none'] = True

        return super().model_dump(**kwargs)


class JobCreate(JobBase):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

    def model_dump(self, **kwargs) -> 'JobResponse':
        return (
            JobResponse(**super().model_dump()).
            model_dump()
        )


class JobPatch(BaseModel):
    status: JobStatus


class JobData(JobWithId, Dyntastic):
    """
    The job data object
    """
    __table_name__ = environ['DYNAMODB_UNARCHIVING_JOB_TABLE_NAME']
    __table_host__ = environ['DYNAMODB_HOST']
    __hash_key__ = "id"

    # To Dictionary
    def to_dict(self) -> 'JobResponse':
        """
        Alternative serialization path to return objects by camel case
        :return:
        """
        return jsonable_encoder(
            JobResponse(
                **self.model_dump()
            ).model_dump(by_alias=True)
        )


class JobQueryPaginatedResponse(QueryPaginatedResponse):
    """
    Job Query Response, includes a list of jobs, the total
    """
    url_placeholder: ClassVar[str] = get_unarchiver_endpoint_url()
    results: List[JobResponse]

    @classmethod
    def resolve_url_placeholder(cls, **kwargs) -> str:

        # Get the url placeholder
        return cls.url_placeholder.format()
