import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    Image,
    Alert,
    Modal,
    TextInput,
    Platform,
    Linking,
} from 'react-native';
import CustomLoader from '../../components/CustomLoader';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { groupAPI } from '../../services/api';
import { socketService } from '../../services/socketService';
import useAuthStore from '../../store/authStore';

const ManageGroupScreen = ({ navigation, route }) => {
    const routeGroupId = route?.params?.groupId;
    const routeGroupName = route?.params?.groupName;

    const [resolvedGroupId, setResolvedGroupId] = useState(routeGroupId || null);
    const [members, setMembers] = useState([]);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingMember, setEditingMember] = useState(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('');
    const [updating, setUpdating] = useState(false);

    useFocusEffect(
      useCallback(() => {
          initGroup();
      }, [resolvedGroupId])
    );

    // Listen for group:deleted socket event (e.g. another admin deleted)
    useEffect(() => {
        if (!resolvedGroupId) return;
        const handleDeleted = () => {
            Alert.alert('Group Deleted', 'This group has been deleted.');
            navigation.replace('Groups');
        };
        socketService.on('group:deleted', handleDeleted);
        return () => {
            socketService.off('group:deleted', handleDeleted);
        };
    }, [resolvedGroupId]);

    const handleDeleteGroup = () => {
        Alert.alert(
            '🗑️ Delete Group',
            'Are you sure you want to permanently delete this group? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await groupAPI.deleteGroup(resolvedGroupId);
                            navigation.replace('Groups');
                        } catch {
                            Alert.alert('Error', 'Failed to delete group. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const initGroup = async () => {
        setLoading(true);
        try {
            let gid = resolvedGroupId;

            if (!gid) {
                const res = await groupAPI.getMyGroups();
                const allGroups = res?.data?.groups || res?.data || [];
                const currentUser = useAuthStore.getState().user;
                const myLedGroups = currentUser?.id ? allGroups.filter(g => g.leaderId === currentUser.id) : allGroups;

                if (myLedGroups.length > 0) {
                    gid = myLedGroups[0].id;
                    setResolvedGroupId(gid);
                } else {
                    Alert.alert(
                        'No Group Found',
                        'You don\'t have a group yet. Create one first!',
                        [{ text: 'Create Group', onPress: () => navigation.replace('GroupSetup') }]
                    );
                    setLoading(false);
                    return;
                }
            }

            await fetchMembers(gid);
        } catch (err) {
            console.warn('initGroup error', err);
            setLoading(false);
        }
    };

    const fetchMembers = async (gid) => {
        try {
            const res = await groupAPI.getGroupDetails(gid);
            const rawMembers = res?.data?.group?.members || res?.data?.members || [];
            const rawPending = res?.data?.group?.pendingInvites || [];

            const toCard = m => ({
                id: m.id,
                workerId: m.workerId || m.worker?.id,
                name: m.name || m.worker?.name || 'Member',
                phone: m.worker?.phone || m.phone || '',
                role: m.role || 'Member',
            });

            setMembers(rawMembers.map(toCard));
            setPendingInvites(rawPending.map(toCard));
        } catch (error) {
            console.error('Fetch Group Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsAppInvite = () => {
        const leaderName = useAuthStore.getState().user?.name || 'గ్రూప్ లీడర్';
        const inviteText = `🌾 *ఎదిగో పని (Edhigo Pani) - గ్రూప్ ఆహ్వానం!*\n\nనమస్తే! *${leaderName}* మిమ్మల్ని "*${routeGroupName || 'మా వ్యవసాయ బృందం'}*" గ్రూప్‌లో చేరడానికి ఆహ్వానిస్తున్నారు.\n\n✅ కలిసి పని చేద్దాం - ఎక్కువ సంపాదిద్దాం\n✅ రోజువారీ వేతనం నేరుగా అందుతుంది\n\nఇప్పుడే చేరండి: https://edhigo-pani.onrender.com`;
        const encoded = encodeURIComponent(inviteText);
        const waUrl = `whatsapp://send?text=${encoded}`;
        const webUrl = `https://api.whatsapp.com/send?text=${encoded}`;

        Linking.canOpenURL(waUrl)
            .then(supported => {
                if (supported) Linking.openURL(waUrl);
                else Linking.openURL(webUrl);
            })
            .catch(() => Linking.openURL(webUrl));
    };

    const handleCallMember = (phone) => {
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        } else {
            Alert.alert('Phone Unavailable', 'This member has not listed a phone number.');
        }
    };

    const removeMember = async (workerId) => {
        Alert.alert('Remove Member', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await groupAPI.removeMember(resolvedGroupId, workerId);
                        setMembers(prev => prev.filter(m => m.workerId !== workerId));
                    } catch {
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
            await groupAPI.updateMember(resolvedGroupId, editingMember.workerId, {
                name: editName, role: editRole,
            });
            setMembers(prev =>
                prev.map(m => m.workerId === editingMember.workerId
                    ? { ...m, name: editName, role: editRole } : m)
            );
            setEditingMember(null);
        } catch {
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
            await groupAPI.updateGroupStatus(resolvedGroupId, 'available');
            navigation.navigate('GroupMap', { groupId: resolvedGroupId, workerCount: members.length + 1 });
        } catch {
            Alert.alert('Error', 'Failed to start group session');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.backgroundDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Group / బృందం నిర్వహణ</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => navigation.navigate('GroupMap', { groupId: resolvedGroupId, workerCount: members.length + 1 })}
                        testID="group-map-btn"
                    >
                        <MaterialIcons name="map" size={22} color={colors.backgroundDark} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.headerBtn, styles.deleteBtn]}
                        onPress={handleDeleteGroup}
                    >
                        <MaterialIcons name="delete-forever" size={22} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── WhatsApp Direct Invite Banner ── */}
            <View style={styles.bannerContainer}>
                <TouchableOpacity
                    style={styles.whatsappBanner}
                    onPress={handleWhatsAppInvite}
                    activeOpacity={0.88}
                >
                    <View style={styles.waIconBox}>
                        <MaterialIcons name="share" size={26} color="#FFFFFF" />
                    </View>
                    <View style={styles.waBannerTextCol}>
                        <Text style={styles.waBannerTitle}>వాట్సాప్ ద్వారా ఆహ్వానించండి</Text>
                        <Text style={styles.waBannerSub}>Invite members via WhatsApp directly</Text>
                    </View>
                    <View style={styles.waArrowCircle}>
                        <MaterialIcons name="arrow-forward" size={18} color="#25D366" />
                    </View>
                </TouchableOpacity>
            </View>

            {/* ── Member list ───────────────────────────────────────────── */}
            <>
                <View style={styles.titleSection}>
                    <Text style={styles.sectionTitle}>Group Members ({members.length})</Text>
                    <TouchableOpacity
                        style={styles.chatShortcutBtn}
                        onPress={() => navigation.navigate('GroupChat', { groupId: resolvedGroupId, groupName: routeGroupName })}
                    >
                        <MaterialIcons name="chat" size={16} color={colors.primary} />
                        <Text style={styles.chatShortcutText}>Group Chat</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 220 }}>
                    {loading ? (
                        <View style={{ marginTop: 40, alignItems: 'center' }}>
                            <CustomLoader size={48} color={colors.primary} />
                        </View>
                    ) : members.length === 0 && pendingInvites.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="groups" size={80} color="#E5E7EB" />
                            <Text style={styles.emptyText}>No members yet</Text>
                            <Text style={styles.emptySubText}>Tap WhatsApp or ADD MEMBER below to get started</Text>
                        </View>
                    ) : (
                        <>
                            {members.map((item) => (
                                <View key={item.id || item.workerId} style={styles.memberCard}>
                                    <TouchableOpacity style={styles.memberInfo} onPress={() => { setEditingMember(item); setEditName(item.name || ''); setEditRole(item.role || ''); }}>
                                        <Image
                                            source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Worker')}&background=random` }}
                                            style={styles.avatar}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.memberName}>{item.name || 'Unknown'}</Text>
                                            <Text style={styles.memberRole}>{item.phone || item.role || 'Member'}</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Action buttons: Call, Chat & Remove */}
                                    <View style={styles.memberActionBtns}>
                                        {item.phone ? (
                                            <TouchableOpacity 
                                                style={styles.callIconBtn} 
                                                onPress={() => handleCallMember(item.phone)}
                                            >
                                                <MaterialIcons name="call" size={18} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        ) : null}

                                        <TouchableOpacity 
                                            style={styles.deleteIconBtn} 
                                            onPress={() => removeMember(item.workerId)}
                                        >
                                            <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            {pendingInvites.length > 0 && (
                                <>
                                    <Text style={styles.pendingHeader}>⏳ Awaiting Response</Text>
                                    {pendingInvites.map((item) => (
                                        <View key={item.id || item.workerId} style={[styles.memberCard, styles.pendingCard]}>
                                            <View style={styles.memberInfo}>
                                                <Image
                                                    source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Worker')}&background=E5E7EB&color=9CA3AF` }}
                                                    style={[styles.avatar, styles.pendingAvatar]}
                                                />
                                                <View>
                                                    <Text style={styles.memberName}>{item.name || 'Unknown'}</Text>
                                                    <Text style={[styles.memberRole, { color: '#F59E0B' }]}>Invite sent • Pending</Text>
                                                </View>
                                            </View>
                                            <TouchableOpacity onPress={() => removeMember(item.workerId)}>
                                                <MaterialIcons name="cancel" size={24} color="#9CA3AF" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </ScrollView>

                <View style={styles.footer}>
                    <View style={styles.footerRow}>
                        <TouchableOpacity 
                            style={styles.waFooterBtn} 
                            onPress={handleWhatsAppInvite}
                            activeOpacity={0.85}
                        >
                            <MaterialIcons name="share" size={22} color="#FFFFFF" />
                            <Text style={styles.waFooterBtnText}>WHATSAPP</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.addButton} 
                            onPress={() => navigation.navigate('AddMember', { groupId: resolvedGroupId, groupName: routeGroupName })}
                            activeOpacity={0.85}
                        >
                            <MaterialIcons name="person-add" size={22} color="#111827" />
                            <Text style={styles.addButtonText}>ADD MEMBER</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={styles.goLiveButton} 
                        onPress={handleGoLive} 
                        disabled={!resolvedGroupId}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.goLiveButtonText}>GO LIVE (G{members.length + 1})</Text>
                    </TouchableOpacity>
                </View>
            </>

            {/* Edit member modal */}
            <Modal visible={!!editingMember} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Member</Text>
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
                                {updating ? <CustomLoader size={24} color="#FFF" /> : <Text style={styles.saveButtonText}>SAVE</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAF7' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 48,
        paddingBottom: 16,
        backgroundColor: colors.primary,
    },
    headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.backgroundDark}22`, justifyContent: 'center', alignItems: 'center' },
    deleteBtn: { backgroundColor: '#FEE2E2' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: colors.backgroundDark },

    bannerContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    whatsappBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#25D366',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#25D366',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
        gap: 12,
    },
    waIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    waBannerTextCol: {
        flex: 1,
    },
    waBannerTitle: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 14,
    },
    waBannerSub: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 1,
    },
    waArrowCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },

    titleSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
    sectionTitle: { fontSize: 20, fontWeight: '900', color: '#111827' },
    chatShortcutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.primary}15`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    chatShortcutText: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.primary,
    },

    content: { flex: 1, paddingHorizontal: 16 },
    memberCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 16, backgroundColor: '#FFFFFF', marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
    memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB' },
    memberName: { fontSize: 15, fontWeight: '800', color: '#111827' },
    memberRole: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    memberActionBtns: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    callIconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#16A34A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteIconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: { alignItems: 'center', marginTop: 60, gap: 8, paddingHorizontal: 24 },
    emptyText: { color: '#4B5563', fontSize: 17, fontWeight: '700' },
    emptySubText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center' },

    footer: { position: 'absolute', bottom: 16, left: 0, right: 0, paddingHorizontal: 16, gap: 10 },
    footerRow: {
        flexDirection: 'row',
        gap: 10,
    },
    waFooterBtn: {
        flex: 1,
        height: 56,
        backgroundColor: '#25D366',
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        elevation: 4,
    },
    waFooterBtnText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    addButton: { 
        flex: 1.3,
        height: 56, 
        backgroundColor: colors.primary, 
        borderRadius: 28, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 8, 
        elevation: 4, 
    },
    addButtonText: { fontSize: 14, fontWeight: '900', color: '#111827' },
    goLiveButton: { height: 48, backgroundColor: '#374151', borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    goLiveButtonText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
    pendingHeader: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginTop: 16, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' },
    pendingCard: { opacity: 0.75, borderStyle: 'dashed', borderColor: '#E5E7EB' },
    pendingAvatar: { opacity: 0.6 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 20 },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 11, fontWeight: 'bold', color: '#6B7280', marginBottom: 6, letterSpacing: 1 },
    modalInput: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, fontSize: 16, fontWeight: 'bold', borderWidth: 1, borderColor: '#F3F4F6' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelButton: { flex: 1, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
    cancelButtonText: { fontWeight: 'bold', color: '#374151' },
    saveButton: { flex: 2, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    saveButtonText: { fontWeight: '900', color: colors.backgroundDark },
});

export default ManageGroupScreen;
