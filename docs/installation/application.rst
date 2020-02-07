.. _app_installation:

************************
Application Installation
************************

**Last Updated:** March 2019

Once you have the portal configured and setup with all the required services, the next step is to install Tethys applications on to your portal.

1. Navigate to App Directory
============================

Within the command line interface, navigate to the directory of the app you wish to install (this directory must contain the app's ``setup.py`` file).

::

    cd /directory/of/app

2. Install the App
==================

Using Install (Recommended):
----------------------------

Using the :ref:`install cli command <tethys_cli_install>`, you can install the application in one quick step. The ``install`` command will install all the dependencies, link any services that you might need for your application and can also rely on the portal configuration to link default services to your application (as configured by the portal administrator).

::

    # Run Init
    tethys install

    # Tethys install with custom options
    tethys install -f ../install.yml -p $TETHYS_HOME/src/configs/portal_config.yml


The install command uses three configuration files:

.. _tethys_install_yml:

install.yml 
-----------

This file is generated with your application scaffold. Dependencies that are listed in the ``install.yml`` will be installed with conda and will honor the specified channel priority. If there are any dependencies listed in the ``setup.py`` that are not specified in the ``install.yml`` then these packages will be installed with pip as part of the setup process. This file should be committed with your application code in order to aid installation on a Tethys Portal.

.. literalinclude:: resources/example-install.yml
   :language: yaml

**install.yml Options:**

* **version**: Indicated the version of the :file:`install.yml` file. Current default : 1.0
* **name**: This should match the app-package name in your setup.py

* **skip**: If enabled, it will skip the installation of packages. This option is set to `False` by default.

* **conda/channels**: List of conda channels that need to be searched for dependency installation. Only specify any conda channels that are apart from the default. 

* **conda/packages**: List of python dependencies that need to be installed by conda. These may be entered in the format ``pyshp=2.0.0`` to download a specific version.

* **pip**: A list of python dependencies that need to be installed by pip.

* **post**: A list of shell scripts that you would want to run after the installation is complete. This option can be used to initialize workspaces/databases etc. These shell scripts should be present in the same directory as setup.py

.. tip::

    Run ``tethys gen install`` to create a blank template of this file. By default the file will be saved to the current working directory.

.. _tethys_services_yml:

services.yml 
------------

The file is designed to be maintained by Tethys Portal administrators to automatically assign services defined in their Tethys Portal to apps they are installing. This file will only be run by default if there is no portal services config file present (see :ref:`tethys_portal_yml`). However you can force the use of this file over the portal config by specifying the `--force-services` tag on the install command.

.. literalinclude:: resources/example-services.yml
   :language: yaml

**services.yml Options:**

* **version**: Indicated the version of the :file:`services.yml` file. Current default : 1.0

* **persistent** : List of persistent store settings in the app and the service to link to each.
* **dataset** : List of dataset settings in the app and the service to link to each.
* **spatial** : List of spatial persistent store settings in the app and the service to link to each.
* **wps** : List of web processing service settings in the app and the service to link to each.
* **custom_settings** : List of custom settings in the app and value of each.

Settings in each of the service sections above will need to be listed in the following format::

	<app_setting_name> : <service_name or id>

In the above example, ``catalog_db`` is the name of the setting in your :file:`app.py` and ``hydroexplorer-persistent`` is the name of the service on the portal.

.. tip::

    Run ``tethys gen services`` to create a blank template of this file. By default the file will be saved to the current working directory.

.. _tethys_portal_yml:

portal_config.yml
-----------------

The file is designed to be maintained by Tethys Portal administrators to automatically assign services defined in their Tethys Portal to apps they are installing. For more information about the :file:`portal_config.yml` see :ref:`tethys_configuration`.

.. literalinclude:: resources/example-portal-config.yml
   :language: yaml

**portal_config.yml Options:**

* **version**: Indicated the version of the :file:`portal_config.yml` file. Current default : 1.0
* **name**: Name of the portal

* **apps/<app-name>/services/persistent** : List of persistent store settings in the app and the service to link to each.
* **apps/<app-name>/services/dataset** : List of dataset settings in the app and the service to link to each.
* **apps/<app-name>/services/spatial** : List of spatial persistent store settings in the app and the service to link to each.
* **apps/<app-name>/services/wps** : List of web processing service settings in the app and the service to link to each.
* **apps/<app-name>/services/custom_settings** : List of custom settings in the app and the value of each.

Settings in each of the service sections above will need to be listed in the following format::

	<app_service_setting_name> : <service_name or id>

In the above example, ``catalog_db`` is the name of the setting in your :file:`app.py` and ``test`` is the name of the service on the portal.

.. tip::

    Run ``tethys gen portal_config`` to create a blank template of this file. By default the file will be saved to ``$TETHYS_SRC/tethy_portal``.


3. Restart Tethys Server
========================

Restart tethys portal to effect the changes::

    tethys manage start


4. Configure Additional App Settings
====================================

If any required settings were not configured through the installation process go to the application settings page in the Tethys Portal admin pages and configure them there (see :doc:`../../tethys_portal/admin_pages`).

5. Initialize Persistent Stores (Optional)
==========================================

The install command will automatically run the syncstores command if it detects that the app has persistent stores. However, if you need to run syncstores manually, it can be done like so:

::

    t
    tethys syncstores {app_name}
