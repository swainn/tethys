**********************
Command Line Interface
**********************

**Last Updated:** March 13, 2019

The Tethys Command Line Interface (CLI) provides several commands that are used for managing Tethys Platform and Tethys apps. The :term:`Python conda environment` must be activated to use the command line tools. This can be done using the following command:

::

    $ ./usr/lib/tethys/bin/activate

The following article provides and explanation for each command provided by Tethys CLI.

Usage
=====

::

    $ tethys <command> [options]

Options
-------

* **-h, --help**: Request the help information for Tethys CLI or any command.


Commands
========

.. _tethys_version_cmd:

version
-------

This command prints the current `tethys_platform` version.

**Examples:**

::

    $ tethys version


.. _tethys_db_cmd:

db <subcommand> [options]
-------------------------

This command contains several subcommands that are used to help setup and manage a Tethys database.

**Arguments:**

* **subcommand**: The management command to run.

    * *init*: Creates a local postgresql database server using the information from the `DATABASES` section in :file:`settings.py`.
    * *start*: Starts the local database server.
    * *stop*: Stops the local database server.
    * *status*: Checks the status of the local database server.
    * *create*: Creates the Tethys database on the database server connection specified in the `DATABASES` section in :file:`settings.py`.
    * *migrate*: Initialize the database during installation. Wrapper for ``manage.py migrate``.
    * *createsuperuser*: Create a new superuser/website admin for your Tethys Portal.
    * *configure*: Convenience command for running *init*, *start*, *create*, *migrate*, and *createsuperuser*.
    * *sync*: Sync installed apps and extensions with the TethysApp database.

**Optional Arguments:**

* **-d DATABASE_ALIAS, --db_alias DATABASE_ALIAS**: Name of the database options from settings.py to use (e.g. 'default').
* **-n USERNAME, --username USERNAME**: Name of database user to add to database when creating.
* **-p PASSWORD, --password PASSWORD**: Password for the database user.
* **-N USERNAME, --superuser-name USERNAME**: Name of database super user to add to database when creating.
* **-P PASSWORD, --superuser-pasword PASSWORD**: Password for the database super user.
* **--portal-superuser-name USERNAME**: Name for the Tethys portal super user.
* **--portal-superuser-email EMAIL**: Email of the Tethys portal super user.
* **--portal-superuser-password PASSWORD**: Password for the Tethys portal super user.

**Examples:**

::

    # Create a new local database server
    $ tethys db init

    # Start local database server
    $ tethys db start

    # Stop local database server
    $ tethys db stop

    # Create Tethys databases
    $ tethys db create

    # Run database migrations
    $ tethys db migrate

    # Create a new Tethys portal superuser
    $ tethys db createsuperuser

    # Shortcut command for init, start, create, migrate, and createsuperuser
    $ tethys db configure

    # Sync installed apps and extensions with the TethysApp database.
    $ tethys db sync



.. _tethys_scaffold_cmd:

scaffold <name>
---------------

This command is used to create new Tethys app projects via the scaffold provided by Tethys Platform. You will be presented with several interactive prompts requesting metadata information that can be included with the app. The new app project will be created in the current working directory of your terminal.

**Arguments:**

* **name**: The name of the new Tethys app project to create. Only lowercase letters, numbers, and underscores are allowed.

**Optional Arguments:**

* **-t TEMPLATE, --template TEMPLATE**: Name of app template to use.
* **-e EXTENSION, --extension EXTENSION**: Name of extension template to use [UNDER DEVELOPMENT].
* **-d, --defaults**: Run command, accepting default values automatically.
* **-o, --overwrite**: Attempt to overwrite project automatically if it already exists.

**Examples:**

::

    $ tethys scaffold my_first_app

.. _tethys_gen_cmd:

gen <type>
----------

Aids the installation of Tethys by automating the creation of supporting files.


**Arguments:**

* **type**: The type of object to generate. Either "settings" or "apache".

    * *settings*: When this type of object is specified, :command:`gen` will generate a new :file:`settings.py` file. It generates the :file:`settings.py` with a new ``SECRET_KEY`` each time it is run.
    * *apache*: When this type of object is specified :command:`gen` will generate a new :file:`apache.conf` file. This file is used to configure Tethys Platform in a production environment.

**Optional Arguments:**

* **-d DIRECTORY, --directory DIRECTORY**: Destination directory for the generated object.

**Examples:**

::

    $ tethys gen settings
    $ tethys gen settings -d /path/to/destination
    $ tethys gen apache
    $ tethys gen apache -d /path/to/destination

.. _tethys_manage_cmd:

manage <subcommand> [options]
-----------------------------

This command contains several subcommands that are used to help manage Tethys Platform.

**Arguments:**

* **subcommand**: The management command to run.

    * *start*: Start the Django development server. Wrapper for ``manage.py runserver``.
    * *collectstatic*: Link app and extension static/public directories to STATIC_ROOT directory and then run Django's collectstatic command. Preprocessor and wrapper for ``manage.py collectstatic``.
    * *collectworkspaces*: Link app workspace directories to TETHYS_WORKSPACES_ROOT directory.
    * *collectall*: Convenience command for running both *collectstatic* and *collectworkspaces*.
    * *createsuperuser*: Create a new superuser/website admin for your Tethys Portal.

**Optional Arguments:**

* **-p PORT, --port PORT**: Port on which to start the development server. Default port is 8000.
* **-m MANAGE, --manage MANAGE**: Absolute path to :file:`manage.py` file for Tethys Platform installation if different than default.

**Examples:**

::

    # Start the development server
    $ tethys manage start
    $ tethys manage start -p 8888

    # Collect static files
    $ tethys manage collectstatic

    # Collect workspaces
    $ tethys manage collectworkspaces

    # Collect static files and workspaces
    $ tethys manage collectall

    # Create a new superuser
    $ tethys manage createsuperuser

syncstores <app_name, app_name...> [options]
--------------------------------------------

Management command for Persistent Stores. To learn more about persistent stores see :doc:`./tethys_services/persistent_store`.

**Arguments:**

* **app_name**: Name of one or more apps to target when performing persistent store sync OR "all" to sync all persistent stores on this Tethys Platform instance.

**Optional Arguments:**

* **-r, --refresh**: Drop databases prior to performing persistent store sync resulting in a refreshed database.
* **-f, --firsttime**: All initialization functions will be executed with the ``first_time`` parameter set to ``True``.
* **-d DATABASE, --database DATABASE**: Name of the persistent store database to target.
* **-m MANAGE, --manage MANAGE**: Absolute path to :file:`manage.py` file for Tethys Platform installation if different than default.

**Examples:**

::

    # Sync all persistent store databases for one app
    $ tethys syncstores my_first_app

    # Sync all persistent store databases for multiple apps
    $ tethys syncstores my_first_app my_second_app yet_another_app

    # Sync all persistent store databases for all apps
    $ tethys syncstores all

    # Sync a specific persistent store database for an app
    $ tethys syncstores my_first_app -d example_db

    # Sync persistent store databases with a specific name for all apps
    $ tethys syncstores all -d example_db

    # Sync all persistent store databases for an app and force first_time to True
    $ tethys syncstores my_first_app -f

    # Refresh all persistent store databases for an app
    $ tethys syncstores my_first_app -r

.. _tethys_list_cmd:

list
----

Use this command to list all installed apps and extensions.

**Examples:**

::

    $ tethys list

uninstall <app>
---------------

Use this command to uninstall apps and extensions.

**Arguments:**

* **name**: Name the app or extension to uninstall.

**Optional Arguments:**
* **-e, --extension**: Flag used to indicate that the item being uninstalled is an extension.

**Examples:**

::

    # Uninstall my_first_app
    $ tethys uninstall my_first_app

    # Uninstall extension
    $ tethys uninstall -e my_extension

.. _tethys_cli_docker:

docker <subcommand> [options]
-----------------------------

Management commands for the Tethys Docker containers. To learn more about Docker, see `What is Docker? <https://www.docker.com/whatisdocker/>`_.

**Arguments:**

* **subcommand**: The docker command to run. One of the following:

    * *init*: Initialize the Tethys Dockers including, starting Boot2Docker if applicable, pulling the Docker images, and installing/creating the Docker containers.
    * *start*: Start the Docker containers.
    * *stop*: Stop the Docker containers.
    * *restart*: Restart the Docker containers.
    * *status*: Display status of each Docker container.
    * *update*: Pull the latest version of the Docker images.
    * *remove*: Remove a Docker images.
    * *ip*: Display host, port, and endpoint of each Docker container.

**Optional Arguments:**

* **-d, --defaults**: Install Docker containers with default values (will not prompt for input). Only applicable to *init* subcommand.
* **-c {postgis, geoserver, wps} [{postgis, geoserver, wps} ...], --containers {postgis, geoserver, wps} [{postgis, geoserver, wps} ...]**: Execute subcommand only on the container(s) specified.
* **-b, --boot2docker**: Also stop Boot2Docker when *stop* subcommand is called with this option.

**Examples:**

::

    # Initialize Tethys Dockers
    $ tethys docker init

    # Initialize with Default Parameters
    $ tethys docker init -d

    # Start all Tethys Dockers
    $ tethys docker start

    # Start only PostGIS Docker
    $ tethys docker start -c postgis

    # Start PostGIS and GeoServer Docker
    $ tethys docker start -c postgis geoserver

    # Stop Tethys Dockers
    $ tethys docker stop

    # Stop Tethys Dockers and Boot2Docker if applicable
    $ tethys docker stop -b

    # Update Tethys Docker Images
    $ tethys docker update

    # Remove Tethys Docker Images
    $ tethys docker remove

    # View Status of Tethys Dockers
    $ tethys docker status

    # View Host and Port Info
    $ tethys docker ip

.. _tethys_cli_testing:

test [options]
--------------

Management commands for running tests for Tethys Platform and Tethys Apps. See :doc:`./testing`.

**Optional Arguments:**

* **-c, --coverage**: Run coverage with tests and output report to console.
* **-C, --coverage-html**: Run coverage with tests and output html formatted report.
* **-u, --unit**: Run only unit tests.
* **-g, --gui**: Run only gui tests. Mutually exclusive with -u. If both flags are set, then -u takes precedence.
* **-f FILE, --file FILE**: File or directory to run test in. If a directory, recursively searches for tests starting at this directory. Overrides -g and -u.

**Examples:**

::

    # Run all tests
    tethys test

    # Run all unit tests with coverage report
    tethys test -u -c

    # Run all gui tests
    tethys test -g

    # Run tests for a single app
    tethys test -f tethys_apps.tethysapp.my_first_app


.. _tethys_cli_app_settings:

app_settings <app_name>
-----------------------

This command is used to list the Persistent Store and Spatial Dataset Settings that an app has requested.

**Arguments:**

* **app_name**: Name of app for which Settings will be listed

**Optional Arguments:**

* **-p --persistent**: A flag indicating that only Persistent Store Settings should be listed
* **-s --spatial**: A flag indicating that only Spatial Dataset Settings should be listed

**Examples:**

::

    $ tethys app_settings my_first_app

.. _tethys_cli_services:

services <subcommand> [<subsubcommand> | options]
-------------------------------------------------

This command is used to interact with Tethys Services from the command line, rather than the App Admin interface.

**Arguments:**

* **subcommand**: The services command to run. One of the following:

    * *list*: List all existing Tethys Services (Persistent Store and Spatial Dataset Services)
    * *create*: Create a new Tethys Service
        * **subcommand**: The service type to create
            * *persistent*: Create a new Persistent Store Service
                **Arguments:**

                * **-n, --name**: A unique name to identify the service being created
                * **-c, --connection**: The connection endpoint associated with this service, in the form "<username>:<password>@<host>:<port>"
            * *spatial*: Create a new Spatial Dataset Service
                **Arguments:**

                * **-n, --name**: A unique name to identify the service being created
                * **-c, --connection**: The connection endpoint associated with this service, in the form "<username>:<password>@<protocol>//<host>:<port>"

                **Optional Arguments:**

                * **-p, --public-endpoint**: The public-facing endpoint of the Service, if different than what was provided with the "--connection" argument, in the form "<protocol>//<host>:<port>".
                * **-k, --apikey**: The API key, if any, required to establish a connection.
    * *remove*: Remove a Tethys Service
        * **subcommand**: The service type to remove
            * *persistent*: Remove a Persistent Store Service
                **Arguments:**
                * **service_uid**: A unique identifier of the Service to be removed, which can either be the database ID, or the service name
            * *spatial*: Remove a Spatial Dataset Service
                **Arguments:**
                * **service_uid**: A unique identifier of the Service to be removed, which can either be the database ID, or the service name

**Examples:**

::

    # List all Tethys Services
    $ tethys services list

    # List only Spatial Dataset Tethys Services
    $ tethys services list -s

    # List only Persistent Store Tethys Services
    $ tethys services list -p

    # Create a new Spatial Dataset Tethys Service

    $ tethys services create spatial -n my_spatial_service -c my_username:my_password@http://127.0.0.1:8081 -p https://mypublicdomain.com -k mysecretapikey

    # Create a new Persistent Store Tethys Service
    $ tethys services create persistent -n my_persistent_service -c my_username:my_password@http://127.0.0.1:8081

    # Remove a Spatial Dataset Tethys Service
    $ tethys services remove my_spatial_service

    # Remove a Persistent Store Tethys Service
    $ tethys services remove my_persistent_service

.. _tethys_cli_link:

link <service_identifier> <app_setting_identifier>
--------------------------------------------------

This command is used to link a Tethys Service with a TethysApp Setting

**Arguments:**

* **service_identifier**: An identifier of the Tethys Service being linked, of the form "<service_type>:<service_uid>", where <service_type> can be either "spatial" or "persistent", and <service_uid> must be either the database ID or name of the Tethys Service.
* **app_setting_identifier**: An identifier of the TethysApp Setting being linked, of the form "<app_package>:<setting_type>:<setting_uid>", where <setting_type> must be one of "ds_spatial," "ps_connection", or "ps_database" and <setting_uid> can be either the database ID or name of the TethysApp Setting.

**Examples:**

::

    # Link a Persistent Store Service to a Persistent Store Connection Setting
    $ tethys link persistent:my_persistent_service my_first_app:ps_connection:my_ps_connection

    # Link a Persistent Store Service to a Persistent Store Database Setting
    $ tethys link persistent:my_persistent_service my_first_app:ps_database:my_ps_connection

    # Link a Spatial Dataset Service to a Spatial Dataset Service Setting
    $ tethys link spatial:my_spatial_service my_first_app:ds_spatial:my_spatial_connection

.. _tethys_cli_schedulers:

schedulers <subcommand>
-----------------------

This command is used to interact with Schedulers from the command line, rather than through the App Admin interface

**Arguments:**

* **subcommand**: The schedulers command to run. One of the following:

    * *list*: List all existing Schedulers
    * *create*: Create a new Scheduler
        **Arguments:**
        * **-n, --name**: A unique name to identify the Scheduler being created
        * **-d, --endpoint**: The endpoint of the remote host the Scheduler will connect with in the form <protocol>//<host>"
        * **-u, --username**: The username that will be used to connect to the remote endpoint"
        **Optional Arguments:**
        * **-p, --password**: The password associated with the username (required if "-f (--private-key-path)" not specified.
        * **-f, --private-key-path**: The path to the private ssh key file (required if "-p (--password)" not specified.
        * **-k, --private-key-pass**: The password to the private ssh key file (only meaningful if "-f (--private-key-path)" is specified.
    * *remove*: Remove a Scheduler
        **Arguments:**
        * **scheduler_name**: The unique name of the Scheduler being removed.

**Examples:**

::

    # List all Schedulers
    $ tethys schedulers list

    # Create a new scheduler
    $ tethys schedulers create -n my_scheduler -e http://127.0.0.1 -u my_username -p my_password

    # Remove a scheduler
    $ tethys schedulers remove my_scheduler


.. _tethys_cli_install:

install 
-------

This command is used to trigger an automatic install for an application on a portal. We recommend using an
:ref:`install.yml file <tethys_install_yml>` in the app directory to customize the installation process. If the install
file doesn't exist the command will offer to create a blank template install.yml file for you. If you require services
to be setup automatically, place a :ref:`services.yml file <tethys_services_yml>` in the root of your application. If
there are any services that are needed by settings in your app that haven't been setup yet, you will be prompted to
configure them interactively during the installation process. If there are any linked persistent stores upon completing
the installation process, the install command will automatically run ``tethys syncstores {app_name}``. Finally, any
scripts listed in the install.yml will be run to finish the installation.

**Optional Arguments:**

* **-d --develop**: Install will run ``python setup.py develop`` instead of ``python setup.py install``.

* **-f --file**: Absolute path to :file:`install.yml` file for Tethys Application installation if different than default. By default it will look for install.yml in your current working directory (which is assumed to be the application's root directory).

* **-p --portal-file**: Absolute path to :file:`portal.yml` file for Tethys Application installation. If provided this file will be used to gather portal configuration for services. The active directory will be searched for a :file:`portal.yml` file.

* **-s --services-file**: Absolute path to :file:`services.yml` file for Tethys Application installation if different than default. By default it will look for services.yml in the root of your application directory.

* **--force-services**: Force the use of :file:`services.yml` over :file:`portal.yml` file

* **-q --quiet**: Skips interactive mode.

* **-n --no-sync**: Skips syncstores when linked persistent stores are found.

* **-v --verbose**: Will show all pip install output when enabled.



**Examples:**

::

    # CD to your app directory
    $ cd $TETHYS_HOME/apps/tethysapp-my_first_app

    # Run Install
    $ tethys install

    # Tethys install with custom options
    $ tethys install -f ../install.yml -p $TETHYS_HOME/src/configs/portal.yml
