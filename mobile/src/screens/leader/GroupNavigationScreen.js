import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';

const GroupNavigationScreen = ({ navigation, route }) => {
    const { job, groupId } = route.params;
    const [distanceRemaining, setDistanceRemaining] = useState(1200); // 1.2km starting

    useEffect(() => {
        Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 10 },
            (loc) => {
                // Simple mock countdown for distance
                setDistanceRemaining(prev => Math.max(0, prev - 50));

                // Arrival detection (100m)
                if (distanceRemaining <= 100) {
                    handleArrival();
                }
            }
        );
    }, [distanceRemaining]);

    const handleArrival = () => {
        Speech.speak("Meeru thotaku cheraru", { language: 'te' }); // "You have arrived at the farm"
        navigation.navigate('LiveMapCall', { job, groupId });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <View style={styles.mapPlaceholder}>
                {/* Map placeholder with route line */}
                <View style={styles.routeLine} />
                <MaterialIcons name="navigation" size={40} color="#3B82F6" style={styles.navIcon} />
            </View>

            <View style={styles.footer}>
                <View style={styles.navInfo}>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>DISTANCE</Text>
                        <Text style={styles.infoValue}>{(distanceRemaining / 1000).toFixed(1)} km</Text>
                    </View>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>TIME</Text>
                        <Text style={styles.infoValue}>{Math.ceil(distanceRemaining / 200)} mins</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.arriveButton}
                    onPress={handleArrival}
                >
                    <Text style={styles.arriveButtonText}>ARRIVED (SIMULATE G6)</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    mapPlaceholder: { flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    routeLine: { width: 4, height: '60%', backgroundColor: '#3B82F6', position: 'absolute' },
    navIcon: { position: 'absolute', bottom: '20%' },
    footer: { padding: 24, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 10 },
    navInfo: { flexDirection: 'row', marginBottom: 20 },
    infoBox: { flex: 1, alignItems: 'center' },
    infoLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: 'bold' },
    infoValue: { fontSize: 24, fontWeight: '900', color: '#111827' },
    infoDivider: { width: 1, backgroundColor: '#E5E7EB', height: '100%' },
    arriveButton: { height: 60, backgroundColor: colors.primary, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    arriveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default GroupNavigationScreen;
