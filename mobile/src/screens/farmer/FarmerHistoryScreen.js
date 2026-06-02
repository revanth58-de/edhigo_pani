// FarmerHistoryScreen - History of jobs posted by the farmer
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    RefreshControl,
    Platform,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { jobAPI } from '../../services/api';
import { machineryService } from '../../services/api/machineryService';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';
import CustomLoader from '../../components/CustomLoader';
import EmptyState from '../../components/EmptyState';

const STATUS_META = {
    pending: { label: 'Waiting for Workers', color: '#F59E0B', bg: '#FEF3C7', icon: 'schedule' },
    accepted: { label: 'Accepted', color: '#3B82F6', bg: '#EFF6FF', icon: 'check-circle' },
    in_progress: { label: 'Under Process', color: '#8B5CF6', bg: '#F5F3FF', icon: 'play-circle' },
    finishing: { label: 'Finishing', color: '#06B6D4', bg: '#CFFAFE', icon: 'done' },
    completed: { label: 'Completed', color: '#10B981', bg: '#D1FAE5', icon: 'task-alt' },
    cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2', icon: 'cancel' },
};

const WORK_ICONS = {
    Sowing: 'grass',
    Harvesting: 'agriculture',
    Irrigation: 'water-drop',
    Labour: 'engineering',
    Tractor: 'agriculture',
};

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const JobCard = ({ job, onUpdateStatus, navigation }) => {
    const status = STATUS_META[job.status] || STATUS_META.pending;
    const workIcon = WORK_ICONS[job.workType] || 'work';

    const handlePress = () => {
        if (job.status === 'in_progress' || job.status === 'finishing') {
            navigation.navigate('WorkInProgress', { job });
        } else if (job.status === 'accepted') {
            navigation.navigate('SelectWorkers', { job });
        }
    };

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={handlePress}>
            {/* Header row */}
            <View style={styles.cardHeader}>
                <View style={[styles.workIconCircle, { backgroundColor: `${colors.primary}15` }]}>
                    <MaterialIcons name={workIcon} size={28} color={colors.primary} />
                </View>
                <View style={styles.cardHeaderText}>
                    <Text style={styles.workType}>{job.workType || 'Farm Work'}</Text>
                    <Text style={styles.jobDate}>{formatDate(job.createdAt)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <MaterialIcons name={status.icon} size={14} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
            </View>

            {/* Details */}
            <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                    <MaterialIcons name="people" size={16} color="#64748B" />
                    <Text style={styles.detailText}>{job.workersNeeded || job.workerCount || 0} Workers Required</Text>
                </View>
                <View style={styles.detailRow}>
                    <MaterialIcons name="currency-rupee" size={16} color="#64748B" />
                    <Text style={styles.detailText}>₹{job.wagePerDay}/day per worker</Text>
                </View>
            </View>

            {/* Management Actions */}
            {job.status !== 'completed' && job.status !== 'cancelled' && (
                <View style={styles.actionRow}>
                    {job.status === 'accepted' && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                            onPress={() => onUpdateStatus(job.id, 'in_progress')}
                        >
                            <Text style={styles.actionBtnText}>Start Work</Text>
                        </TouchableOpacity>
                    )}
                    {job.status === 'in_progress' && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#06B6D4' }]}
                            onPress={() => onUpdateStatus(job.id, 'finishing')}
                        >
                            <Text style={styles.actionBtnText}>Mark Finishing</Text>
                        </TouchableOpacity>
                    )}
                    {(job.status === 'finishing' || job.status === 'in_progress') && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                            onPress={() => onUpdateStatus(job.id, 'completed')}
                        >
                            <Text style={styles.actionBtnText}>Complete Work</Text>
                        </TouchableOpacity>
                    )}
                    {(job.status === 'pending' || job.status === 'matched' || job.status === 'accepted' || job.status === 'in_progress' || job.status === 'finishing') && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#EF4444', marginLeft: 8 }]}
                            onPress={() => onUpdateStatus(job.id, 'cancelled')}
                        >
                            <Text style={styles.actionBtnText}>Cancel Work</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Dispute Action */}
            <TouchableOpacity 
                style={styles.disputeLink}
                onPress={() => navigation.navigate('Dispute', { jobId: job.id })}
                activeOpacity={0.7}
            >
                <MaterialIcons name="report-problem" size={16} color="#E11D48" />
                <Text style={styles.disputeLinkText}>Report Issue / Dispute Job</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const MachineryBookingCard = ({ booking, navigation, t }) => {
    const isCompleted = booking.status === 'completed';
    const isPaid = booking.payments && booking.payments.some(p => p.status === 'completed');
    const isPendingPayment = isCompleted && !isPaid;

    const handleAction = () => {
        if (booking.status === 'confirmed') {
            navigation.navigate('QRAttendance', {
                job: {
                    id: booking.id,
                    workType: booking.machinery?.name || booking.machinery?.type || 'Machinery',
                    payPerDay: booking.machinery?.pricePerHour || booking.totalAmount,
                },
                type: 'in',
                booking,
                isMachinery: true,
            });
        } else if (booking.status === 'in_progress') {
            navigation.navigate('WorkInProgress', {
                job: {
                    id: booking.id,
                    workType: booking.machinery?.name || booking.machinery?.type || 'Machinery',
                    payPerDay: booking.machinery?.pricePerHour || booking.totalAmount,
                },
                booking,
                isMachinery: true,
            });
        } else if (isPendingPayment) {
            navigation.navigate('Payment', {
                job: {
                    id: booking.id,
                    workType: booking.machinery?.name || booking.machinery?.type || 'Machinery',
                    payPerDay: booking.machinery?.pricePerHour || booking.totalAmount,
                },
                booking,
                isMachinery: true,
            });
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.workIconCircle, { backgroundColor: `${colors.primary}15` }]}>
                    <MaterialIcons name="agriculture" size={28} color={colors.primary} />
                </View>
                <View style={styles.cardHeaderText}>
                    <Text style={styles.workType}>{booking.machinery?.name || 'Machinery'}</Text>
                    <Text style={styles.jobDate}>{formatDate(booking.date)}</Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    {
                        backgroundColor:
                            booking.status === 'confirmed' ? '#EFF6FF' :
                            booking.status === 'in_progress' ? '#F5F3FF' :
                            isPaid ? '#D1FAE5' :
                            isPendingPayment ? '#FEF3C7' : '#FEE2E2'
                    }
                ]}>
                    <Text style={[
                        styles.statusText,
                        {
                            color:
                                booking.status === 'confirmed' ? '#3B82F6' :
                                booking.status === 'in_progress' ? '#8B5CF6' :
                                isPaid ? '#10B981' :
                                isPendingPayment ? '#D97706' : '#EF4444'
                        }
                    ]}>
                        {booking.status === 'confirmed' ? 'Confirmed' :
                         booking.status === 'in_progress' ? 'In Progress' :
                         isPaid ? 'Paid' :
                         isPendingPayment ? 'Pending Pay' : booking.status.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                    <MaterialIcons name="person" size={16} color="#64748B" />
                    <Text style={styles.detailText}>Owner: {booking.machinery?.owner?.name || 'Owner'}</Text>
                </View>
                {booking.machinery?.owner?.phone && (
                    <View style={styles.detailRow}>
                        <MaterialIcons name="phone" size={16} color="#64748B" />
                        <Text style={styles.detailText}>{booking.machinery.owner.phone}</Text>
                    </View>
                )}
                {booking.address && (
                    <View style={styles.detailRow}>
                        <MaterialIcons name="location-on" size={16} color="#64748B" />
                        <Text style={styles.detailText}>{booking.address}</Text>
                    </View>
                )}
                <View style={styles.detailRow}>
                    <MaterialIcons name="schedule" size={16} color="#64748B" />
                    <Text style={styles.detailText}>Slot: {booking.slot}</Text>
                </View>
                <View style={styles.detailRow}>
                    <MaterialIcons name="currency-rupee" size={16} color="#64748B" />
                    <Text style={styles.detailText}>Total: ₹{booking.totalAmount}</Text>
                </View>
            </View>

            {(booking.status === 'confirmed' || booking.status === 'in_progress' || isPendingPayment) && (
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[
                            styles.actionBtn,
                            {
                                backgroundColor:
                                    booking.status === 'confirmed' ? colors.primary :
                                    booking.status === 'in_progress' ? '#8B5CF6' : '#F59E0B'
                            }
                        ]}
                        onPress={handleAction}
                    >
                        <Text style={styles.actionBtnText}>
                            {booking.status === 'confirmed' ? 'Start (Show QR)' :
                             booking.status === 'in_progress' ? 'Active Session' : 'Pay Owner'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const FarmerHistoryScreen = ({ navigation }) => {
    const user = useAuthStore((state) => state.user);
    const [jobs, setJobs] = useState([]);
    const [machineryBookings, setMachineryBookings] = useState([]);
    const [activeCategory, setActiveCategory] = useState('jobs'); // 'jobs' | 'machinery'
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    // M10: Filter state
    const [workTypeFilter, setWorkTypeFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const { t } = useTranslation();

    // M10: Derived filtered list
    const filteredJobs = jobs.filter(job => {
        const wtMatch = workTypeFilter === 'All' || job.workType === workTypeFilter;
        const stMatch = statusFilter === 'All' || job.status === statusFilter;
        return wtMatch && stMatch;
    });

    const fetchJobs = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const [jobsRes, machineryRes] = await Promise.all([
                jobAPI.getMyJobs(),
                machineryService.getBookings(),
            ]);

            const jobList = jobsRes?.data?.data || [];
            setJobs(Array.isArray(jobList) ? jobList : []);

            if (machineryRes.success) {
                setMachineryBookings(machineryRes.bookings || []);
            }
        } catch (err) {
            setError('Could not load bookings. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const updateJobStatus = async (jobId, newStatus) => {
        try {
            setLoading(true);
            if (newStatus === 'cancelled') {
                await jobAPI.cancelJob(jobId);
                Alert.alert('Success', 'Booking has been cancelled.');
            } else {
                await jobAPI.updateStatus(jobId, newStatus);
                Alert.alert('Success', `Booking status updated to ${newStatus.replace('_', ' ')}`);
            }
            fetchJobs();
        } catch (err) {
            Alert.alert('Error', 'Failed to update status.');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchJobs();
        }, [])
    );

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.centeredBox}>
                    <CustomLoader size={48} color={colors.primary} />
                    <Text style={styles.loadingText}>Loading your bookings...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.centeredBox}>
                    <MaterialIcons name="error-outline" size={56} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => fetchJobs()}>
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (activeCategory === 'machinery') {
            if (machineryBookings.length === 0) {
                return (
                    <EmptyState
                        icon="agriculture"
                        title="No Machinery Booked"
                        subtitle="Your machinery bookings will appear here."
                        action={{ label: 'Book Machinery', onPress: () => navigation.navigate('FarmerHome') }}
                    />
                );
            }
            return (
                <>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryText}>
                            {machineryBookings.length} booking{machineryBookings.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    {machineryBookings.map((booking) => (
                        <MachineryBookingCard
                            key={booking.id}
                            booking={booking}
                            navigation={navigation}
                            t={t}
                        />
                    ))}
                </>
            );
        }

        if (jobs.length === 0) {
            return (
                <EmptyState
                    icon="history"
                    title="No Jobs Posted Yet"
                    subtitle="Your posted jobs will appear here once you start hiring workers."
                    action={{ label: 'Post a Job', onPress: () => navigation.navigate('FarmerHome') }}
                />
            );
        }

        return (
            <>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>
                        {filteredJobs.length} of {jobs.length} booking{jobs.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                {filteredJobs.map((job, i) => (
                    <JobCard key={job.id || i} job={job} onUpdateStatus={updateJobStatus} navigation={navigation} />
                ))}
                {filteredJobs.length === 0 && (
                    <View style={styles.centeredBox}>
                        <MaterialIcons name="filter-list-off" size={48} color="#D1D5DB" />
                        <Text style={styles.emptyTitle}>No matches</Text>
                        <Text style={styles.emptySubtitle}>Try a different filter combination.</Text>
                    </View>
                )}
            </>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <TopBar title="Bookings" showBack navigation={navigation} />

            {/* Category selection tabs */}
            <View style={styles.categoryToggleRow}>
                <TouchableOpacity
                    style={[styles.categoryTab, activeCategory === 'jobs' && styles.categoryTabActive]}
                    onPress={() => setActiveCategory('jobs')}
                >
                    <MaterialIcons name="engineering" size={18} color={activeCategory === 'jobs' ? '#FFF' : '#64748B'} />
                    <Text style={[styles.categoryTabText, activeCategory === 'jobs' && styles.categoryTabTextActive]}>
                        Workers
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.categoryTab, activeCategory === 'machinery' && styles.categoryTabActive]}
                    onPress={() => setActiveCategory('machinery')}
                >
                    <MaterialIcons name="agriculture" size={18} color={activeCategory === 'machinery' ? '#FFF' : '#64748B'} />
                    <Text style={[styles.categoryTabText, activeCategory === 'machinery' && styles.categoryTabTextActive]}>
                        Machinery
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchJobs(true)}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {activeCategory === 'jobs' && (
                    <>
                        {/* M10: WorkType filter chips */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
                            {['All', 'Sowing', 'Harvesting', 'Irrigation', 'Labour', 'Tractor'].map(wt => (
                                <TouchableOpacity
                                    key={wt}
                                    style={[styles.filterChip, workTypeFilter === wt && styles.filterChipActive]}
                                    onPress={() => setWorkTypeFilter(wt)}
                                >
                                    <Text style={[styles.filterChipText, workTypeFilter === wt && styles.filterChipTextActive]}>{wt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* M10: Status filter chips */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
                            {['All', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'].map(st => (
                                <TouchableOpacity
                                    key={st}
                                    style={[styles.filterChip, statusFilter === st && styles.filterChipActive]}
                                    onPress={() => setStatusFilter(st)}
                                >
                                    <Text style={[styles.filterChipText, statusFilter === st && styles.filterChipTextActive]}>
                                        {st === 'All' ? 'All Status' : st.replace('_', ' ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                )}

                {renderContent()}
            </ScrollView>

            <BottomNavBar role="farmer" activeTab="Bookings" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100, flexGrow: 1 },

    // M10: Filter chips
    filterRow: { flexGrow: 0, marginBottom: 4, backgroundColor: '#F9FAFB' },
    filterRowContent: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterChipText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
    filterChipTextActive: { color: '#FFFFFF' },

    summaryRow: { marginBottom: 12 },
    summaryText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },

    // Job Card
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    workIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardHeaderText: { flex: 1 },
    workType: { fontSize: 19, fontWeight: '800', color: '#131811' },
    jobDate: { fontSize: 15, color: '#9CA3AF', marginTop: 2 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 9999,
    },
    statusText: { fontSize: 13, fontWeight: '800' },

    cardDetails: { gap: 6 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { fontSize: 16, color: '#6B7280' },

    // Empty / Error / Loading
    centeredBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: 60,
        gap: 12,
    },
    loadingText: { fontSize: 16, color: '#9CA3AF', marginTop: 8 },
    errorText: { fontSize: 15, color: '#EF4444', textAlign: 'center' },
    retryBtn: {
        marginTop: 8,
        paddingHorizontal: 28,
        paddingVertical: 12,
        backgroundColor: colors.primary,
        borderRadius: 9999,
    },
    retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#131811', textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
    postJobBtn: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
        backgroundColor: colors.primary,
        borderRadius: 9999,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    postJobBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },

    // Action Buttons
    actionRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 16,
    },
    actionBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    actionBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    disputeLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingVertical: 8,
        gap: 6,
    },
    disputeLinkText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#E11D48',
    },
    categoryToggleRow: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 12,
    },
    categoryTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    categoryTabActive: {
        backgroundColor: colors.primary,
    },
    categoryTabText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    categoryTabTextActive: {
        color: '#FFFFFF',
    },
});

export default FarmerHistoryScreen;
