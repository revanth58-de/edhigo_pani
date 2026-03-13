// Web stub for react-native-maps
// This file is automatically used on web builds instead of the native module.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapView = ({ style, children, ...props }) => (
  <View style={[styles.placeholder, style]}>
    <Text style={styles.text}>🗺️ Map not available on web</Text>
    {children}
  </View>
);

const Marker = () => null;
const Polyline = () => null;
const Callout = () => null;
const Circle = () => null;
const Polygon = () => null;

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
    color: '#388e3c',
    fontWeight: '600',
  },
});

export default MapView;
export { Marker, Polyline, Callout, Circle, Polygon };
