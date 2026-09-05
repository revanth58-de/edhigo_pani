import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const MapDashboard = ({ markers = [], userLocation, height = 300, role = 'farmer', fullScreen = false }) => {
    const isFullScreen = Boolean(fullScreen);

    return (
        <View style={isFullScreen ? styles.fullContainer : [styles.container, { height }]}>
            {/* Background grid pattern simulation for web map */}
            <View style={styles.gridOverlay}>
                <View style={styles.gridLineH1} />
                <View style={styles.gridLineH2} />
                <View style={styles.gridLineV1} />
                <View style={styles.gridLineV2} />
                <View style={styles.roadLine} />
            </View>

            {/* Simulated Live Location / Farm Destination Marker */}
            <View style={styles.farmMarker}>
                <View style={styles.farmPin}>
                    <MaterialIcons name="agriculture" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.markerLabelContainer}>
                    <Text style={styles.markerLabel}>Farm Location</Text>
                </View>
            </View>

            {/* Simulated Worker Markers if any */}
            {(markers.length > 0 ? markers : [{ id: 'w1' }]).slice(0, 3).map((m, idx) => (
                <View
                    key={m.id || idx}
                    style={[
                        styles.workerMarker,
                        idx === 0 ? styles.workerPos1 : idx === 1 ? styles.workerPos2 : styles.workerPos3
                    ]}
                >
                    <View style={styles.workerPulse} />
                    <View style={styles.workerPin}>
                        <MaterialIcons name="directions-walk" size={16} color="#FFFFFF" />
                    </View>
                </View>
            ))}

            {/* Map Info Badge */}
            <View style={styles.mapBadge}>
                <MaterialIcons name="satellite" size={14} color="#15803D" />
                <Text style={styles.mapBadgeText}>Live GPS Tracking</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        minHeight: 300,
        backgroundColor: '#E8F5E9',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: colors.gray200,
    },
    fullContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#E8F5E9',
        overflow: 'hidden',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.35,
    },
    gridLineH1: {
        position: 'absolute',
        top: '30%',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#A3D9A5',
    },
    gridLineH2: {
        position: 'absolute',
        top: '65%',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#A3D9A5',
    },
    gridLineV1: {
        position: 'absolute',
        left: '35%',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: '#A3D9A5',
    },
    gridLineV2: {
        position: 'absolute',
        left: '70%',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: '#A3D9A5',
    },
    roadLine: {
        position: 'absolute',
        top: '45%',
        left: -50,
        right: -50,
        height: 8,
        backgroundColor: '#D1E7DD',
        transform: [{ rotate: '-15deg' }],
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#B2D8C7',
    },
    farmMarker: {
        position: 'absolute',
        top: '35%',
        left: '52%',
        alignItems: 'center',
        zIndex: 4,
    },
    farmPin: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    markerLabelContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    markerLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#1F2937',
    },
    workerMarker: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
    },
    workerPos1: {
        top: '25%',
        left: '28%',
    },
    workerPos2: {
        top: '42%',
        left: '75%',
    },
    workerPos3: {
        top: '20%',
        left: '60%',
    },
    workerPin: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#059669',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    workerPulse: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
    },
    mapBadge: {
        position: 'absolute',
        top: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#DCFCE7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        zIndex: 5,
    },
    mapBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#15803D',
    },
});

export default MapDashboard;
