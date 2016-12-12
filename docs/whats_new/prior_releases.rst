*******************
Prior Release Notes
*******************

**Last Updated:** May 28, 2016

Information about prior releases is shown here.

Release 1.3.0
=============

Tethys Portal
-------------

* Open account signup disabled by default
* New setting in `settings.py` that allows open signup to be enabled

See: :doc:`../tethys_portal/customize`

Map View
--------

* Feature selection enabled for ImageWMS layers
* Clicking on features highlights them when enabled
* Callback functions can be defined in JavaScript to trap on the feature selection change event
* Custom styles can be applied to highlighted features
* Basemap can be disabled
* Layer attributes can be set in MVLayer (e.g. visibility and opacity)
* Updated to use OpenLayers 3.10.1

See: :doc:`../tethys_sdk/gizmos/map_view`

Plot View
---------

* D3 plotting implemented as a free alternative to Highcharts for line plot, pie plot, scatter plot, bar plot, and timeseries plot.

See: :doc:`../tethys_sdk/gizmos/plot_view`

Spatial Dataset Services
------------------------

* Upgraded gsconfig dependency to version 1.0.0
* Provide two new methods on the geoserver engine to create SQL views and simplify the process of linking PostGIS databases with GeoServer.

See: :doc:`../tethys_sdk/spatial_dataset_service/geoserver_reference`

App Feedback
------------

* Places button on all app pages that activates a feedback form
* Sends app-users comments to specified developer emails
* Includes user and app specific information

See: :doc:`../tethys_portal/feedback`

Handoff
-------

* Handoff Manager now available, which can be used from controllers to handoff from one app to another on the same Tethys portal (without having to use the REST API)
* The way handoff handler controllers are specified was changed to be consistent with other controllers

See: :doc:`../tethys_sdk/handoff`

Jobs Table Gizmo
----------------

* The refresh interval for job status and runtime is configurable

See: :doc:`../tethys_sdk/gizmos/jobs_table`

Social Authentication
---------------------

* Support for HydroShare added

See: :doc:`../tethys_portal/social_auth`

Dynamic Persistent Stores
-------------------------

* Persistent stores can now be created dynamically (at runtime)
* Helper methods to list persistent stores for the app and check whether a store exists.

See: :doc:`../tethys_sdk/persistent_store`

App Descriptions
----------------

* Apps now feature optional descriptions.
* An information icon appears on the app icon when descriptions are available.
* When the information icon is clicked on the description is shown.

See: :doc:`../tethys_sdk/app_class`

Bugs
----

* Missing initial value parameter was added to the select and select2 gizmos.
* Addressed several cases of mixed content warnings when running behind HTTPS.
* The disconnect social account buttons are now disabled if your account doesn't have a password or there is only one social account associated with the account.
* Fixed issues with some of the documentation not being generated.
* Fixed styling issues that made the Message Box gizmo unusable.
* Normalized references to controllers, persistent store initializers, and handoff handler functions.
* Various docs typos were fixed.

Release 1.2.0
=============

Social Authentication
---------------------

* Social login supported
* Google, LinkedIn, and Facebook
* HydroShare coming soon
* New controls on User Profile page to manage social accounts

See: :doc:`../tethys_portal/social_auth`


D3 Plotting Gizmos
------------------

* D3 alternatives for all the HighCharts plot views
* Use the same plot objects to define both types of charts
* Simplified and generalized the mechanism for declaring plot views

See: :doc:`../tethys_sdk/gizmos/plot_view`

Job Manager Gizmo
-----------------

* New Gizmo that will show the status of jobs running with the Job Manager

Workspaces
----------

* SDK methods for creating and managing workspaces for apps
* List files and directories in workspace directory
* Clear and remove files and directories in workspace

See: :doc:`../tethys_sdk/workspaces`

Handoff
-------

* Use handoff to launch one app from another
* Pass arguments via GET parameters that can be used to retrieve data from the sender app

See: :doc:`../tethys_sdk/handoff`

Video Tutorials
---------------

* New video tutorials have been created
* The videos highlight working with different software suite elements
* CKAN, GeoServer, PostGIS
* Advanced user input forms
* Advanced Mapping and Plotting Gizmos

See: :doc:`../tutorials/video_tutorials`

New Location for Tethys SDK
---------------------------

* Tethys SDK methods centralized to a new convenient package: tethys_sdk

See: :doc:`../tethys_sdk`

Persistent Stores Changes
-------------------------

* Moved the get_persistent_stores_engine() method to the TethysAppBase class.
* To call the method import your :term:`app class` and call it on the class.
* The old get_persistent_stores_engine() method has been flagged for deprecation.

See: :doc:`../tethys_sdk/persistent_store`

Command Line Interface
----------------------

* New management commands including ``createsuperuser``, ``collectworkspaces``, and ``collectall``
* Modified behavior of ``syncdb`` management command, which now makes and then applies migrations.

See: :doc:`../tethys_sdk/tethys_cli`


Release 1.1.0
=============

Gizmos
------

* Options objects for configuring gizmos (see :doc:`../tethys_sdk/gizmos` for more details).
* Many improvements to Map View (see :ref:`map-view`)

  * Improved layer support including GeoJSON, KML, WMS services, and ArcGIS REST services
  * Added a mechanism for creating legends
  * Added drawing capabilities
  * Upgraded to OpenLayers version 3.5.0

* New objects for simplifying Highcharts plot creation (see :ref:`plot-view`)

  * HighChartsLinePlot
  * HighChartsScatterPlot
  * HighChartsPolarPlot
  * HighChartsPiePlot
  * HighChartsBarPlot
  * HighChartsTimeSeries
  * HighChartsAreaRange

* Added the ability to draw a box on Google Map View

Tethys Portal Features
----------------------

* Reset forgotten passwords
* Bypass the home page and redirect to apps library
* Rename the apps library page title
* The two mobile menus were combined into a single mobile menu
* Dataset Services and Web Processing Services admin settings combined into a single category called Tethys Services
* Added "Powered by Tethys Platform" attribution to footer

Job Manager
-----------

* Provides a unified interface for all apps to create submit and monitor computing jobs
* Abstracts the CondorPy module to provide a higher-level interface with computing jobs
* Allows definition of job templates in the app.py module of apps projects


Documentation Updates
---------------------

* Added documentation about the Software Suite and the relationship between each software component and the APIs in the SDK is provided
* Documentation for manual download and installation of Docker images
* Added system requirements to documentation

Bug Fixes
---------

* Naming new app projects during scaffolding is more robust
* Fixed bugs with fetch climate Gizmo
* Addressed issue caused by usernames that included periods (.) and other characters
* Made header more responsive to long names to prevent header from wrapping and obscuring controls
* Fixed bug with tethys gen apache command
* Addressed bug that occurred when naming WPS services with uppercase letters

Other
-----

* Added parameter of UrlMap that can be used to specify custom regular expressions for URL search patterns
* Added validation to service engines
* Custom collectstatic command that automatically symbolically links the public/static directories of Tethys apps to the static directory
* Added "list" methods for dataset services and web processing services to allow app developers to list all available services registered on the Tethys Portal instance
