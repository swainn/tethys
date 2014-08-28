/*****************************************************************************
 * FILE:    tethys_map.js
 * DATE:    13 January 2014
 * AUTHOR: Nathan R. Swain
 * COPYRIGHT: (c) 2014 Brigham Young University
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

var TETHYS_EDIT_MAP = (function() {
    // Wrap the library in a package function
    "use strict"; // And enable strict mode for this library
    
    /************************************************************************
     *                      MODULE LEVEL / GLOBAL VARIABLES
     *************************************************************************/
     var color_picker,          // Color picker object
     default_value,             // Default overlay value
     drawing_manager,           // Drawing manager for the editable map
     google_map_urls,           // The url of the data to be loaded into the map
     info_window,               // Contains the info window object
                                // values of the hex color representation of the value
     legend_color_ramp,         // Default color ramp for legend
     ramp_index,                // Stores the next available color in the ramp
     map,                       // The Google Maps map object container
     next_overlay_id,           // Next overlay id
     overlays,                  // Stash the overlays from the map
     initial_color_ramp,        // Initial color ramp object
     initial_overlays,          // Initial overlays object
     public_interface,          // Object returned by the module
     popover_open,              // Popover state variable
     reference_layers;          // Google map kml layers
    

    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    // Google Map and Earth Managment Function Declarations
    var addInitialGeoJsonOverlays, addInitialWktJsonOverlays, colorRecycle, changeColor, clickOffPopover,
    createInfoWindow, geojsonify, getFillColorForValue, getOverlayId, getUniqueColor, initColorPicker,
    initGoogleMap, overlayClick, overlayDrawingComplete, polygonCenter, retrieveKmlData, setColorForOverlay,
    setInitialColorRamp, scrapColorPicker, showColorPickerPopover, updateField, updateLegend, wellKnownTextify;
    
    addInitialGeoJsonOverlays = function(json) {
        var geometries;
        
        // Get geometries
        geometries = json['geometries'];
        
        // Add each geometry
        $(geometries).each(function() {
            var type, properties, pairs,
            coordinates, google_coordinates, overlay,
            value;
            
            type = this['type'];
            coordinates = this['coordinates'];
            properties = this['properties'];
            value = properties['value'];
            google_coordinates = [];
    
            // Create Google Overlay objects        
            if (type === 'Point') {
            var color = getFillColorForValue(value);
            var symbol = { path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                       fillColor: color,
                       fillOpacity: 1.0,
                       scale: 5,
                       strokeColor: color,
                       strokeWeight: 1 };
                       
            // Create Google Coordinates
            google_coordinates.push(new google.maps.LatLng(Number(coordinates[0]), Number(coordinates[1])));
                       
            overlay = new google.maps.Marker({
                draggable: true,
                position: google_coordinates[0],
                icon: symbol
            });
            
            // Type specific properties
            overlay.type = google.maps.drawing.OverlayType.MARKER;
            
            // Add marker specific events to make sure the text area is always up-to-date after edits
            google.maps.event.addListener(overlay, 'dragend', updateField);
            
            } else if (type === 'Polygon') {
            var color = getFillColorForValue(value);
            
            // Create Google Coordinates
            $(coordinates).each(function(){
                google_coordinates.push(new google.maps.LatLng(Number(this[0]), Number(this[1])));
            });
            
            overlay = new google.maps.Polygon({
                editable: true,
                draggable: true,
                geodesic: true,
                path: google_coordinates,
                fillColor: color,
                strokeColor: color
            });
            
            // Type specific properties
            overlay.type = google.maps.drawing.OverlayType.POLYGON;
            
            // Add polygon specific events to make sure the text area is always up-to-date after edits
            google.maps.event.addListener(overlay, 'dragend', updateField);
            google.maps.event.addListener(overlay.getPath(), 'set_at', updateField);
            google.maps.event.addListener(overlay.getPath(), 'insert_at', updateField);
            google.maps.event.addListener(overlay.getPath(), 'remove_at', updateField);
            
            } else if (type === 'LineString') {
            var color = getFillColorForValue(value);
            
            // Create Google Coordinates
            $(coordinates).each(function(){
                google_coordinates.push(new google.maps.LatLng(Number(this[0]), Number(this[1])));
            });
            
            overlay = new google.maps.Polyline({
                draggabe: true,
                editable: true,
                geodesic: true,
                path: google_coordinates,
                strokeColor: color
            });
            
            // Type specific properties
            overlay.type = google.maps.drawing.OverlayType.POLYLINE;
            
            // Add polygon specific events to make sure the text area is always up-to-date after edits
            google.maps.event.addListener(overlay, 'dragend', updateField);
            google.maps.event.addListener(overlay.getPath(), 'set_at', updateField);
            google.maps.event.addListener(overlay.getPath(), 'insert_at', updateField);
            google.maps.event.addListener(overlay.getPath(), 'remove_at', updateField);
            }
            
            // Global overlay properties
            overlay.setMap(map);
            overlay.id = getOverlayId();
            overlay.value = value;
            
            // Add overlay click event handler method to overlay
            overlay.overlayClick = overlayClick;
            
            // Create a event listeners for the overlay
            google.maps.event.addListener(overlay, 'click', overlay.overlayClick);
            
            // Add overlay to the overlays array
            overlays.push(overlay);        
        });
        
        // Update the hidden field
        updateField();
        
        // Update the legend
        updateLegend();
    
    };
    
    addInitialWktJsonOverlays = function(json) {
        var geometries;
    
        // Get geometries
        geometries = json['geometries'];
        
        // Add each geometry
        $(geometries).each(function() {
            var type, wkt_string, properties, pairs,
            coordinates, google_coordinates, overlay,
            value;
            
            type = this['type'];
            wkt_string = this['wkt'].trim();
            properties = this['properties'];
            value = properties['value'];
            coordinates = [];
            google_coordinates = [];
            
            // Strip endcaps (e.g. 'POINT(' & ')')
            wkt_string = wkt_string.replace(type.toLocaleUpperCase() + '((', '');
            wkt_string = wkt_string.replace(type.toLocaleUpperCase() + '(', '');
            wkt_string = wkt_string.replace('))', '');
            wkt_string = wkt_string.replace(')', '');
            
            // Isolate coordinate pairs
            pairs = wkt_string.split(',');
            
            // Split coordinate pairs
            $(pairs).each(function(){
            coordinates.push(this.trim().split(' '));
            });
            
            // Create Google Coordinates
            $(coordinates).each(function(){
            google_coordinates.push(new google.maps.LatLng(Number(this[1]), Number(this[0])));
            });
            
            // Create Google Overlay objects        
            if (type === 'Point') {
            var color = getFillColorForValue(value);
            var symbol = { path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                       fillColor: color,
                       fillOpacity: 1.0,
                       scale: 5,
                       strokeColor: color,
                       strokeWeight: 1 };
                       
            overlay = new google.maps.Marker({
                draggable: true,
                position: google_coordinates[0],
                icon: symbol
            });
            
            
            // Type specific properties
            overlay.type = google.maps.drawing.OverlayType.MARKER;
            
            // Add marker specific events to make sure the text area is always up-to-date after edits
            google.maps.event.addListener(overlay, 'dragend', updateField);
            
            } else if (type === 'Polygon') {
            var color = getFillColorForValue(value);
            
            google_coordinates.pop(); // Last coordinate is a duplicate
            
            overlay = new google.maps.Polygon({
                editable: true,
                draggable: true,
                geodesic: true,
                path: google_coordinates,
                fillColor: color,
                strokeColor: color
            });
            
            // Type specific properties
            overlay.type = google.maps.drawing.OverlayType.POLYGON;
            
            // Add polygon specific events to make sure the text area is always up-to-date after edits
            google.maps.event.addListener(overlay, 'dragend', updateField);
            google.maps.event.addListener(overlay.getPath(), 'set_at', updateField);
            google.maps.event.addListener(overlay.getPath(), 'insert_at', updateField);
            google.maps.event.addListener(overlay.getPath(), 'remove_at', updateField);
            
            } else if (type === 'PolyLine') {
            var color = getFillColorForValue(value);
            
            overlay = new google.maps.Polyline({
                draggabe: true,
                editable: true,
                geodesic: true,
                path: google_coordinates,
                strokeColor: color
            });
            
            // Type specific properties
            overlay.type = google.maps.drawing.OverlayType.POLYLINE;
            
            // Add polygon specific events to make sure the text area is always up-to-date after edits
            google.maps.event.addListener(overlay, 'dragend', updateField);
            google.maps.event.addListener(overlay.getPath(), 'set_at', updateField);
            google.maps.event.addListener(overlay.getPath(), 'insert_at', updateField);
            google.maps.event.addListener(overlay.getPath(), 'remove_at', updateField);
            }
            
            // Global overlay properties
            overlay.setMap(map);
            overlay.id = getOverlayId();
            overlay.value = value;
            
            // Add overlay click event handler method to overlay
            overlay.overlayClick = overlayClick;
            
            // Create a event listeners for the overlay
            google.maps.event.addListener(overlay, 'click', overlay.overlayClick);
            
            // Add overlay to the overlays array
            overlays.push(overlay);        
        });
        
        // Update the hidden field
        updateField();
        
        // Update the legend
        updateLegend();
    };
    
    colorRecycle = function(value, color) {
        var color_index = legend_color_ramp.indexOf(color);
        
        // If a color is 'freed' via deletion or value change, recycle it
        for (var i = 0; i < overlays.length; i++) {
            if (overlays[i].value === value) {
            // If at least one of the overlays has this value
            // then the color is still linked with it
            return;
            }
        }
        
        // Recycle the color by pushing it to the next available spot
        if (color_index !== -1 && color_index !== ramp_index - 2) {
            legend_color_ramp.splice(color_index, 1);
            legend_color_ramp.splice(ramp_index, 0, color);
        }
    };
    
    changeColor = function(value, color) {
        // Change the color of all the overlays that have the value
        for (var i = 0; i < overlays.length; i++) {
            if (overlays[i].value === value) {
            setColorForOverlay(overlays[i], color);
            }
        }
        
        // Update the legend
        updateLegend();    
    };
    
    clickOffPopover = function (e) {
        var target = e.target;
        
        $('.popover').each(function () {
            var popover = this;
            var popover_is_not_target = !($(popover).is(target));
            var popover_does_not_have_target = $(popover).has(target).length === 0;
            var target_is_not_a_popover_trigger = true;
            var trigger_id = '#' + $(popover).attr('data-trigger');
            
            $('.popoverTrigger').each(function() {
            var popover_trigger = this;
            var trigger_is_target = $(popover_trigger).is(target);
            var trigger_has_target = $(popover_trigger).has(target).length > 0;
            if (trigger_is_target || trigger_has_target) {
                target_is_not_a_popover_trigger = false;
                return false; // break the loop
            }
            });
            
            if (popover_is_not_target && popover_does_not_have_target && target_is_not_a_popover_trigger) {
            $(trigger_id).popover('hide');
            }
            
            
        });
    };
    
    createInfoWindow = function(title, save_button_title, overlay) {
        var overlay_id, value, type, center, center_marker, anchor;
        overlay_id = overlay.id;
        value = overlay.value;
        type = overlay.type;
        
        // Close any other popovers before creating the info window
        $('.popover').each(function() {
            var trigger_id = '#' + $(this).attr('data-trigger');
            $(trigger_id).popover('hide');
        });
        
        // Setup content for info window
        var content_string = '<div>'+
                    '<h4>' + title + '</h4>'+
                    '<form id="infoWindowForm">'+
                      '<div class="control-group">'+
                        '<label class="control-label" for="infoWindowInput">Value</label>'+
                        '<div class="controls">'+
                          '<input form="#infoWindowForm" type="text" id="infoWindowInput" name="value" value="' + value + '">'+
                        '</div>'+
                      '</div>'+
                      '<div class="control-group">'+
                        '<div class="controls">'+
                          '<a class="btn btn-danger" onclick="deleteOverlay('+
                                  overlay_id +
                                  ');" href="javascript:void(0);">Delete</a>'+
                          '<a id="saveButton" class="btn btn-success pull-right" onclick="setValue('+
                                  overlay_id +
                                  ', $(\'#infoWindowInput\').val());" href="javascript:void(0);">'+ save_button_title +'</a>'+
                        '</div>'+
                      '</div>'+
                    '</form>'+
                      '</div>';
                      
        // Get center to be anchor of popup
        if (type === google.maps.drawing.OverlayType.POLYGON || type === google.maps.drawing.OverlayType.POLYLINE) {
            anchor = polygonCenter(overlay);
        } else if (type === google.maps.drawing.OverlayType.MARKER) {
            anchor = overlay.getPosition();
        }
                               
        center_marker = new google.maps.Marker({ position: anchor });
                         
        info_window.setContent(content_string);
        
        info_window.open(map, center_marker);
    
    };
    
    geojsonify = function(overlay, type) {
        var crs, geoJson, properties;
        
        // Define the Coordinate Reference System
        crs = {'type': 'link',
               'properties': {
                   'href': 'http://spatialreference.org/ref/epsg/4326/proj4/',
                   'type':'proj4'}
               };
               
               properties = {'id': overlay.id,
                     'value': overlay.value};
        
        // Convert maps overlays into geoJSON
        if (type === google.maps.drawing.OverlayType.POLYGON || type === google.maps.drawing.OverlayType.POLYLINE) {
            var coordinates = [];
            var vertices = overlay.getPath();
                
            for (var i = 0; i < vertices.getLength(); i++) {
            var xy = vertices.getAt(i);
            var xy_array = [xy.lat(), xy.lng()];
            coordinates.push(xy_array);
            }
            
            if (type === google.maps.drawing.OverlayType.POLYGON) {
            geoJson = {'type': 'Polygon',
                   'coordinates': coordinates,
                   'properties': properties,
                   'crs': crs
                   };
            } else if (type === google.maps.drawing.OverlayType.POLYLINE) {
            geoJson = {'type': 'LineString',
                   'coordinates': coordinates,
                   'properties': properties,
                   'crs': crs
                   };
            }
        
            return geoJson;
        }    
        else if (type === google.maps.drawing.OverlayType.MARKER) {
            var position = overlay.getPosition();
            
            coordinates = [position.lat(), position.lng()];
            
            geoJson = {'type': 'Point',
                   'coordinates': coordinates,
                   'properties': properties,
                   'crs': crs
                   };
                   
            return geoJson;
        }
        
        return 'null';
    };
    
    getFillColorForValue = function(value) {
        // Find an overlay that has the same value and match the color
        for (var i = 0; i < overlays.length; i++){
            if (value === overlays[i].value) {
            if (overlays[i].type === google.maps.drawing.OverlayType.POLYGON || overlays[i].type === google.maps.drawing.OverlayType.POLYLINE) {
                return overlays[i].strokeColor;
            }
            else if (overlays[i].type === google.maps.drawing.OverlayType.MARKER) {
                return overlays[i].icon.fillColor;
            }
            else if (overlays[i].type === 'color_ramp') {
                return overlays[i].color;
            }
            }
        }
        
        // Otherwise get the next unique color
        return getUniqueColor();
    };
    
    getOverlayId = function() {
        var id = next_overlay_id;
        ++next_overlay_id;
        return id;
        };
        
        getUniqueColor = function() {
        if (ramp_index < legend_color_ramp.length) {
            var color = legend_color_ramp[ramp_index];
            ++ramp_index;
            return color;
        }
        else {
            // Interpolate
            return '#ffffff';
        }
    };
    
    initColorPicker = function(e) {
        var color_div, color, value;
        
        // Get a handle on the color div and link it to the color picker
        color_div = $(e.target).children('div:first');
        color = $(color_div).attr('data-color');
        $('.popover').attr('data-trigger', $(color_div).parents('a:first').attr('id'));
        
        // Initialize color picker
        color_picker = $.farbtastic('#color_picker');
        color_picker.linkTo('#' + $(color_div).attr('id'));
        color_picker.setColor(color);
        
        popover_open = true;
    };
    
    initGoogleMap = function() {
        // Variable declarations
        var mapOptions;
        var drawingModesArray = [];
        var drawingMode;
        
        // Configure drawing modes
        if (draw_polygons) {
            drawingModesArray.push(google.maps.drawing.OverlayType.POLYGON);
        }
        
        if (draw_points) {
            drawingModesArray.push(google.maps.drawing.OverlayType.MARKER);
        }
        
        if (draw_polylines) {
            drawingModesArray.push(google.maps.drawing.OverlayType.POLYLINE);
        }
        
        if (initial_drawing_mode !== '')
        {
            if (initial_drawing_mode === 'POLYGONS') {
            drawingMode = google.maps.drawing.OverlayType.POLYGON;
            }
            else if (initial_drawing_mode === 'POINTS') {
            drawingMode = google.maps.drawing.OverlayType.MARKER;
            }
            else if (initial_drawing_mode === 'POLYLINES') {
            drawingMode = google.maps.drawing.OverlayType.POLYLINE;
            }
        }
        
        // Configure map
        mapOptions = {
            center: new google.maps.LatLng(39.0, -96.0),
            zoom: 4,
            mapTypeId: google.maps.MapTypeId.HYBRID,
                scaleControl: true,
                rotateControl: true,
        };
        
        // init map
        map = new google.maps.Map(document.getElementById("editable_google_map"), mapOptions);
        
        // Add legened to map
        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(document.getElementById('editable_map_legend'));
                                
        // Load KML
        if (typeof(google_map_urls) !== 'undefined') {
            for (var i = 0; i < google_map_urls.length; i++) {
            reference_layers[i] = new google.maps.KmlLayer(google_map_urls[i]);
            reference_layers[i].setMap(map);
            }
        }
        
        // Setup drawing manager and configure
        drawing_manager = new google.maps.drawing.DrawingManager({
            drawingMode: drawingMode,
            drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_RIGHT,
            drawingModes: drawingModesArray
            },
            polygonOptions: {
            editable: true,
            draggable: true,
            geodesic: true
            },
            markerOptions: {
            draggable: true
            },
            polylineOptions: {
            draggable: true,
            editable: true,
            geodesic: true
            }
        });
        
        drawing_manager.setMap(map);
        
        // Add initial color ramp
        // if (initial_color_ramp !== '') {
            // setInitialColorRamp(initial_color_ramp);
        // }
        
        // Add initial input overlays
        if ('type' in initial_overlays && initial_overlays['type'] === 'WKTGeometryCollection') {
            addInitialWktJsonOverlays(initial_overlays);
        } else if ('type' in initial_overlays && initial_overlays['type'] === 'GeometryCollection') {
            addInitialGeoJsonOverlays(initial_overlays);
        }
        
        
        // Add the listeners
        google.maps.event.addListener(drawing_manager, 'overlaycomplete', overlayDrawingComplete);
    };
    
    overlayClick = function() {
        // Show edit info window
        createInfoWindow('Edit', 'Update', this);
    };
    
    overlayDrawingComplete = function(event) {
        // Add non-type specific properties to overlay
        event.overlay.id = getOverlayId();
        event.overlay.type = event.type;
        event.overlay.value = default_value;
        
        // Add overlay click event handler method to overlay
        event.overlay.overlayClick = overlayClick;
        
        // Create a event listeners for the overlay
        google.maps.event.addListener(event.overlay, 'click', event.overlay.overlayClick);
        
        
        if (event.type === google.maps.drawing.OverlayType.POLYGON || event.type === google.maps.drawing.OverlayType.POLYLINE) {
            var color = getFillColorForValue(default_value);
            
            // Add polygon specific properties to overlay
            event.overlay.center = polygonCenter(event.overlay);
            
            if (event.type === google.maps.drawing.OverlayType.POLYGON) {
                event.overlay.setOptions({fillColor: color, strokeColor: color});
            }
            else if (event.type === google.maps.drawing.OverlayType.POLYLINE) {
                event.overlay.setOptions({strokeColor: color});
            }
            
            // Add polygon specific events to make sure the text area is always up-to-date after edits
            google.maps.event.addListener(event.overlay, 'dragend', updateField);
            google.maps.event.addListener(event.overlay.getPath(), 'set_at', updateField);
            google.maps.event.addListener(event.overlay.getPath(), 'insert_at', updateField);
            google.maps.event.addListener(event.overlay.getPath(), 'remove_at', updateField);
            
        } else if (event.type === google.maps.drawing.OverlayType.MARKER) {
            var color = getFillColorForValue(default_value);
            var symbol = { path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                   fillColor: color,
                   fillOpacity: 1.0,
                   scale: 5,
                   strokeColor: color,
                   strokeWeight: 1 };
            
            // Add marker specific properties to overlay
            event.overlay.center = event.overlay.getPosition();
            event.overlay.setOptions({ icon: symbol });
            
            // Add marker specific events to make sure the text area is always up-to-date after edits
            google.maps.event.addListener(event.overlay, 'dragend', updateField);
        }
        
        // Add the overlay to the global array of overlays
        overlays.push(event.overlay);
        
        // Trigger info_window for the user to set the value
        createInfoWindow('Set Value', 'Save', event.overlay);
        
        // Update the hidden field
        updateField();
        
        // Update the legend
        updateLegend();
    };
    
    polygonCenter = function(polygon) {
        var vertices, x1, x2, y1, y2;
        var center = {};
        var xs = [];
        var ys = [];
    
        // Find center of polygon
        vertices = polygon.getPath();
        
        for (var i = 0; i < vertices.getLength(); i++) {
            var xy = vertices.getAt(i);
            var x = xy.lat();
            var y = xy.lng();
            
            // Compile list of x's and y's
            xs.push(x);
            ys.push(y);
        }
        
        // Sort the arrays
        xs.sort(function(a, b) { return a - b; });
        ys.sort(function(a, b) { return a - b; });
        
        // Get the bounding box
        x1 = xs[0];         // min x
        x2 = xs[xs.length - 1]; // max x
        y1 = ys[0];        // min y
        y2 = ys[ys.length - 1]; // max y
        
        // Calculate the center point of the bounding box
        center.x = x1 + ((x2 - x1) / 2);
        center.y = y1 + ((y2 - y1) / 2);
        
        return new google.maps.LatLng(center.x, center.y);
    };
    
    // KML Data Retriever
    retrieveKmlData = function(kml_action) {
        $.ajax({
            url: kml_action
        }).done(function(json) {
            var google_map_div;
            var height, width;
            
            // Set global map data variable
            google_map_urls = json['kml_link'];
            
            // Get height and width of loading div
            height = $('#editable_google_map_loading').css('height');
            width = $('#editable_google_map_loading').css('width');
            
            // Replace loading div with google earth div
            google_map_div = '<div id="editable_google_map" style="height: ' + height + '; width: ' + width + ';"></div>'
                   + '<div id="google_maps_async_loading" class="center-parent" style="height: ' + height + '; width: ' + width + ';">'
                   +   '<div class="centered" on>'
                   +     '<h5>Loading...</h5>'
                   +   '</div>'    
                   + '</div>';
            $('#editable_google_map_loading').replaceWith(google_map_div);
            
            // Trigger google map load
            initGoogleMap();
        });
    };
    
    scrapColorPicker = function(e) {
        if (typeof color_picker !== 'undefined' && color_picker !== null) {
            var color_div = $(e.target).children('div:first');
            var new_color = color_picker.color;
            var old_color = $(color_div).attr('data-color');
            var value = $(color_div).attr('data-value');
            
            if (new_color !== old_color) {
            changeColor(Number(value), new_color);
            }
            
            color_picker = null;
            popover_open = false;
        }
    };
    
    showColorPickerPopover = function(e) {
        var current_trigger_id = '#' + $(e.target).attr('id');
        
        $('.popover').each(function() {
            var popover_trigger_id = '#' + $(this).attr('data-trigger');
            
            if (popover_trigger_id !== current_trigger_id) {
            $(popover_trigger_id).popover('hide');
            }
        });
    };
    
    setColorForOverlay = function(overlay, color) {
        var old_color;
        
        // Update the color
        if (overlay.type === google.maps.drawing.OverlayType.POLYGON) {
            old_color = overlay.strokeColor;
            overlay.setOptions({fillColor: color, strokeColor: color});
        }
        else if (overlay.type === google.maps.drawing.OverlayType.POLYLINE) {
            old_color = overlay.strokeColor;
            overlay.setOptions({strokeColor: color});
        }
        else if (overlay.type === google.maps.drawing.OverlayType.MARKER) {
            old_color = overlay.icon.fillColor;
            var symbol = { path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                   fillColor: color,
                   fillOpacity: 1.0,
                   scale: 5,
                   strokeColor: color,
                   strokeWeight: 1 };
            overlay.setOptions({ icon: symbol });
        }
        
        return old_color;
    };
    
    setInitialColorRamp = function(ramp) {
    
    // for (var key in ramp) {
        // var value = key;
        // var color = ramp[key];
        // var ramp_overlay = {};
        // ramp_overlay.id = getOverlayId();
        // ramp_overlay.type = 'color_ramp';
        // ramp_overlay.value = value;
        // ramp_overlay.color = color;
//         
        // overlays.push(ramp_overlay);
    // }
//     
    // console.log(overlays);
    };
    
    updateField = function() {
        if (output_format === 'GEOJSON') {
            // Set the contents of the text area
            $('#geometry').html(public_interface.getGeoJsonString());
        }
        else if (output_format === 'WKT') {
            // Set the contents of the text area
            $('#geometry').html(public_interface.getWktJsonString());
        }
    };
    
    updateLegend = function() {
        var legend_element = $('#editable_map_legend');
        var legend_string = '<table>';
        var legend_content = {};
        var color_picker_div;
        
        // Show legend if hidden
        if ($(legend_element).attr('hidden'))
        {
            $(legend_element).attr('hidden', false);
        }
        
        // Update the legend content
        for (var i = 0; i < overlays.length; i++)
        {
            var current_value = overlays[i].value;
            var current_color;
            
            if (overlays[i].type === google.maps.drawing.OverlayType.POLYGON || overlays[i].type === google.maps.drawing.OverlayType.POLYLINE) {
            current_color = overlays[i].strokeColor;
            }
            else if (overlays[i].type === google.maps.drawing.OverlayType.MARKER) {
            current_color = overlays[i].icon.fillColor;
            }
            else if (overlays[i].type === 'color_ramp') {
            current_color = overlays[i].color;
            }
            
            if (!(current_value in legend_content))
            {
            legend_content[current_value] = current_color;
            }
        }
        
        // Append all colors and values
        for (var value in legend_content) {        
            legend_string += '<tr>'+
                     '<td class="legend-item">'+
                         '<a id="triggerFor'+ value +'" href="javascript:void(0);" class="popoverTrigger">'+
                         '<div id="colorFor'+ value +'" data-value="'+ value +'" data-color="'+ legend_content[value] +'" class="legend-color" style="background-color:'+ legend_content[value] +';"></div>'+
                         '</a>'+
                     '</td>'+
                     '<td class="legend-item legend-value"><strong>'+ value +'</strong></td>'+
                     '</tr>';
        }
        
        // Close the table
        legend_string += '</table>';
        
        // Update legend content
        $(legend_element).html(legend_string);
        
        // Bind popovers to legend items
        color_picker_div = '<div id="color_picker" style="width: 195px; height: 195px;"></div>';
    };
    
    wellKnownTextify = function(overlay, type) {
        var crs, wellKnownTextJSON, properties;
        
        // Define the Coordinate Reference System
        crs = {'type': 'link',
               'properties': {
                    'href': 'http://spatialreference.org/ref/epsg/4326/proj4/',
                    'type':'proj4'}
               };
               
           properties = {'id': overlay.id,
                           'value': overlay.value};
        
        // Convert maps overlays into geoJSON
        if (type === google.maps.drawing.OverlayType.POLYGON) {
            var coordinates = [];
            var vertices = overlay.getPath();
            var wellKnownText = 'POLYGON((';
            var firstCoordinates = vertices.getAt(0);
                 
            for (var i = 0; i < vertices.getLength(); i++) {
            var xy = vertices.getAt(i);
            wellKnownText += xy.lng() + ' ' + xy.lat() + ', ';
            }
             
            wellKnownText += (firstCoordinates.lng() + ' ' + firstCoordinates.lat() + '))');
             
            wellKnownTextJSON = {'type': 'Polygon',
                            'wkt': wellKnownText,
                            'properties': properties,
                        'crs': crs
                       };
        
            return wellKnownTextJSON;
        }
        else if (type === google.maps.drawing.OverlayType.POLYLINE) {
            var coordinates = [];
            var vertices = overlay.getPath();
            var wellKnownText = 'POLYLINE(';
            var pairs = [];
                 
            for (var i = 0; i < vertices.getLength(); i++) {
            var xy = vertices.getAt(i);
            pairs.push(xy.lng() + ' ' + xy.lat());
            }
            
             wellKnownText += pairs.join(', ') + ')';
            wellKnownTextJSON = {'type': 'PolyLine',
                            'wkt': wellKnownText,
                            'properties': properties,
                        'crs': crs
                       };
        
            return wellKnownTextJSON;
        }
        else if (type === google.maps.drawing.OverlayType.MARKER) {
            var position = overlay.getPosition();
            var wellKnownText = 'POINT(' + position.lng() + ' ' + position.lat()  + ')';
            
            wellKnownTextJSON = {'type': 'Point',
                     'wkt': wellKnownText,
                     'properties': properties,
                     'crs': crs
                    };
                   
            return wellKnownTextJSON;
        }
        
        return null;
    
    };
    
    /************************************************************************
     *                            TOP LEVEL CODE
     *************************************************************************/
    /*
     * Library object that contains public facing functions of the package.
     */
    public_interface = {
        // Delete a shape from the map
        deleteOverlay: function(id) {
            // Find the appropriate overlay from the array of overlays
            for (var i = 0; i < overlays.length; i ++) {
            if (overlays[i].id === id) {
                var old_value = overlays[i].value;
                var old_color;
                
                // Get the color
                if (overlays[i].type === google.maps.drawing.OverlayType.POLYGON) {
                old_color = overlays[i].strokeColor;
                }
                else if (overlays[i].type === google.maps.drawing.OverlayType.POLYLINE) {
                old_color = overlays[i].strokeColor;
                }
                else if (overlays[i].type === google.maps.drawing.OverlayType.MARKER) {
                old_color = overlays[i].icon.fillColor;
                }
                
                // Remove it from the map
                overlays[i].setMap(null);
                
                // Remove it from the overlays array
                overlays.splice(i, 1);
                
                // Recycle color
                colorRecycle(old_value, old_color);
                
                break;
            }
            }
            
            // Close the pop-up window
            info_window.close();
            
            // Update the hidden field
            updateField();
            
            // Update the legend
            updateLegend();
        },
        
        // Get the shapes from the map as geo json
        getGeoJson: function() {
            var geometry_collection = {'type': 'GeometryCollection',
                           'geometries': []};
            
            for (var i = 0; i < overlays.length; i ++) {
            var overlay = overlays[i];
            var geojson = geojsonify(overlay, overlay.type);
            geometry_collection.geometries.push(geojson);
            }
            
            return geometry_collection;
        },
        
        // Get the shapes from the map as a geo json string
        getGeoJsonString: function() {
            // Convert geo json to a string
            return JSON.stringify(getGeoJson());
        },
        
        getWktJson: function() {
            var geometry_collection = {'type': 'WKTGeometryCollection',
                           'geometries': []};
            
            for (var i = 0; i < overlays.length; i ++) {
            var overlay = overlays[i];
            var wktJson = wellKnownTextify(overlay, overlay.type);
            geometry_collection.geometries.push(wktJson);
            }
            
            return geometry_collection;
        },
        
        getWktJsonString: function() {
            // Convert wkt json to a string
            return JSON.stringify(getWktJson());
        },
        
        // Set the value of an overlay on the map
        setValue: function(id, value) {
            // Find the appropriate overlay from the array of overlays
            var numeric_value = Number(value);
            console.log(value);
            
            for (var i = 0; i < overlays.length; i ++) {
                if (overlays[i].id === id) {
                    var color = getFillColorForValue(numeric_value);
                    var old_value = overlays[i].value;
                    
                    // Update color and retain old color
                    var old_color = setColorForOverlay(overlays[i], color);
                    
                    // Set new value and change default to match
                    overlays[i].value = numeric_value;
                    default_value = numeric_value;
                    
                    // Recycle color
                    colorRecycle(old_value, old_color);
                    
                    break;
                }
            }
            
            // Close the pop-up window
            info_window.close();
            
            // Update the hidden field
            updateField();
            
            // Update the legend
            updateLegend();
        },
        
        // Swap current background kml_service for another
        swapKmlService: function(kml_service) {
            // Show loading message
            // $('#google_maps_async_loading').css('display', 'block');
            
            $.ajax({
            url: kml_service
            }).done(function(json) {
            
            if (json.hasOwnProperty('kml_link')) {
                var kml_links;
                
                // Remove kmls from map
                for (var i = 0; i < reference_layers.length; i++) {
                    var reference_layer = reference_layers[i];
                    reference_layer.setMap(null);
                }
                
                // Clear reference layers
                reference_layers = [];
                
                // Get Links
                kml_links = json['kml_link'];
                
                for (var i = 0; i < kml_links.length; i++) {
                var kml_link, layer;
                
                // Get link
                kml_link = kml_links[i];
                
                // Create new layer object with link
                layer = new google.maps.KmlLayer(kml_link);
                layer.setMap(map);
                
                // Store handle to layer in global for later use
                reference_layers.push(layer);
                }
            }
            
            // Hide loading message
            // $('#google_maps_async_loading').css('display', 'none');
            
            });
        },
        
        swapOverlayService: function(overlay_service, clear_overlays) {
            $.ajax({
                url: overlay_service
            }).done(function(json) {
            
                if (json.hasOwnProperty('overlay_json')) {
                    var overlay_json = json['overlay_json'];
    
                    if (clear_overlays) {
                        // Remove overlays from map
                        for (var i = 0; i < overlays.length; i++) {
                            overlays[i].setMap(null);
                        }
                        
                        // Clear overlay globals
                        overlays = [];
                    }
                    
                    // Add input overlays
                    if ('type' in overlay_json && overlay_json['type'] === 'WKTGeometryCollection') {
                        addInitialWktJsonOverlays(overlay_json);
                    } else if ('type' in overlay_json && overlay_json['type'] === 'GeometryCollection') {
                        addInitialGeoJsonOverlays(overlay_json);
                    }
                }
            });
        }
    };
    
    // Initialization: jQuery function that gets called when 
    // the DOM tree finishes loading
    $(function() {
        /* Initialize the globals */
        // info_window               
        info_window = new google.maps.InfoWindow();
        
        // Bind stuff to the domready event
        google.maps.event.addListener(info_window, 'domready', function() {
            // Set the first input to be focused when info window is shown
            $('#infoWindowForm input:first').focus();    
        });
        
        // Reference layers global
        reference_layers = [];
        
        // Overlay globals
        overlays = [];
        next_overlay_id = 1;
        default_value = 1;
        
        // Parse the initial color ramp string
        if (initial_color_ramp_string !== '') {
            initial_color_ramp = JSON.parse(initial_color_ramp_string);
        } else {
            initial_color_ramp = null;
        }
        
        // Parse initial overlays string
        if (initial_overlays_string !== '') {
            initial_overlays = JSON.parse(initial_overlays_string);
        } else {
            initial_overlays = {}; // Empty object
        }
            
        // Initialize legend color ramp
        legend_color_ramp = [
                     '#ff0000', // red
                     '#ff7f00', // orange
                     '#ffff00', // yellow
                     '#00c800', // green
                     '#00c8ff', // sky blue
                     '#0000ff', // blue
                     '#7f00ff', // purple
                     '#f768a1', // pink
                     '#ff00ff', // magenta
                     '#999999', // gray
                     '#a65628', // brown
                     '#800000', // dark red
                     '#c86400', // dark orange
                     '#c8c800', // dark yellow
                     '#647D00', // olive green
                     '#003280', // navy blue
                     '#400080', // dark purple
                     '#800080', // dark magenta
                     '#8dd3c7', // pastel turquoise
                     '#ffffb3', // pastel yellow
                     '#bebada', // pastel purple
                     '#fb8072', // pastel red
                     '#80b1d3', // pastel blue
                     '#fdb462', // pastel orange
                     '#b3de69', // pastel green
                     '#fccde5', // pastel pink
                     '#d9d9d9', // pastel gray
                     '#e5d8bd', // pastel brown
                     '#016c59', // others
                     '#9ecae1',
                     '#e31a1c',
                     '#efedf5',
                     '#d9d9d9',
                     '#737373',
                     '#525252',
                    ];
                    
        ramp_index = 0;
        popover_open = false;
        
        var color_picker_div = '<div id="color_picker" style="width: 195px; height: 195px;"></div>';
        var popover = $('body').popover({ placement: 'left',
                          html: true,
                          content: color_picker_div,
                          selector: '.popoverTrigger',
                          container: 'body'});
        
        // Bind init and scrap methods to the popovers                   
        $(popover).on('shown', initColorPicker);
        $(popover).on('show', showColorPickerPopover);
        $(popover).on('hidden', scrapColorPicker);
        
        // Setup click off event = close for popovers
        $('body').on('click', clickOffPopover);
        
        // Note that the kml_action parameter is passed through a variable
        // declaration that is part of the snippet.
        retrieveKmlData(kml_action);
        
        });
    
    return public_interface;

}()); // End of package wrapper

/*****************************************************************************
 *                      Public Functions
 *****************************************************************************/
function deleteOverlay(id) {
    TETHYS_EDIT_MAP.deleteOverlay(id);
}

function getGeoJson() {
    return TETHYS_EDIT_MAP.getGeoJson();
}

function getGeoJsonString() {
    return TETHYS_EDIT_MAP.getGeoJsonString();
}

function getWktJson() {
    return TETHYS_EDIT_MAP.getWktJson();
}

function getWktJsonString() {
    return TETHYS_EDIT_MAP.getWktJsonString();
}

function setValue(id, value) {
    TETHYS_EDIT_MAP.setValue(id, value);
}

function swapKmlService(kml_service) {
    TETHYS_EDIT_MAP.swapKmlService(kml_service);
}

function swapOverlayService(overlay_service, clear_overlays) {
    TETHYS_EDIT_MAP.swapOverlayService(overlay_service, clear_overlays);
}
