"""
********************************************************************************
* Name: jobs.py
* Author: Nathan Swain and Scott Christensen
* Created On: 7 August 2015
* Copyright: (c) Brigham Young University 2015
* License: BSD 2-Clause
********************************************************************************
"""
# flake8: noqa
# DO NOT ERASE
# Depricated imports
from tethys_compute.job_manager import (
    JobManager,
    BasicJobTemplate,
    CondorJobTemplate,
    CondorJobDescription,
    CondorWorkflowTemplate,
    CondorWorkflowJobTemplate,
)
from tethys_compute.models import (
    BasicJob,
    CondorJob,
    CondorWorkflow,
    CondorWorkflowJobNode,
    DaskJob
)
