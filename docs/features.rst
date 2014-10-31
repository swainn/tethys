.. image:: images/features/tethys_logo_inverse.png
   :height: 40px
   :width: 40px
   :align: left

***************
Tethys Platform
***************

**Last Updated:** October 30, 2014

Welcome to Tethys Platform! Tethys provides a platform for developing and hosting water resources web applications or
web apps. Tethys provides a suite of software to addresses the unique development needs of water resources web
apps and a Python software development kit (SDK) to interact with each software component in code. The functionality provided in
Tethys includes file and model storage, spatial database storage, spatial data publishing, geoprocessing, spatial and
tabular data visualizations, and access to cloud computing resources. Tethys Platform is powered by the Django Python
web framework giving it a solid web foundation with excellent performance.

.. figure:: images/features/tethys_platform_diagram.jpg
    :height: 350px
    :align: center

    Tethys Platform Software Components


Develop Web Apps
================

Tethys Platform is focused on making development of engaging, interactive web apps for water resources as easy as possible.
It is backed by free and open source software to address the data, visualization, and computational needs of water
resources.

(Screen shot of an app)


Python Software Development Kit
===============================

Tethys Apps are developed with the Python programming language using the Tethys Software Development Kit (SDK). Tethys
apps projects are organized using a Model View Controller (MVC) approach. The SDK provides Python module links to each
software component of the Tethys Platform, making it easy to incorporate each in your apps. In addition, you can use
all of the Python modules that you are accustomed to using in your scientific Python scripts to power your apps. Tethys
also includes a Command Line Interface that can be used to create new app projects from a scaffold and manage the
development server.

.. image:: images/features/app_code.png
    :height: 350px
    :align: center

Templating and Gizmos
=====================

The SDK takes advantage of the Django templating system so you can build dynamic pages for your app. It also provides
a series of modular user interface elements called Gizmos. With only a few lines of Python code and a single line in your
template, you can add range sliders, toggle switches, auto completes, interactive maps, and dynamic plots to your app.

.. image:: images/features/example_gizmo.png
    :height: 400px
    :align: center

Spatial Data
============

Tethys Platform is especially equipped to handle the spatial data needs of your water resources web apps. Included in
the software backing Tethys is PostgreSQL with the PostGIS extension for spatial database storage, GeoServer for spatial
data publishing, and 52 North web processing service for geoprocessing. Tethys also provides a Google Maps, Google Earth,
and OpenLayers for interactive spatial data visualizations in your apps.

(Screenshot of the Google Map)

Data Store
==========

Tethys provides mechanisms for linking to CKAN and HydroShare as a means of data and file storage.

(Data Store Icon)

Computing
=========

Tethys provides Python modules that will allow you to provision and run jobs in a distributed computing environment.

(Computing Icon)

Developer Tools
===============

Tethys provides a set of developer tools that are accessible when you run Tethys in developer mode. They contain
documentation, code examples, and live demos of the features of various components of Tethys. Use the developer tools
to learn how to add a map or a plot to your app using Gizmos, browse the available geoprocessing capabilities and formulate
geoprocessing requests interactively, and browse the data that is available to apps via the Data Store connections.

.. image:: images/features/developer_tools.png
    :height: 350px
    :align: center


Production Ready
================

After you have a working app, Tethys Platform can be configured so that it can serve as a safe environment to host your
apps.

App Dashboard
-------------

The Tethys Apps plugin adds an apps dashboard page to CKAN. All of the apps that are loaded via the plugin will
be accessible here.



User Management
---------------

Something about users

(Screenshot of User profile)

Customizable
------------

(Screenshot of admin settings)