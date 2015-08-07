"""
********************************************************************************
* Name: models.py
* Author: Scott Christensen
* Created On: 2015
* Copyright: (c) Brigham Young University 2015
* License: BSD 2-Clause
********************************************************************************
"""
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from tethys_compute import (TETHYSCLUSTER_CFG_FILE,
                            TETHYSCLUSTER_CFG_TEMPLATE,
                            TETHYSCLUSTER_AWS_CFG_FILE,
                            TETHYSCLUSTER_AWS_CFG_TEMPLATE,
                            TETHYSCLUSTER_AZURE_CFG_FILE,
                            TETHYSCLUSTER_AZURE_CFG_TEMPLATE)
from tethys_compute.utilities import DictionaryField, ListField

import os, re
from multiprocessing import Process
from abc import abstractmethod

from tethyscluster import config as tethyscluster_config
from tethyscluster.sshutils import get_certificate_fingerprint
from condorpy import Job, Templates


class SettingsCategory(models.Model):
    name = models.CharField(max_length=30)

    class Meta:
        verbose_name = 'Settings Category'
        verbose_name_plural = 'Settings'

    def __unicode__(self):
        return self.name


class Setting(models.Model):
    name = models.TextField(max_length=30)
    content = models.TextField(max_length=500, blank=True)
    date_modified = models.DateTimeField('date modified', auto_now=True)
    category = models.ForeignKey(SettingsCategory)

    def __unicode__(self):
        return self.name

    @classmethod
    def as_dict(cls):
        all_settings = cls.objects.all()

        settings_dict = dict()

        for setting in all_settings:
            code_name = setting.name.lower().replace(' ', '_')
            settings_dict[code_name] = setting.content

        return settings_dict

@receiver(post_save, sender=Setting)
def setting_post_save(sender, instance, created, raw, using, update_fields, **kwargs):
    settings = Setting.as_dict()
    if settings['default_cluster']:
        with open(TETHYSCLUSTER_CFG_FILE, 'w') as config_file:
            config_file.write(TETHYSCLUSTER_CFG_TEMPLATE % settings)

    if settings['aws_access_key_id'] \
        and settings['aws_secret_access_key'] \
        and settings['aws_user_id'] \
        and settings['key_name'] \
        and settings['key_location']:

        with open(TETHYSCLUSTER_AWS_CFG_FILE, 'w') as config_file:
            config_file.write(TETHYSCLUSTER_AWS_CFG_TEMPLATE % settings)

    if settings['subscription_id'] and settings['certificate_path']:
        settings['certificate_fingerprint'] = get_certificate_fingerprint(cert_location=settings['certificate_path'])
        with open(TETHYSCLUSTER_AZURE_CFG_FILE, 'w') as config_file:
            config_file.write(TETHYSCLUSTER_AZURE_CFG_TEMPLATE % settings)



class Cluster(models.Model):
    STATUSES = (
        ('STR', 'Starting'),
        ('RUN', 'Running'),
        ('STP', 'Stopped'),
        ('UPD', 'Updating'),
        ('DEL', 'Deleting'),
        ('ERR', 'Error'),
    )

    STATUS_DICT = {k:v for v,k in STATUSES}

    PROVIDERS = (
        ('AWS', 'Amazon Web Services'),
        ('AZR', 'Microsoft Azure'),
    )

    try:
        TC_MANAGER = tethyscluster_config.get_cluster_manager()
    except Exception as e:
        print e.message
        TC_MANAGER = None

    _name = models.CharField(max_length=30, unique=True, default='tethys_default')
    _size = models.IntegerField(default=1)
    _status = models.CharField(max_length=3, choices=STATUSES, default=STATUS_DICT['Starting'])
    _cloud_provider = models.CharField(max_length=3, choices=PROVIDERS, default=PROVIDERS[0][0])
    _master_image_id = models.CharField(max_length=9, blank=True, null=True)
    _node_image_id = models.CharField(max_length=9, blank=True, null=True)
    _master_instance_type = models.CharField(max_length=20, blank=True, null=True)
    _node_instance_type = models.CharField(max_length=20, blank=True, null=True)
    _tethys_cluster = None

    @classmethod
    def create(cls, name, size=1):
        return cls(name=name, size=size)

    def __unicode__(self):
        return '%s (%d-node)' % (self.name, self.size)

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, name):
        self._name = name

    @property
    def size(self):
        return self._size

    @size.setter
    def size(self, size):
        object.__setattr__(self, '_size', size)

    @property
    def status(self):
        self._update_status()
        field = self._meta.get_field('_status')
        return self._get_FIELD_display(field)

    @property
    def cloud_provider(self):
        field = self._meta.get_field('_cloud_provider')
        return self._get_FIELD_display(field)

    @property
    def tethys_cluster(self):
        if not self._tethys_cluster:
            try:
                self._tethys_cluster = self.TC_MANAGER.get_cluster_or_none(self.name)
            except Exception as e:
                print e.message
        return self._tethys_cluster

    def create_tethys_cluster(self):
        tc = self.tethys_cluster
        if not tc:
            try:
                tc = self.TC_MANAGER.get_default_template_cluster(self.name)
                tc.update({'cluster_size':self.size})
                print tc
                tc.start()
                self._tethys_cluster = tc
                self.connect_scheduler_and_master()
                self.save()
            except Exception as e:
                print e.message
        else:
            pass
            #raise

    def connect_scheduler_and_master(self):
        def add_value_to_condor_config(config_file, attr, value):
            text = config_file.read()
            text_parts = re.split('^\s*%s ?= ?' % (attr, ), text, flags=re.IGNORECASE|re.M)
            if len(text_parts) > 1:
                last_part = text_parts.pop()
                new_last_part = '%s %s' % (value, last_part)
                text_parts.append(new_last_part)
                join_attr = '%s = ' % (attr, )
                new_text = join_attr.join(text_parts)
            else:
                new_text = '%s\n%s = %s\n' % (text, attr, value)
            config_file.seek(0)
            config_file.write(new_text)

        def get_public_ip():
            #TODO try this code
            # import socket
            # host_ip socket.gethostbyname(socket.gethostname())

            import urllib2, json
            json_response = urllib2.urlopen('http://ip.jsontest.com/').read()
            host_ip = json.loads(json_response)['ip']
            return host_ip

        tc = self.tethys_cluster
        if tc:
            master = tc.master_node
            settings = Setting.as_dict()
            scheduler_ip = settings['scheduler_ip'] or get_public_ip()
            master_local_config_file = master.ssh.execute('condor_config_val local_config_file')[0]
            with master.ssh.remote_file(master_local_config_file, mode='r+') as config_file:
                add_value_to_condor_config(config_file, 'FLOCK_FROM', scheduler_ip)

            p = os.popen('condor_config_val local_config_file')
            local_config_file = p.read().strip('\n')
            p.close()

            with open(local_config_file, 'r+') as config_file:
                add_value_to_condor_config(config_file, 'FLOCK_TO', master.ip_address)


    def update_tethys_cluster(self):
        #TODO check if connection to master needs to be updated
        tc = self.tethys_cluster
        if tc:
            tc_size = len(tc.nodes)
            delta = abs(tc_size - self.size)
            if delta != 0:
                cmd = self._add_nodes if self.size > tc_size else self._remove_nodes
                cmd(delta)
        else:
            self.create_tethys_cluster()
            #raise

    def delete_tethys_cluster(self):
        #TODO remove master_ip from local condor config
        tc = self.tethys_cluster
        if tc:
            tc.terminate_cluster(force=True)

    def _add_nodes(self, num_nodes, image_id=None, instance_type=None, spot_bid=None):
        tc = self.tethys_cluster
        tc.add_nodes(num_nodes, image_id=image_id, instance_type=instance_type, spot_bid=spot_bid)
        self._sync()

    def _remove_nodes(self, num_nodes):
        tc = self.tethys_cluster
        tc.remove_nodes(num_nodes=num_nodes, force=True)
        self._sync()

    def _update_status(self):
        old_status = self._status
        tc = self.tethys_cluster
        if tc is None:
            if self._status == self.STATUS_DICT['Starting']:
                pass
            elif self._status == self.STATUS_DICT['Deleting']:
                self.delete() #TODO: Not so sure this will work
            else:
                self._status = self.STATUS_DICT['Error']
        elif self._status == self.STATUS_DICT['Updating']:
            if tc.is_cluster_up() and len(tc.nodes) == self.size:
                self._status = self.STATUS_DICT['Running']
        elif (self._status == self.STATUS_DICT['Starting'] or self._status == self.STATUS_DICT['Stopped']) and tc.is_cluster_up():
            self._status = self.STATUS_DICT['Running']
        elif self._status == self.STATUS_DICT['Running']:
            if tc.is_cluster_stopped():
                self._status = self.STATUS_DICT['Stopped']
            elif not tc.is_valid():
                self._status = self.STATUS_DICT['Error']

@receiver(pre_save, sender=Cluster)
def cluster_pre_save(sender, instance, raw, using, update_fields, **kwargs):
    instance._update_status()


@receiver(post_save, sender=Cluster)
def cluster_post_save(sender, instance, created, raw, using, update_fields, **kwargs):
    if created:
        target = instance.create_tethys_cluster
    else:
        target = instance.update_tethys_cluster
    process = Process(target=target)
    process.start()

@receiver(post_delete, sender=Cluster)
def cluster_post_delete(sender, instance, **kwargs):
    process = Process(target=instance.delete_tethys_cluster)
    process.start()


class TethysJob(models.Model):
    """Base class for all job types.

    """
    class Meta:
        verbose_name = 'Job'

    STATUSES = (
        ('PEN', 'Pending'),
        ('SUB', 'Submitted'),
        ('RUN', 'Running'),
        ('COM', 'Complete'),
        ('ERR', 'Error'),
        ('ABT', 'Aborted')
    )

    STATUS_DICT = {k: v for v, k in STATUSES}

    name = models.CharField(max_length=30)
    description = models.CharField(max_length=1024, blank=True, default='')
    user = models.ForeignKey(User)
    label = models.CharField(max_length=30)
    creation_time = models.DateTimeField(auto_now_add=True)
    execute_time = models.DateTimeField(blank=True, null=True)
    completion_time = models.DateTimeField(blank=True, null=True)
    _status = models.CharField(max_length=3, choices=STATUSES, default=STATUSES[0][0])

    @property
    def status(self):
        self.child._update_status()
        field = self.child._meta.get_field('_status')
        status = self._get_FIELD_display(field)
        return status


    def execute(self):
        """

        """
        self.execute_time = timezone.now()
        self.save()
        self.child._execute()

    @abstractmethod
    def _execute(self):
        pass

    @abstractmethod
    def _update_status(self):
        pass

    @abstractmethod
    def stop(self):
        """

        """
        raise NotImplementedError()

    def pause(self):
        """

        """
        raise NotImplementedError()

    def resume(self):
        """
        """
        raise NotImplementedError()


class CondorJob(TethysJob):
    """

    """
    executable = models.CharField(max_length=256)
    condorpy_template_name = models.CharField(max_length=256, blank=True, null=True)
    attributes = DictionaryField(default='')
    remote_input_files = ListField(default='')
    working_directory = models.CharField(max_length=512, blank=True, null=True)
    cluster_id = models.IntegerField(blank=True, default=0)
    num_jobs = models.IntegerField(default=1)
    remote_id = models.CharField(max_length=32, blank=True, null=True)
    tethys_job = models.OneToOneField(TethysJob, related_name='child')
    #scheduler_ip = models.CharField(max_length=12, blank=True, null=True) ##TethysCompute only supports one scheduler
    #ami = models.CharField(max_length=9)  ## use documentation to specify this
    STATUS_MAP = {'Unexpanded': 'PEN',
                  'Idle': 'SUB',
                  'Running': 'RUN',
                  'Removed': 'ABT',
                  'Completed': 'COM',
                  'Held': 'ERR',
                  'Submission_err': 'ERR'}

    @property
    def condorpy_template(self):
        if self.condorpy_template_name:
            template = getattr(Templates, self.condorpy_template_name)
        else:
            template = Templates.base
        return template

    @property
    def condorpy_job(self):
        if not hasattr(self, '_condorpy_job'):
            settings = Setting.as_dict()
            if 'executable' in self.attributes.keys():
                del self.attributes['executable']
            job = Job(name=self.name,
                      attributes=self.condorpy_template,
                      executable=self.executable,
                      host=settings['scheduler_ip'],
                      username='tethysadmin',
                      private_key=settings['scheduler_key_location'],
                      remote_input_files=self.remote_input_files,
                      working_directory=self.working_directory,
                      **self.attributes)
            job._cluster_id = self.cluster_id
            job._num_jobs = self.num_jobs
            if self.remote_id:
                job._remote_id = self.remote_id
            else:
                self.remote_id = job._remote_id
            self._condorpy_job = job
        return self._condorpy_job

    def _update_status(self):
        if self._status in ['PEN', 'SUB', 'RUN']:
            try:
                condor_status = self.condorpy_job.status
                if condor_status == 'Completed':
                    self._process_results()
            except Exception, e:
                # raise e
                condor_status = 'Submission_err'
            self._status = self.STATUS_MAP[condor_status]
            self.save()

    def _execute(self, queue=1, options=[]):
        self.num_jobs = queue
        self.cluster_id = self.condorpy_job.submit(queue, options)
        self.save()

    def _process_results(self):
        self.condorpy_job.sync_remote_output()
        self.condorpy_job.close_remote()

    def stop(self):
        self.condorpy_job.remove()

    def get_attribute(self, attribute):
        self.condorpy_job.get(attribute)

    def set_attribute(self, attribute, value):
        self.condorpy_job.set(attribute, value)

    def _update_attributes(self):
        self.attributes = self.condorpy_job._attributes

@receiver(pre_save, sender=CondorJob)
def condor_job_pre_save(sender, instance, raw, using, update_fields, **kwargs):
    instance._update_attributes()