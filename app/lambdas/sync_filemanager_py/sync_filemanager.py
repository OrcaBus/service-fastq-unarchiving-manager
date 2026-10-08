#!/usr/bin/env python3
from typing import Optional, Tuple
from urllib.parse import urlparse
from orcabus_api_tools.filemanager import crawl_filemanager_sync


def parse_s3_uri(s3_uri: str) -> Tuple[str, Optional[str]]:
    parsed = urlparse(s3_uri)
    if parsed.scheme != "s3":
        raise ValueError(f"Expected an s3:// URI, got '{s3_uri}'")
    bucket = parsed.netloc
    if not bucket:
        raise ValueError(f"Could not determine bucket from s3 uri '{s3_uri}'")
    prefix = parsed.path.lstrip("/") or None
    return bucket, prefix


def handler(event, context):
    s3_uri_prefix = event.get('s3UriPrefix')
    if s3_uri_prefix:
        bucket, prefix = parse_s3_uri(s3_uri_prefix)
    else:
        bucket = event.get('bucket')
        prefix = event.get('prefix')
    if not bucket:
        raise ValueError("Either 's3UriPrefix' or 'bucket' must be provided in the event")
    crawl_filemanager_sync(bucket=bucket, prefix=prefix)
    return {"status": "success"}
