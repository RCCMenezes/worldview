import {
  get as lodashGet,
  isUndefined as lodashIsUndefined,
  each as lodashEach,
  find as lodashFind
} from 'lodash';

import {
  getLayers
} from '../layers/selectors';
import { getMinValue, getMaxValue, selectedStyleFunction } from './util';
import update from 'immutability-helper';
import { containsCoordinate } from 'ol/extent';
import stylefunction from 'ol-mapbox-style/stylefunction';

/**
 * Gets a single colormap (entries / legend combo)
 *
 *
 * @method get
 * @static
 * @param str {string} The ID of the layer
 * @param number {Number} The index of the colormap for this layer, default 0
 * object.
 * @return {object} object including the entries and legend
 */
export function getVectorStyle(layerId, index, groupStr, state) {
  groupStr = groupStr || state.compare.activeString;
  index = lodashIsUndefined(index) ? 0 : index;
  const renderedVectorStyle = lodashGet(
    state,
    `vectorStyles.${layerId}.layers.${index}`
  );
  if (renderedVectorStyle) {
    return renderedVectorStyle;
  }
  return getAllVectorStyles(layerId, index, state);
}

export function getAllVectorStyles(layerId, index, state) {
  const { config, vectorStyles } = state;
  var name = lodashGet(config, `layers.${layerId}.vectorStyle.id`);
  var vectorStyle = vectorStyles.custom[name];
  if (!vectorStyle) {
    throw new Error(name + ' Is not a rendered vectorStyle');
  }
  if (!lodashIsUndefined(index)) {
    if (vectorStyle.layers) {
      vectorStyle = vectorStyle.layers[index];
    }
  }
  return vectorStyle;
}

export function findIndex(layerId, type, value, index, groupStr, state) {
  index = index || 0;
  var values = getVectorStyle(layerId, index, groupStr, state).entries.values;
  var result;
  lodashEach(values, function(check, index) {
    var min = getMinValue(check);
    var max = getMaxValue(check);
    if (type === 'min' && value === min) {
      result = index;
      return false;
    }
    if (type === 'max' && value === max) {
      result = index;
      return false;
    }
  });
  return result;
}

export function setRange(layerId, props, index, palettes, state) {
  // Placeholder filter range function
  return (layerId, props, index, palettes, state);
}

export function setStyleFunction(def, vectorStyleId, vectorStyles, layer, state) {
  const { compare } = state;
  var styleFunction;
  var layerId = def.id;
  var glStyle = vectorStyles[layerId];
  var olMap = lodashGet(state, 'map.ui.selected');
  var layerState = state.layers;
  const activeLayerStr = state.compare.activeString;
  const selected = state.vectorStyles.selected;
  var activeLayers = getLayers(
    layerState[activeLayerStr],
    {},
    state
  ).reverse();
  var layerGroups;
  var layerGroup;

  if (olMap) {
    layerGroups = olMap.getLayers().getArray();
    if (compare && compare.active) {
      if (layerGroups.length === 2) {
        layerGroup =
          layerGroups[0].get('group') === activeLayerStr
            ? layerGroups[0]
            : layerGroups[1].get('group') === activeLayerStr
              ? layerGroups[1]
              : null;
      }
    }
    lodashEach(activeLayers, function(def) {
      if (compare && compare.active) {
        if (layerGroup && layerGroup.getLayers().getArray().length) {
          lodashEach(layerGroup.getLayers().getArray(), subLayer => {
            if (subLayer.wv && (subLayer.wv.id === layerId)) {
              layer = subLayer;
            }
          });
        }
      } else {
        lodashEach(layerGroups, subLayer => {
          if (subLayer.wv && (subLayer.wv.id === layerId)) {
            layer = subLayer;
          }
        });
      }
    });
  }
  const layerArray = layer.getLayers ? layer.getLayers().getArray() : [layer];
  lodashEach(layerArray, layerInLayerGroup => {
    // Apply mapbox-gl styles
    const extentStartX = layerInLayerGroup.getExtent()[0];
    const acceptableExtent = extentStartX === 180 ? [-180, -90, -110, 90] : extentStartX === -250 ? [110, -90, 180, 90] : null;

    styleFunction = stylefunction(layerInLayerGroup, glStyle, vectorStyleId);
    // Filter Orbit Tracks
    if (glStyle.name === 'Orbit Tracks' &&
      (selected[layerId] && selected[layerId].length)) {
      const selectedFeatures = selected[layerId];
      layerInLayerGroup.setStyle(function(feature, resolution) {
        const data = state.config.vectorData[def.vectorData.id];
        const properties = data.mvt_properties;
        const features = feature.getProperties();
        const idKey = lodashFind(properties, { Function: 'Identify' }).Identifier;
        const minutes = feature.get('label');
        const uniqueIdentifier = features[idKey];
        if (shouldRenderFeature(feature, acceptableExtent)) {
          if (minutes && uniqueIdentifier && selectedFeatures && selectedFeatures.includes(uniqueIdentifier)) {
            return selectedStyleFunction(feature, styleFunction(feature, resolution), 1.5);
          } else {
            return styleFunction(feature, resolution);
          }
        } else {
          return styleFunction(feature, resolution);
        }
      });
    } else if ((glStyle.name === 'SEDAC') &&
      (selected[layerId] && selected[layerId].length)) {
      const selectedFeatures = selected[layerId];

      layerInLayerGroup.setStyle(function(feature, resolution) {
        const data = state.config.vectorData[def.vectorData.id];
        const properties = data.mvt_properties;
        const features = feature.getProperties();
        const idKey = lodashFind(properties, { Function: 'Identify' }).Identifier;
        const uniqueIdentifier = features[idKey];
        if (shouldRenderFeature(feature, acceptableExtent)) {
          if (uniqueIdentifier && selectedFeatures && selectedFeatures.includes(uniqueIdentifier)) {
            return selectedStyleFunction(feature, styleFunction(feature, resolution));
          } else {
            return styleFunction(feature, resolution);
          }
        }
      });
    }
  });
  return vectorStyleId;
}
const shouldRenderFeature = (feature, acceptableExtent) => {
  if (!acceptableExtent) return true;
  const midpoint = feature.getFlatCoordinates ? feature.getFlatCoordinates() : feature.getGeometry().getFlatCoordinates();
  if (containsCoordinate(acceptableExtent, midpoint)) return true;
  return false;
};
export function getKey(layerId, groupStr, state) {
  groupStr = groupStr || state.compare.activeString;
  if (!isActive(layerId, groupStr, state)) {
    return '';
  }
  var def = getVectorStyle(layerId, undefined, groupStr, state);
  var keys = [];
  if (def.custom) {
    keys.push('style=' + def.custom);
  }
  if (def.min) {
    keys.push('min=' + def.min);
  }
  if (def.max) {
    keys.push('max=' + def.max);
  }
  return keys.join(',');
}
export function isActive(layerId, group, state) {
  group = group || state.compare.activeString;
  if (state.vectorStyles.custom[layerId]) {
    return state.vectorStyles[group][layerId];
  }
}

export function clearStyleFunction(def, vectorStyleId, vectorStyles, layer, state) {
  var styleFunction;
  var layerId = def.id;
  var glStyle = vectorStyles[layerId];
  var olMap = lodashGet(state, 'legacy.map.ui.selected');
  if (olMap) {
    lodashEach(olMap.getLayers().getArray(), subLayer => {
      if (subLayer.wv.id === layerId) {
        layer = subLayer;
      }
    });
  }
  styleFunction = stylefunction(layer, glStyle, vectorStyleId);
  if (glStyle.name === 'Orbit Tracks') {
    // Filter time by 5 mins
    layer.setStyle(function(feature, resolution) {
      var minute;
      var minutes = feature.get('label');
      if (minutes) {
        minute = minutes.split(':');
      }
      if ((minute && minute[1] % 5 === 0) || feature.getType() === 'LineString') {
        return styleFunction(feature, resolution);
      }
    });
  }
  return update(vectorStyles, { layerId: { maps: { $unset: ['custom'] } } });
}
