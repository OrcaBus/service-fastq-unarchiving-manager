from typing import Literal

JobStatus = Literal[
    'PENDING',
    'RUNNING',
    'FAILED',
    'ABORTED',
    'SUCCEEDED',
]
