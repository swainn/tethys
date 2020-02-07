.. _key_concepts_beginner_tutorial:

*****************
Beginner Concepts
*****************

**Last Updated:** October 2019

This tutorial introduces important concepts for first-time or beginner Tethys developers. The topics covered include:

* The App Class
* Model View Controller
* Introduction to the View
* Django Template Language
* Introduction to the Controller
* Templating Gizmos
* Custom Styles and CSS
* Linking Between Pages
* App Navigation

1. App Class
============

The app class, located in ``app.py`` is the primary configuration file for Tethys apps. All app classes inherit from the ``TethysAppBase`` class.

a. Open ``app.py`` in your favorite Python IDE or text editor.

b. Change the theme color of your app by changing the value of the ``color`` property of the ``DamInventory`` class. Use a site like `color-hex <http://www.color-hex.com/>`_ to find an appropriate hexadecimal RGB color.

c. You can also change the icon of your app. Find a new image online (square images work best) and save it in the ``public/images/`` directory of your app. Then change the value of the ``icon`` property of the ``DamInventory`` class to match the name of the image.

.. tip::

    For more details about the app class, see the :doc:`../../tethys_sdk/app_class`.

.. warning::

    DO NOT change the value of the ``index``, ``package``, or ``root_url`` properties of your app class unless you know what you are doing. Doing so will break your app.

2. App Settings
===============

Other settings for your app can be configured in the app settings. App settings are stored in a database, meaning they can be changed dynamically by the administrator of your portal. Some app settings, like Name and Description, correspond with properties in the ``app.py`` script.

a. To access the app settings, click on the Settings button (gear icon) at the top right-hand corner of your app.

b. Change the Name and Description of your app by changing their respective values on the app settings page. Press the ``Save`` button, located at the bottom of the app settings page. Then navigate back to your app to see the changes.

You can also create custom settings for your app that can be configured on the app settings page:

b. Open the ``app.py`` and add the ``custom_settings()`` method to the ``DamInventory`` class. Don't for get to import ``CustomSetting``:

    ::

        from tethys_sdk.app_settings import CustomSetting

        ...

        class DamInventory(TethysAppBase):
            """
            Tethys app class for Dam Inventory.
            """
            ...

            def custom_settings(self):
                """
                Example custom_settings method.
                """
                custom_settings = (
                    CustomSetting(
                        name='max_dams',
                        type=CustomSetting.TYPE_INTEGER,
                        description='Maximum number of dams that can be created in the app.',
                        required=False
                    ),
                )
                return custom_settings

    .. warning::

        Ellipsis in code blocks in Tethys tutorials indicate code that is not shown for brevity. When there are ellipsis in the code, DO NOT COPY AND PASTE THE BLOCK VERBATIM.

c. Save changes to ``app.py``.

d. The development server should automatically restart when it detects changes to files. However if it does not restart, you can manually restart it by pressing ``CTRL-C`` to stop the server followed by the ``tethys manage start`` command to start it again.

e. Navigate to the settings page of your app and scroll down to the **Custom Settings** section and you should see an entry for the ``max_dams`` settings. Enter a value and save changes to the setting. You will learn how to use this custom setting in the app later on in the tutorial.

.. tip::

    For more information about app settings, see the :doc:`../../tethys_sdk/app_settings`.

3. Model View Controller
========================

Tethys apps are developed using the :term:`Model View Controller` (MVC) software architecture pattern. Model refers to the data model and associated code, View refers to the representations of the data, and Controller refers of the code that coordinates data from the Model for rendering in the View. In Tethys apps, the Model is usually an SQL database or files and the code for accessing them, the Views are most often the templates or HTML files, and Controllers are implemented as Python functions or classes.

.. tip::

    For more information about the MVC pattern, see :doc:`../../supplementary/key_concepts`.


4. Views
========

Views for Tethys apps are constructed using the standard web programming tools: HTML, JavaScript, and CSS. Additionally, HTML templates can use the Django Template Language, because Tethys Platform is build on Django. This allows you to insert Python code into your HTML documents making the web pages of your app dynamic and reusable.

a. Open ``/templates/dam_inventory/home.html`` and replace it's contents with the following:

::

    {% extends "dam_inventory/base.html" %}
    {% load tethys_gizmos %}

    {% block app_content %}
      {% gizmo dam_inventory_map %}
    {% endblock %}

    {% block app_actions %}
      {% gizmo add_dam_button %}
    {% endblock %}

.. tip::

    **Django Template Language**: If you are familiar with HTML, the contents of this file may seem strange. That's because the file is actually a Django template, which contains special syntax (i.e.: ``{% ... %}`` and ``{{ ... }}`` to make the template dynamic. Django templates can contain variables, filters, and tags.

    **Variables.** Variables are denoted by double curly brace syntax like this: ``{{ variable }}``. Template variables are replaced by the value of the variable. Dot notation can be used to access attributes of an object, keys of dictionaries, and items in lists or tuples: ``{{ my_object.attribute }}`` , ``{{ my_dict.key }}``, and ``{{ my_list.3 }}``.

    **Filters.** Variables can be modified by filters which look like this: ``{{ variable|filter:argument }}``. Filters modify the value of the variable output such as formatting dates, formatting numbers, changing the letter case, or concatenating multiple variables.

    **Tags.** Tags use curly-brace-percent-sign syntax like this: ``{% tag %}``. Tags perform many different functions including creating text, controlling flow, or loading external information to be used in the app. Some commonly used tags include ``for``, ``if``, ``block``, and ``extends``.

    **Blocks.** The block tags in the Tethys templates are used to override the content in the different areas of the app base template. For example, any HTML written inside the ``app_content`` block will render in the app content area of the app.

    For a better explanation of the Django Template Language and the blocks available in Tethys apps see the :doc:`../../tethys_sdk/templating`.

5. Controllers
==============

Basic controllers consist of a Python function that takes a ``request`` object as an argument. The ``request`` object contains all the information about the incoming request including any data being passed to the server, information about the user that is logged in, and the HTTP headers. Each controller function is associated with one view or template. Any variable assigned to the ``context`` variable in a controller becomes a variable on the template specified in the ``render`` function.

a. Open ``controllers.py`` define the ``dam_inventory_map`` and ``add_dam_button`` gizmos in your home controller:

::

    from django.shortcuts import render
    from tethys_sdk.permissions import login_required
    from tethys_sdk.gizmos import MapView, Button


    @login_required()
    def home(request):
        """
        Controller for the app home page.
        """

        dam_inventory_map = MapView(
            height='100%',
            width='100%',
            layers=[],
            basemap='OpenStreetMap',
        )


        add_dam_button = Button(
            display_text='Add Dam',
            name='add-dam-button',
            icon='glyphicon glyphicon-plus',
            style='success'
        )

        context = {
            'dam_inventory_map': dam_inventory_map,
            'add_dam_button': add_dam_button
        }

        return render(request, 'dam_inventory/home.html', context)

b. Save your changes to ``controllers.py`` and ``home.html`` and refresh the page to view the map.

.. tip::

    **Gizmos**: The ``home.html`` template used a Tethys template tag, ``gizmo``, to insert a map and a button with only one line of code: ``{% gizmo dam_inventory_map %}``. Gizmo tags require one argument, an object that defines the options for the gizmo. These gizmo options must be defined in the controller for that view. In the example above we define the options objects for the two gizmos on the ``home.html`` template and pass them to the template through the context dictionary.

    For more details on the Map View or Button Gizmos see: :doc:`../../tethys_sdk/gizmos/map_view` and :doc:`../../tethys_sdk/gizmos/button` For more information about Gizmos in general see the :doc:`../../tethys_sdk/gizmos`.

6. Custom Styles
================

It would look nicer if the map gizmo filled the entire app content area. To do this, we will need to add custom CSS or style rules to remove the padding around the ``inner-app-content`` area.

a. Create a new file ``/public/css/map.css`` and add the following contents:

::

    #inner-app-content {
        padding: 0;
    }

    #app-content, #inner-app-content, #map_view_outer_container {
        height: 100%;
    }

b. Load the styles on the ``/templates/dam_inventory/home.html`` template by adding a link to the ``public/css/map.css`` to it. To do this add ``static`` to the load statement at the top of the template and add the ``styles`` block to the end of the file:

::

    {% load tethys_gizmos static %}

    ...

    {% block styles %}
        {{ block.super }}
        <link href="{% static 'dam_inventory/css/map.css' %}" rel="stylesheet"/>
    {% endblock %}

c. Save your changes to ``map.css`` and ``home.html`` and refresh the page to view the changes. The map should fill the content area now. Notice how the map dynamically resizes if the screen size changes.

.. important::

    Don't forget the ``{{ block.super }}``! The ``{{ block.super }}`` statement loads all previously loaded styles in this block. If you forget the ``{{ block.super }}``, it will result in a broken page with no styles applied.

7. Create a New Page
====================

Creating a new page in your app consists of three steps: (1) create a new template, (2) add a new controller to ``controllers.py``, and (3) add a new ``UrlMap`` to the ``app.py``.

a. Create a new file ``/templates/dam_inventory/add_dam.html`` and add the following contents:

::

    {% extends "dam_inventory/base.html" %}

This is the simplest template you can create in a Tethys app, which amounts to a blank Tethys app page. You must still extend the ``base.html`` to retain the styling of an app page.


b. Create a new controller function called ``add_dam`` at the bottom of the ``controllers.py``:

::

    @login_required()
    def add_dam(request):
        """
        Controller for the Add Dam page.
        """

        context = {}
        return render(request, 'dam_inventory/add_dam.html', context)

This is the most basic controller function you can write: a function that accepts an argument called ``request`` and a return value that is the result of the ``render`` function. The ``render`` function renders the Django template into valid HTML using the ``request`` and ``context`` provided.

c. Create a new URL Map for the ``add_dam`` controller in the ``url_maps`` method of App Class in ``app.py``:

::

    class DamInventory(TethysAppBase):
        """
        Tethys app class for Dam Inventory.
        """
        ...

        def url_maps(self):
            """
            Add controllers
            """
            UrlMap = url_map_maker(self.root_url)

            url_maps = (
                UrlMap(
                    name='home',
                    url='dam-inventory',
                    controller='dam_inventory.controllers.home'
                ),
                UrlMap(
                    name='add_dam',
                    url='dam-inventory/dams/add',
                    controller='dam_inventory.controllers.add_dam'
                ),
            )

            return url_maps

A ``UrlMap`` is an object that maps a URL for your app to controller function that should handle requests to that URL.

d. At this point you should be able to access the new page by entering its URL (`<http://localhost:8000/apps/dam-inventory/dams/add/>`_) into the address bar of your browser. It is not a very exciting page, because it is blank.

.. tip::

    **New Page Pattern**: Adding new pages is an exercise of the Model View Controller pattern. Generally, the steps are:

    * Modify the model as necessary to support the data for the new page
    * Create a new HTML template
    * Create a new controller function
    * Add a new ``UrlMap`` in ``app.py``

8. Link to New Page
===================

Finally, you can also link to the page from another page using a button.

a. Modify the ``add_dam_button`` on the Home page to link to the newly created page (don't forget the import):

::

    from django.shortcuts import reverse

    ...

    @login_required()
    def home(request):
        ...

        add_dam_button = Button(
            display_text='Add Dam',
            name='add-dam-button',
            icon='glyphicon glyphicon-plus',
            style='success',
            href=reverse('dam_inventory:add_dam')
        )

9. Build Out New Page
=====================

a. Modify the ``template/dam_inventory/add_dam.html`` with a title in the app content area and add ``Add`` and ``Cancel`` buttons to the app actions area:

::

    {% extends "dam_inventory/base.html" %}
    {% load tethys_gizmos %}

    {% block app_content %}
      <h1>Add Dam</h1>
    {% endblock %}

    {% block app_actions %}
      {% gizmo cancel_button %}
      {% gizmo add_button %}
    {% endblock %}

b. Define the options for the ``Add`` and ``Cancel`` button gizmos in the ``add_dam`` controller in ``controllers.py``. Also add the variables to the context so they are available to the template:

::

    @login_required()
    def add_dam(request):
        """
        Controller for the Add Dam page.
        """
        add_button = Button(
            display_text='Add',
            name='add-button',
            icon='glyphicon glyphicon-plus',
            style='success'
        )

        cancel_button = Button(
            display_text='Cancel',
            name='cancel-button',
            href=reverse('dam_inventory:home')
        )

        context = {
            'add_button': add_button,
            'cancel_button': cancel_button,
        }

        return render(request, 'dam_inventory/add_dam.html', context)


10. Customize Navigation
========================

Now that there are two pages in the app, we should modify the app navigation to have links to the **Home** and **Add Dam** pages.

a. Open ``/templates/dam_inventory/base.html`` and replace the ``app_navigation_items`` block:

::

    {% block app_navigation_items %}
      <li class="title">Navigation</li>
      <li class="active"><a href="{% url 'dam_inventory:home' %}">Home</a></li>
      <li class=""><a href="{% url 'dam_inventory:add_dam' %}">Add Dam</a></li>
    {% endblock %}

Notice that the **Home** link in the app navigation is always highlighed, even if you are on the **Add Dam** page. The highlight is controlled by adding the ``active`` class to the appropriate navigation link. We can get the navigation to highlight appropriately using the following pattern.

b. Modify ``app_navigation_items`` block in ``/templates/dam_inventory/base.html`` to dynamically highlight active link:

::

    {% block app_navigation_items %}
      {% url 'dam_inventory:home' as home_url %}
      {% url 'dam_inventory:add_dam' as add_dam_url %}
      <li class="title">Navigation</li>
      <li class="{% if request.path == home_url %}active{% endif %}"><a href="{{ home_url }}">Home</a></li>
      <li class="{% if request.path == add_dam_url %}active{% endif %}"><a href="{{ add_dam_url }}">Add Dam</a></li>
    {% endblock %}

The ``url`` tag is used in templates to lookup URLs using the name of the UrlMap, namespaced by the app package name (i.e.: ``namespace:url_map_name``). We assign the urls to two variables, ``home_url`` and ``add_dam_url``, using the ``as`` operator in the ``url`` tag. Then we wrap the ``active`` class of each navigation link in an ``if`` tag. If the expression given to an ``if`` tag evaluates to true, then the content of the ``if`` tag is rendered, otherwise it is left blank. In this case the result is that the ``active`` class is only added to link of the page we are visiting.

11. Solution
============

This concludes the Beginner Tutorial. You can view the solution on GitHub at `<https://github.com/tethysplatform/tethysapp-dam_inventory>`_ or clone it as follows:

.. parsed-literal::

    git clone https://github.com/tethysplatform/tethysapp-dam_inventory.git
    cd tethysapp-dam_inventory
    git checkout -b beginner-solution beginner-|version|
