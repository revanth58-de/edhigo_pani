import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const GroupWorkStatusScreen = ({ navigation, route }) => {
    const { job, groupId } = route.params;
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFinishWork = () => {
        // Navigate to G9 (Checkout QR)
        navigation.navigate('GroupQRAttendance', { job, groupId, type: 'OUT' });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>WORK IN PROGRESS</Text>
                <Text style={styles.headerSub}>Attendance Locked</Text>
            </View>

            <View style={styles.timerCard}>
                <Text style={styles.timerLabel}>ELAPSED TIME</Text>
                <Text style={styles.timerValue}>{formatTime(elapsedTime)}</Text>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.infoCard}>
                    <MaterialIcons name="agriculture" size={40} color={colors.primary} />
                    <View>
                        <Text style={styles.infoTitle}>Harvesting Project</Text>
                        <Text style={styles.infoSmall}>Farmer: Ramappa Goud</Text>
                    </View>
                </View>

                <View style={styles.ruleBox}>
                    <MaterialIcons name="lock" size={20} color="#6B7280" />
                    <Text style={styles.ruleText}>Attendance is locked during work.</Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.finishButton}
                    onPress={handleFinishWork}
                >
                    <Text style={styles.finishText}>FINISH WORK & CHECK OUT</Text>
                    <MaterialIcons name="check-circle" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { backgroundColor: colors.primary, padding: 40, alignItems: 'center', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
    timerCard: { backgroundColor: '#FFF', marginHorizontal: 40, marginTop: -40, borderRadius: 24, padding: 24, alignItems: 'center', elevation: 12 },
    timerLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: 'bold', marginBottom: 8 },
    timerValue: { fontSize: 48, fontWeight: '900', color: colors.primary, letterSpacing: 2 },
    content: { flex: 1, padding: 24 },
    infoCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#FFF', padding: 20, borderRadius: 20, elevation: 2, marginBottom: 20 },
    infoTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    infoSmall: { fontSize: 14, color: '#6B7280' },
    ruleBox: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 20 },
    ruleText: { color: '#6B7280', fontSize: 12 },
    footer: { padding: 24, paddingBottom: 40 },
    finishButton: { height: 70, backgroundColor: colors.primary, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 4 },
    finishText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default GroupWorkStatusScreen;
