import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    SafeAreaView,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { groupAPI } from '../../services/api';

const AddMemberScreen = ({ navigation, route }) => {
    const { groupId } = route.params;
    const [phone, setPhone] = useState('');

    const handleKeyPress = (val) => {
        if (phone.length < 10) {
            setPhone(prev => prev + val);
        }
    };

    const handleBackspace = () => {
        setPhone(prev => prev.slice(0, -1));
    };

    const formatPhone = (number) => {
        if (!number) return '(000) 000-0000';
        const cleaned = ('' + number).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
        if (!match) return number;
        let parts = [];
        if (match[1]) parts.push(`(${match[1]}`);
        if (match[2]) parts.push(`) ${match[2]}`);
        if (match[3]) parts.push(`-${match[3]}`);
        return parts.join('');
    };

    const handleAddMember = async () => {
        if (phone.length < 10) {
            Alert.alert('Invalid Number', 'Please enter a 10-digit phone number.');
            return;
        }

        try {
            await groupAPI.addMemberByPhone(groupId, {
                phone: phone,
                status: 'joined'
            });
            Alert.alert('Success', 'Member added to group!');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to add member');
        }
    };

    const KeypadButton = ({ val, icon }) => (
        <TouchableOpacity
            style={styles.key}
            onPress={() => val !== null ? handleKeyPress(val) : (icon === 'backspace' ? handleBackspace() : handleAddMember())}
        >
            {icon ? (
                <MaterialIcons name={icon} size={28} color={icon === 'check-circle' ? colors.primary : '#374151'} />
            ) : (
                <Text style={styles.keyText}>{val}</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={28} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Group Member</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.micCircle}>
                    <MaterialIcons name="mic" size={32} color={colors.primary} />
                </View>
                <Text style={styles.instruction}>Enter worker phone number</Text>

                <View style={styles.phoneDisplay}>
                    <Text style={styles.phoneLabel}>PHONE NUMBER</Text>
                    <Text style={styles.phoneNumber}>{formatPhone(phone)}</Text>
                    <View style={styles.underline} />
                </View>

                <View style={styles.keypad}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <KeypadButton key={num} val={num} />
                    ))}
                    <KeypadButton val={null} icon="backspace" />
                    <KeypadButton val={0} />
                    <KeypadButton val={null} icon="check-circle" />
                </View>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={handleAddMember}>
                <MaterialIcons name="person-add" size={24} color="#FFF" />
                <Text style={styles.addButtonText}>Add to Group</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 10,
    },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
    content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 40 },
    micCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: `${colors.primary}1A`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    instruction: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 40 },
    phoneDisplay: { width: '100%', alignItems: 'center', marginBottom: 40 },
    phoneLabel: { fontSize: 12, fontWeight: 'bold', color: '#6B7280', letterSpacing: 1, marginBottom: 8 },
    phoneNumber: { fontSize: 32, fontWeight: '900', color: '#111827', letterSpacing: 2 },
    underline: { width: '100%', height: 2, backgroundColor: colors.primary, marginTop: 12 },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
    },
    key: {
        width: '30%',
        aspectRatio: 1.2,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyText: { fontSize: 28, fontWeight: '900', color: '#111827' },
    addButton: {
        margin: 24,
        height: 64,
        backgroundColor: colors.primary,
        borderRadius: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        elevation: 4,
    },
    addButtonText: { color: '#FFF', fontSize: 20, fontWeight: '900' },
});

export default AddMemberScreen;
