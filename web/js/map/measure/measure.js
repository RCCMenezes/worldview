import { unByKey } from 'ol/Observable';
import Overlay from 'ol/Overlay';
import { getArea, getLength } from 'ol/sphere';
import { LineString, Polygon } from 'ol/geom';
import Draw from 'ol/interaction/Draw';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

export function measure (map, projection) {
  const self = {};
  let draw;
  let sketch;
  let helpTooltipElement;
  let helpTooltip;
  let measureTooltipElement;
  let measureTooltip;
  let allMeasureTooltips = [];
  let drawChangeListener;
  const source = new VectorSource();
  const vector = getVectorLayer(source);

  /**
   * Handle pointer move.
   */
  function pointerMoveHandler (evt) {
    if (evt.dragging) {
      return;
    }
    const helpMsg = !sketch
      ? 'Click to start drawing.'
      : 'Click to continue drawing. <br/> Double-click to complete.';

    helpTooltipElement.innerHTML = helpMsg;
    helpTooltip.setPosition(evt.coordinate);
    helpTooltipElement.classList.remove('hidden');
  };

  function createHelpTooltip() {
    if (helpTooltipElement) {
      helpTooltipElement.parentNode.removeChild(helpTooltipElement);
    }
    helpTooltipElement = document.createElement('div');
    helpTooltipElement.className = 'tooltip-measure hidden';
    helpTooltip = new Overlay({
      element: helpTooltipElement,
      offset: [15, 15],
      positioning: 'center-left'
    });
    map.addOverlay(helpTooltip);
  }

  function createMeasureTooltip() {
    if (measureTooltipElement) {
      measureTooltipElement.parentNode.removeChild(measureTooltipElement);
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'tooltip-measure tooltip-active';
    measureTooltip = new Overlay({
      element: measureTooltipElement,
      offset: [0, -15],
      positioning: 'bottom-center'
    });
    allMeasureTooltips.push(measureTooltip);
    map.addOverlay(measureTooltip);
  }

  function drawStartCallback (evt) {
    let tooltipCoord;
    sketch = evt.feature;
    drawChangeListener = sketch.getGeometry().on('change', (evt) => {
      const geom = evt.target;
      let output;
      if (geom instanceof Polygon) {
        output = formatArea(geom, projection);
        tooltipCoord = geom.getInteriorPoint().getCoordinates();
      } else if (geom instanceof LineString) {
        output = formatLength(geom, projection);
        tooltipCoord = geom.getLastCoordinate();
      }
      measureTooltipElement.innerHTML = output;
      measureTooltip.setPosition(tooltipCoord);
    });
  };

  function drawEndCallback () {
    measureTooltipElement.className = 'tooltip-measure tooltip-static';
    measureTooltip.setOffset([0, -7]);
    sketch = null;
    measureTooltipElement = null;
    createMeasureTooltip();
    map.removeOverlay(helpTooltip);
    map.removeInteraction(draw);
    unByKey(drawChangeListener);
  };

  /**
    * Add the map interactionn
    * @param {String} measureType
    */
  function addInteraction(measureType) {
    const type = (measureType === 'area' ? 'Polygon' : 'LineString');
    draw = getDraw(source, type);
    vector.setMap(map);
    map.addInteraction(draw);
    createMeasureTooltip();
    createHelpTooltip();
    draw.on('drawstart', drawStartCallback, this);
    draw.on('drawend', drawEndCallback, this);
  }

  self.initMeasurement = (type) => {
    map.on('pointermove', pointerMoveHandler);
    addInteraction(type);
  };

  self.changeUnitOfMeasure = (unit) => {
    console.log(unit);
  };

  self.clearMeasurements = () => {
    allMeasureTooltips.forEach(tooltip => {
      map.removeOverlay(tooltip);
    });
    allMeasureTooltips = [];
    map.removeInteraction(draw);
    vector.getSource().clear();
    vector.setMap(null);
  };

  return self;
}

const convertKmToMiles = (km) => km * 0.62137;

const convertSquareKmToMiles = (squareKm) => squareKm * 0.38610;

const convertMilesToKm = (miles) => miles / 0.62137;

const convertSquareMilesToKm = (squareMiles) => squareMiles / 0.38610;

const formatLength = (line, projection) => {
  const length = getLength(line, { projection });
  if (length > 100) {
    return (Math.round(length / 1000 * 100) / 100).toLocaleString() + ' ' + 'km';
  } else {
    return (Math.round(length * 100) / 100).toLocaleString() + ' ' + 'm';
  }
};

const formatArea = (polygon, projection) => {
  const area = getArea(polygon, { projection });
  if (area > 10000) {
    return `${(Math.round(area / 1000000 * 100) / 100).toLocaleString()} km<sup>2</sup>`;
  } else {
    return `${(Math.round(area * 100) / 100).toLocaleString()} m<sup>2</sup>`;
  }
};

const getVectorLayer = (source) => {
  return new VectorLayer({
    source,
    style: new Style({
      fill: new Fill({
        color: 'rgba(213, 78, 33, 0.1)'
      }),
      stroke: new Stroke({
        color: 'rgba(255, 100, 6, 1)',
        lineJoin: 'round',
        width: 3
      })
    })
  });
};

const getDraw = (source, type) => {
  return new Draw({
    source,
    type,
    style: new Style({
      fill: new Fill({
        color: 'rgba(213, 78, 33, 0.1)'
      }),
      stroke: new Stroke({
        color: 'rgba(255, 100, 6, 1)',
        lineDash: [10, 20],
        lineJoin: 'round',
        width: 4
      }),
      image: new CircleStyle({
        radius: 7,
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 0.7)'
        }),
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.3)'
        })
      })
    })
  });
};
