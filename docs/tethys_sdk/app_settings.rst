****************
App Settings API
****************

**Last Updated:** May 2017

The App Settings API allows developers to create settings for their apps that can be configured in the admin interface of the Tethys Portal in which the app is installed. Examples of what App Settings could be used for include enabling or disabling functionality, assigning constant values or assumptions that are used throughout the app, or customizing the look and feel of the app. App Settings are only be accessible by Tethys Portal administrators in production, so they should be thought of as global settings for the app that are not customizable on a user by user basis.

As of Tethys Platform 2.0.0, Tethys Services such as databases and map servers are configured through App Settings. Tethys Service App Settings can be thought of as sockets for a particular type of Tethys Service (e.g. PostGIS database, GeoServer, CKAN). Tethys Portal administrators can "plug-in" the appropriate type of Tethys Service from the pool of Tethys Services during installation and setup of the app in the portal. This slight paradigm shift gives Tethys Portal administrators more control over the resources they manage for a Portal instance and how they are distributed across the apps.

Custom Settings
===============

Custom Settings are used to create scalar-valued settings for an app. Four basic types of values are supported including ``string``, ``boolean``, ``integer``, and ``float``. Create Custom Settings by implementing the ``custom_setting()`` method in your :term:`app class`. This method should return a list of CustomSettings_ objects:

.. automethod:: tethys_apps.base.TethysAppBase.custom_settings
   :noindex:

To retrieve the value of a Custom Setting, import your :term:`app class` and call the ``get_custom_setting()`` class method:

.. automethod:: tethys_apps.base.TethysAppBase.get_custom_setting
   :noindex:

Persistent Store Settings
=========================

Persistent Store Settings are used to request databases and connections to database servers for use in your app  (e.g. PostgreSQL, PostGIS). Create Persistent Store Settings by implementing the ``persistent_store_settings()`` method in your :term:`app class`. This method should return a list of PersistentStoreConnectionSetting_ and PersistentStoreDatabaseSetting_ objects:

.. automethod:: tethys_apps.base.TethysAppBase.persistent_store_settings
   :noindex:

To retrieve a connection to a Persistent Store, import your :term:`app class` and call either the ``get_persistent_store_database()`` or ``get_persistent_store_connection`` class methods:

.. automethod:: tethys_apps.base.TethysAppBase.get_persistent_store_database
   :noindex:

.. automethod:: tethys_apps.base.TethysAppBase.get_persistent_store_connection
   :noindex:

.. tip::

    See the :doc:`./tethys_services/persistent_store` and the :doc:`./tethys_services/spatial_persistent_store` for more details on how to use Persistent Stores in your apps.

Dataset Service Settings
========================

Dataset Service Settings are used to request specific types of dataset services for use in your app  (e.g. CKAN, HydroShare). Create Dataset Service Settings by implementing the ``dataset_service_settings()`` method in your :term:`app class`. This method should return a list of DatasetServiceSetting_ objects:

.. automethod:: tethys_apps.base.TethysAppBase.dataset_service_settings
   :noindex:

To retrieve a connection to a Dataset Service, import your :term:`app class` and call the ``get_dataset_service()`` class method:

.. automethod:: tethys_apps.base.TethysAppBase.get_dataset_service
   :noindex:

.. tip::

    See the :doc:`./tethys_services/dataset_services` for more details on how to use Dataset Services in your apps.

Spatial Dataset Service Settings
================================

Spatial Dataset Service Settings are used to request specific types of spatial dataset services for use in your app  (e.g. geoserver). Create Spatial Dataset Service Settings by implementing the ``spatial_dataset_service_settings()`` method in your :term:`app class`. This method should return a list of SpatialDatasetServiceSetting_ objects:

.. automethod:: tethys_apps.base.TethysAppBase.spatial_dataset_service_settings
   :noindex:

To retrieve a connection to a Spatial Dataset Service, import your :term:`app class` and call the ``get_spatial_dataset_service()`` class method:

.. automethod:: tethys_apps.base.TethysAppBase.get_spatial_dataset_service
   :noindex:

.. tip::

    See the :doc:`./tethys_services/spatial_dataset_services` for more details on how to use Spatial Dataset Services in your apps.

Web Processing Service Settings
===============================

Web Processing Service Settings are used to request specific types of dataset services for use in your app  (e.g. CKAN, HydroShare). Create Web Processing Service Settings by implementing the ``web_processing_service_settings()`` method in your :term:`app class`. This method should return a list of WebProcessingServiceSetting_ objects:

.. automethod:: tethys_apps.base.TethysAppBase.web_processing_service_settings
   :noindex:

To retrieve a connection to a Web Processing Service, import your :term:`app class` and call the ``get_web_processing_service()`` class method:

.. automethod:: tethys_apps.base.TethysAppBase.get_web_processing_service
   :noindex:

.. tip::

    See the :doc:`./tethys_services/web_processing_services` for more details on how to use Dataset Services in your apps.


API Documentation
=================

Settings Objects
----------------

.. _CustomSettings:

.. autoclass:: tethys_sdk.app_settings.CustomSetting

.. _PersistentStoreConnectionSetting:

.. autoclass:: tethys_sdk.app_settings.PersistentStoreConnectionSetting

.. _PersistentStoreDatabaseSetting:

.. autoclass:: tethys_sdk.app_settings.PersistentStoreDatabaseSetting

.. _DatasetServiceSetting:

.. autoclass:: tethys_sdk.app_settings.DatasetServiceSetting

.. _SpatialDatasetServiceSetting:

.. autoclass:: tethys_sdk.app_settings.SpatialDatasetServiceSetting

.. _WebProcessingServiceSetting:

.. autoclass:: tethys_sdk.app_settings.WebProcessingServiceSetting

Settings Declaration Methods
----------------------------

.. automethod:: tethys_apps.base.TethysAppBase.custom_settings

.. automethod:: tethys_apps.base.TethysAppBase.persistent_store_settings

.. automethod:: tethys_apps.base.TethysAppBase.dataset_service_settings

.. automethod:: tethys_apps.base.TethysAppBase.spatial_dataset_service_settings

.. automethod:: tethys_apps.base.TethysAppBase.web_processing_service_settings


Settings Getter Methods
-----------------------

.. automethod:: tethys_apps.base.TethysAppBase.get_custom_setting

.. automethod:: tethys_apps.base.TethysAppBase.get_persistent_store_database

.. automethod:: tethys_apps.base.TethysAppBase.get_persistent_store_connection

.. automethod:: tethys_apps.base.TethysAppBase.get_dataset_service

.. automethod:: tethys_apps.base.TethysAppBase.get_spatial_dataset_service

.. automethod:: tethys_apps.base.TethysAppBase.get_web_processing_service