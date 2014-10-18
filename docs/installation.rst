************
Installation
************

**Last Updated:** May 21, 2014

Requirements
============

* CKAN 2.2 Source Installation

Assumptions
===========

It will be assumed that you are familiar with working with CKAN and Python virtual environments (this is a plugin for CKAN). If you are new to CKAN it may be useful to spend some time reviewing their developer documentation.

This documentation will refer to the :file:`~/tethysdev` directory frequently. This is an arbitrary working directory for app development and it is used to simplify the instructions. Feel free to use any directory of your choosing, but be sure to modify the commands to reflect your choice.


1. Download Source
==================

Download the source for the CKAN Apps plugin using git. In a terminal execute the following commands::

	$ mkdir ~/tethysdev
	$ cd ~/tethysdev
	$ git clone https://swainn@bitbucket.org/swainn/ckanext-tethys_apps.git

.. hint::

	The "~" (tilde) character is a shortcut to the home directory in a unix terminal. Thus, :file:`~/tethysdev` refers to a directory called "tethysdev" in the home directory.


2. Install into Python
======================

Activate your CKAN Python virtual environment, change into the :file:`ckanext-tethys_apps` directory, and run the setup script. If you have used the defaults for installing CKAN, this can be done like so::

	$ . /usr/lib/ckan/default/bin/activate
	$ cd ~/tethysdev/ckanext-tethys_apps
	$ python setup.py install

.. caution::

	Don't forget the "." operator when activating your Python environment. This is needed to execute the :file:`activate` script.

3. Modify CKAN Configuration
============================

Add the term "tethys_apps" to the **ckan.plugins** parameter of your CKAN configuration (e.g.: :file:`/etc/ckan/default/development.ini`). The parameter should look similar to this when your done:

::

    ckan.plugins = tethys_apps

.. note::
    
    Depending on the different plugins that are enabled for your CKAN installation, the **ckan.plugins** parameters may have several other plugin names listed with "tethys_apps". This is ok.

4. Copy the Source Directory
============================

Copy the :file:`tethys_apps` directory from the source into the :file:`ckanext` directory of the CKAN source. This can be done like so::

	$ cp ~/tethysdev/ckanext-tethys_apps/ckanext/tethys_apps /usr/lib/ckan/src/ckan/ckanext/


5. Create Database Users
========================

Create a database user and database for Tethys Apps. The plugin needs it's own database user to assist with the automatic database provisioning feature. Create the user and give it a password using hte interactive prompt. You will need to remember this password for the next step.

::

    $ sudo -u postgres createuser -S -d -R -P tethys_db_manager
    $ sudo -u postgres createdb -O tethys_db_manager tethys_db_manager -E utf-8
    
Next, create a database superuser for Tethys and it's associtated database. Remember the password that you assign to this user for the next step.

::

    $ sudo -u postgres createuser --superuser -d -R -P tethys_super
    $ sudo -u postgres createdb -O tethys_super tethys_super -E utf-8



6. Modify the Tethys Apps Config
================================

Open the Tethys Apps configuration file (:file:`/usr/lib/ckan/default/src/ckan/ckanext/tethys_apps/tethys_apps.ini`) and edit the ``tethys.database_manager_url`` and ``tethys.superuser_url`` parameters so that the username, password, host, port, and database match the databases and users that you created in the last step. The url uses the following pattern:

::

    postgresql://<username>:<password>@<host>:<port>/<database>

The ``tethys.database_manager_url``  and ``tethys.superuser_url`` parameters should look something like this when you are done:

::
    
    tethys.database_manager_url = postgresql://tethys_db_manager:pass@localhost:5432/tethys_db_manager
    tethys.superuser_url = postgresql://tethys_super:pass@localhost:5432/tethys_super

Next, make sure the ``tethys.ckanapp_directory`` parameter is set to the path to your :file:`ckanapp` directory. For a default installation of CKAN and Tethys Apps, this will be at :file:`/usr/lib/ckan/default/src/ckan/ckanext/tethys_apps/ckanapp`. This parameter should look similar to this when you are done:

::

    tethys.ckanapp_directory = /usr/lib/ckan/default/src/ckan/ckanext/tethys_apps/ckanapp

.. hint::

    Do **NOT** use double or single quotes for the url or directory parameters in the Tethys configuration file.



7. Start CKAN
=============

Deactivate and reactivate your CKAN Python virtual environment and start up the Paster server:

::

    $ deactivate
    $ . /usr/lib/ckan/default/bin/activate
    $ paster serve /etc/ckan/default/development.ini

.. note::

    If your virtual environment was already deactivated the :command:`deactivate` command will fail. This is ok. Just activate your virtual environment and start paster server.

Navigate to your CKAN page in a web browser (likely at http://localhost:5000). Installation has been successful if the :guilabel:`Apps` link appears in the header of your CKAN page.


Working With Tethys Under Development
=====================================

The Tethys Apps plugin is currently under heavy development. It is likely that you will want to pull the latest changes frequently until a stable version is released. To prevent the need to reinstall the app everytime you pull changes, you will need to use the following modifications when installing the Tethys Apps plugin:

Use the :command:`develop` command instead of the :command:`install` command  when running the setup script. This creates a link between the Tethys Apps source and Python instead of hard copying it. This will allow any changes you pull to be propegated without reinstalling the plugin.

::

	$ . /usr/lib/ckan/default/bin/activate
	$ cd ~/tethysdev/ckanext-tethys_apps
	$ python setup.py develop

Create a symbolic link between :file:`tethys_apps` and :file:`ckanext`, rather than copying for the same reasons as above::

	$ ln -s ~/tethysdev/ckanext-tethys_apps/ckanext/tethys_apps /usr/lib/ckan/default/src/ckan/ckanext/tethys_apps

Pull Latest Changes
-------------------

Changes can be pulled from the git repository like so::

$ cd ~/tethysdev/ckanext-tethys_apps
$ git pull
