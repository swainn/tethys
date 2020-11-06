"""
********************************************************************************
* Name: condor_base
* Author: nswain
* Created On: September 12, 2018
* Copyright: (c) Aquaveo 2018
********************************************************************************
"""
import os
from abc import abstractmethod
from pathlib import Path
from functools import partial
import logging

from django.db import models
from django.utils import timezone

from tethys_compute.models.tethys_job import TethysJob
from tethys_compute.models.condor.condor_scheduler import CondorScheduler

log = logging.getLogger(__name__)


class CondorBase(TethysJob):
    """
    Base class for CondorJob and CondorWorkflow
    """
    cluster_id = models.IntegerField(blank=True, default=0)
    remote_id = models.CharField(max_length=32, blank=True, null=True)
    scheduler = models.ForeignKey(CondorScheduler, on_delete=models.SET_NULL, blank=True, null=True)

    STATUS_MAP = {'Unexpanded': 'SUB',
                  'Idle': 'SUB',
                  'Running': 'RUN',
                  'Removed': 'ABT',
                  'Completed': 'COM',
                  'Held': 'ERR',
                  'Submission_err': 'ERR',
                  'Various': 'VAR',
                  'Various-Complete': 'VCP',
                  }

    @property
    def condor_object(self):
        """
        Returns: an instance of a condorpy job or condorpy workflow with scheduler, cluster_id, and remote_id attributes set
        """  # noqa: E501
        condor_object = self._condor_object
        condor_object._cluster_id = self.cluster_id
        condor_object._cwd = self.workspace
        if self.scheduler:
            condor_object.set_scheduler(self.scheduler.host,
                                        self.scheduler.username,
                                        self.scheduler.password,
                                        self.scheduler.private_key_path,
                                        self.scheduler.private_key_pass
                                        )
            self.remote_id = self.remote_id or condor_object._remote_id
            condor_object._remote_id = self.remote_id
        return condor_object

    @abstractmethod
    def _condor_object(self):
        """
        Returns: an instance of a condorpy job or condorpy workflow
        """
        pass

    @property
    def statuses(self):
        updated = (timezone.now() - self.last_status_update) < self.update_status_interval
        if not (hasattr(self, '_statuses') and updated):
            self._statuses = self.condor_object.statuses

        return self._statuses

    @abstractmethod
    def _execute(self, *args, **kwargs):
        self.cluster_id = self.condor_object.submit(*args, **kwargs)
        self.save()

    def _update_status(self, *args, **kwargs):
        if not self.execute_time:
            return 'PEN'
        try:
            # get the status of the condorpy job/workflow
            condor_status = self.condor_object.status

            if condor_status == 'Various':
                statuses = self.statuses
                running_statuses = statuses['Unexpanded'] + statuses['Idle'] + statuses['Running']
                if not running_statuses:
                    condor_status = 'Various-Complete'
        except Exception:
            condor_status = 'Submission_err'

        self._status = self.STATUS_MAP[condor_status]
        self.save()

    def _process_results(self):
        if self.scheduler:
            self.condor_object.sync_remote_output()
            self.condor_object.close_remote()

    def stop(self):
        self.condor_object.remove()

    def _resubmit(self):
        self.condor_object.close_remote()
        self.execute()

    @abstractmethod
    def _log_files(self):
        """
            Build a nested dictionary with all the log files we want to retrieve.
        """
        pass

    def _get_logs_from_remote(self, log_files):
        """
        Get logs from remote while job is running.

        Args:
            log_files: the nested dictionaries of all the log files

        Returns: the contents of all the logs files in a nested dictionary.
        """

        contents = dict()
        for log_file_type, log_file_path in log_files.items():
            if log_file_type == 'workflow':
                contents['workflow'] = partial(self.get_log_content, log_file_path)
            else:
                # Parse out logs for each job.
                contents[log_file_type] = dict()
                for job_log_type, job_log_path in log_file_path.items():
                    contents[log_file_type][job_log_type] = partial(self.get_log_content, job_log_path)

        return contents

    def get_log_content(self, log_file):
        content, _ = self.condor_object._execute(['cat', log_file])
        return content

    def _get_logs_from_workspace(self, log_files):
        """
        Get logs from workspaces in case the job has been deleted over the condor scheduler.
        :param log_files: the nested dictionaries of all the log files
        :return: the contents of all the logs files in a nested dictionary.
        """
        contents = dict()
        for log_file_type, log_file_path in log_files.items():
            if log_file_type == 'workflow':
                log_file = os.path.join(self.workspace, self.remote_id, log_file_path)
                contents['workflow'] = partial(self.read_file, log_file)
            else:
                # Parse out logs for each job.
                contents[log_file_type] = dict()
                for job_log_type, job_log_path in log_file_path.items():
                    log_file_folder = os.path.join(self.workspace, self.remote_id, log_file_type, "logs")
                    log_file_ext = job_log_path[-4:]
                    file_name = 'File'
                    if os.path.isdir(log_file_folder):
                        for file in os.listdir(log_file_folder):
                            if file.endswith(log_file_ext):
                                file_name = os.path.join(log_file_folder, file)
                    contents[log_file_type][job_log_type] = partial(self.read_file, file_name)

        return contents

    @staticmethod
    def read_file(file_name):
        try:
            file_path = Path(file_name)
            if file_path.is_file():
                with file_path.open() as f:
                    return f.read()
            else:
                return f'{file_name} does not exist'
        except Exception as e:
            log.exception(e)
            return f'There was an error while reading {file_name}'

    def _get_logs(self):
        """
        Get logs contents for condor job.
        """
        log_files = self._log_files()
        log_contents = self._get_logs_from_remote(log_files)
        # Check to see if log_contents are empty. If it's empty, the job on the condor machine might get removed.
        # We will try to get from the workspace if this is the case.
        log_has_content = self._check_log_has_content(log_contents)
        if not log_has_content:
            log_contents = self._get_logs_from_workspace(log_files)
        return log_contents

    def pause(self):
        """
        Pauses job during execution
        """
        pass
        # self.condor_object.hold()

    def resume(self):
        """
        Resumes a job that has been paused
        """
        pass
        # self.condor_object.release()

    def update_database_fields(self):
        self.remote_id = self.remote_id or self._condor_object._remote_id

    @staticmethod
    def _check_log_has_content(log_contents):
        """
        Return True if log content is not empty.
        """
        for key, value in log_contents.items():
            if isinstance(value, dict):
                for child_value in value.values():
                    if child_value:
                        return True
            else:
                if value:
                    return True
        return False
