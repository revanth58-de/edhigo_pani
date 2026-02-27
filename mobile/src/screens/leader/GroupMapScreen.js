import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Dimensions,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import useAuthStore from '../../store/authStore';
import socketService from '../../services/socketService';
import * as Location from 'expo-location';

const GroupMapScreen = ({ navigation, route }) => {
    const { groupId, workerCount } = route.params || { workerCount: 15 };
    const { user } = useAuthStore();
    const [location, setLocation] = useState(null);

    useEffect(() => {
        startTracking();
        setupSocket();
        return () => stopTracking();
    }, []);

    const startTracking = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Location access is required for map mode.');
            return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);

        // Watch location
        Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
            (newLoc) => {
                setLocation(newLoc.coords);
                // Sync with backend/socket if needed
                socketService.emit('group:location_update', {
                    groupId,
                    latitude: newLoc.coords.latitude,
                    longitude: newLoc.coords.longitude
                });
            }
        );
    };

    const setupSocket = () => {
        socketService.on('job:request', (data) => {
            // Navigate to G4 when request received
            navigation.navigate('GroupRequest', { jobData: data, groupId });
        });
    };

    const stopTracking = () => {
        // Cleanup handled by watchPositionAsync's return or similar
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Real map component would go here. Using a placeholder for UI demo. */}
            <View style={styles.mapPlaceholder}>
                <View style={styles.markerContainer}>
                    <View style={styles.marker}>
                        <MaterialIcons name="groups" size={32} color="#FFF" />
                        <Text style={styles.markerText}>👥 {workerCount}</Text>
                    </View>
                    <View style={styles.markerTail} />
                </View>

                <View style={styles.infoBadge}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.infoBadgeText}>AVAILABLE</Text>
                </View>
            </View>

            <View style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialIcons name="close" size={28} color="#1F2937" />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>Group Map Mode</Text>
                        <Text style={styles.headerSub}>Visible to nearby farmers</Text>
                    </View>
                </View>

                <View style={styles.statsCard}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>Status</Text>
                        <Text style={[styles.statValue, { color: '#10B981' }]}>Online</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>Fence</Text>
                        <Text style={styles.statValue}>100m</Text>
                    </View>
                </View>

                <View style={styles.waitingContainer}>
                    <Text style={styles.waitingText}>Waiting for requests...</Text>
                    <View style={styles.dots}>
                        <Text style={styles.dot}>•</Text>
                        <Text style={styles.dot}>•</Text>
                        <Text style={styles.dot}>•</Text>
                    </View>
                </View>

                {/* PROTOTYPE: Button to simulate request for testing flow */}
                <TouchableOpacity
                    style={styles.simButton}
                    onPress={() => navigation.navigate('GroupRequest', { workerCount, groupId })}
                >
                    <Text style={styles.simButtonText}>Simulate Request (G4)</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E5E7EB' },
    mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
    markerContainer: { alignItems: 'center' },
    marker: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 30,
        gap: 8,
        elevation: 8,
    },
    markerText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
    markerTail: { width: 0, height: 0, borderLeftWidth: 10, borderLeftColor: 'transparent', borderRightWidth: 10, borderRightColor: 'transparent', borderTopWidth: 15, borderTopColor: colors.primary, marginTop: -1 },
    infoBadge: { position: 'absolute', top: 120, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, elevation: 4, gap: 6 },
    pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    infoBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#10B981' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 60, justifyContent: 'space-between', paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 20 },
    backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    headerSub: { fontSize: 12, color: '#6B7280' },
    statsCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 6 },
    stat: { flex: 1, alignItems: 'center' },
    statLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
    divider: { width: 1, height: '100%', backgroundColor: '#F3F4F6' },
    waitingContainer: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 30, paddingVertical: 12, paddingHorizontal: 24, alignSelf: 'center' },
    waitingText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
    dots: { flexDirection: 'row', gap: 4, marginTop: 4 },
    dot: { color: '#FFF', fontSize: 20 },
    simButton: { backgroundColor: '#3B82F6', borderRadius: 12, padding: 12, alignSelf: 'center', marginTop: 10 },
    simButtonText: { color: '#FFF', fontWeight: 'bold' }
});

export default GroupMapScreen;
