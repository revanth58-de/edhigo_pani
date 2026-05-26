import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import useAuthStore from '../../store/authStore';
import { socketService } from '../../services/socketService';
import * as Location from 'expo-location';
import MapDashboard from '../../components/MapDashboard';

const GroupMapScreen = ({ navigation, route }) => {
    const { groupId, workerCount } = route.params || { workerCount: 15 };
    const { user } = useAuthStore();
    const [location, setLocation] = useState(null);
    // Map of userId -> { latitude, longitude, timestamp }
    const [memberLocations, setMemberLocations] = useState({});

    // Store watch subscription so we can call .remove() on unmount
    const watcherRef = useRef(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        startTracking();
        setupSocket();
        return () => {
            isMounted.current = false;
            stopTracking();
        };
    }, []);

    const startTracking = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted.current) return;
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Location access is required for map mode.');
            return;
        }

        try {
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation
            });
            if (!isMounted.current) return;
            setLocation(loc.coords);

            // Emit initial location
            if (groupId) {
                socketService.emitGroupLocationUpdate({
                    groupId,
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
            }
        } catch (e) {
            console.warn('Error getting initial location:', e);
        }

        try {
            // Watch location — store subscription ref for cleanup
            const sub = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
                (newLoc) => {
                    if (!isMounted.current) return;
                    setLocation(newLoc.coords);
                    if (groupId) {
                        socketService.emitGroupLocationUpdate({
                            groupId,
                            latitude: newLoc.coords.latitude,
                            longitude: newLoc.coords.longitude,
                        });
                    }
                }
            );

            if (!isMounted.current) {
                sub.remove();
            } else {
                watcherRef.current = sub;
            }
        } catch (e) {
            console.warn('Error setting up location watcher:', e);
        }
    };

    const handleJobRequest = (data) => {
        if (!isMounted.current) return;
        navigation.navigate('GroupRequest', { jobData: data, groupId });
    };

    const handleLocationBroadcast = (data) => {
        if (!isMounted.current) return;
        const { userId, latitude, longitude, timestamp } = data;
        // Don't show the current user's own marker
        if (userId === user?.id) return;
        setMemberLocations((prev) => ({
            ...prev,
            [userId]: { latitude, longitude, timestamp },
        }));
    };

    const setupSocket = () => {
        // Join the group room to receive broadcasts
        if (groupId) socketService.joinGroupRoom(groupId);

        // Listen for job requests (navigate to GroupRequest screen)
        socketService.on('job:request', handleJobRequest);

        // Listen for other group members' locations
        socketService.onGroupLocationBroadcast(handleLocationBroadcast);
    };

    const stopTracking = () => {
        // Properly remove the GPS watcher subscription
        if (watcherRef.current) {
            watcherRef.current.remove();
            watcherRef.current = null;
        }
        // Unsubscribe from socket events
        socketService.off('job:request', handleJobRequest);
        socketService.offGroupLocationBroadcast(handleLocationBroadcast);
    };

    // Convert memberLocations map to markers array for MapDashboard
    const memberMarkers = Object.entries(memberLocations).map(([userId, loc]) => ({
        id: `member-${userId}`,
        latitude: loc.latitude,
        longitude: loc.longitude,
        type: 'worker',
        active: true,
    }));

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Real Google Map with member markers */}
            <MapDashboard
                fullScreen
                userLocation={location}
                markers={memberMarkers}
            />

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
                        <Text style={styles.statLabel}>Members</Text>
                        <Text style={styles.statValue}>{Object.keys(memberLocations).length + 1}</Text>
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
