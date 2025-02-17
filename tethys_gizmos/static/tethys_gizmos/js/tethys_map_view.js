/*****************************************************************************
 * FILE:    Tethys Map View Library
 * DATE:    February 4, 2015
 * AUTHOR:  Nathan Swain
 * COPYRIGHT: (c) Brigham Young University 2015
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

// Backward/forward compatability for OpenLayers
if (typeof ol.inherits === 'undefined') {
  ol.inherits = function (child, parent) {
      child.prototype = Object.create(parent.prototype);
      child.prototype.constructor = child;
  }
}

// Extend Object prototype
Object.byString = function(o, s) {
  s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
  s = s.replace(/^\./, '');           // strip a leading dot
  var a = s.split('.');

  for (var i = 0, n = a.length; i < n; ++i) {
      var k = a[i];
      if (k in o) {
          o = o[k];
      } else {
          return;
      }
  }
  return o;
}

/*****************************************************************************
*                      LIBRARY WRAPPER
*****************************************************************************/
var TETHYS_MAP_VIEW = (function() {
// Wrap the library in a package function
"use strict"; // And enable strict mode for this library

/************************************************************************
 *                      MODULE LEVEL / GLOBAL VARIABLES
 *************************************************************************/
 // Constants
var DEFAULT_PROJECTION = 'EPSG:3857',                     // Spherical Mercator Projection
    LAT_LON_PROJECTION = 'EPSG:4326',                     // Standard Geographic Projection
    DEFAULT_SENSITIVITY = 2,                              // Used in selectable features
    DEFAULT_OUTPUT_FORMAT = 'GeoJSON',                    // The default output format
    GEOJSON_FORMAT = 'GeoJSON',                           // GeoJSON format type
    WKT_FORMAT = 'WKT',                                   // Well know text format type
    DEFAULT_FORMAT = GEOJSON_FORMAT;                      // Default format type

// Options Attributes
var ATTRIBUTE_TABLE_DATA = 'attribute-table',             // Data attribute containing the attribute table options
    BASE_MAP_DATA = 'base-map',                           // Data attribute containing the base map options
    CONTROLS_DATA = 'controls',                           // Data attribute containing the controls options
    DRAW_DATA = 'draw',                                   // Data attribute containing the drawing options
    LAYERS_DATA = 'layers',                               // Data attribute containing the layers options
    LEGEND_DATA = 'legend',                               // Data attribute containing the legend options
    VIEW_DATA = 'view',                                   // Data attribute containing the view options
    FEAT_SELECTION_DATA = 'feature-selection',            // Data attribute containing the feature selection options
    DISABLE_BASE_MAP_DATA = 'disable-base-map',           // Data attribute containing the disable base map option
    SHOW_CLICKS_DATA = 'show-clicks';                     // Data attribute containing the show clicks value

// Objects
var public_interface;                                     // Object returned by the module

// Map
var m_map,					                            // The map
    m_map_target;                                         // Selector for the map container

// Drawing
var m_delete_feature_interaction,                         // Delete feature interaction
    m_drag_box_interaction,                               // Drag box interaction used for drawing rectangles
    m_drawing_interaction,                                // Drawing interaction used for drawing
    m_drag_feature_interaction,                           // Drag feature interaction
    m_drawing_layer,                                      // Drawing layer for drawing feature
    m_drawing_source,                                     // Drawing sources for drawing feature
    m_modify_interaction,                                 // Modify interaction used for modifying features
    m_modify_select_interaction,                          // Select interaction for modify action
    m_snap_interaction,                                   // Snap interaction for drawing layers
    m_snapping_source;                                    // Snapping source for drawing feature

// Feature Selection
var m_lines_selected_layer,                               // The layer that contains the currently selected lines
    m_points_selected_layer,                              // The layer that contains the currently selected points
    m_polygons_selected_layer,                            // The layer that contains the currently selected polygons
    m_select_interaction,                                 // Select interaction for main layers
    m_selectable_layers,                                  // The layers that allow for selectable features
    m_selectable_wms_layers,                              // The layers that allow for selectable wms features
    m_wms_feature_selection_changed_callbacks,            // An array of callback functions to execute whenever features change
    m_zoom_on_selection;                                  // Indicates whether to zoom on selection event

// Legend
var m_legend_element,                                     // Stores the document element for the legend
    m_legend_items,                                       // Stores the legend items
    m_legend_control;                                     // OpenLayers map control

// Map Click
var m_custom_map_clicked_callback,                        // A callback function to call when the map is clicked (if provided)
    m_show_clicks,                                        // Show points where user clicks on map when true
    m_points_clicked_layer;                               // The layer that contains the point click on map by user

// Serialize Map Data
var m_serialization_format,                               // Serialization format for serializing layer data
    m_textarea_target;                                    // Selector for the textarea target

// Options
var m_attribute_table_options,                            // Attribute table options json
    m_base_map_options,                                   // Base map options json
    m_controls_options,                                   // Controls options json
    m_draw_options,                                       // Draw options json
    m_layers_options,                                     // Layers options json
    m_legend_options,                                     // Legend options json
    m_view_options,                                       // View options json
    m_feature_selection_options,                          // Feature selection options json
    m_disable_base_map;                                   // Disable base map option json

/************************************************************************
 *                       PRIVATE METHOD DECLARATIONS
 *************************************************************************/
// Initialization Methods
 var ol_base_map_init, ol_base_map_switcher_init, ol_controls_init, ol_drawing_init, ol_layers_init, ol_legend_init,
     ol_map_init, ol_selection_interaction_init, ol_wms_feature_selection_init, ol_view_init, ol_custom_map_click_init, 
     parse_options, ol_initialize_all;

// Drawing Methods
var add_drawing_interaction, add_drag_box_interaction, add_drag_feature_interaction,
    add_delete_feature_interaction, add_modify_interaction, add_snap_interaction, add_feature_callback,
    draw_end_callback, draw_change_callback, delete_feature_callback, change_feature_callback,
    switch_interaction;

// Feature Parser Methods
var geojsonify, wellknowtextify, gcollection_to_fcollection;

// Attribute Table Methods
var initialize_feature_properties, generate_feature_id, get_feature_properties;

// Legend Methods
var clear_legend, new_legend_item, update_legend;

// Selectable Features Methods
var select_features_at_location, default_selected_feature_styler, highlight_selected_features, zoom_to_selection,
    jsonp_response_handler, override_selection_styler, selected_features_changed, select_features_by_attribute;
    
// Map Click
var map_clicked, set_map_on_click, clear_clicked_point, highlight_clicked_point;

// UI Management Methods
var update_field;

// Utility Methods
var is_defined, in_array, string_to_function, build_ol_objects, add_default_base_map_layer;

// Class Declarations
var DrawingControl, DragFeatureInteraction, DeleteFeatureInteraction;

 /************************************************************************
 *                    PRIVATE FUNCTION IMPLEMENTATIONS
 *************************************************************************/
/***********************************
 * Initialization Methods
 ***********************************/

var base_map_labels = [];
// Initialize the background map
ol_base_map_init = function()
{
  // Constants
  var SUPPORTED_BASE_MAPS = {
  'OpenStreetMap': {
      source_class: ol.source.OSM,
      default_source_options: {},
      label_property: null,
  },
  'Bing': {
      source_class: ol.source.BingMaps,
      default_source_options: null,
      label_property: 'imagerySet',
  },
  'Azure': {
    source_class: function(options) {
      options.url = 'https://atlas.microsoft.com/map/tile?api-version=2.0&tilesetId=' + 
          options.tilesetId + '&zoom={z}&x={x}&y={y}&subscription-key=' + 
          options.subscriptionKey;
      return new ol.source.XYZ(options);
    },
    label_property: 'layer',
  },
  'ESRI': {
      source_class: function(options){
          //ESRI_Imagery_World_2D (MapServer)
          //ESRI_StreetMap_World_2D (MapServer)
          //NatGeo_World_Map (MapServer)
          //NGS_Topo_US_2D (MapServer)
          //Ocean_Basemap (MapServer)
          //USA_Topo_Maps (MapServer)
          //World_Imagery (MapServer)
          //World_Physical_Map (MapServer)
          //World_Shaded_Relief (MapServer)
          //World_Street_Map (MapServer)
          //World_Terrain_Base (MapServer)
          //World_Topo_Map (MapServer)

          options.url = 'https://server.arcgisonline.com/ArcGIS/rest/services/' +
               options.layer + '/MapServer/tile/{z}/{y}/{x}';

          return new ol.source.XYZ(options);
      },
      default_source_options: {
          attributions: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/' +
                        'rest/services/World_Topo_Map/MapServer">ArcGIS</a>',
          layer: 'World_Street_Map'
      },
      label_property: 'layer',
  },
  'CartoDB': {
      source_class: function(options){
          var style,  // 'light' or 'dark'. Default is 'light'
              labels;  // true or false. Default is true.
          style = is_defined(options.style) ? options.style : 'light';
          labels = options.labels === false ? '_nolabels': '_all';

          options.url = 'http://{1-4}.basemaps.cartocdn.com/' + style + labels + '/{z}/{x}/{y}.png'

          return new ol.source.XYZ(options)
      },
      default_source_options: {
          style: 'light',
          labels: true,
      },
      label_property: 'style',
  },
  'XYZ': {
      source_class: ol.source.XYZ,
      default_source_options: {},
      label_property: null,
  },
}

  if (is_defined(m_disable_base_map) && m_disable_base_map) {
    return;
  }

  var ol_base_map_layer_init = function(base_map_layer_names, base_map_layer_arguments, visible) {
    let base_map_layer, base_map_layer_label;
    let layers = [], labels = [];
    for (let i = 0; i < base_map_layer_names.length; i++) {
      let layer_name = base_map_layer_names[i], argument = base_map_layer_arguments[i];
      if (Object.getOwnPropertyNames(SUPPORTED_BASE_MAPS).includes(layer_name)){
          var base_map_metadata = SUPPORTED_BASE_MAPS[layer_name];
          var LayerSource = base_map_metadata.source_class;
          var source_options = argument ? argument : base_map_metadata.default_source_options;
  
          let layer, label = layer_name;
  
          if(source_options){
            layer = new ol.layer.Tile({
              source: new LayerSource(source_options),
              visible: base_map_layer_names.length > 1 ? true : visible
            });
          }
  
          if (source_options && source_options.hasOwnProperty('control_label')) {
            label = source_options.control_label;
          }
          else if(base_map_metadata.label_property) {
            label += '-' + source_options[base_map_metadata.label_property];
          }
  
          layers.push(layer);
          labels.push(label);
      } else {
        console.warn('Unsupported base map: ' + layer_name);
      }
    }
    if (layers.length > 1) {
      base_map_layer = new ol.layer.Group({layers: layers, visible: visible});
      base_map_layer_label = labels.join('+');
    } else if (layers.length == 1) {
      base_map_layer = layers[0];
      base_map_layer_label = labels[0];
    } else {
      return null;
    }
    base_map_layer.tethys_legend_title = 'Basemap: ' + base_map_layer_label;
    base_map_labels.push(base_map_layer_label);
    return base_map_layer;
  }

  if (is_defined(m_base_map_options)) {
    var base_map_options = Array.isArray(m_base_map_options) ? m_base_map_options : [m_base_map_options]
    var first_flag = true;
    var valid_base_map_found = false;
    base_map_options.forEach(function (base_map_option) {
      var visible = false;
      if (first_flag) {
        visible = true;
        first_flag = false;
      }
      var base_map_layer_names = [], base_map_layer_arguments = [];

      if (typeof base_map_option === 'string') {
        base_map_layer_names.push(base_map_option);
        base_map_layer_arguments.push(null);
      }
      else if (typeof base_map_option === 'object'){
        // turn the base_map_option into an array of objects
        base_map_option = Array.isArray(base_map_option) ? base_map_option : [base_map_option];
        for (let option of base_map_option) {
          let layer_name = Object.getOwnPropertyNames(option)[0];
          base_map_layer_names.push(layer_name);
          base_map_layer_arguments.push(option[layer_name]);
        }
      }

      // Add the base map to layers
      let base_map_layer = ol_base_map_layer_init(base_map_layer_names, base_map_layer_arguments, visible);
      if (base_map_layer) {
        m_map.addLayer(base_map_layer);
        valid_base_map_found = true;
      }
      
    });
    if (!valid_base_map_found) {
      // Default base map
      add_default_base_map_layer();
    }
  }
  else{
      // Default base map
      add_default_base_map_layer();
  }
}

// Initialize the base map switcher
ol_base_map_switcher_init = function () {
  if (is_defined(base_map_labels)) {
//      var base_map_options = Array.isArray(m_base_map_options) ? m_base_map_options : [m_base_map_options]
    if (base_map_labels.length >= 1) {
      var $map_element = $('#' + m_map_target);
      var html = '<span class="dropdown ol-control" id="basemap_dropdown_container">' +
                 '<button class="btn btn-sm btn-light dropdown-toggle" title="Basemap" type="button" id="basemap_dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                 '<i class="bi bi-layers-fill"></i>' +
                 '</button>' +
                 '<ul class="dropdown-menu">' +
                 '<li class="basemap-option" value="None">None <span class="current-basemap-label"></span></li>';
      var first_flag = true;
      base_map_labels.forEach(function (val) {
        if (first_flag) {
          html += '<li class="basemap-option selected-basemap-option" value="' + val + '">' + val + ' <span class="current-basemap-label"> (Current)</span></li>';
          first_flag = false;
        } else {
          html += '<li class="basemap-option" value="' + val + '">' + val + ' <span class="current-basemap-label"></span></li>';
        }
      });

      html += '</ul></span>'

      $(html).insertBefore($map_element);

      // The function fired when a different basemap is selected from the drop-down
      var change_basemap = function () {
        var selected_base_map = $(this).attr('value');
        var base_map_label = 'Basemap: ' + selected_base_map;

        $('.current-basemap-label').text('');
        $('.basemap-option').removeClass('selected-basemap-option');
        $(this).addClass('selected-basemap-option');
        $($(this).children()[0]).text(' (Current)');

        m_map.getLayers().forEach(function (layer) {
          if (layer.hasOwnProperty('tethys_legend_title')) {
            if (layer.tethys_legend_title.indexOf('Basemap') !== -1) {
              layer.setVisible(layer.tethys_legend_title === base_map_label);
            }
          }
        });
      };

      // Listen for the basemap change event
      $('.basemap-option').on('click', change_basemap);

      // Add control to the map
      let basemap_control = new ol.control.Control({element: document.getElementById('basemap_dropdown_container')});
      m_map.addControl(basemap_control);
    }
  }
}

// Initialize the controls
ol_controls_init = function()
{
  // Constants
  var ZOOM_SLIDER = 'ZoomSlider',
      ROTATE = 'Rotate',
      ZOOM_EXTENT = 'ZoomToExtent',
      FULL_SCREEN = 'FullScreen',
      MOUSE_POSITION = 'MousePosition',
      SCALE_LINE = 'ScaleLine',
      OVERVIEW_MAP = 'OverviewMap';

  var controls;

  // Start with defaults
  controls = ol.control.defaults();

  if (is_defined(m_controls_options)) {
    for (var i = 0; i < m_controls_options.length; i++) {
      var current_control;

      current_control = m_controls_options[i];

      // Handle string case
      if (typeof current_control === 'string') {
        if (current_control === ZOOM_SLIDER) {
          m_map.addControl(new ol.control.ZoomSlider());
        }
        else if (current_control === ROTATE) {
          m_map.addControl(new ol.control.Rotate());
        }
        else if (current_control === ZOOM_EXTENT) {
          m_map.addControl(new ol.control.ZoomToExtent());
        }
        else if (current_control === FULL_SCREEN) {
          m_map.addControl(new ol.control.FullScreen());
        }
        else if (current_control === MOUSE_POSITION) {
          m_map.addControl(new ol.control.MousePosition());
        }
        else if (current_control === SCALE_LINE) {
          m_map.addControl(new ol.control.ScaleLine());
        }
        else if (current_control === OVERVIEW_MAP) {
          m_map.addControl(new ol.control.OverviewMap());
        }

      // Handle object case
      } else if (typeof current_control === 'object') {
        if (ZOOM_SLIDER in current_control){
          m_map.addControl(new ol.control.ZoomSlider(current_control[ZOOM_SLIDER]));
        }
        else if (ROTATE in current_control){
          m_map.addControl(new ol.control.Rotate(current_control[ROTATE]));
        }
        else if (FULL_SCREEN in current_control){
          m_map.addControl(new ol.control.FullScreen(current_control[FULL_SCREEN]));
        }
        else if (MOUSE_POSITION in current_control){
          m_map.addControl(new ol.control.MousePosition(current_control[MOUSE_POSITION]));
        }
        else if (SCALE_LINE in current_control){
          m_map.addControl(new ol.control.ScaleLine(current_control[SCALE_LINE]));
        }
        else if (OVERVIEW_MAP in current_control){
          m_map.addControl(new ol.control.OverviewMap(current_control[OVERVIEW_MAP]));
        }
        else if (ZOOM_EXTENT in current_control){
          var control_obj = current_control[ZOOM_EXTENT];

          // Transform coordinates to default CRS
          if ('projection' in control_obj && 'extent' in control_obj) {
            control_obj['extent'] = ol.proj.transformExtent(control_obj['extent'], control_obj['projection'], DEFAULT_PROJECTION);
            delete control_obj['projection'];
          }
          m_map.addControl(new ol.control.ZoomToExtent(control_obj));
        }
      }
    }
  }

  return controls;

};

// Initialize the drawing tools
ol_drawing_init = function()
{
  // Constants
////////////////////////////////////////// Color of annotation tools and Button Spacing ////////////////////////////////
  var VALID_GEOMETRY_TYPES = ['Polygon', 'Point', 'LineString', 'Box'];
  var VALID_CONTROL_TYPES = VALID_GEOMETRY_TYPES.concat(['Pan', 'Move', 'Delete', 'Modify']);
  var INITIAL_FILL_COLOR = 'rgba(255, 255, 255, 0.2)',
      INITIAL_STROKE_COLOR = '#ffcc33',
      INITIAL_POINT_FILL_COLOR = '#ffcc33',
      BUTTON_SPACING = 1.75,
      BUTTON_OFFSET_UNITS = 'em';

  var controls_added = [],
      button_left_offset = 4.5,
      initial_drawing_mode = 'Point';

  var initial_features_str, projection, format, proj_format, features = [];

  if (is_defined(m_draw_options)) {
    // Customize styles
    INITIAL_FILL_COLOR = m_draw_options.fill_color,
    INITIAL_STROKE_COLOR = m_draw_options.line_color,
    INITIAL_POINT_FILL_COLOR = m_draw_options.point_color;

    if (typeof m_draw_options.initial_features === 'string' || m_draw_options.initial_features instanceof String) {
      initial_features_str = m_draw_options.initial_features;
    }
    else if (m_draw_options.initial_features) {
      initial_features_str = JSON.stringify(m_draw_options.initial_features);
    }
    else {
      initial_features_str = "";
    }

    // Initialize the drawing layer
    m_drawing_source = new ol.source.Vector({wrapX: false});

    // Determine serialization format
    m_serialization_format = DEFAULT_FORMAT;

    if (is_defined(m_draw_options.output_format)) {
      m_serialization_format = m_draw_options.output_format;
    }

    // Load initial features
    if (is_defined(initial_features_str) && initial_features_str !== "") {
      
      if (m_serialization_format === GEOJSON_FORMAT) {
        format = new ol.format.GeoJSON();

        // Convert Geometry Collection to Feature Collection
        if (initial_features_str.includes("GeometryCollection")) {
          initial_features_str = gcollection_to_fcollection(initial_features_str);
        }

        // Determine projection
        proj_format = new ol.format.GeoJSON();
        projection = proj_format.readProjection(initial_features_str);

        // Read the features
        if (is_defined(projection)) {
          features = format.readFeatures(
            initial_features_str,
            {'dataProjection': projection, 'featureProjection': DEFAULT_PROJECTION}
          );
        } else {
          features = format.readFeatures(initial_features_str);
        }
      } else {
        proj_format = new ol.format.WKT();
        projection = proj_format.readProjection(initial_features_str);
        format = new ol.format.WKT();

        $.each(initial_features_str.features, function(index, feature) {
          var current_feature;
          if (is_defined(projection)) {
            current_feature = format.readFeatures(
              feature.wkt,
              {'dataProjection': projection, 'featureProjection': DEFAULT_PROJECTION}
            );
          } else {
            current_feature = format.readFeatures(feature.wkt);
          }

          features = features.concat(current_feature);
        });
      }

      // Add features to drawing layer source
      m_drawing_source.addFeatures(features);

      // Sync text field with initial features
      update_field();
    }

    m_drawing_layer = new ol.layer.Vector({
      source: m_drawing_source,
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: INITIAL_FILL_COLOR
        }),
        stroke: new ol.style.Stroke({
          color: INITIAL_STROKE_COLOR,
          width: 2
        }),
        image: new ol.style.Circle({
          radius: 4,
          fill: new ol.style.Fill({
            color: INITIAL_POINT_FILL_COLOR
          })
        }),
      })
    });

    // Add drawing layer legend properties
    m_drawing_layer.tethys_legend_title = m_draw_options.legend_title;
    m_drawing_layer.tethys_editable = true;
    m_drawing_layer.tethys_data = m_draw_options.data;

    // Add drawing layer to the map
    m_map.addLayer(m_drawing_layer);

    // Initialize drawing layer selection
    if (m_draw_options.feature_selection) {
      m_selectable_layers.push(m_drawing_layer);
    }

    // Define snapping target source
    m_snapping_source = m_drawing_source;
    var snapping_layer = m_draw_options.snapping_layer;
    var properties = Object.keys(snapping_layer);

    if (properties.length > 0) {
      var match_property = properties[0];
      var match_value = snapping_layer[match_property];

      m_map.getLayers().forEach(function(layer, index, layers) {
        var val = Object.byString(layer, match_property);

        if (val == match_value) {
          var source, params, layer, wms_url, wfs_url, wfs_url_func;
          source = layer.getSource();

          // Only do the voodoo if the source is a WMS type
          // With the goal to set the m_snapping_source
          if (source instanceof ol.source.ImageWMS || source instanceof ol.source.TileWMS) {
              // Get data from WMS source needed to make a WFS source
              params = source.getParams();
              layer = params.LAYERS;
              wms_url = source.getUrls()[0];

              // Convert the wfs url to a wms url
              wfs_url = wms_url.replace('wms', 'wfs');

              // Define the function used to load the WFS feature data
              wfs_url_func = function(extent) {
                  return wfs_url + '?service=WFS&' +
                      'version=1.1.0&' +
                      'request=GetFeature&' +
                      'typename=' + layer + '&' +
                      'outputFormat=application/json&' +
                      'srsname=EPSG:3857&' +
                      'bbox=' + extent.join(',') + ',EPSG:3857';
              }

              // Create a new vector source for the WFS version of the WMS layer
              m_snapping_source = new ol.source.Vector({
                  format: new ol.format.GeoJSON(),
                  url: wfs_url_func,
                  strategy: ol.loadingstrategy.bbox
              });

              // Add a new layer to contain the snapping vector layer, but style it to be transparent
              var snapping_layer = new ol.layer.Vector({
                  source: m_snapping_source,
                  style: new ol.style.Style({
                      stroke: new ol.style.Stroke({
                          color: 'rgba(0,0,0,0)',
                          width: 2
                      })
                  })
              });
              m_map.addLayer(snapping_layer);
          }
          else if (source instanceof ol.source.Vector) {
              m_snapping_source = source;
          }
          else {
              console.log("Invalid source type. Supported source types for a given layer are Vector or ImageWMS or TileWMS.");
          }
          //Don't continue searching for the snapping layer. Break out of the loop
          return false;
        }
      });
    }

    // Bind event
    m_drawing_source.on('addfeature', add_feature_callback);
    m_drawing_source.on('removefeature', delete_feature_callback);
    m_drawing_source.on('change', change_feature_callback);

    // Set initial drawing interaction
    if (is_defined(m_draw_options.initial) &&
        in_array(m_draw_options.initial, VALID_CONTROL_TYPES) &&
        is_defined(m_draw_options.controls) &&
        in_array(m_draw_options.initial, m_draw_options.controls))
    {
      initial_drawing_mode = m_draw_options.initial;
    }

    switch_interaction(initial_drawing_mode);

    // Add drawing controls to the map
    if (is_defined(m_draw_options.controls)) {
      var pan_control;
      var draw_controls = m_draw_options.controls;

      // Always add the pan_control
      pan_control = new DrawingControl({
        control_type: 'Pan',
        left_offset: button_left_offset.toString() + BUTTON_OFFSET_UNITS,
        active: initial_drawing_mode === 'Pan',
        control_id: "tethys_pan"
      });

      button_left_offset += BUTTON_SPACING;
      m_map.addControl(pan_control);

      // Add modify control first
      if (in_array('Modify', draw_controls)) {
        var modify_control;

        modify_control = new DrawingControl({
          control_type: 'Modify',
          left_offset: button_left_offset.toString() + BUTTON_OFFSET_UNITS,
          active: initial_drawing_mode === 'Modify',
          control_id: "tethys_modify"
        });


        button_left_offset += BUTTON_SPACING;
        m_map.addControl(modify_control);
      }

      // Add delete control
      if (in_array('Delete', draw_controls)) {
        var modify_control;

        modify_control = new DrawingControl({
          control_type: 'Delete',
          left_offset: button_left_offset.toString() + BUTTON_OFFSET_UNITS,
          active: initial_drawing_mode === 'Delete',
          control_id: "tethys_delete"
        });


        button_left_offset += BUTTON_SPACING;
        m_map.addControl(modify_control
        );
      }

      if (in_array('Move', draw_controls)) {
        var drag_feature_control;

        // Add drag feature control next
        drag_feature_control = new DrawingControl({
          control_type: 'Move',
          left_offset: button_left_offset.toString() + BUTTON_OFFSET_UNITS,
          active: initial_drawing_mode === 'Move',
          control_id: "tethys_move"
        });

        button_left_offset += BUTTON_SPACING;
        m_map.addControl(drag_feature_control);
      }

      // Add geometry controls
      for (var i = 0; i < draw_controls.length; i++) {

        var current_control_type = draw_controls[i];

        if (in_array(current_control_type, VALID_GEOMETRY_TYPES) && (!in_array(current_control_type, controls_added))) {
          var offset_string,
              new_control;

          var is_initial = false;

          // Convert offset to string
          offset_string = button_left_offset.toString() + BUTTON_OFFSET_UNITS;

          // Create new control
          if (current_control_type === initial_drawing_mode) {
            is_initial = true;
          }

          new_control = new DrawingControl({
            control_type: current_control_type,
            left_offset: offset_string,
            active: is_initial,
            control_id: "draw_" + current_control_type
          });

          m_map.addControl(new_control);

          // Stash and increment
          controls_added.push(current_control_type);
          button_left_offset += BUTTON_SPACING;
        }
      }
    }
  }
};

// Initialize the layers
ol_layers_init = function()
{
  // Constants
  var GEOJSON = 'GeoJSON',
      KML = 'KML';

  var TILE_SOURCES = ['TileDebug', 'TileUTFGrid', 'UrlTile', 'TileImage', 'VectorTile', 'BingMaps', 'TileArcGISRest',
                      'TileJSON', 'TileWMS', 'WMTS', 'XYZ', 'Zoomify', 'CartoDB', 'OSM'];

  var IMAGE_SOURCES = ['ImageArcGISRest', 'ImageCanvas', 'ImageMapGuide', 'ImageStatic', 'ImageWMS', 'ImageVector',
                       'Raster'];

  var VECTOR_SOURCES = ['GeoJSON', 'KML', 'Vector', 'Cluster'];

  var STYLE_MAP = {
      'fill'  : ol.style.Fill,
      'stroke': ol.style.Stroke,
      'text'  : ol.style.Text,
  };

  var STYLE_IMAGE_MAP = {
      'circle': ol.style.Circle,
  };

  if (is_defined(m_layers_options)) {
    for (var i = m_layers_options.length; i--; ) {
      var current_layer,
          layer, Source, current_layer_layer_options;
      var label_info;

      current_layer = m_layers_options[i];

      // Extract layer_options
      if ('layer_options' in current_layer && current_layer.layer_options) {
        // Process style layer options
        if ('style' in current_layer.layer_options) {
          var style = current_layer.layer_options.style;

          // Build the openlayers objects
          var built_style = build_ol_objects(style, {});

          // Overwrite style layer option with built objects
          current_layer.layer_options.style = built_style;
        }

        // Process style_map layer option
        if ('style_map' in current_layer.layer_options) {
          var style_map = current_layer.layer_options.style_map;
          delete current_layer.layer_options.style_map;

          // Build the openlayers objects
          var built_style_map = build_ol_objects(style_map, {});

          // Get the label info
          label_info = current_layer.layer_options.label_options;

          // Create the style map function, using the current context
          var style_map_function = (function(label_info) {
            var temp = function(feature) {
              if (label_info) {
                // Get the feature label value
                var label = feature.get(label_info.label_property, '');

                // Set up label style options
                var font = '12px Calibri,sans-serif';
                if (label_info.font) {
                  font = label_info.font;
                }
                var alignment = 'left';
                if (label_info.alignment) {
                  alignment = label_info.text_align;
                }
                var offset = 10;
                if (label_info.offset) {
                  offset = label_info.offset_x;
                }

                // Create label style
                const labelStyle = new ol.style.Style({
                  text: new ol.style.Text({
                    font: font,
                    overflow: true,
                    fill: new ol.style.Fill({
                      color: '#000',
                    }),
                    stroke: new ol.style.Stroke({
                      color: '#fff',
                      width: 3,
                    }),
                    offsetX: offset,
                    textAlign: alignment,
                  }),
                });

                // Set the label text
                labelStyle.getText().setText(label);

                // Return the build style map for the geometry type along with the label style
                return [built_style_map[feature.getGeometry().getType()], labelStyle];
              }

              // Return the build style map (without any labeling)
              return built_style_map[feature.getGeometry().getType()];
            };
            return temp;
          })(label_info);

          current_layer.layer_options['style'] = style_map_function;

          // Declutter if using labels
          if (label_info) {
            current_layer.layer_options.declutter = true;
          }
        }

        // Get updated layer options
        current_layer_layer_options = current_layer.layer_options;
      } else {
        current_layer_layer_options = {};
      }

      // Tile layer case
      if (in_array(current_layer.source, TILE_SOURCES)) {
        var resolutions, source_options, tile_grid;

        source_options = current_layer.options;

        if (source_options && 'tileGrid' in source_options) {
          source_options['tileGrid'] = new ol.tilegrid.TileGrid(source_options['tileGrid']);
        } else {
          // Define a default TileGrid that is the same as the default one generated for EPSG:3857 in GeoServer
          resolutions = [
            156543.03390625,
             78271.516953125,
             39135.7584765625,
             19567.87923828125,
              9783.939619140625,
              4891.9698095703125,
              2445.9849047851562,
              1222.9924523925781,
               611.4962261962891,
               305.74811309814453,
               152.87405654907226,
                76.43702827453613,
                38.218514137268066,
                19.109257068634033,
                 9.554628534317017,
                 4.777314267158508,
                 2.388657133579254,
                 1.194328566789627,
                 0.5971642833948135,
                 0.2985821416974068,
                 0.1492910708487034,
                 0.0746455354243517,
          ]

          // Create the tile grid
          source_options['tileGrid'] = new ol.tilegrid.TileGrid({
            extent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
            resolutions: resolutions,
            origin: [0, 0],
            tileSize: [256, 256],
          });
        }

        Source = string_to_function('ol.source.' + current_layer.source);
        current_layer_layer_options['source'] = new Source(source_options);
        layer = new ol.layer.Tile(current_layer_layer_options);
      }

      // Image layer case
      else if (in_array(current_layer.source, IMAGE_SOURCES)) {
        Source = string_to_function('ol.source.' + current_layer.source);
        current_layer_layer_options['source'] = new Source(current_layer.options);
        layer = new ol.layer.Image(current_layer_layer_options);
      }

      // Vector layer case
      else if (in_array(current_layer.source, VECTOR_SOURCES)) {

        // GeoJSON case
        if (current_layer.source === GEOJSON){
          var geojson_source, json, projection, format, features;

          json = current_layer.options;

          // Determine projection
          format = new ol.format.GeoJSON();
          projection = format.readProjection(json);

          // Read the features
          if (is_defined(projection)) {
            features = format.readFeatures(json, {'dataProjection': projection, 'featureProjection': DEFAULT_PROJECTION});
          } else {
            features = format.readFeatures(json);
          }

          geojson_source = new ol.source.Vector({
            features: features
          });

          current_layer_layer_options['source'] = geojson_source;
          layer = new ol.layer.Vector(current_layer_layer_options);
        }

        // KML case
        else if (current_layer.source === KML){
          // From URL case
          if (current_layer.options.hasOwnProperty('url')) {
            current_layer_layer_options['source'] = new ol.source.Vector({
              url: current_layer.options.url,
              format: new ol.format.KML(),
              projection: new ol.proj.get(DEFAULT_PROJECTION)
            });
            layer = new ol.layer.Vector(current_layer_layer_options);
          }

          // From string case
          else if (current_layer.options.hasOwnProperty('kml')) {
            var kml_source;

            kml_source = new ol.source.Vector({
              features: (new ol.format.KML()).readFeatures(current_layer.options.kml),
              projection: new ol.proj.get(DEFAULT_PROJECTION)
            });

            current_layer_layer_options['source'] = kml_source;
            layer = new ol.layer.Vector(current_layer_layer_options);
          }
        }

        // Generic vector case
        else {
          Source = string_to_function('ol.source.' + current_layer.source);
          current_layer_layer_options['source'] = new Source(current_layer.options);
          layer = new ol.layer.Vector(current_layer_layer_options);
        }
      }

      if (typeof layer !== typeof undefined) {
        // Set legend properties
        layer.tethys_legend_title = current_layer.legend_title;
        layer.tethys_legend_classes = current_layer.legend_classes;
        layer.tethys_legend_extent = current_layer.legend_extent;
        layer.tethys_legend_extent_projection = current_layer.legend_extent_projection;
        layer.tethys_editable = current_layer.editable;
        layer.tethys_data = current_layer.data;

        // Add layer to the map
        m_map.addLayer(layer);

        // Enable feature selection layers
        if (in_array(current_layer.source, ['ImageWMS', 'TileWMS'])) {
          if ('feature_selection' in current_layer && current_layer.feature_selection) {
            // add geometry attribute to layer properties for selection
            if('geometry_attribute' in current_layer && current_layer.geometry_attribute) {
                layer.setProperties({'geometry_attribute': current_layer.geometry_attribute});
            }
            else{
                layer.setProperties({'geometry_attribute': "the_geom"});
                console.log('WARNING: geometry_attribute undefined. Default value of "the_geom" used.')
            }
            // Push layer to m_selectable_wms_layers layers to enable selection
            m_selectable_wms_layers.push(layer);
          }
        } else {
          if ('feature_selection' in current_layer && current_layer.feature_selection) {
            // Push layer to m_selectable_layers to enable selection
            m_selectable_layers.push(layer);
          }
        }
      }
    }
  }
};

// Initialize the legend
ol_legend_init = function()
{
  if (is_defined(m_legend_options) && m_legend_options) {
    var legend_content;

    // Create the legend element
    m_legend_items = document.createElement('ul');
    m_legend_items.className = 'legend-items';

    legend_content = document.createElement('div');
    legend_content.className = 'legend-content';
    legend_content.appendChild(m_legend_items);

    m_legend_element = document.createElement('div');
    m_legend_element.className = 'tethys-map-view-legend ol-unselectable ol-control';
    m_legend_element.appendChild(legend_content);

    // Add legend element as a control on open layers map
    m_legend_control = new ol.control.Control({element: m_legend_element});
    m_legend_control.setMap(m_map);

    // Populate Legend
    update_legend();
  }
};


// Initialize the map
 ol_map_init = function()
{
  // Init Map
  m_map = new ol.Map({
    target: m_map_target,
    view: new ol.View({
      center: [0, 0],
      zoom: 2,
      minZoom: 0,
      maxZoom: 28
    })
  });
};

// Initialize the selectable layers
ol_wms_feature_selection_init = function()
{
  // Initialize the callback array always
  m_wms_feature_selection_changed_callbacks = [];

  // Only turn on feature selection if there are layers that support it.
  if (m_selectable_wms_layers.length > 0) {
      m_points_selected_layer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: default_selected_feature_styler,
      });
      m_points_selected_layer.setMap(m_map);

      m_lines_selected_layer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: default_selected_feature_styler,
      });
      m_lines_selected_layer.setMap(m_map);

      m_polygons_selected_layer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: default_selected_feature_styler,
      });
      m_polygons_selected_layer.setMap(m_map);

      // Bind the to the map onclick event
      set_map_on_click();
  }
};

ol_selection_interaction_init = function()
{
  m_select_interaction = null;
  // Create new selection interaction
  if (m_selectable_layers.length > 0) {
      //make layers selectable
      m_select_interaction = new ol.interaction.Select({
                                  layers: m_selectable_layers,
                              });

      // Add new drawing interaction to map
      m_map.addInteraction(m_select_interaction);
  }
};

// Initialize the map view
ol_view_init = function()
{
  // Declarations
  var view_json;

  // Get view settings from data attribute
  var $map_element = $('#' + m_map_target);
  view_json = $map_element.attr('data-view');

  if (typeof view_json !== typeof undefined && view_json !== false) {
    var view_obj;

    view_obj = JSON.parse(view_json);

    if ('extent' in view_obj && view_obj.extent && 'projection' in view_obj) {
      let t_extent = ol.proj.transformExtent(view_obj.extent, view_obj.projection, DEFAULT_PROJECTION);
      let view = m_map.getView();
      view.setMaxZoom(view_obj.maxZoom);
      view.setMinZoom(view_obj.minZoom);
      view.fit(t_extent, m_map.getSize());
    } else if ('center' in view_obj && view_obj.center && 'projection' in view_obj) {
      view_obj.center = ol.proj.transform(view_obj.center, view_obj.projection, DEFAULT_PROJECTION);
      delete view_obj.extent;
      delete view_obj.projection;
      m_map.setView(new ol.View(view_obj));
    }
  }

  // Change size of the map when the map element size changes
  $map_element.changeSize(function($this){
    m_map.updateSize();
  });

};

ol_custom_map_click_init = function()
{
  if (m_show_clicks && is_defined(m_custom_map_clicked_callback)) {
    // Initialize layer for drawing clicked point
    m_points_clicked_layer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: default_selected_feature_styler,
    });
    m_points_clicked_layer.setMap(m_map);
    set_map_on_click();
  }
};

parse_options = function()
{
  var $map_element = $('#' + m_map_target);

  // Read attributes
  m_attribute_table_options = $map_element.data(ATTRIBUTE_TABLE_DATA);
  m_base_map_options = $map_element.data(BASE_MAP_DATA);
  m_controls_options = $map_element.data(CONTROLS_DATA);
  m_draw_options = $map_element.data(DRAW_DATA);
  m_layers_options = $map_element.data(LAYERS_DATA);
  m_legend_options = $map_element.data(LEGEND_DATA);
  m_view_options = $map_element.data(VIEW_DATA);
  m_disable_base_map = $map_element.data(DISABLE_BASE_MAP_DATA);
  m_feature_selection_options = $map_element.data(FEAT_SELECTION_DATA);
  m_show_clicks = $map_element.data(SHOW_CLICKS_DATA);
};

ol_initialize_all = function() {
  // Map container selector
  m_map_target = 'map_view';
  m_textarea_target = 'map_view_geometry';
  m_selectable_layers = [];
  m_selectable_wms_layers = [];
  m_zoom_on_selection = false;

  // Parse options
  parse_options();

  // Initialize the map
  ol_map_init();

  // Initialize Controls
  ol_controls_init();

  // Initialize Base Map
  ol_base_map_init();

  // Initialize Base Map Switcher
  ol_base_map_switcher_init();

  // Initialize Layers
  ol_layers_init();

  // Initialize WMS Selectable Features
  ol_wms_feature_selection_init();

  // Initialize Drawing
  ol_drawing_init();

  // Initialize Selectable Features
  ol_selection_interaction_init();

  // Initialize View
  ol_view_init();

  // Initialize Legend
  ol_legend_init();

  // Initialize tooltips
  $('[data-toggle="tooltip"]').tooltip();
};

/***********************************
 * Drawing Methods
 ***********************************/
add_drawing_interaction = function(geometry_type) {
  // Create new drawing interaction
  m_drawing_interaction = new ol.interaction.Draw({
    source: m_drawing_source,
    type: geometry_type
  });

  // Bind events to the interaction
  m_drawing_interaction.on('drawend', function(event) {
    draw_end_callback(event.feature);
  });

  // Add new drawing interaction to map
  m_map.addInteraction(m_drawing_interaction);
};

add_drag_box_interaction = function() {
  // Add a drag box interaction
  m_drag_box_interaction = new ol.interaction.DragBox({
    condition: ol.events.condition.noModifierKeys,
    style: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#0099ff',
        width: 3
      })
    })
  });

  // Capture bounds and add to drawn feature layer on drag box end
  m_drag_box_interaction.on('boxend', function(event){
    var extent, feature;

    // Get extent of bounding box
    extent = this.getGeometry().getExtent();

    // Create a new feature with extent
    feature = new ol.Feature({
      geometry: new ol.geom.Polygon.fromExtent(extent)
    });

    // Add feature to drawing layer
    m_drawing_source.addFeature(feature);

    // Call draw end callback
    draw_end_callback(feature);

    m_select_interaction.getFeatures().push(feature);
    m_select_interaction.dispatchEvent({
      type: 'select',
      selected: [feature]
    });
  });

  m_map.addInteraction(m_drag_box_interaction);

};

add_drag_feature_interaction = function() {
  // Add Drag feature interaction
  m_drag_feature_interaction = new DragFeatureInteraction();
  m_map.addInteraction(m_drag_feature_interaction);
};

add_delete_feature_interaction = function() {
  // Add delete feature interaction
  m_delete_feature_interaction = new DeleteFeatureInteraction();
  m_map.addInteraction(m_delete_feature_interaction);
};

add_snap_interaction = function() {
  // Add snap interaction
  var snap_options = {source: m_snapping_source};
  snap_options = Object.assign(snap_options, m_draw_options.snapping_options);
  m_snap_interaction = new ol.interaction.Snap(snap_options);
  m_map.addInteraction(m_snap_interaction);
};

add_modify_interaction = function() {
  // Modify interaction works in conjunction with a selection interaction
  var selected_features = null;

  // Create select interaction
  m_modify_select_interaction = new ol.interaction.Select({
      layers: function(layer){
          if (layer.tethys_editable){
              return layer
          }
      },
  });
  m_map.addInteraction(m_modify_select_interaction);

  // Get selected features
  selected_features = m_modify_select_interaction.getFeatures();

  // Create modify interaction
  m_modify_interaction = new ol.interaction.Modify({
    features: selected_features,
    deleteCondition: function(event) {
      return ol.events.condition.shiftKeyOnly(event) && ol.events.condition.singleClick(event);
    }
  });
  m_map.addInteraction(m_modify_interaction);
};

add_feature_callback = function(feature) {
  // Update the field
  update_field();
};

delete_feature_callback = function(feature){
  // Update the hidden text field
  update_field();
};

change_feature_callback = function(feature){
  // Update the hidden text field
  update_field();
};

draw_end_callback = function(feature) {
  // Initialize the feature properties
  initialize_feature_properties(feature);

  // Bind change event to new feature
  feature.on('change', draw_change_callback);

  // Update the field
  update_field();
  update_legend();
};

draw_change_callback = function(event) {
  update_field();
};

switch_interaction = function(interaction_type)
{
  // Remove all interactions
  m_map.removeInteraction(m_drawing_interaction);
  m_map.removeInteraction(m_modify_select_interaction);
  m_map.removeInteraction(m_modify_interaction);
  m_map.removeInteraction(m_drag_feature_interaction);
m_map.removeInteraction(m_delete_feature_interaction);
  m_map.removeInteraction(m_drag_box_interaction);
  m_map.removeInteraction(m_snap_interaction);

  // Set appropriate drawing interaction
  if (interaction_type === 'Pan') {
    // Do nothing
  } else if (interaction_type === 'Modify') {
    add_modify_interaction();
  } else if (interaction_type === 'Move') {
    add_drag_feature_interaction();
  } else if (interaction_type === 'Delete') {
    add_delete_feature_interaction();
  } else if (interaction_type === 'Box') {
    add_drag_box_interaction();
  } else {
    add_drawing_interaction(interaction_type);
  }

  if (m_draw_options.snapping_enabled) {
      add_snap_interaction();
  }
};

/***********************************
 * Feature Parser Methods
 ***********************************/
geojsonify = function()
{
  var features, geometry_collection;

  // Get the features
  features = m_drawing_source.getFeatures();

  if (features.length == 0)
  {
      return "";
  }

  // Setup geometry collection
  geometry_collection = {'type': 'GeometryCollection',
                         'geometries': []};

  features.forEach(function(feature){
    var geojson, crs, coordinates, properties,
        geometry, map_crs, geom_type;

    // Clone geometry so transformation doesn't affect features on the map
    geometry = feature.getGeometry().clone();
    geom_type = geometry.getType();

    // Transform the CRS to standard Lat-Long: EPSG-4326
    map_crs = m_map.getView().getProjection();
    geometry = geometry.transform(map_crs, 'EPSG:4326');

    // Get coordinates
    coordinates = geometry.getCoordinates();

    // Create CRS
    crs = {
      type: 'link',
      properties: {
         href: 'http://spatialreference.org/ref/epsg/4326/proj4/',
         type: 'proj4'
      }
    };

    // Parse Properties
    properties = get_feature_properties(feature);

    // Formulate GeoJSON
    geojson = {
      type: geom_type,
      coordinates: coordinates,
      properties: properties,
      crs: crs
    };

    geometry_collection.geometries.push(geojson);
  });

  return geometry_collection;
};

wellknowtextify = function()
{
  var features, geometry_collection;

  // Get the features
  features = m_drawing_source.getFeatures();

  if (features.length == 0)
  {
      return "";
  }

  // Setup geometry collection
  geometry_collection = {'type': 'GeometryCollection',
                         'geometries': []};

  features.forEach(function(feature){
    var wktjson, wkt, crs, coordinates, properties,
        geometry, map_crs, geom_type;

    // Clone geometry so transformation doesn't affect features on the map
    geometry = feature.getGeometry().clone();
    geom_type = geometry.getType();

    // Transform the CRS to standard Lat-Long: EPSG-4326
    map_crs = m_map.getView().getProjection();
    geometry = geometry.transform(map_crs, 'EPSG:4326');

    // Get coordinates
    coordinates = geometry.getCoordinates();

    // Assemble well know text parameters
    wkt = '';

    if (geom_type === 'Point') {
      wkt = 'POINT(' + coordinates[0] + ' ' + coordinates[1] + ')';

    } else if (geom_type === 'Polygon') {
      var first_coordinate = geometry.getFirstCoordinate();
      wkt = 'POLYGON((';

      for (var i = 0; i < coordinates[0].length; i++) {
        var pair = coordinates[0][i];
        wkt += pair[0] + ' ' + pair[1] + ', ';
      }

      wkt += (first_coordinate[0] + ' ' + first_coordinate[1] + '))');

    } else if (geom_type === 'LineString') {
      var pairs = [];

      wkt = 'POLYLINE(';

      for (var i = 0; i < coordinates.length; i++) {
        var pair = coordinates[i];
        var wkt_pair = pair[0] + ' ' + pair[1];
        pairs.push(wkt_pair);
      }

      wkt += pairs.join(', ') + ')';
    }

    // Create CRS
    crs = {
      type: 'link',
      properties: {
         href: 'http://spatialreference.org/ref/epsg/4326/proj4/',
         type: 'proj4'
      }
    };

    // Parse Properties
    properties = get_feature_properties(feature);

    // Formulate WKT JSON
    wktjson = {
      type: geom_type,
      wkt: wkt,
      properties: properties,
      crs: crs
    };

    geometry_collection.geometries.push(wktjson);
  });

  return geometry_collection;
};

gcollection_to_fcollection = function(geojson_str) {
  // Convert GeometryCollection geojson string to FeatureCollection geojson string
  let geometry_collection = JSON.parse(geojson_str);

  // Stub out the FeatureCollection
  let feature_collection = {
    "type": "FeatureCollection",
    "features": [],
  }

  // Set CRS on FeatureCollection if defined on the GeometryCollection
  if (geometry_collection.hasOwnProperty("crs")) {
    feature_collection.crs = geometry_collection.crs;
  }

  // Convert each geometry to a Feature
  for (let geometry of geometry_collection.geometries) {
    let feature = {
      "type": "Feature",
      "geometry": {
        "type": geometry.type,
        "coordinates": geometry.coordinates,
      }
    };

    // Add properties if they are present
    if (geometry.hasOwnProperty("properties")) {
      feature.properties = geometry.properties;
    }

    // Add to the FeatureCollection
    feature_collection.features.push(feature);
  }

  return JSON.stringify(feature_collection);
};

/***********************************
 * Attribute Table Methods
 ***********************************/
generate_feature_id = function() {
  //// return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  var uuid = '', ii;
  for (ii = 0; ii < 32; ii += 1) {
    switch (ii) {
    case 8:
    case 20:
      uuid += '-';
      uuid += (Math.random() * 16 | 0).toString(16);
      break;
    case 12:
      uuid += '-';
      uuid += '4';
      break;
    case 16:
      uuid += '-';
      uuid += (Math.random() * 4 | 8).toString(16);
      break;
    default:
      uuid += (Math.random() * 16 | 0).toString(16);
    }
  }
  return uuid;
};

get_feature_properties = function(feature) {
  var feature_properties, properties;

  properties = {id: feature.getId()};
  feature_properties = feature.getProperties();

  for (var property in feature_properties) {
    if (property != 'geometry') {
      properties[property] = feature_properties[property];
    }
  }

  return properties;
};

initialize_feature_properties = function(feature) {
  // Set the id
  let feature_id = 'drawing_layer.' + generate_feature_id();
  feature.setId(feature_id);

  // Initialize with properties and defaults provided
  //feature.setProperties({
  //  'prop1': 1,
  //  'prop2': 'cool'
  //});
};

/***********************************
 * Legend Methods
 ***********************************/
clear_legend = function() {
  // Clear legend elements
  while (m_legend_items.firstChild) {
    m_legend_items.removeChild(m_legend_items.firstChild);
  }

  // Clear menu items
  $('.tethys-map-view-dropdown').each(function() {
    $(this).remove();
  });
};

new_legend_item = function(layer) {
  // Declare Vars
  var html, last_item, title,
      opacity_control, display_control, zoom_control, menu_toggle_control,
      legend_classes, init_display_control_text;

  if (layer.hasOwnProperty('tethys_legend_title')) {
    title = layer.tethys_legend_title;
  } else {
    title = 'Untitled';
  }

  if (layer.getVisible()) {
    init_display_control_text = 'Hide Layer';
  } else {
    init_display_control_text = 'Show Layer';
  }

  html =  '<li class="legend-item">' +
            '<div class="legend-buttons">' +
              '<a class="btn btn-light btn-legend-action zoom-control" title="' + title + '">' + title + '</a>' +
              '<a class="btn btn-light legend-dropdown-toggle">' +
                '<i class="bi bi-caret-down-fill"></i>' +
                '<span class="visually-hidden">Toggle Dropdown</span>' +
              '</a>' +
              '<div class="tethys-legend-dropdown">' +
                '<ul>' +
                  '<li><a class="opacity-control">' +
                    '<span>Opacity</span> ' +
                    '<input type="range" min="0.0" max="1.0" step="0.01" value="' + layer.getOpacity() + '">' +
                  '</a></li>' +
                  '<li><a class="display-control" href="javascript:void(0);">' + init_display_control_text + '</a></li>' +
                '</ul>' +
              '</div>' +
            '</div>';

  // Append the legend classes if applicable
  legend_classes = layer.tethys_legend_classes;

  if (legend_classes) {
    html += '<div class="legend-item-classes"><ul>';

    // Create SVG symbols for legend
    for (var i = 0; i < legend_classes.length; i++) {
      var legend_class;

      legend_class = legend_classes[i];

      html += '<li class="legend-class ' + legend_class.type + '">';
      if (legend_class.LEGEND_TYPE === "mvlegendimage") {
          html += '<div class="tethys-mvlegendimage tethys-legend-dropdown">' +
                  '<ul>' +
                    '<li><span class="legend-class-symbol">' + legend_class.value + '</span>' +
                        '<span class="legend-class-value"><img src="' + legend_class.image_url + '"></span>' +
                    '</li>' +
                  '</ul>' +
                  '</div>';
      } else if (legend_class.LEGEND_TYPE === "mvlegend") {
          html += '<span class="legend-class-symbol">';
          if (legend_class.type === legend_class.POINT_TYPE) {
            html += '<svg><circle cx="10" cy="10" r="25%" fill="' + legend_class.fill + '"/></svg>';
          }

          else if (legend_class.type === legend_class.LINE_TYPE) {
            html += '<svg><polyline points="19 1, 1 6, 19 14, 1 19" stroke="' + legend_class.stroke + '" fill="transparent" stroke-width="2"/></svg>';
          }

          else if (legend_class.type === legend_class.POLYGON_TYPE) {
            html += '<svg><polygon points="1 10, 5 3, 13 1, 19 9, 14 19, 9 13" stroke="' + legend_class.stroke + '" fill="' + legend_class.fill + '" stroke-width="2"/></svg>';
          }
          else if (legend_class.type === legend_class.RASTER_TYPE) {
              for (var j = 0; j < legend_class.ramp.length; j++) {
                  html += '<svg><rect width="20" height="20" fill=' + legend_class.ramp[j] + '/></svg>';
              }
          }

          html += '</span><span class="legend-class-value">' + legend_class.value + '</span>';
      }
    }

    html += '</li>';
  }

  // Close li.legend-item
  html += '</ul></div>';

  // Append to the legend items
  $(m_legend_items).append(html);

  // Bind events for controls
  last_item = $(m_legend_items).children(':last-child');
  menu_toggle_control = $(last_item).find('.legend-dropdown-toggle');
  opacity_control = $(last_item).find('.opacity-control input[type=range]');
  display_control = $(last_item).find('.display-control');
  zoom_control = $(last_item).find('.zoom-control');

  // Bind toggle control
  menu_toggle_control.on('click', function(){
    var dropdown_menu = $(last_item).find('.tethys-legend-dropdown');
    dropdown_menu.toggleClass('open');
  });

  // Bind Opacity Control
  opacity_control.on('input', function() {
    layer.setOpacity(parseFloat(this.value));
  });

  // Bind Display Control
  display_control.on('click', function() {
    if (layer.getVisible()){
      layer.setVisible(false);
      $(this).html('Show Layer');
    } else {
      layer.setVisible(true);
      $(this).html('Hide Layer');
    }
  });

  // Bind Zoom to Layer Control
  zoom_control.on('click', function() {
    var extent;

    extent = layer.tethys_legend_extent;

    if (is_defined(extent)) {
      var lat_lon_extent = ol.proj.transformExtent(extent, layer.tethys_legend_extent_projection, DEFAULT_PROJECTION);
      m_map.getView().fit(lat_lon_extent, m_map.getSize());
    }
  });
};

update_legend = function() {
  if (is_defined(m_legend_options) && m_legend_options) {
    var layers;

    // Clear the legend items
    clear_legend();

    // Get current layers from the map
    layers = m_map.getLayers();

    for (var i = layers.getLength(); i--; ) {
      new_legend_item(layers.item(i));
    }

    // Activate the drop down menus
    $('.dropdown-toggle').dropdown();
  }
};

/***********************************
 * Selectable Features Methods
 ***********************************/
select_features_at_location = function(x, y, event = null) {
  var urls, tolerance, multiselect, sensitivity;
  urls = [];
  sensitivity = DEFAULT_SENSITIVITY;

  // Get custom sensitivity and compute tolerance
  if (is_defined(m_feature_selection_options) && 'sensitivity' in m_feature_selection_options) {
    sensitivity = m_feature_selection_options.sensitivity;
  }
  tolerance = m_map.getView().getResolution() * sensitivity;

  // Determine if multiselect applies
  multiselect = false;
  if (is_defined(m_feature_selection_options) &&
      'multiselect' in m_feature_selection_options &&
      m_feature_selection_options.multiselect &&
      event && ol.events.condition.shiftKeyOnly(event)) {
      multiselect = true;
  }

  // Clear current selection
  if (!multiselect) {
    m_points_selected_layer.getSource().clear();
    m_lines_selected_layer.getSource().clear();
    m_polygons_selected_layer.getSource().clear();
  }
  if (selected_features_changed) {
    selected_features_changed(m_points_selected_layer, m_lines_selected_layer, m_polygons_selected_layer);
  }

  for (var i = 0; i < m_selectable_wms_layers.length; i++) {
    var source, wms_url, url, layer, layer_params, layer_name, layer_view_params, geometry_attribute;
    var bbox, cql_filter;

    // Don't select if not visible
    layer = m_selectable_wms_layers[i];
    if (!layer.getVisible()) { continue; }
    // Check for undefined source or non-WMS layers before proceeding
    source = layer.getSource();
    if (!(source && ('getGetFeatureInfoUrl' in source || 'getFeatureInfoUrl' in source))) { continue; }

    //get geometry_attribute from the layer
    geometry_attribute = layer.getProperties().geometry_attribute;
    // URL Params
    bbox = '{{minx}}%2C{{miny}}%2C{{maxx}}%2C{{maxy}}'
    bbox = bbox.replace('{{minx}}', x - tolerance);
    bbox = bbox.replace('{{miny}}', y - tolerance);
    bbox = bbox.replace('{{maxx}}', x + tolerance);
    bbox = bbox.replace('{{maxy}}', y + tolerance);
    cql_filter = '&CQL_FILTER=BBOX(' + geometry_attribute + '%2C' + bbox + '%2C%27EPSG%3A3857%27)';
    layer_params = source.getParams();
    layer_name = layer_params.LAYERS.replace('_group', '');
    layer_view_params = layer_params.VIEWPARAMS ? layer_params.VIEWPARAMS : '';

    if (source instanceof ol.source.ImageWMS) {
      wms_url = source.getUrl();
    }
    else if (source instanceof ol.source.TileWMS) {
      var tile_urls = source.getUrls();
      if (tile_urls.length > 0) {
        wms_url = tile_urls[0];
      }
    }

    url = wms_url.replace('wms', 'wfs')
        + '?SERVICE=wfs'
        + '&VERSION=2.0.0'
        + '&REQUEST=GetFeature'
        + '&TYPENAMES=' + layer_name
        + '&VIEWPARAMS=' + layer_view_params
        + '&OUTPUTFORMAT=text/javascript'
        + '&FORMAT_OPTIONS=callback:TETHYS_MAP_VIEW.jsonResponseHandler;'
        + '&SRSNAME=' + DEFAULT_PROJECTION
        + cql_filter;

    if (!multiselect)
    {
      url += '&COUNT=1';
    }
    urls.push(url);
  }

  // Get the features if applicable
  for (var j = 0; j < urls.length; j++) {
    $.ajax({
      url: urls[j],
      dataType: 'jsonp',
      context: {'multiselect': multiselect},
    });
  }
};

default_selected_feature_styler = function(feature, resolution) {
  var image, styles;

  image = new ol.style.Circle({
    radius: 5,
    fill: new ol.style.Fill({
      color: '#7300e5'
    }),
    stroke: new ol.style.Stroke({
      color: 'white',
      width: 1
    })
  });

  styles = {
    'Point': [new ol.style.Style({
      image: image
    })],
    'MultiPoint': [new ol.style.Style({
      image: image
    })],
    'LineString': [new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#7300e5',
        width: 3
      })
    })],
    'MultiLineString': [new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#7300e5',
        width: 3
      })
    })],
    'Polygon': [new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#7300e5',
        width: 3
      }),
      fill: new ol.style.Fill({
        color: 'rgba(115, 0, 229, 0.1)'
      })
    })],
    'MultiPolygon': [new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#7300e5',
        width: 3
      }),
      fill: new ol.style.Fill({
        color: 'rgba(115, 0, 229, 0.1)'
      })
    })]
  }

  return styles[feature.getGeometry().getType()];
};

selected_features_changed = function(points, lines, polygons) {
  for (var i = 0; i < m_wms_feature_selection_changed_callbacks.length; i++) {
    var callback = m_wms_feature_selection_changed_callbacks[i];
    callback(points, lines, polygons);
  }
};

highlight_selected_features = function(geojson) {
  var points_source, lines_source, polygons_source;
  var features, curr_features;
  var incoming_type;
  var points, lines, polygons;

  // Don't highlight if there is nothing to show
  if (!is_defined(geojson) ||
     ('totalFeatures' in geojson && geojson.totalFeatures <= 0)) {
    return;
  }

  incoming_type = geojson.features[0].geometry.type;

  // Get sources
  points_source = m_points_selected_layer.getSource();
  lines_source = m_lines_selected_layer.getSource();
  polygons_source = m_polygons_selected_layer.getSource();

  // Valid Geometries
  points = ['Point', 'MultiPoint'];
  lines = ['LineString', 'MultiLineString'];
  polygons = ['Polygon', 'MultiPolygon'];

  // Parse the Features
  features = (new ol.format.GeoJSON()).readFeatures(geojson);

  if (in_array(incoming_type, points)) {
    points_source.addFeatures(features);
  }
  else if (in_array(incoming_type, lines)) {
    lines_source.addFeatures(features);
  }
  else if (in_array(incoming_type, polygons)) {
    polygons_source.addFeatures(features);
  }

  // Hide lines if a point is selected (to allow selection of nodes that fall on a line)
  if (points_source && lines_source && points_source.getFeatures().length > 0) {
    lines_source.clear();
  }

  // Hide lines if a point is selected (to allow selection of nodes that fall on a polygon)
  if (points_source && polygons_source && points_source.getFeatures().length > 0) {
    polygons_source.clear();
  }
};

zoom_to_selection = function(geojson) {
  if (!is_defined(geojson)) {
    return;
  }
  var total_features, features, min_x, min_y, max_x, max_y, feature_extent, zoom_buffer,
      selection_type;
  zoom_buffer = 50;
  total_features = geojson.totalFeatures;

  if (total_features > 0 && total_features <= 20) {
      features = geojson.features;
      selection_type = features[0].geometry.type;
      if (selection_type == 'Point') {
          min_x = features[0].geometry.coordinates[0];
          max_x = min_x;
          min_y = features[0].geometry.coordinates[1];
          max_y = min_y;
      } else if (selection_type == 'LineString' || selection_type == 'MultiPoint') {
          min_x = features[0].geometry.coordinates[0][0];
          max_x = min_x;
          min_y = features[0].geometry.coordinates[0][1];
          max_y = min_y;
          for (var i = 0; i < total_features; i++) {
              for (var j = 0; j < features[i].geometry.coordinates.length; j++) {
                  if (features[i].geometry.coordinates[j][0] < min_x) {
                      min_x = features[i].geometry.coordinates[j][0];
                  }
                  if (features[i].geometry.coordinates[j][0] > max_x) {
                      max_x = features[i].geometry.coordinates[j][0];
                  }
                  if (features[i].geometry.coordinates[j][1] < min_y) {
                      min_y = features[i].geometry.coordinates[j][1];
                  }
                  if (features[i].geometry.coordinates[j][1] > max_y) {
                      max_y = features[i].geometry.coordinates[j][1];
                  }
              }
          }
      } else if (selection_type == 'Polygon' || selection_type == 'MultiLineString') {
          min_x = features[0].geometry.coordinates[0][0][0];
          max_x = min_x;
          min_y = features[0].geometry.coordinates[0][0][1];
          max_y = min_y;
          for (var i = 0; i < total_features; i++) {
              for (var j = 0; j < features[i].geometry.coordinates.length; j++) {
                  for (var k = 0; k < features[i].geometry.coordinates[j].length; k++) {
                      if (features[i].geometry.coordinates[j][k][0] < min_x) {
                          min_x = features[i].geometry.coordinates[j][k][0];
                      }
                      if (features[i].geometry.coordinates[j][k][0] > max_x) {
                          max_x = features[i].geometry.coordinates[j][k][0];
                      }
                      if (features[i].geometry.coordinates[j][k][1] < min_y) {
                          min_y = features[i].geometry.coordinates[j][k][1];
                      }
                      if (features[i].geometry.coordinates[j][k][1] > max_y) {
                          max_y = features[i].geometry.coordinates[j][k][1];
                      }
                  }
              }
          }
      }

      if (Math.abs(max_x - min_x) < 111.13175 || Math.abs(max_y - min_y) < 111.13175) {
          min_x = min_x - 111.13175;
          max_x = max_x + 111.13175;
          min_y = min_y - 111.13175;
          max_y = max_y + 111.13175;
      }

      // Add in the buffer;
      min_x = min_x - zoom_buffer;
      max_x = max_x + zoom_buffer;
      min_y = min_y - zoom_buffer;
      max_y = max_y + zoom_buffer;

      feature_extent = [min_x, min_y, max_x, max_y];

      m_map.getView().fit(feature_extent, m_map.getSize());
  }
};

jsonp_response_handler = function(data) {
  // Process response
  highlight_selected_features(data);

  // Handle zooming to selection
  if (m_zoom_on_selection) {
    zoom_to_selection(data);
  }

  // Call Features Changed Method
  if (selected_features_changed) {
    selected_features_changed(m_points_selected_layer, m_lines_selected_layer, m_polygons_selected_layer);
  }
};

override_selection_styler = function(type, styler) {
  // Set styler for selection layers
  if (type === 'points' && m_points_selected_layer) {
    m_points_selected_layer.setStyle(styler);
  }
  else if (type === 'lines' && m_lines_selected_layer) {
    m_lines_selected_layer.setStyle(styler);
  }
  else if (type === 'polygons' && m_polygons_selected_layer) {
    m_polygons_selected_layer.setStyle(styler);
  }
};

select_features_by_attribute =  function(layer_name, attribute_name, attribute_value, zoom_on_selection) {
  if (typeof zoom_on_selection === 'undefined') {
      zoom_on_selection = true;
  }
  for (var i = 0; i < m_selectable_wms_layers.length; i++) {
    var source, wms_url, url, layer, source_params, layer_view_params;
    var cql_filter;
    m_zoom_on_selection = zoom_on_selection;

    // Don't select if not visible
    layer = m_selectable_wms_layers[i];
    if (!layer.getVisible()) { continue; }
    // Check for undefined source or non-WMS layers before proceeding
    source = layer.getSource();
    if (!(source && ('getGetFeatureInfoUrl' in source || 'getFeatureInfoUrl' in source))) { continue; }
    source_params = source.getParams();
    if (source_params.LAYERS == layer_name) {
      if (source instanceof ol.source.ImageWMS) {
        wms_url = source.getUrl();
      }
      else if (source instanceof ol.source.TileWMS) {
        var tile_urls = source.getUrls();
        if (tile_urls.length > 0) {
          wms_url = tile_urls[0];
        }
      }

      // Check for multiple attribute values contained in single string
      if (attribute_value.indexOf(',') !== -1){
        attribute_value = attribute_value.split(',');
        // Generate cql_filter for multi-value queries
        // Assumes multi-values enter function as one string with commas separating the values
        cql_filter = '&cql_filter=' + attribute_name + '=%27' + attribute_value[0] + '%27';
        for (var i = 1; i < attribute_value.length; i++) {
          cql_filter += ' OR ' + attribute_name + '=%27' + attribute_value[i] + '%27';
        }
      } else {
        // Generate cql_filter for single value queries
        cql_filter = '&cql_filter=' + attribute_name + '=%27' + attribute_value + '%27';
      }

      layer_view_params = source_params.VIEWPARAMS ? source_params.VIEWPARAMS : '';

      // Create callback url
      url = wms_url.replace('wms', 'wfs')
            + '?SERVICE=wfs'
            + '&VERSION=2.0.0'
            + '&REQUEST=GetFeature'
            + '&TYPENAMES=' + layer_name.replace('_group', '')
            + '&VIEWPARAMS=' + layer_view_params
            + '&OUTPUTFORMAT=text/javascript'
            + '&FORMAT_OPTIONS=callback:TETHYS_MAP_VIEW.jsonResponseHandler;'
            + '&SRSNAME=' + DEFAULT_PROJECTION
            + cql_filter;

      // Get the features if applicable
      $.ajax({
        url: url,
        dataType: 'jsonp',
      });
    }
  }
};

// Map Click
set_map_on_click = function() {
  // Un-set the single click binding to map_clicked just in case it is already set to avoid setting multiple
  m_map.un('singleclick', map_clicked);

  // Re-set/set the single click binding to map_clicked
  m_map.on('singleclick', map_clicked);
};

map_clicked = function(event) {
  var x = event.coordinate[0];
  var y = event.coordinate[1];

  // Call the map clicked callback provided by user if defined
  if (m_show_clicks && is_defined(m_custom_map_clicked_callback)) {
      let clicked_event = $.Event('clicked.tethys-map-view');
      clicked_event.x = x;
      clicked_event.y = y;
      clicked_event.coordinate = event.coordinate
      highlight_clicked_point(x, y);
      m_custom_map_clicked_callback(event.coordinate, event);
      $('#' + m_map_target).trigger(clicked_event);
  }

  // Perform the feature selection if enabled and there are selectable layers
  if (is_defined(m_feature_selection_options) && m_selectable_wms_layers.length > 0) {
     select_features_at_location(x, y, event);
  }
};

clear_clicked_point = function() {
  // Clear clicked point layer
  const clicked_points_source = m_points_clicked_layer.getSource();
  clicked_points_source.clear();
};

highlight_clicked_point = function(x, y) {
  // Get the clicked point layer source
  const clicked_points_source = m_points_clicked_layer.getSource();
  // Create new point feature
  const click_point = (new ol.format.GeoJSON()).readFeatures({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [x, y],
    },
    properties: {

    }
  });

  // Clear last clicked point
  clear_clicked_point();

  // Add new point to clicked point layer
  clicked_points_source.addFeatures(click_point);
};

/***********************************
 * Initialization Methods
 ***********************************/
update_field = function() {
  var $textarea,
      textarea_string;

  $textarea = $('#' + m_textarea_target);
  textarea_string = '';

  if (m_serialization_format === GEOJSON_FORMAT) {
      textarea_string = geojsonify();
  } else {
      textarea_string = wellknowtextify();
  }

  if (textarea_string !== '') {
      textarea_string = JSON.stringify(textarea_string);
  }

  // Set value of textarea
  $textarea.val(textarea_string);
};

/***********************************
 * Utility Methods
 ***********************************/
in_array = function(item, array)
{
  return array.indexOf(item) !== -1;
};

is_defined = function(variable)
{
  return !!(typeof variable !== typeof undefined && variable !== false && variable !== null);
};

// Instantiate a function from a string
// credits: http://stackoverflow.com/questions/1366127/instantiate-a-javascript-object-using-a-string-to-define-the-class-name
string_to_function = function(str) {
  var arr = str.split(".");
  var fn = (window || this);

  for (var i = 0, len = arr.length; i < len; i++) {
    fn = fn[arr[i]];
  }

  if (typeof fn !== "function") {
    throw new Error("function not found: " + str);
  }

  return  fn;
};

build_ol_objects = function(obj, stack) {
  for (var property in obj) {
    if (!obj.hasOwnProperty(property)) {
        continue;
    }

    if (property.includes('ol.')) {
      var constructor_options = obj[property];
      var ol_import = property.split('.');
      var the_class = null;
      try {
        $.each(ol_import, function(index, module) {
          if (module == 'ol') {
            the_class = window[module];
          }
          else {
            the_class = the_class[module];
          }
        });
        return new the_class(build_ol_objects(constructor_options, {}));
      } catch(err) {
          console.error('Invalid OpenLayers class: ' + property);
          return {};
      }
    } else {
      if (obj[property] instanceof Object) {
        stack[property] = build_ol_objects(obj[property], {});
      }
      else {
        stack[property] = obj[property];
      }
    }
  }
  return stack;
};

add_default_base_map_layer = function() {
  let default_base_map_layer = new ol.layer.Tile({
    source: new ol.source.OSM()
  });
  // Add the base map to layers
  m_map.addLayer(default_base_map_layer);
  base_map_labels.push("Open Street Map");
}

/***********************************
 * Class Implementations
 ***********************************/
///////////////////////////////////////// This is the place to play with the button locations //////////////////////////

DrawingControl = function(opt_options) {
  var options,
      button,
      button_image,
      button_wrapper,
      icon_class,
      handle_drawing_interaction_switch;

  options = opt_options || {};

  // Create Button
  icon_class = 'tethys-map-view-draw-icon ' + options.control_type.toLowerCase();

  if (is_defined(options.active) && options.active === true) {
    icon_class += ' active';
  }

  button = document.createElement('button');
  button.setAttribute('type', 'button');
  button.setAttribute('data-bs-toggle', 'tooltip');
  button.setAttribute('data-bs-placement', 'bottom');
  button.setAttribute('title', options.control_type);
  button_image = document.createElement('div');
  button_image.className = icon_class;
  button.appendChild(button_image);
  button_wrapper = document.createElement('div');
  button_wrapper.className = 'tethys-map-view-draw-control ol-unselectable ol-control';
  button_wrapper.style.left = options.left_offset;
  button_wrapper.setAttribute('id',options.control_id);
  button_wrapper.appendChild(button);

  // Create action handler
  handle_drawing_interaction_switch = function(event) {

    // Switch Interaction
    switch_interaction(options.control_type);

    // Reset button active state
    $('.tethys-map-view-draw-icon').each(function(){
      $(this).removeClass('active');
    });

    // Set current button to active state
    $(this).children('.tethys-map-view-draw-icon').addClass('active');
  };

  // Bind switch action to click and touch events
  button.addEventListener('click', handle_drawing_interaction_switch, false);
  button.addEventListener('touchstart', handle_drawing_interaction_switch, false);

  // Call parent constructor
  ol.control.Control.call(this, {
    element: button_wrapper,
    target: options.target
  });
};
ol.inherits(DrawingControl, ol.control.Control);

// Custom interaction for dragging and moving features
// Credits: http://openlayers.org/en/v3.3.0/examples/drag-features.html?q=drag
DragFeatureInteraction = function() {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: DragFeatureInteraction.prototype.handleDownEvent,
    handleDragEvent: DragFeatureInteraction.prototype.handleDragEvent,
    handleMoveEvent: DragFeatureInteraction.prototype.handleMoveEvent,
    handleUpEvent: DragFeatureInteraction.prototype.handleUpEvent
  });

  this.coordinate_ = null;
  this.cursor_ = 'pointer';
  this.feature_ = null;
  this.previousCursor_ = undefined;

};
ol.inherits(DragFeatureInteraction, ol.interaction.Pointer);

// Trigger a drag feature
DragFeatureInteraction.prototype.handleDownEvent = function(event) {
  var map = event.map;

  var feature = map.forEachFeatureAtPixel(event.pixel,
      function(feature, layer) {
        if (layer.tethys_editable === false){
          return false;
        }
        return feature;
      });

  if (feature) {
    this.coordinate_ = event.coordinate;
    this.feature_ = feature;
  }

  return !!feature;
};

// Handle drag feature
DragFeatureInteraction.prototype.handleDragEvent = function(event) {
  var map = event.map;

  var feature = map.forEachFeatureAtPixel(event.pixel, function(feature, layer) {
    return feature;
  });

  var deltaX = event.coordinate[0] - this.coordinate_[0];
  var deltaY = event.coordinate[1] - this.coordinate_[1];

  var geometry = /** @type {ol.geom.SimpleGeometry} */
      (this.feature_.getGeometry());
  geometry.translate(deltaX, deltaY);

  this.coordinate_[0] = event.coordinate[0];
  this.coordinate_[1] = event.coordinate[1];
};

// Handle map movement
DragFeatureInteraction.prototype.handleMoveEvent = function(event) {
  if (this.cursor_) {
    var map = event.map;
    var feature = map.forEachFeatureAtPixel(event.pixel,
        function(feature, layer) {
          return feature;
        });
    var element = event.map.getTargetElement();
    if (feature) {
      if (element.style.cursor != this.cursor_) {
        this.previousCursor_ = element.style.cursor;
        element.style.cursor = this.cursor_;
      }
    } else if (this.previousCursor_ !== undefined) {
      element.style.cursor = this.previousCursor_;
      this.previousCursor_ = undefined;
    }
  }
};

// Un-trigger drag feature
DragFeatureInteraction.prototype.handleUpEvent = function(event) {
  this.coordinate_ = null;
  this.feature_ = null;
  return false;
};

//Custom interaction for deleting features
DeleteFeatureInteraction = function() {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: DeleteFeatureInteraction.prototype.handleDownEvent,
    //Borrow the code from the DragFeatureInteraction for map movement (pointer)
    handleMoveEvent: DragFeatureInteraction.prototype.handleMoveEvent
    });

  this.coordinate_ = null;
  this.cursor_ = 'pointer';
  this.feature_ = null;
  this.previousCursor_ = undefined;

  };

ol.inherits(DeleteFeatureInteraction, ol.interaction.Pointer);

DeleteFeatureInteraction.prototype.handleDownEvent = function(event) {
  var map = event.map;
  var feature = map.forEachFeatureAtPixel(event.pixel,
      function(feature, layer) {
          if (layer.tethys_editable && layer instanceof ol.layer.Vector) {
              layer.getSource().removeFeature(feature);
          };
      });
  return;
  };

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
    return m_map;
  },
  updateLegend: update_legend,
  getTarget: function() {
    return m_map_target;
  },
  jsonResponseHandler: jsonp_response_handler,
  reInitializeMap: ol_initialize_all,

  zoomToExtent: function(lat_long_extent) {
    var map_extent = ol.proj.transformExtent(lat_long_extent, LAT_LON_PROJECTION, DEFAULT_PROJECTION);
    m_map.getView().fit(map_extent, m_map.getSize());
  },

  overrideSelectionStyler: function(geometry_type, styler) {
    if (!in_array(geometry_type, ['points', 'lines', 'polygons'])) {
      console.log('Warning: "' + geometry_type +'" is not a valid value for the geometry_type argument. Must be one of: "points", "lines", or "polygons"');
      return;
    }
    override_selection_styler(geometry_type, styler);
  },

  clearSelection: function() {
    if(m_points_selected_layer) {
      m_points_selected_layer.getSource().clear();
    }

    if (m_lines_selected_layer) {
      m_lines_selected_layer.getSource().clear();
    }

    if (m_polygons_selected_layer) {
      m_polygons_selected_layer.getSource().clear();
    }

    if (m_select_interaction) {
      m_select_interaction.getFeatures().clear();
    }
    // Call Features Changed Method
    if (selected_features_changed) {
      selected_features_changed(m_points_selected_layer, m_lines_selected_layer, m_polygons_selected_layer);
    }
  },

  onSelectionChange: function(func) {
    m_wms_feature_selection_changed_callbacks.push(func);
  },

  clearSelectionChangeCallbacks: function() {
    m_wms_feature_selection_changed_callbacks = [];
  },

  getSelectInteraction: function() {
    return m_select_interaction;
  },

  selectFeaturesByAttribute: select_features_by_attribute,
  mapClicked: function(func) {
    if (m_show_clicks) {
        m_custom_map_clicked_callback = func;
        ol_custom_map_click_init();
    }
  },
  clearClickedPoint: function() {
    clear_clicked_point();
  },
};

/************************************************************************
 *                  INITIALIZATION / CONSTRUCTOR
 *************************************************************************/

// Initialization: jQuery function that gets called when
// the DOM tree finishes loading
$(function() {
  ol_initialize_all();
});

return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.
