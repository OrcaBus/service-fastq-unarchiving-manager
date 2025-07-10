from typing import Literal, List

JobStatusType = Literal[
    'PENDING',
    'RUNNING',
    'FAILED',
    'ABORTED',
    'SUCCEEDED',
]

JobStatusList: List[JobStatusType] = list(JobStatusType.__args__)

JobStatusStateChangeType = Literal[
    'RUNNING',
    'FAILED',
    'ABORTED',
    'SUCCEEDED',
]

JobStatusStateChangeList = list(JobStatusStateChangeType.__args__)

JobStatusTerminalType = Literal[
    'FAILED',
    'ABORTED',
    'SUCCEEDED'
]

JobStatusTerminalList = list(JobStatusTerminalType.__args__)
