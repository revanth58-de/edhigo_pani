import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const GroupCallScreen = ({ navigation, route }) => {
    const { job, groupId } = route.params;

    const handleCall = () => {
        Linking.openURL('tel:919876543210');
    };

    const handleArrival = () => {
        // Arrival alert logic would trigger navigation to G7
        navigation.navigate('GroupQRAttendance', { job, groupId, type: 'IN' });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

            <View style={styles.mapPlaceholder}>
                <View style={styles.markerContainer}>
                    <View style={styles.farmerMarker}>
                        <MaterialIcons name="person" size={24} color="#FFF" />
                    </View>
                    <Text style={styles.farmerLabel}>Farmer (Near)</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <View style={styles.jobBrief}>
                    <View style={styles.workIcon}>
                        <MaterialIcons name="agriculture" size={32} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.jobType}>{job?.workType || 'Harvesting'}</Text>
                        <Text style={styles.farmerName}>Ramappa Goud</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.callButton}
                    onPress={handleCall}
                >
                    <MaterialIcons name="call" size={32} color="#FFF" />
                    <Text style={styles.callButtonText}>CALL FARMER</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.arriveAlert}
                    onPress={handleArrival}
                >
                    <Text style={styles.arriveAlertText}>I'VE ARRIVED (GO TO G7)</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.emergency}>
                <MaterialIcons name="warning" size={24} color="#FFF" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    markerContainer: { alignItems: 'center' },
    farmerMarker: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    farmerLabel: { marginTop: 4, fontWeight: 'bold', fontSize: 12, color: '#1F2937' },
    footer: { padding: 24, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 12 },
    jobBrief: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
    workIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: `${colors.primary}1A`, justifyContent: 'center', alignItems: 'center' },
    jobType: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    farmerName: { fontSize: 14, color: '#6B7280' },
    callButton: { height: 70, backgroundColor: colors.primary, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 4 },
    callButtonText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    arriveAlert: { marginTop: 16, padding: 12, alignItems: 'center' },
    arriveAlertText: { color: colors.primary, fontWeight: 'bold' },
    emergency: { position: 'absolute', top: 60, right: 20, width: 48, height: 48, borderRadius: 24, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', elevation: 4 }
});

export default GroupCallScreen;
