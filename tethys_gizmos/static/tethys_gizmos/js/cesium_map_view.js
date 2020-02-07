var CESIUM_MAP_VIEW = (function() {
	// Wrap the library in a package function
	"use strict"; // And enable strict mode for this library

	/************************************************************************
 	*                      MODULE LEVEL / GLOBAL VARIABLES
 	*************************************************************************/
 	var public_interface;				// Object returned by the module

	// Selectors
    var m_map_target,                   // Selector for the map container
        m_textarea_target;              // Selector for the textarea target

    // Objects
    var m_viewer;					    // The map object

    var m_token,
        m_options,                      // The map basic options
        m_globe,                        // The map globe options
        m_view_options,                 // The map view options
        m_terrain_options,              // The map terrain options
        m_image_layer_options,          // The map image layer options
        m_models_options,               // The map 3D object options
        m_entities_options,             // The map entity options
        m_clock,                        // The map clock options
        m_draw;                         // The map drawing option (boolean)

    // Others
    var draw_id;                        // draw_id counter

	/************************************************************************
 	*                    PRIVATE FUNCTION DECLARATIONS
 	*************************************************************************/
 	var cesium_base_map_init, cesium_globe_init, cesium_map_view_init, cesium_initialize_all, cesium_widgets_init,
 	    clock_options_init, cesium_view, cesium_terrain, cesium_image_layers, cesium_load_model, cesium_load_entities,
 	    cesium_models, update_field, option_checker;

    var cesium_shadow_options, textarea_string_dict, cesium_logging;

    // Utility Methods
    var is_defined, is_empty_or_undefined, in_array, string_to_object, string_to_function, string_w_arg_to_function,
        build_options, build_options_string, need_to_run, cesium_options, json_parser, clear_data;


 	/************************************************************************
 	*                    PRIVATE FUNCTION IMPLEMENTATIONS
 	*************************************************************************/
    /***********************************
    * Initialization Methods
    ***********************************/
    // Initialize the map
    cesium_base_map_init = function()
    {
        // Get view settings from data attribute
        var $map_element = $('#' + m_map_target);
        m_token = $map_element.data('cesium-ion-token');
        m_options = $map_element.data('options');

        Cesium.Ion.defaultAccessToken = m_token;

        // Initialize the clock options
        clock_options_init();

        if (!is_empty_or_undefined(m_options))
        {
            // Init Map
            m_viewer = new Cesium.Viewer(m_map_target, m_options);
        }
        else
        {
            m_viewer = new Cesium.Viewer(m_map_target);
        }
    };

    clock_options_init = function() {
        // Get view settings from data attribute
        var $map_element = $('#' + m_map_target);
        m_clock = $map_element.data('clock');

        if (!is_empty_or_undefined(m_clock))
        {
            // Parse out the Cesium objects
            m_clock = cesium_options(m_clock);

            // Lazily initialize the m_options if it isn't initialized or is empty.
            if (is_empty_or_undefined(m_options))
            {
                m_options = {};
            }

            // Add clockViewModel to m_options for the viewer
            if (!is_empty_or_undefined(m_clock)) {
                m_options['clockViewModel'] = new Cesium.ClockViewModel(m_clock['clock']);
            }
        }
    };

    // Set globe options, if any
    cesium_globe_init = function()
    {
        // Get view settings from data attribute
        var $map_element = $('#' + m_map_target);
        m_globe = $map_element.data('globe');

        if (!is_empty_or_undefined(m_globe))
        {
            for (var property in m_globe)
            {
                // Set the globe property if it is a valid property of the existing globe object
                if (m_viewer.scene.globe.hasOwnProperty(property))
                {
                    m_viewer.scene.globe[property] = m_globe[property];
                }
            }
        }
    };

    // Set Cesium Camera View
    cesium_view = function() {
        var $map_element = $('#' + m_map_target);
        m_view_options = $map_element.data('view');

        if(!is_empty_or_undefined(m_view_options))
        {
            let m_cesium_view_options = cesium_options(m_view_options);
            for (let view_option in m_cesium_view_options)
            {
                switch(view_option) {
                    case 'setView':
                        m_viewer.camera.setView(m_cesium_view_options[view_option]);
                        break
                    case 'flyTo':
                        m_viewer.camera.flyTo(m_cesium_view_options[view_option]);
                        break
                    case 'lookAt':
                        m_viewer.camera.lookAt(m_cesium_view_options[view_option]['center'],  m_cesium_view_options[view_option]['offset']);
                        break
                    case 'lookAtTransform':
                        m_viewer.camera.lookAtTransform(m_cesium_view_options[view_option]['transform'],  m_cesium_view_options[view_option]['offset']);
                        break
                    case 'viewBoundingSphere':
                        m_viewer.camera.viewBoundingSphere(m_cesium_view_options[view_option]['boundingSphere'], m_cesium_view_options[view_option]['offset']);
                        break
                }
            }
        }
        else
        {
            return;
        }
    }

    // Set Cesium Terrain
    cesium_terrain = function() {
        var data_terrain_json;
        var $map_element = $('#' + m_map_target);

        m_terrain_options = $map_element.data('terrain');

        if(!is_empty_or_undefined(m_terrain_options))
        {
            m_terrain_options = cesium_options(m_terrain_options);
            m_viewer.terrainProvider = m_terrain_options['terrainProvider'];
        }
        else
        {
            return;
        }
    }

    // Set Cesium image layers
    cesium_image_layers = function(){
        var $map_element = $('#' + m_map_target);
        m_image_layer_options = $map_element.data('layer');

        if(is_empty_or_undefined(m_image_layer_options))
        {
            return;
        }

        for (var i = 0; i < m_image_layer_options.length; i++) {
            var curr_layer = m_image_layer_options[i];

            if ('source' in curr_layer) {
                if (curr_layer.source == 'TileWMS' || curr_layer.source == 'ImageWMS') {
                    var tile_wms = new Cesium.WebMapServiceImageryProvider({
                        url: curr_layer.options.url,
                        layers: curr_layer.options.params.LAYERS,
                        parameters: {
                            format: 'image/png',
                            transparent: true,
                        }
                    });
                    var img_layer = m_viewer.imageryLayers.addImageryProvider(tile_wms);
                    img_layer['tethys_data'] = curr_layer.data;
                    img_layer['legend_title'] = curr_layer.legend_title;
                    img_layer['legend_classes'] = curr_layer.legend_classes;
                    img_layer['legend_extent'] = curr_layer.legend_extent;
                    img_layer['legend_extent_projection'] = curr_layer.legend_extent_projection;
                    img_layer['feature_selection'] = curr_layer.feature_selection;
                    img_layer['geometry_attribute'] = curr_layer.geometry_attribute;
                }

            } else {
                var layer_options = cesium_options(curr_layer);
                for (var layer_option in layer_options) {
                    var imagery_provider = layer_options[layer_option]['imageryProvider'];
                    var key = layer_options[layer_option]['imageryProvider']['key'];
                    if (key) {
                        Cesium.MapboxApi.defaultAccessToken = key;
                    }
                    var img_layer = m_viewer.imageryLayers.addImageryProvider(
                        layer_options[layer_option]['imageryProvider']);
                    img_layer['tethys_data'] = curr_layer.data;
                    img_layer['legend_title'] = curr_layer.legend_title;
                    img_layer['legend_classes'] = curr_layer.legend_classes;
                    img_layer['legend_extent'] = curr_layer.legend_extent;
                    img_layer['legend_extent_projection'] = curr_layer.legend_extent_projection;
                    img_layer['feature_selection'] = curr_layer.feature_selection;
                    img_layer['geometry_attribute'] = curr_layer.geometry_attribute;
                }
            }
        }
    }

    // Set Cesium models
    cesium_models = function()
    {
        var $map_element = $('#' + m_map_target);
        m_models_options = $map_element.data('models');

        if(!is_empty_or_undefined(m_models_options))
        {
             cesium_shadow_options = {'disabled': 0, 'enabled': 1, 'cast_only': 2, 'receive_only': 3, 'number_of_shadow_modes': 4}
        }
        else
        {
            return;
        }

        let m_model_option_properties = cesium_options(m_models_options);
        for (let m_model_option_property in m_model_option_properties)
        {
            var name = m_model_option_properties[m_model_option_property]['name'];
            // Map shadows key
            if ('shadows' in m_model_option_properties[m_model_option_property]['model']) {
                var shadow_prop = m_model_option_properties[m_model_option_property]['model']['shadows']
                m_model_option_properties[m_model_option_property]['model']['shadows'] = cesium_shadow_options[shadow_prop.toLowerCase()]
            }
            var model = m_model_option_properties[m_model_option_property]['model'];
            var position = m_model_option_properties[m_model_option_property]['position'];
            var orientation = m_model_option_properties[m_model_option_property]['orientation'];
            cesium_load_model(model, model, position, orientation);
        }
    }

    cesium_load_model = function(name, model, position, orientation)
    {
        // Convert shadow to number using shadow_dict.
        var entity = m_viewer.entities.add({
                                            name : name,
                                            position : position,
                                            orientation : orientation,
                                            model : model,
                                         });
        m_viewer.trackedEntity = entity;
    }

    // Set Cesium entities
    cesium_load_entities = function()
    {
        var $map_element = $('#' + m_map_target);
        var m_entities_options = [];
        var raw_entities_options = $map_element.data('entities');

        if(is_empty_or_undefined(raw_entities_options))
        {
            return;
        }

        // load entity object.
        for (let i = 0; i < raw_entities_options.length; i++) {
            var curr_entity_options  = raw_entities_options[i];

            if (!'source' in curr_entity_options) {
                continue;
            }
            // process object to handle object.
            if (curr_entity_options.source.toLowerCase() == 'czml')
            {
                var czml = curr_entity_options.options;
                var dataSourcePromise = Cesium.CzmlDataSource.load(czml).then(function(source_result) {
                    source_result['tethys_data'] = curr_entity_options.data;
                    source_result['legend_title'] = curr_entity_options.legend_title;
                    source_result['legend_classes'] = curr_entity_options.legend_classes;
                    source_result['legend_extent'] = curr_entity_options.legend_extent;
                    source_result['legend_extent_projection'] = curr_entity_options.legend_extent_projection;
                    source_result['feature_selection'] = curr_entity_options.feature_selection;
                    source_result['geometry_attribute'] = curr_entity_options.geometry_attribute;

                    if ('layer_options' in curr_entity_options && curr_entity_options.layer_options &&
                        'visible' in curr_entity_options.layer_options) {
                        source_result.show = curr_entity_options.layer_options.visible;
                    }
                    return source_result;
                });
                m_viewer.dataSources.add(dataSourcePromise);
            }
            else if (curr_entity_options.source.toLowerCase() == 'geojson')
            {
                var gjson = curr_entity_options.options;
                var dataSourcePromise = Cesium.GeoJsonDataSource.load(gjson).then(function(source_result) {
                    source_result['tethys_data'] = curr_entity_options.data;
                    source_result['legend_title'] = curr_entity_options.legend_title;
                    source_result['legend_classes'] = curr_entity_options.legend_classes;
                    source_result['legend_extent'] = curr_entity_options.legend_extent;
                    source_result['legend_extent_projection'] = curr_entity_options.legend_extent_projection;
                    source_result['feature_selection'] = curr_entity_options.feature_selection;
                    source_result['geometry_attribute'] = curr_entity_options.geometry_attribute;

                    if ('layer_options' in curr_entity_options && curr_entity_options.layer_options &&
                        'visible' in curr_entity_options.layer_options) {
                        source_result.show = curr_entity_options.layer_options.visible;
                    }
                    return source_result;
                });
                m_viewer.dataSources.add(dataSourcePromise);
            }
        }
    }

    var drawing_helper = function () {
        // create the almighty cesium widget
        var scene = m_viewer.scene;

        // start the draw helper to enable shape creation and editing
        var drawHelper = new DrawHelper(m_viewer);
        var toolbar = drawHelper.addToolbar(document.getElementById("cesium_map_view_toolbar"), {
            buttons: ['marker', 'polyline', 'polygon', 'circle', 'extent', 'logging']
        });
        toolbar.addListener('markerCreated', function(event) {
            loggingMessage('Marker created at ' + event.position.toString());
            // create one common billboard collection for all billboards
            var b = new Cesium.BillboardCollection();
            scene.primitives.add(b);
            var billboard = b.add({
                id : draw_id,
                show : true,
                position : event.position,
                pixelOffset : new Cesium.Cartesian2(0, 0),
                eyeOffset : new Cesium.Cartesian3(0.0, 0.0, 0.0),
                horizontalOrigin : Cesium.HorizontalOrigin.CENTER,
                verticalOrigin : Cesium.VerticalOrigin.CENTER,
                scale : 1.0,
                image: '/static/tethys_gizmos/images/glyphicons_242_google_maps.png',
                color : new Cesium.Color(1.0, 1.0, 1.0, 1.0)
            });
            update_field(billboard, 'Marker');

            draw_id += 1;
            billboard.setEditable();
        });

        // Update marker when moved
        var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
        handler.setInputAction(function(click){
            var pickObject = scene.pick(click.position);
            if (typeof pickObject === 'object' && typeof pickObject.primitive._billboardCollection === 'object') {
                update_field(pickObject.primitive, 'Marker');
                loggingMessage('Marker moved to ' + pickObject.primitive.position.toString());
            }
        }, Cesium.ScreenSpaceEventType.LEFT_UP);

        toolbar.addListener('polylineCreated', function(event) {
            loggingMessage('Polyline created with ' + event.positions.length + ' points');
            var polyline = new DrawHelper.PolylinePrimitive({
                id: draw_id,
                positions: event.positions,
                width: 5,
                geodesic: true,
                colors: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
            });
            draw_id +=1;
            scene.primitives.add(polyline);
            update_field(polyline, 'Polyline');
            polyline.setEditable();
            polyline.addListener('onEdited', function(event) {
                loggingMessage('Polyline edited, ' + event.positions.length + ' points');
                update_field(polyline, 'Polyline');
            });

        });
        toolbar.addListener('polygonCreated', function(event) {
            loggingMessage('Polygon created with ' + event.positions.length + ' points');
            var polygon = new DrawHelper.PolygonPrimitive({
                id: draw_id,
                positions: event.positions,
                material : Cesium.Material.fromType(Cesium.Material.RimLightingType)
            });
            draw_id += 1;
            scene.primitives.add(polygon);
            update_field(polygon, 'Polygon');
            polygon.setEditable();
            polygon.addListener('onEdited', function(event) {
                update_field(polygon, 'Polygon');
                loggingMessage('Polygon edited, ' + event.positions.length + ' points');
            });

        });

        toolbar.addListener('circleCreated', function(event) {
            loggingMessage('Circle created: center is ' + event.center.toString() + ' and radius is ' + event.radius.toFixed(1) + ' meters');
            var circle = new DrawHelper.CirclePrimitive({
                id : draw_id,
                center: event.center,
                radius: event.radius,
                material: Cesium.Material.fromType(Cesium.Material.RimLightingType)
            });
            draw_id += 1;
            scene.primitives.add(circle);
            update_field(circle, 'Circle');
            circle.setEditable();
            circle.addListener('onEdited', function(event) {
                update_field(circle, 'Circle');
                loggingMessage('Circle edited: radius is ' + event.radius.toFixed(1) + ' meters');
            });
        });
        toolbar.addListener('extentCreated', function(event) {
            var extent = event.extent;
            loggingMessage('Extent created (N: ' + extent.north.toFixed(3) + ', E: ' + extent.east.toFixed(3) + ', S: ' + extent.south.toFixed(3) + ', W: ' + extent.west.toFixed(3) + ')');
            var extentPrimitive = new DrawHelper.ExtentPrimitive({
                id : draw_id,
                extent: extent,
                material: Cesium.Material.fromType(Cesium.Material.RimLightingType)
            });
            draw_id += 1;
            scene.primitives.add(extentPrimitive);
            update_field(extentPrimitive, 'Extent');
            extentPrimitive.setEditable();
            extentPrimitive.addListener('onEdited', function(event) {
                update_field(extentPrimitive, 'Extent');
                loggingMessage('Extent edited: extent is (N: ' + event.extent.north.toFixed(3) + ', E: ' + event.extent.east.toFixed(3) + ', S: ' + event.extent.south.toFixed(3) + ', W: ' + event.extent.west.toFixed(3) + ')');
            });
        });
        toolbar.addListener('clearData', function() {
            clear_data();
        });

        function loggingMessage(message) {
            cesium_logging.innerHTML = message;
        }
    }

    cesium_initialize_all = function() {
        // Map container selector
        m_map_target = 'cesium_map_view';
        m_textarea_target = 'cesium_map_view_geometry';
        cesium_logging = document.getElementById('cesium_map_view_logging');
        textarea_string_dict = {};

        // Initialize the map
        cesium_base_map_init();

        // Initialize the globe
        cesium_globe_init();

        // Set Cesium Terrain options
        cesium_terrain();

         // Set Image layers using Cesium View Properties
        cesium_image_layers();

        // Load Cesium models
        cesium_models();

        // Load Cesium entities
        cesium_load_entities();

        // Load the view last
        cesium_view();

        // Enable Drawing Option if specified
        let $map_element = $('#' + m_map_target);
        m_draw = $map_element.data('draw');
        if (m_draw) {
            draw_id = 1;
            drawing_helper();
        }
    };

    /***********************************
    * Initialization Methods
    ***********************************/
    update_field = function(draw_object, geometry_type) {
        var $textarea;
        var id = draw_object['id'];

        var draw_coordinates = [];
        if (id) {
            if (geometry_type == 'Circle')
            {
                var draw_center = draw_object['center'];
                draw_coordinates.push([draw_center['x'], draw_center['y']])
                textarea_string_dict[id] = {'type': geometry_type, 'center': draw_coordinates,
                'radius': draw_object['radius']};
            }
            else if(geometry_type=='Marker')
            {
                draw_coordinates.push(draw_object.position['x'], draw_object.position['y'])
                textarea_string_dict[id] = {'type': geometry_type, 'coordinates': draw_coordinates};
            }
            else if(geometry_type == 'Extent')
            {
                var extents = draw_object['extent'];
                textarea_string_dict[id] = {'type': geometry_type, 'east': extents['east'],
                'north': extents['north'], 'south': extents['south'], 'west': extents['west']};
            }
            else
            {   var draw_positions = draw_object['positions'];
                for(var i = 0; i < draw_positions.length-2; i++)
                {
                  draw_coordinates.push([draw_positions[i]['x'], draw_positions[i]['y']])
                }
                textarea_string_dict[id] = {'type': geometry_type, 'coordinates': draw_coordinates};
            }
            $textarea = $('#' + m_textarea_target);
            $textarea.val(JSON.stringify(textarea_string_dict));
        }
    };
    clear_data = function()
    {
        var $textarea;
        $textarea = $('#' + m_textarea_target);

        // clear text area
        $textarea.val('');

        // Clear string
        textarea_string_dict = {};

        // reset id
        draw_id = 1;

        // Clear logging
        cesium_logging.innerHTML = '';
    }

    json_parser = function(option)
    {
         var parse_option = false;

         if (typeof option !== typeof undefined && option !== false)
         {
            parse_option = JSON.parse(option, {});
         }
         return parse_option;
    }


    /***********************************
    * Utility Methods
    ***********************************/
    in_array = function(item, array) {
        return array.indexOf(item) !== -1;
    };

    is_defined = function(variable) {
        return !!(typeof variable !== typeof undefined && variable !== false);
    };

    // Instantiate a function from a string
    // credits: http://stackoverflow.com/questions/1366127/instantiate-a-javascript-object-using-a-string-to-define-the-class-name
    string_to_object = function(str) {
        var arr = str.split(".");
        var fn = (window || this);

        for (var i = 0, len = arr.length; i < len; i++) {
          fn = fn[arr[i]];
        }

        return  fn;
    };

    string_to_function = function(str) {
        var fn = string_to_object(str);

        if (typeof fn !== "function") {
          throw new Error("function not found: " + str);
        }

        return  fn;
    };

    // Process 'Cesium.Cartesian3': [0.0, -4790000.0, 3930000.0]. Take method name and arguments then return the method output.
    string_w_arg_to_function = function(obj_dict) {
        for (var method_string in obj_dict) {
            var args;

            // find the last string to see if it's a method or class using the initial letter
            // ex: method_string_list returns ['Cesium', 'Cartesian3'];
            var method_string_list = method_string.split('.');

            // ex: this one return 'Cartesian3'
            var method_last_string = method_string_list[method_string_list.length - 1];
            // Get the initial letter from the method name. ex: 'C'
            var initial_letter = method_last_string[0]
            if (typeof obj_dict[method_string] == 'object') {
                args = obj_dict[method_string];
            }
            else {
                args = [obj_dict[method_string]];
            }

            // the method call, ex: Cesium.Cartesian3(0.0, -4790000.0, 3930000.0)
            var method_call;

            // convert string to function. ex: Cesium.Cartesian3


            // Check to see if is a constant (all uppercase)
            if (method_last_string == method_last_string.toUpperCase())
            {
                console.log('here');
                console.log(method_last_string);
            }
            // Check the initial letter to see if it's a string or class
            if (initial_letter == initial_letter.toLowerCase()) {
                var method = string_to_function(method_string);
                // This is a method
                if(Array.isArray(args)) {       // if args is an array object, we have to use ...args
                    method_call = method(...args);
                } else {                        // if args is an object, we just pass it in
                    method_call = method(args);
                }
            } else {
                var method = string_to_function(method_string);
                // This is a class
                if(Array.isArray(args)) {       // if args is an array object, we have to use ...args
                    method_call = new method(...args);
                } else {                        // if args is an object, we just pass it in
                    method_call = new method(args);
                }
            }
        }

        return method_call
    }

    //  Handle multiple method calls.  //
    build_options = function (obj, stack) {
        for (var property in obj) {
            if(obj.hasOwnProperty(property)) {
                // Value of property is an object
                if(typeof obj[property] == 'object') {
                    // Use string to function when detect Cesium. in the key
                    var obj_key = Object.keys(obj[property])[0];
                    if (typeof obj_key !== 'undefined') {
                        // recursively
                        if (obj_key.indexOf('Cesium.') > -1) {
                            // loop through all the children element to find Cesium
                            var obj_child_key_all = obj[property][obj_key]
                            if (typeof obj_child_key_all !== 'undefined') {
                                var index;
                                if (typeof obj_child_key_all === 'object')
                                {
                                    for (var key in obj_child_key_all) {
                                        if (!Array.isArray(obj_child_key_all)) {
                                            // Continue to build object since this is not the last element.
                                            if (typeof obj_child_key_all[key] === 'object') {
                                                build_options(obj[property], stack[property] = obj[property]);
                                            }
                                            // handle string or number. Use toString so we don't have to write another if statement
                                            else if ((obj_child_key_all[key]).toString().indexOf('Cesium.') > -1) {
                                                build_options(obj[property], stack[property] = obj[property]);
                                            }
                                        }
                                        else if (typeof (Object.keys(obj_child_key_all[key])[0]) !== 'undefined') {
                                            if ((Object.keys(obj_child_key_all[key])[0].indexOf('Cesium.')) > -1) {
                                                build_options(obj[property], stack[property] = obj[property]);
                                            }
                                        }
                                    }
                                }
                            // if we don't find any Cesium in Children, execute the method/class
                            build_options(obj[property], stack[property] = string_w_arg_to_function(obj[property]));
                            }
                        } else {  // Simply continue to build object when no Cesium. in the key
                            build_options(obj[property], stack[property] = obj[property]);
                        }
                    }
                }
                // Value of property is a string
                else if (typeof obj[property] == 'string')
                {
                    // Use string to function when detect Cesium. in the key
                    var str_value = obj[property];
                    if (str_value.indexOf('Cesium.') > -1) {
                        var const_value = string_to_object(str_value);
                        build_options(obj[property], stack[property] = const_value);
                    }
                }
            }
        }
        return stack;
    }

    build_options_string = function (obj) {
        var dict_string = {}
        for (var property in obj) {
            if(obj.hasOwnProperty(property)) {
                if(typeof obj[property] == 'string') {
                    dict_string = Object.assign({}, dict_string, obj);
                }
            }
        }
        return dict_string;

    }

    // Find if we have any Cesium needed to process, if yes, we need to rebuild the object again.
    need_to_run = function(obj) {
        for (var property in obj) {
            if(obj.hasOwnProperty(property)) {
                if (typeof obj[property] == 'object') {
                    if (typeof Object.keys(obj[property])[0] !== 'undefined') {
                        // Find next children if exists
                        if ((Object.keys(obj[property])[0].indexOf('Cesium.')) == -1) {
                            return need_to_run(obj[property]);
                        }
                        else {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    // Build the final object with all the processed result from method/class in the object.
    cesium_options = function(obj) {
        // Always run this first time
        var new_obj = build_options(obj, {})

        // Check if we need to run again
        var run_status = need_to_run(new_obj);

        // if we detect Cesium., rebuild the object
        if (run_status) {
            return cesium_options(new_obj)
        }

        // No more Cesium in the object, merge object object with string object.
        var new_obj_string = build_options_string(obj);
        if (new_obj_string) {
            new_obj = Object.assign({}, new_obj_string, new_obj);
        }

        return new_obj;
    }

    // Check if object is empty or undefined
    is_empty_or_undefined = function(obj)
    {
        if (!obj || typeof obj !== 'object') {
            return true;
        }

        for(var key in obj) {
            if(obj.hasOwnProperty(key))
                return false;
        }
        return true;
    }

	/************************************************************************
 	*                        DEFINE PUBLIC INTERFACE
 	*************************************************************************/
	/*
	 * Library object that contains public facing functions of the package.
	 * This is the object that is returned by the library wrapper function.
	 * See below.
	 * NOTE: The functions in the public interface have access to the private
	 * functions of the library because of JavaScript function scope.
	 */

	public_interface = {
        getMap: function() {
            return m_viewer;
        },
	};

	/************************************************************************
 	*                  INITIALIZATION / CONSTRUCTOR
 	*************************************************************************/

	// Initialization: jQuery function that gets called when
	// the DOM tree finishes loading
	$(function() {
		cesium_initialize_all();
	});

	return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.