import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// Conditional imports for Web/Native
let MapLibre;
let WebView;

if (Platform.OS === 'web') {
    try {
        MapLibre = require('maplibre-gl');
    } catch (e) {
        console.error('Failed to load maplibre-gl', e);
    }
} else {
    try {
        WebView = require('react-native-webview').WebView;
    } catch (e) {
        console.warn('WebView not available');
    }
}

const DEFAULT_CENTER = [78.4867, 17.3850]; // Hyderabad
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const MAP_CSS_URL = 'https://unpkg.com/maplibre-gl@5.19.0/dist/maplibre-gl.css';

const MapDashboard = ({ markers = [], userLocation, height = 300, onMarkerPress, role = 'farmer' }) => {
    const mapContainer = useRef(null);
    const mapInstance = useRef(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const markersRef = useRef({});

    // ─── Web Implementation ───
    useEffect(() => {
        if (Platform.OS !== 'web' || !MapLibre) return;

        // Add CSS dynamically to avoid require errors
        if (!document.getElementById('maplibre-css')) {
            const link = document.createElement('link');
            link.id = 'maplibre-css';
            link.rel = 'stylesheet';
            link.href = MAP_CSS_URL;
            document.head.appendChild(link);
        }

        if (!mapInstance.current && mapContainer.current) {
            try {
                // Handle different export patterns
                const MapCtor = MapLibre.Map || (MapLibre.default && MapLibre.default.Map);
                if (!MapCtor) throw new Error('Map constructor not found');

                mapInstance.current = new MapCtor({
                    container: mapContainer.current,
                    style: MAP_STYLE,
                    center: userLocation || DEFAULT_CENTER,
                    zoom: 12,
                });

                mapInstance.current.on('load', () => {
                    setMapLoaded(true);
                    console.log('🗺️ MapLibre Web Loaded');
                });
            } catch (err) {
                console.error('Map initialization error:', err);
            }
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    // Update Markers (Web)
    useEffect(() => {
        if (Platform.OS !== 'web' || !mapLoaded || !mapInstance.current) return;

        // Clear removed markers
        const currentMarkerIds = new Set(markers.map(m => m.id));
        Object.keys(markersRef.current).forEach(id => {
            if (!currentMarkerIds.has(id)) {
                markersRef.current[id].remove();
                delete markersRef.current[id];
            }
        });

        // Add/Update markers
        markers.forEach(marker => {
            if (markersRef.current[marker.id]) {
                markersRef.current[marker.id].setLngLat([marker.longitude, marker.latitude]);
            } else {
                try {
                    const MarkerCtor = MapLibre.Marker || (MapLibre.default && MapLibre.default.Marker);
                    if (!MarkerCtor) return;

                    const el = document.createElement('div');
                    el.className = 'custom-marker';
                    el.style.width = '30px';
                    el.style.height = '30px';
                    el.style.borderRadius = '50%';
                    el.style.backgroundColor = marker.type === 'worker' ? '#5bec13' : '#FF4D4D';
                    el.style.border = '2px solid white';
                    el.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
                    el.style.display = 'flex';
                    el.style.justifyContent = 'center';
                    el.style.alignItems = 'center';
                    el.style.cursor = 'pointer';

                    // Rapido-style pulse for active markers
                    if (marker.active) {
                        const pulse = document.createElement('div');
                        pulse.style.position = 'absolute';
                        pulse.style.width = '100%';
                        pulse.style.height = '100%';
                        pulse.style.borderRadius = '50%';
                        pulse.style.backgroundColor = marker.type === 'worker' ? '#5bec13' : '#FF4D4D';
                        pulse.style.opacity = '0.6';
                        pulse.style.animation = 'pulse 2s infinite';
                        el.appendChild(pulse);
                    }

                    const icon = document.createElement('i');
                    icon.className = 'material-icons';
                    icon.style.fontSize = '18px';
                    icon.style.color = 'white';
                    icon.style.position = 'relative';
                    icon.style.zIndex = '5';
                    icon.innerText = marker.type === 'worker' ? 'person' : 'work';
                    el.appendChild(icon);

                    const newMarker = new MarkerCtor(el)
                        .setLngLat([marker.longitude, marker.latitude])
                        .addTo(mapInstance.current);

                    el.onclick = () => onMarkerPress && onMarkerPress(marker);
                    markersRef.current[marker.id] = newMarker;
                } catch (err) {
                    console.error('Error creating marker:', err);
                }
            }
        });
    }, [markers, mapLoaded]);

    // Handle User Location (Web)
    useEffect(() => {
        if (Platform.OS === 'web' && mapInstance.current && userLocation) {
            mapInstance.current.flyTo({ center: userLocation, zoom: 14 });
        }
    }, [userLocation]);

    // ─── Native Implementation (WebView + MapLibre CDN) ───
    if (Platform.OS !== 'web' && WebView) {
        const mapHtml = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <script src="https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.js"></script>
          <link href="https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.css" rel="stylesheet" />
          <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
          <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100%; }
            .marker { width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; position: relative; }
            @keyframes pulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.5); opacity: 0; } }
            .pulse { position: absolute; width: 100%; height: 100%; border-radius: 50%; animation: pulse 2s infinite; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const map = new maplibregl.Map({
              container: 'map',
              style: '${MAP_STYLE}',
              center: [${(userLocation || DEFAULT_CENTER)[0]}, ${(userLocation || DEFAULT_CENTER)[1]}],
              zoom: 12
            });

            const markers = {};

            function updateMarkers(newMarkers) {
              newMarkers.forEach(m => {
                if (markers[m.id]) {
                  markers[m.id].setLngLat([m.longitude, m.latitude]);
                } else {
                  const el = document.createElement('div');
                  el.className = 'marker';
                  el.style.backgroundColor = m.type === 'worker' ? '#5bec13' : '#FF4D4D';
                  if (m.active) {
                    const p = document.createElement('div');
                    p.className = 'pulse';
                    p.style.backgroundColor = m.type === 'worker' ? '#5bec13' : '#FF4D4D';
                    el.appendChild(p);
                  }
                  el.innerHTML += '<i class="material-icons" style="font-size: 18px; color: white; position: relative; z-index: 10;">' + (m.type === 'worker' ? 'person' : 'work') + '</i>';
                  
                  markers[m.id] = new maplibregl.Marker(el)
                    .setLngLat([m.longitude, m.latitude])
                    .addTo(map);
                }
              });
            }
            
            window.addEventListener('message', (e) => {
              const data = JSON.parse(e.data);
              if (data.type === 'updateMarkers') updateMarkers(data.markers);
              if (data.type === 'flyTo') map.flyTo({ center: data.center, zoom: 14 });
            });
          </script>
        </body>
      </html>
    `;

        return (
            <View style={[styles.container, { height }]}>
                <WebView
                    originWhitelist={['*']}
                    source={{ html: mapHtml }}
                    scrollEnabled={false}
                    style={{ borderRadius: 16 }}
                />
            </View>
        );
    }

    // ─── Web Render ───
    return (
        <View style={[styles.container, { height }]}>
            {Platform.OS === 'web' && (
                <style>{`
            @keyframes pulse {
              0% { transform: scale(1); opacity: 0.6; }
              100% { transform: scale(2.5); opacity: 0; }
            }
          `}</style>
            )}
            <div ref={mapContainer} style={{ width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden' }} />
            {!mapLoaded && Platform.OS === 'web' && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            )}

            {/* Map Controls */}
            <View style={styles.controls}>
                <TouchableOpacity style={styles.controlBtn} onPress={() => {
                    if (userLocation && mapInstance.current) mapInstance.current.flyTo({ center: userLocation, zoom: 14 });
                }}>
                    <MaterialIcons name="my-location" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: colors.gray100,
    },
    loaderContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    controls: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 5,
    },
    controlBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    }
});

export default MapDashboard;
