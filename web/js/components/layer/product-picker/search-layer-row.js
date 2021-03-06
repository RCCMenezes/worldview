import React from 'react';
import PropTypes from 'prop-types';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { getOrbitTrackTitle } from '../../../modules/layers/util';

/**
 * A single layer search result row
 * @class LayerRow
 * @extends React.Component
 */
class LayerRow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: props.isEnabled,
    };
    this.toggleCheck = this.toggleCheck.bind(this);
    this.toggleShowMetadata = this.toggleShowMetadata.bind(this);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      checked: nextProps.isEnabled,
    });
  }

  /**
   * Toggle layer checked state
   * @method toggleCheck
   * @return {void}
   */
  toggleCheck() {
    const { checked } = this.state;
    const { onState, offState, layer } = this.props;
    if (checked) offState(layer.id);
    if (!checked) onState(layer.id);
    this.setState({ checked: !checked });
  }

  /**
   * Show metadata for this layer
   * @method showMetadata
   * @param {e} event
   * @return {void}
   */
  toggleShowMetadata() {
    const {
      layer,
      showLayerMetadata,
      isMetadataShowing,
      isMobile,
    } = this.props;
    if (!isMetadataShowing) {
      showLayerMetadata(layer.id);
    } else if (isMobile) {
      // Allow click to deselect on mobile
      showLayerMetadata(null);
    }
  }

  /**
   * Spit the layer name and details (which are foundi in parentheses)
   * onto separate lines
   *
   * @param {*} title - the full layer title
   */
  renderSplitTitle = (title) => {
    const splitIdx = title.indexOf('(');
    const attrs = title.slice(splitIdx);
    const titleName = title.slice(0, splitIdx - 1);
    return splitIdx < 0
      ? (<h3>{title}</h3>)
      : (
        <>
          <h3>{titleName}</h3>
          <h4>{attrs}</h4>
        </>
      );
  }

  render() {
    const { checked } = this.state;
    const { layer, isMetadataShowing } = this.props;
    const {
      title, track, description, subtitle,
    } = layer;
    const layerTitle = !track ? title : `${title} (${getOrbitTrackTitle(layer)})`;
    const rowClass = isMetadataShowing
      ? 'search-row layers-all-layer selected'
      : 'search-row layers-all-layer';
    const checkboxClass = checked ? 'wv-checkbox checked' : 'wv-checkbox';

    return (
      <div id={`${layer.id}-search-row`} className={rowClass}>
        <div className={checkboxClass}>
          <input
            type="checkbox"
            id={`${layer.id}-checkbox`}
            title={title}
            name={`${layer.id}-checkbox`}
            checked={checked}
            onChange={this.toggleCheck}
          />
        </div>
        <div className="layers-all-header" onClick={this.toggleShowMetadata}>
          {!track ? this.renderSplitTitle(layerTitle) : <h3>{layerTitle}</h3>}
          {subtitle && <h5>{subtitle}</h5>}
          {description && !isMetadataShowing && (
            <FontAwesomeIcon icon={faInfoCircle} />
          )}
        </div>
      </div>
    );
  }
}
LayerRow.propTypes = {
  isEnabled: PropTypes.bool,
  isMetadataShowing: PropTypes.bool,
  isMobile: PropTypes.bool,
  layer: PropTypes.object,
  offState: PropTypes.func,
  onState: PropTypes.func,
  showLayerMetadata: PropTypes.func,
};

export default LayerRow;
