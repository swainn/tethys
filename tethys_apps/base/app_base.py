"""
********************************************************************************
* Name: app_base.py
* Author: Nathan Swain and Scott Christensen
* Created On: August 19, 2013
* Copyright: (c) Brigham Young University 2013
* License: BSD 2-Clause
********************************************************************************
"""
import os
import sys

from django.http import HttpRequest
from django.contrib.auth.models import User
from django.utils.functional import SimpleLazyObject

from tethys_compute.job_manager import JobManager
from tethys_apps.base.workspace import TethysWorkspace


class TethysAppBase(object):
    """
    Base class used to define the app class for Tethys apps.

    Attributes:
      name (string): Name of the app.
      index (string): Lookup term for the index URL of the app.
      icon (string): Location of the image to use for the app icon.
      package (string): Name of the app package.
      root_url (string): Root URL of the app.
      color (string): App theme color as RGB hexadecimal.

    """
    name = ''
    index = ''
    icon = ''
    package = ''
    root_url = ''
    color = ''

    def __repr__(self):
        """
        String representation
        """
        return '<TethysApp: {0}>'.format(self.name)

    def url_map(self):
        """
        Use this method to define the URL Maps for your app. Your ``UrlMap`` objects must be created from a ``UrlMap`` class that is bound to the ``root_url`` of your app. Use the ``url_map_maker()`` function to create the bound ``UrlMap`` class. If you generate your app project from the scaffold, this will be done automatically.

        Returns:
          iterable: A list or tuple of ``UrlMap`` objects.

        **Example:**

        ::

            def url_maps(self):
                \"""
                Example url_maps method.
                \"""
                # Create UrlMap class that is bound to the root url.
                UrlMap = url_map_maker(self.root_url)

                url_maps = (UrlMap(name='home',
                                   url='my-first-app',
                                   controller='my_first_app.controllers.home'
                                   ),
                )

                return url_maps
        """
        raise NotImplementedError()
    
    def persistent_stores(self):
        """
        Define this method to register persistent store databases for your app. You may define up to 5 persistent stores for an app.

        Returns:
          iterable: A list or tuple of ``PersistentStore`` objects. A persistent store database will be created for each object returned.

        **Example:**

        ::

            def persistent_stores(self):
                \"""
                Example persistent_stores method.
                \"""

                stores = (PersistentStore(name='example_db',
                                          initializer='init_stores:init_example_db',
                                          spatial=True
                        ),
                )

                return stores
        """
        return None

    def dataset_services(self):
        """
        Use this method to define dataset service connections for use in your app.

        Returns:
          iterable: A list or tuple of ``DatasetService`` objects.

        **Example:**

        ::

            def dataset_services(self):
                \"""
                Example dataset_services method.
                \"""
                dataset_services = (DatasetService(name='example',
                                                   type='ckan',
                                                   endpoint='http://www.example.com/api/3/action',
                                                   apikey='a-R3llY-n1Ce-@Pi-keY'
                                                   ),
                )

                return dataset_services
        """
        return None

    def spatial_dataset_services(self):
        """
        Use this method to define spatial dataset service connections for use in your app.

        Returns:
          iterable: A list or tuple of ``SpatialDatasetService`` objects.

        **Example:**

        ::

            def spatial_dataset_services(self):
                \"""
                Example spatial_dataset_services method.
                \"""
                spatial_dataset_services = (SpatialDatasetService(name='example',
                                                                  type='geoserver',
                                                                  endpoint='http://www.example.com/geoserver/rest',
                                                                  username='admin',
                                                                  password='geoserver'
                                                                  ),
                )

                return spatial_dataset_services
        """
        return None

    def wps_services(self):
        """
        Use this method to define web processing service connections for use in your app.

        Returns:
          iterable: A list or tuple of ``WpsService`` objects.

        **Example:**

        ::

            def wps_services(self):
                \"""
                Example wps_services method.
                \"""
                wps_services = (WpsService(name='example',
                                           endpoint='http://www.example.com/wps/WebProcessingService'
                                           ),
                )

                return wps_services
        """
        return None

    @classmethod
    def job_templates(cls):
        """
        Use this method to define job templates to easily create and submit jobs in your app.

        Returns:
            iterable: A list or tuple of ``JobTemplate`` objects.

        **Example:**

        ::

            from tethys_compute.job_manager import JobTemplate, JobManager

            @classmethod
            def job_templates(cls):
                \"""
                Example job_templates method.
                \"""
                job_templates = (JobTemplate(name='example',
                                             type=JobManager.JOB_TYPES_DICT['CONDOR'],
                                             parameters={'executable': 'my_script.py',
                                                         'condorpy_template_name': 'vanilla_transfer_files',
                                                         'attributes': {'transfer_output_files': 'example_output'},
                                                         'remote_input_files': ['my_script.py','input_1', 'input_2'],
                                                         'working_directory': os.path.dirname(__file__)}
                                            ),
                                )

                return job_templates
        """
        return None

    @classmethod
    def get_job_manager(cls):
        templates = cls.job_templates()
        job_manager = JobManager(label=cls.package, job_templates=templates)
        return job_manager


    @classmethod
    def get_user_workspace(cls, user):
        """
        Get the file workspace (directory) for a user.

        Args:
          user(User or HttpRequest): User or request object.

        Returns:
          tethys_apps.base.TethysWorkspace: An object representing the workspace.

        **Example:**

        ::

            import os
            from .app import MyFirstApp

            def a_controller(request):
                \"""
                Example controller that uses get_user_workspace() method.
                \"""
                # Retrieve the workspace
                user_workspace = MyFirstApp.get_user_workspace(request.user)
                new_file_path = os.path.join(user_workspace.path, 'new_file.txt')

                with open(new_file_path, 'w') as a_file:
                    a_file.write('...')

                context = {}

                return render(request, 'my_first_app/template.html', context)

        """
        username = ''

        if isinstance(user, User):
            username = user.username
        elif isinstance(user, HttpRequest):
            username = user.user.username
        elif isinstance(user, SimpleLazyObject):
            username = user.username
        elif user is None:
            pass
        else:
            raise ValueError("Invalid type for argument 'user': must be either an User or HttpRequest object.")

        if not username:
            username = 'anonymous_user'

        project_directory = os.path.dirname(sys.modules[cls.__module__].__file__)
        workspace_directory = os.path.join(project_directory, 'workspaces', 'user_workspaces', username)
        return TethysWorkspace(workspace_directory)

    @classmethod
    def get_app_workspace(cls):
        """
        Get the file workspace (directory) for the app.

        Returns:
          tethys_apps.base.TethysWorkspace: An object representing the workspace.

        **Example:**

        ::

            import os
            from .app import MyFirstApp

            def a_controller(request):
                \"""
                Example controller that uses get_app_workspace() method.
                \"""
                # Retrieve the workspace
                app_workspace = MyFirstApp.get_app_workspace()
                new_file_path = os.path.join(app_workspace.path, 'new_file.txt')

                with open(new_file_path, 'w') as a_file:
                    a_file.write('...')

                context = {}

                return render(request, 'my_first_app/template.html', context)

        """
        # Find the path to the app project directory
        ## Hint: cls is a child class of this class.
        ## Credits: http://stackoverflow.com/questions/4006102/is-possible-to-know-the-_path-of-the-file-of-a-subclass-in-python
        project_directory = os.path.dirname(sys.modules[cls.__module__].__file__)
        workspace_directory = os.path.join(project_directory, 'workspaces', 'app_workspace')
        return TethysWorkspace(workspace_directory)