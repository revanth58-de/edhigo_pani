import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const DEFAULT_CENTER = {
    latitude: 17.3850,
    longitude: 78.4867,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

// Guard against NaN/null coordinates
const isValidCoord = (lat, lng) =>
    lat != null && lng != null &&
    !isNaN(lat) && !isNaN(lng) &&
    isFinite(lat) && isFinite(lng);

const safeRegion = (loc) => {
    if (!loc) return DEFAULT_CENTER;

    // userLocation can be [lng, lat] array or {latitude, longitude} object
    let lat, lng;
    if (Array.isArray(loc)) {
        lng = loc[0];
        lat = loc[1];
    } else if (loc.longitude != null && loc.latitude != null) {
        lat = loc.latitude;
        lng = loc.longitude;
    }

    if (isValidCoord(lat, lng)) {
        return {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        };
    }
    return DEFAULT_CENTER;
};

// Custom Animated Marker for Active state (Pulse effect)
const AnimatedPulseMarker = ({ marker, onPress }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        if (marker.active) {
            Animated.loop(
                Animated.parallel([
                    Animated.timing(pulseAnim, {
                        toValue: 2.5,
                        duration: 2000,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0,
                        duration: 2000,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
            opacityAnim.setValue(0);
        }
    }, [marker.active]);

    const markerColor = marker.type === 'worker' ? '#5bec13' : '#FF4D4D';
    const iconName = marker.type === 'worker' ? 'person' : 'work';

    return (
        <Marker
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            onPress={() => onPress && onPress(marker)}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false} // Prevents lag/crashing when using custom views inside a Marker
        >
            <View style={styles.markerContainer}>
                {marker.active && (
                    <Animated.View
                        style={[
                            styles.pulse,
                            {
                                backgroundColor: markerColor,
                                transform: [{ scale: pulseAnim }],
                                opacity: opacityAnim,
                            }
                        ]}
                    />
                )}
                <View style={[styles.markerDot, { backgroundColor: markerColor }]}>
                    <MaterialIcons name={iconName} size={16} color="white" />
                </View>
            </View>
        </Marker>
    );
};


const MapDashboard = ({ markers = [], userLocation, height = 300, onMarkerPress, role = 'farmer' }) => {
    const mapRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        if (mapReady && mapRef.current && userLocation) {
            const region = safeRegion(userLocation);
            mapRef.current.animateToRegion(region, 1000);
        }
    }, [userLocation, mapReady]);

    const handleCenterLocation = () => {
        if (mapRef.current && userLocation) {
            mapRef.current.animateToRegion(safeRegion(userLocation), 1000);
        }
    };

    // Filter valid markers
    const validMarkers = markers.filter(m => isValidCoord(m.latitude, m.longitude));

    // Platform.OS === 'web' is partially supported by react-native-maps via react-native-web-maps or similar,
    // but usually, Expo handles this polyfill if configured.
    // Assuming native mobile target for this migration.

    return (
        <View style={[styles.container, { height }]}>
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                provider={PROVIDER_GOOGLE}
                initialRegion={safeRegion(userLocation)}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={false}
                onMapReady={() => setMapReady(true)}
            >
                {validMarkers.map((marker) => (
                    <AnimatedPulseMarker
                        key={marker.id}
                        marker={marker}
                        onPress={onMarkerPress}
                    />
                ))}
            </MapView>

            {/* Map Controls */}
            <View style={styles.controls}>
                <TouchableOpacity style={styles.controlBtn} onPress={handleCenterLocation}>
                    <MaterialIcons name="my-location" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        flex: 1, // Ensures wrapper takes available space
        minHeight: 300,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: colors.gray100,
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
    },
    markerContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        zIndex: 2,
    },
    pulse: {
        position: 'absolute',
        width: 28,
        height: 28,
        borderRadius: 14,
        zIndex: 1,
    }
});

export default MapDashboard;
