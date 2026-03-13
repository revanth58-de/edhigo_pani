// Stub for react-native-maps on web
const React = require('react');
const { View } = require('react-native');

const MapView = (props) => React.createElement(View, props);
MapView.Animated = MapView;

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = (props) => null;
module.exports.Polyline = (props) => null;
module.exports.Polygon = (props) => null;
module.exports.Circle = (props) => null;
module.exports.Callout = (props) => null;
module.exports.PROVIDER_GOOGLE = 'google';
module.exports.PROVIDER_DEFAULT = null;
