import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { groupAPI } from '../../services/api';
import BottomNavBar from '../../components/BottomNavBar';

const AddMemberScreen = ({ navigation, route }) => {
    const { groupId } = route.params;
    const [phone, setPhone] = useState('');
    const [cursorPos, setCursorPos] = useState(0);
    const [loading, setLoading] = useState(false);

    // ── Dialpad logic (identical to LoginScreen) ──────────────────────────────
    const handleNumberPress = (num) => {
        if (phone.length < 10) {
            const newPhone = phone.slice(0, cursorPos) + num + phone.slice(cursorPos);
            setPhone(newPhone);
            setCursorPos(cursorPos + 1);
        }
    };

    const handleBackspace = () => {
        if (cursorPos > 0) {
            const newPhone = phone.slice(0, cursorPos - 1) + phone.slice(cursorPos);
            setPhone(newPhone);
            setCursorPos(cursorPos - 1);
        }
    };

    const formatPhone = (num) => {
        if (num.length <= 4) return num;
        return `${num.slice(0, 4)} ${num.slice(4)}`;
    };

    const keypadRows = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        [null, '0', 'backspace'],
    ];
    // ─────────────────────────────────────────────────────────────────────────

    const handleAddMember = async () => {
        if (phone.length !== 10) {
            Alert.alert('Invalid Number', 'Please enter a 10-digit phone number.');
            return;
        }
        setLoading(true);
        try {
            await groupAPI.addMemberByPhone(groupId, { phone, status: 'joined' });
            Alert.alert('Success', 'Member added to group!');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to add member');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={28} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Group Member</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Phone display — identical to LoginScreen */}
                <View style={styles.displaySection}>
                    <View style={styles.labelRow}>
                        <MaterialIcons name="phone-iphone" size={20} color={colors.primary} />
                        <Text style={styles.label}>WORKER PHONE NUMBER</Text>
                    </View>

                    <View style={styles.phoneDisplayRow}>
                        {phone.length === 0 ? (
                            <Text style={[styles.phoneDisplay, { color: '#9CA3AF' }]}>0000 000000</Text>
                        ) : (
                            phone.split('').map((char, index) => (
                                <React.Fragment key={index}>
                                    {index === cursorPos && <View style={styles.activeCursor} />}
                                    {index === 4 && <View style={{ width: 12 }} />}
                                    <TouchableOpacity onPress={() => setCursorPos(index)}>
                                        <Text style={[styles.phoneDisplay, cursorPos === index && styles.activeChar]}>
                                            {char}
                                        </Text>
                                    </TouchableOpacity>
                                </React.Fragment>
                            ))
                        )}
                        {phone.length > 0 && cursorPos === phone.length && (
                            <View style={styles.activeCursor} />
                        )}
                        {phone.length > 0 && (
                            <TouchableOpacity style={styles.ghostTap} onPress={() => setCursorPos(phone.length)} />
                        )}
                    </View>
                    <View style={styles.displayUnderline} />
                </View>

                <View style={{ height: 16 }} />

                {/* Keypad — identical layout to LoginScreen */}
                <View style={styles.keypadContainer}>
                    <View style={styles.keypad}>
                        {keypadRows.map((row, rowIndex) => (
                            <View key={rowIndex} style={styles.keypadRow}>
                                {row.map((key, keyIndex) => {
                                    if (key === null) return <View key={keyIndex} style={styles.keypadKey} />;
                                    if (key === 'backspace') {
                                        return (
                                            <TouchableOpacity
                                                key={keyIndex}
                                                style={[styles.keypadKey, styles.keypadKeyActive]}
                                                onPress={handleBackspace}
                                                activeOpacity={0.7}
                                            >
                                                <MaterialIcons name="backspace" size={36} color="#EF4444" />
                                            </TouchableOpacity>
                                        );
                                    }
                                    return (
                                        <TouchableOpacity
                                            key={keyIndex}
                                            style={[styles.keypadKey, styles.keypadKeyActive]}
                                            onPress={() => handleNumberPress(key)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.keypadKeyText}>{key}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </View>

                    {/* Add Member button — styled like LoginScreen's Continue */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.addButton, phone.length !== 10 && styles.addButtonDisabled]}
                            onPress={handleAddMember}
                            disabled={loading || phone.length !== 10}
                            activeOpacity={0.9}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.backgroundDark} />
                            ) : (
                                <>
                                    <MaterialIcons name="person-add" size={24} color={colors.backgroundDark} />
                                    <Text style={styles.addButtonText}>Add to Group</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <BottomNavBar role="leader" activeTab="Group" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundLight },
    scrollView: { flex: 1 },
    scrollContent: { flexGrow: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 48,
        paddingBottom: 12,
        backgroundColor: colors.backgroundLight,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#111827' },

    // Phone display — identical to LoginScreen
    displaySection: {
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 24,
        alignItems: 'center',
    },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    label: { fontSize: 12, fontWeight: '500', color: '#6f8961', letterSpacing: 2 },
    phoneDisplay: { fontSize: 40, fontWeight: 'bold', color: '#131811', letterSpacing: 2, paddingVertical: 16 },
    phoneDisplayRow: { flexDirection: 'row', alignItems: 'center', minHeight: 80 },
    activeCursor: { width: 3, height: 40, backgroundColor: colors.primary, borderRadius: 2 },
    activeChar: { color: colors.primary },
    ghostTap: { position: 'absolute', right: -20, width: 40, height: 80 },
    displayUnderline: { width: '100%', height: 2, backgroundColor: `${colors.primary}4D` },

    // Keypad — identical to LoginScreen
    keypadContainer: { padding: 16 },
    keypad: { gap: 12 },
    keypadRow: { flexDirection: 'row', gap: 12 },
    keypadKey: { flex: 1, height: 80, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
    keypadKeyActive: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#dfe6db',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    keypadKeyText: { fontSize: 30, fontWeight: 'bold', color: '#131811' },

    // Add button — same shape as LoginScreen continue button
    buttonContainer: { paddingHorizontal: 8, paddingTop: 24, paddingBottom: 40 },
    addButton: {
        flexDirection: 'row',
        height: 64,
        borderRadius: 9999,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 16,
    },
    addButtonDisabled: { opacity: 0.5 },
    addButtonText: { fontSize: 20, fontWeight: 'bold', color: colors.backgroundDark },
});

export default AddMemberScreen;
