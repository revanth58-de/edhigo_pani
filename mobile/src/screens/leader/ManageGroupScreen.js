import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { groupAPI } from '../../services/api';
import BottomNavBar from '../../components/BottomNavBar';

// ── Dialpad (identical to LoginScreen) ───────────────────────────────────────
const KEYPAD_ROWS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [null, '0', 'backspace'],
];

const ManageGroupScreen = ({ navigation, route }) => {
    const { groupId, groupName } = route.params || {};
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingMember, setEditingMember] = useState(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('');
    const [updating, setUpdating] = useState(false);
    const [adding, setAdding] = useState(false); // false = member list, true = dialpad

    // Dialpad state
    const [phone, setPhone] = useState('');
    const [cursorPos, setCursorPos] = useState(0);
    const [addingMember, setAddingMember] = useState(false);

    useEffect(() => {
        fetchGroupDetails();
    }, []);

    const fetchGroupDetails = async () => {
        if (!groupId) {
            setLoading(false);
            return;
        }
        try {
            const res = await groupAPI.getGroupDetails(groupId);
            // Handle both response shapes: res.data.group.members or res.data.members
            const memberList =
                res?.data?.group?.members ||
                res?.data?.members ||
                [];
            setMembers(memberList);
        } catch (error) {
            console.error('Fetch Group Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // ── Dialpad handlers ──────────────────────────────────────────────────────
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

    const handleAddMember = async () => {
        if (phone.length !== 10) {
            Alert.alert('Invalid Number', 'Please enter a 10-digit phone number.');
            return;
        }
        setAddingMember(true);
        try {
            await groupAPI.addMemberByPhone(groupId, { phone, status: 'joined' });
            Alert.alert('Success', 'Member added to group!');
            setPhone('');
            setCursorPos(0);
            setAdding(false);
            fetchGroupDetails();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to add member');
        } finally {
            setAddingMember(false);
        }
    };
    // ─────────────────────────────────────────────────────────────────────────

    const removeMember = async (workerId) => {
        Alert.alert('Remove Member', 'Are you sure you want to remove this member?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await groupAPI.removeMember(groupId, workerId);
                        setMembers(prev => prev.filter(m => m.workerId !== workerId));
                    } catch (error) {
                        Alert.alert('Error', 'Failed to remove member');
                    }
                },
            },
        ]);
    };

    const handleUpdateMember = async () => {
        if (!editName) return;
        setUpdating(true);
        try {
            await groupAPI.updateMember(groupId, editingMember.workerId, { name: editName, role: editRole });
            setMembers(prev =>
                prev.map(m => m.workerId === editingMember.workerId ? { ...m, name: editName, role: editRole } : m)
            );
            setEditingMember(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to update member');
        } finally {
            setUpdating(false);
        }
    };

    const handleGoLive = async () => {
        if (members.length === 0) {
            Alert.alert('Empty Group', 'Add members before going live.');
            return;
        }
        try {
            await groupAPI.updateGroupStatus(groupId, 'active');
            navigation.navigate('GroupMap', { groupId, workerCount: members.length });
        } catch (error) {
            Alert.alert('Error', 'Failed to start group session');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header — same paddingTop as all screens */}
            <View style={styles.header}>
                <View style={styles.micCircle}>
                    <MaterialIcons name="mic" size={24} color={colors.primary} />
                </View>
                <Text style={styles.headerTitle}>Manage your group</Text>
                <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('LeaderProfile')}>
                    <MaterialIcons name="person-add-alt" size={24} color="#374151" />
                </TouchableOpacity>
            </View>

            {adding ? (
                /* ── Inline Dialpad view ─────────────────────────────────── */
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
                    {/* Phone display */}
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
                            {phone.length > 0 && cursorPos === phone.length && <View style={styles.activeCursor} />}
                            {phone.length > 0 && (
                                <TouchableOpacity style={styles.ghostTap} onPress={() => setCursorPos(phone.length)} />
                            )}
                        </View>
                        <View style={styles.displayUnderline} />
                    </View>

                    <View style={{ height: 16 }} />

                    {/* Keypad */}
                    <View style={styles.keypadContainer}>
                        <View style={styles.keypad}>
                            {KEYPAD_ROWS.map((row, rowIndex) => (
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

                        <View style={styles.dialpadButtons}>
                            <TouchableOpacity
                                style={styles.cancelDialBtn}
                                onPress={() => { setAdding(false); setPhone(''); setCursorPos(0); }}
                            >
                                <Text style={styles.cancelDialBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.addBtn, phone.length !== 10 && styles.addBtnDisabled]}
                                onPress={handleAddMember}
                                disabled={addingMember || phone.length !== 10}
                                activeOpacity={0.9}
                            >
                                {addingMember ? (
                                    <ActivityIndicator color={colors.backgroundDark} />
                                ) : (
                                    <>
                                        <MaterialIcons name="person-add" size={24} color={colors.backgroundDark} />
                                        <Text style={styles.addBtnText}>Add to Group</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            ) : (
                /* ── Member list view ────────────────────────────────────── */
                <>
                    <View style={styles.titleSection}>
                        <Text style={styles.sectionTitle}>Group Members</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{members.length} Active</Text>
                        </View>
                    </View>

                    <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 220 }}>
                        {loading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                        ) : members.length === 0 ? (
                            <View style={styles.emptyState}>
                                <MaterialIcons name="groups" size={80} color="#E5E7EB" />
                                <Text style={styles.emptyText}>No members yet</Text>
                            </View>
                        ) : (
                            members.map((item) => (
                                <View key={item.id} style={styles.memberCard}>
                                    <TouchableOpacity style={styles.memberInfo} onPress={() => { setEditingMember(item); setEditName(item.name || ''); setEditRole(item.role || ''); }}>
                                        <Image
                                            source={{ uri: `https://ui-avatars.com/api/?name=${item.name || 'Worker'}&background=random` }}
                                            style={styles.avatar}
                                        />
                                        <View>
                                            <Text style={styles.memberName}>{item.name || 'Unknown'}</Text>
                                            <Text style={styles.memberRole}>{item.role || 'Member'}</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => removeMember(item.workerId)}>
                                        <MaterialIcons name="delete-outline" size={24} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </ScrollView>

                    {/* Footer buttons */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.addButton} onPress={() => setAdding(true)}>
                            <MaterialIcons name="person-add" size={24} color="#111827" />
                            <Text style={styles.addButtonText}>ADD MEMBER</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.goLiveButton} onPress={handleGoLive}>
                            <Text style={styles.goLiveButtonText}>GO LIVE (G{members.length})</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {/* Edit member modal */}
            <Modal visible={!!editingMember} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Member Details</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>FULL NAME</Text>
                            <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} placeholder="Member Name" />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>ROLE</Text>
                            <TextInput style={styles.modalInput} value={editRole} onChangeText={setEditRole} placeholder="e.g. Site Supervisor" />
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingMember(null)}>
                                <Text style={styles.cancelButtonText}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} onPress={handleUpdateMember} disabled={updating}>
                                {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>SAVE CHANGES</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <BottomNavBar role="leader" activeTab="Group" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 48,
        paddingBottom: 16,
        backgroundColor: colors.primary,
    },
    micCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.backgroundDark}22`, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: colors.backgroundDark },
    profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.backgroundDark}22`, justifyContent: 'center', alignItems: 'center' },

    // Member list
    titleSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 28 },
    sectionTitle: { fontSize: 28, fontWeight: '900', color: '#111827' },
    badge: { backgroundColor: `${colors.primary}1A`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
    badgeText: { fontSize: 14, fontWeight: '900', color: colors.primary },
    content: { flex: 1, paddingHorizontal: 24 },
    memberCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 99, backgroundColor: '#F9FAFB', marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' },
    memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    memberName: { fontSize: 18, fontWeight: '900', color: '#111827' },
    memberRole: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
    emptyState: { alignItems: 'center', marginTop: 80 },
    emptyText: { marginTop: 16, color: '#9CA3AF', fontSize: 18, fontWeight: '500' },

    // Footer buttons
    footer: { position: 'absolute', bottom: 90, left: 0, right: 0, paddingHorizontal: 24, gap: 12 },
    addButton: { height: 72, backgroundColor: colors.primary, borderRadius: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 4 },
    addButtonText: { fontSize: 20, fontWeight: '900', color: '#111827' },
    goLiveButton: { height: 56, backgroundColor: '#374151', borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    goLiveButtonText: { color: '#FFF', fontWeight: '900', fontSize: 16 },

    // ── Dialpad (identical to LoginScreen) ──
    displaySection: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, alignItems: 'center' },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    label: { fontSize: 12, fontWeight: '500', color: '#6f8961', letterSpacing: 2 },
    phoneDisplay: { fontSize: 40, fontWeight: 'bold', color: '#131811', letterSpacing: 2, paddingVertical: 16 },
    phoneDisplayRow: { flexDirection: 'row', alignItems: 'center', minHeight: 80 },
    activeCursor: { width: 3, height: 40, backgroundColor: colors.primary, borderRadius: 2 },
    activeChar: { color: colors.primary },
    ghostTap: { position: 'absolute', right: -20, width: 40, height: 80 },
    displayUnderline: { width: '100%', height: 2, backgroundColor: `${colors.primary}4D` },
    keypadContainer: { padding: 16 },
    keypad: { gap: 12 },
    keypadRow: { flexDirection: 'row', gap: 12 },
    keypadKey: { flex: 1, height: 80, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
    keypadKeyActive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#dfe6db', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    keypadKeyText: { fontSize: 30, fontWeight: 'bold', color: '#131811' },
    dialpadButtons: { flexDirection: 'row', gap: 12, paddingHorizontal: 8, paddingTop: 20, paddingBottom: 16 },
    cancelDialBtn: { flex: 1, height: 64, borderRadius: 9999, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    cancelDialBtnText: { fontSize: 17, fontWeight: 'bold', color: '#6B7280' },
    addBtn: { flex: 2, flexDirection: 'row', height: 64, borderRadius: 9999, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 16 },
    addBtnDisabled: { opacity: 0.5 },
    addBtnText: { fontSize: 18, fontWeight: 'bold', color: colors.backgroundDark },

    // Edit modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 24 },
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#6B7280', marginBottom: 8, letterSpacing: 1 },
    modalInput: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 'bold', borderWidth: 1, borderColor: '#F3F4F6' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
    cancelButton: { flex: 1, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
    cancelButtonText: { fontWeight: 'bold', color: '#374151' },
    saveButton: { flex: 2, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    saveButtonText: { fontWeight: '900', color: '#111827' },
});

export default ManageGroupScreen;
