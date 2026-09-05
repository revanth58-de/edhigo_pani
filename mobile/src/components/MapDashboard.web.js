import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const MapDashboard = ({
    markers = [],
    userLocation,
    height = 300,
    onMarkerPress,
    role = 'farmer',
    fullScreen = false,
}) => {
    const isFullScreen = Boolean(fullScreen);
    const [activeMarkerId, setActiveMarkerId] = useState(null);

    // Filter valid markers
    const validMarkers = (markers || []).filter(
        (m) => m && (m.latitude != null || m.lat != null || m.id != null || m.name != null)
    );

    return (
        <View style={isFullScreen ? styles.fullContainer : [styles.container, { height }]}>
            {/* Visual Cartographic Map Background */}
            <View style={styles.mapCanvas}>
                {/* Subtle topographic grid & roads */}
                <View style={styles.gridLineH1} />
                <View style={styles.gridLineH2} />
                <View style={styles.gridLineV1} />
                <View style={styles.gridLineV2} />
                <View style={styles.roadMain} />
                <View style={styles.roadSecondary} />
            </View>

            {/* User / Current Location Marker if provided */}
            {userLocation && (
                <View style={styles.userLocationMarker}>
                    <View style={styles.userLocationPulse} />
                    <View style={styles.userLocationPin}>
                        <MaterialIcons
                            name={role === 'farmer' ? 'agriculture' : 'my-location'}
                            size={18}
                            color="#FFFFFF"
                        />
                    </View>
                    <View style={styles.userLocationTag}>
                        <Text style={styles.userLocationText}>
                            {role === 'farmer' ? 'Farm Location' : 'My Location'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Dynamic Workers / Markers */}
            {validMarkers.length > 0 ? (
                validMarkers.map((marker, idx) => {
                    // Compute pseudo-random distributed positions around center for web preview
                    const topPercent = 22 + ((idx * 37 + 13) % 52);
                    const leftPercent = 18 + ((idx * 43 + 29) % 64);
                    const markerColor = marker.type === 'job' ? '#EF4444' : '#10B981';
                    const iconName = marker.type === 'job' ? 'work' : 'directions-walk';
                    const isSelected = activeMarkerId === (marker.id || idx);

                    return (
                        <TouchableOpacity
                            key={marker.id || idx}
                            style={[
                                styles.dynamicMarker,
                                { top: `${topPercent}%`, left: `${leftPercent}%` },
                            ]}
                            onPress={() => {
                                setActiveMarkerId(isSelected ? null : (marker.id || idx));
                                if (onMarkerPress) onMarkerPress(marker);
                            }}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.markerPulse, { backgroundColor: `${markerColor}33` }]} />
                            <View style={[styles.markerDot, { backgroundColor: markerColor }]}>
                                <MaterialIcons name={iconName} size={15} color="#FFFFFF" />
                            </View>
                            {marker.name ? (
                                <View style={styles.markerNameCard}>
                                    <Text style={styles.markerNameText} numberOfLines={1}>
                                        {marker.name}
                                    </Text>
                                    {marker.ratingAvg || marker.rating ? (
                                        <View style={styles.ratingRow}>
                                            <MaterialIcons name="star" size={10} color="#F59E0B" />
                                            <Text style={styles.ratingText}>
                                                {Number(marker.ratingAvg || marker.rating).toFixed(1)}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    );
                })
            ) : (
                /* Empty Radar Scan State when no markers are online */
                <View style={styles.emptyRadarContainer}>
                    <View style={styles.radarRing3} />
                    <View style={styles.radarRing2} />
                    <View style={styles.radarRing1} />
                    <View style={styles.radarCenterPin}>
                        <MaterialIcons name="share-location" size={22} color={colors.primary} />
                    </View>
                </View>
            )}

            {/* Map Controls */}
            <View style={styles.controls}>
                <View style={styles.controlBtn}>
                    <MaterialIcons name="my-location" size={20} color={colors.primary} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        minHeight: 300,
        backgroundColor: '#EAF5EC',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: '#D3ECD8',
    },
    fullContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#EAF5EC',
        overflow: 'hidden',
    },
    mapCanvas: {
        ...StyleSheet.absoluteFillObject,
    },
    gridLineH1: {
        position: 'absolute',
        top: '32%',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#D1E9D7',
    },
    gridLineH2: {
        position: 'absolute',
        top: '68%',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#D1E9D7',
    },
    gridLineV1: {
        position: 'absolute',
        left: '35%',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: '#D1E9D7',
    },
    gridLineV2: {
        position: 'absolute',
        left: '70%',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: '#D1E9D7',
    },
    roadMain: {
        position: 'absolute',
        top: '48%',
        left: -60,
        right: -60,
        height: 8,
        backgroundColor: '#FAF5EA',
        transform: [{ rotate: '-12deg' }],
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#E8DEC8',
    },
    roadSecondary: {
        position: 'absolute',
        top: '15%',
        bottom: -20,
        left: '52%',
        width: 6,
        backgroundColor: '#FAF5EA',
        transform: [{ rotate: '25deg' }],
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#E8DEC8',
    },
    userLocationMarker: {
        position: 'absolute',
        top: '42%',
        left: '50%',
        transform: [{ translateX: -18 }, { translateY: -18 }],
        alignItems: 'center',
        zIndex: 5,
    },
    userLocationPulse: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
    },
    userLocationPin: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    userLocationTag: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    userLocationText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#1F2937',
    },
    dynamicMarker: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4,
    },
    markerPulse: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    markerDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    markerNameCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    markerNameText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#1F2937',
        maxWidth: 70,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1,
    },
    ratingText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#4B5563',
    },
    emptyRadarContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -60 }, { translateY: -60 }],
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    radarRing3: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.15)',
    },
    radarRing2: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.25)',
    },
    radarRing1: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
    },
    radarCenterPin: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    controls: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        zIndex: 5,
    },
    controlBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
});

export default MapDashboard;
