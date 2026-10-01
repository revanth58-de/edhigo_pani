import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  INITIAL_USERS,
  INITIAL_JOBS,
  INITIAL_NEARBY_WORKERS,
  INITIAL_GROUPS,
  INITIAL_MACHINERY,
  INITIAL_NOTIFICATIONS,
  INITIAL_EARNINGS
} from './mockData';

const MOCK_STORAGE_PREFIX = '@dinasari_mock_';

class MockStateEngine {
  constructor() {
    this.currentUser = { ...INITIAL_USERS.farmer };
    this.jobs = [...INITIAL_JOBS];
    this.groups = [...INITIAL_GROUPS];
    this.nearbyWorkers = [...INITIAL_NEARBY_WORKERS];
    this.machinery = [...INITIAL_MACHINERY];
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.earnings = { ...INITIAL_EARNINGS };
    this.attendanceRecords = {};
    this.payments = [];
    this.disputes = [];
    this.machineryBookings = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    try {
      const savedJobs = await AsyncStorage.getItem(MOCK_STORAGE_PREFIX + 'jobs');
      if (savedJobs) this.jobs = JSON.parse(savedJobs);

      const savedGroups = await AsyncStorage.getItem(MOCK_STORAGE_PREFIX + 'groups');
      if (savedGroups) this.groups = JSON.parse(savedGroups);

      const savedUser = await AsyncStorage.getItem(MOCK_STORAGE_PREFIX + 'user');
      if (savedUser) this.currentUser = JSON.parse(savedUser);
    } catch (e) {
      console.warn('Mock engine storage load error:', e);
    }
    this.initialized = true;
  }

  async persist() {
    try {
      await AsyncStorage.setItem(MOCK_STORAGE_PREFIX + 'jobs', JSON.stringify(this.jobs));
      await AsyncStorage.setItem(MOCK_STORAGE_PREFIX + 'groups', JSON.stringify(this.groups));
      await AsyncStorage.setItem(MOCK_STORAGE_PREFIX + 'user', JSON.stringify(this.currentUser));
    } catch (e) {
      console.warn('Mock engine storage save error:', e);
    }
  }

  // ── Handler Router ──
  async handleRequest(config) {
    await this.initialize();
    
    // Simulate natural mobile API latency (80ms - 200ms)
    await new Promise(r => setTimeout(r, 120));

    const method = (config.method || 'get').toLowerCase();
    // Normalize URL
    let url = config.url || '';
    url = url.replace(/^https?:\/\/[^\/]+/, '');
    url = url.replace(/^\/api/, '');
    const [pathOnly] = url.split('?');
    const params = config.params || {};
    let data = {};
    if (config.data) {
      try {
        data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      } catch {
        data = config.data;
      }
    }

    console.log(`[Offline Mock Engine] ${method.toUpperCase()} ${pathOnly}`, { params, data });

    // ── AUTH ──
    if (pathOnly === '/auth/send-otp') {
      const phone = data.phone || '9876543210';
      return this.success({ success: true, message: `OTP sent to +91 ${phone}`, phone });
    }

    if (pathOnly === '/auth/verify-otp') {
      const phone = data.phone || '9876543210';
      const role = data.role || this.currentUser.role || 'farmer';
      let matchedUser = Object.values(INITIAL_USERS).find(u => u.role === role) || INITIAL_USERS.farmer;
      
      this.currentUser = {
        ...matchedUser,
        phone,
        name: data.name || matchedUser.name,
        role: data.role || matchedUser.role,
        village: data.village || matchedUser.village,
      };
      await this.persist();

      return this.success({
        success: true,
        accessToken: `mock_jwt_access_token_${Date.now()}`,
        refreshToken: `mock_jwt_refresh_token_${Date.now()}`,
        user: this.currentUser,
      });
    }

    if (pathOnly === '/auth/me') {
      return this.success({ success: true, user: this.currentUser });
    }

    if (pathOnly === '/auth/profile' && method === 'put') {
      this.currentUser = { ...this.currentUser, ...data };
      await this.persist();
      return this.success({ success: true, user: this.currentUser });
    }

    if (pathOnly === '/auth/set-role') {
      const role = data.role || 'farmer';
      const template = INITIAL_USERS[role] || INITIAL_USERS.farmer;
      this.currentUser = {
        ...this.currentUser,
        role,
        skills: template.skills || undefined,
        crops: template.crops || undefined,
        dailyWageRate: template.dailyWageRate || undefined,
        groupName: template.groupName || undefined,
      };
      await this.persist();
      return this.success({ success: true, user: this.currentUser });
    }

    if (pathOnly === '/auth/refresh') {
      return this.success({
        accessToken: `mock_jwt_access_token_${Date.now()}`,
        refreshToken: `mock_jwt_refresh_token_${Date.now()}`,
      });
    }

    // ── JOBS ──
    if (pathOnly === '/jobs' && method === 'get') {
      let filtered = [...this.jobs];
      if (params.crop) filtered = filtered.filter(j => j.crop?.toLowerCase().includes(params.crop.toLowerCase()));
      if (params.workType) filtered = filtered.filter(j => j.workType?.toLowerCase().includes(params.workType.toLowerCase()));
      if (params.status) filtered = filtered.filter(j => j.status === params.status);
      return this.success(filtered);
    }

    if (pathOnly === '/jobs' && method === 'post') {
      const newJob = {
        id: `job_${Date.now()}`,
        title: data.title || `${data.crop || 'Field'} Work (${data.workType || 'General'})`,
        description: data.description || 'Farm work requested by farmer.',
        crop: data.crop || 'Paddy',
        workType: data.workType || 'Harvesting',
        location: data.location || this.currentUser.village || 'Warangal Farm',
        village: data.village || this.currentUser.village || 'Warangal',
        district: 'Warangal',
        latitude: data.latitude || 17.9784,
        longitude: data.longitude || 79.5941,
        distanceKm: 1.5,
        wage: Number(data.wage) || 700,
        wageType: data.wageType || 'daily',
        workersNeeded: Number(data.workersNeeded) || 4,
        workersAccepted: 0,
        status: 'open',
        startDate: data.startDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        durationDays: Number(data.durationDays) || 2,
        farmer: {
          id: this.currentUser.id,
          name: this.currentUser.name,
          phone: this.currentUser.phone,
          rating: this.currentUser.rating || 4.8,
          village: this.currentUser.village,
        },
        transportProvided: !!data.transportProvided,
        foodProvided: !!data.foodProvided,
        createdAt: new Date().toISOString(),
      };
      this.jobs.unshift(newJob);
      await this.persist();
      return this.success(newJob);
    }

    if (pathOnly === '/jobs/my-jobs') {
      const myJobs = this.jobs.filter(j => j.farmer?.id === this.currentUser.id || j.farmer?.phone === this.currentUser.phone);
      return this.success(myJobs.length > 0 ? myJobs : this.jobs.slice(0, 3));
    }

    if (pathOnly === '/jobs/my-work' || pathOnly === '/jobs/worker-history') {
      const workerJobs = this.jobs.filter(j => j.status === 'accepted' || j.status === 'in_progress' || j.status === 'completed');
      return this.success(workerJobs);
    }

    if (pathOnly === '/jobs/nearby-workers' || pathOnly === '/workers/nearby') {
      return this.success(this.nearbyWorkers);
    }

    // Dynamic job routes: /jobs/:id/...
    const jobDetailMatch = pathOnly.match(/^\/jobs\/([^\/]+)$/);
    if (jobDetailMatch) {
      const jobId = jobDetailMatch[1];
      if (method === 'get') {
        const job = this.jobs.find(j => j.id === jobId) || this.jobs[0];
        return this.success(job);
      }
      if (method === 'delete') {
        this.jobs = this.jobs.filter(j => j.id !== jobId);
        await this.persist();
        return this.success({ success: true, message: 'Job cancelled' });
      }
    }

    const jobAcceptMatch = pathOnly.match(/^\/jobs\/([^\/]+)\/accept$/);
    if (jobAcceptMatch && method === 'post') {
      const jobId = jobAcceptMatch[1];
      const job = this.jobs.find(j => j.id === jobId);
      if (job) {
        job.workersAccepted = Math.min(job.workersNeeded, (job.workersAccepted || 0) + 1);
        job.status = job.workersAccepted >= job.workersNeeded ? 'accepted' : 'open';
        await this.persist();
        return this.success({ success: true, job });
      }
      return this.success({ success: true });
    }

    const jobWithdrawMatch = pathOnly.match(/^\/jobs\/([^\/]+)\/withdraw$/);
    if (jobWithdrawMatch && method === 'post') {
      const jobId = jobWithdrawMatch[1];
      const job = this.jobs.find(j => j.id === jobId);
      if (job) {
        job.workersAccepted = Math.max(0, (job.workersAccepted || 1) - 1);
        job.status = 'open';
        await this.persist();
      }
      return this.success({ success: true, message: 'Withdrawn from job' });
    }

    const jobStatusMatch = pathOnly.match(/^\/jobs\/([^\/]+)\/status$/);
    if (jobStatusMatch && method === 'put') {
      const jobId = jobStatusMatch[1];
      const job = this.jobs.find(j => j.id === jobId);
      if (job) {
        job.status = data.status || job.status;
        await this.persist();
        return this.success({ success: true, job });
      }
      return this.success({ success: true });
    }

    // ── ATTENDANCE ──
    if (pathOnly === '/attendance/check-in') {
      const rec = {
        jobId: data.jobId,
        workerId: data.workerId || this.currentUser.id,
        checkInTime: new Date().toISOString(),
        status: 'present',
        verifiedByQr: true,
      };
      this.attendanceRecords[data.jobId] = this.attendanceRecords[data.jobId] || [];
      this.attendanceRecords[data.jobId].push(rec);
      return this.success({ success: true, attendance: rec });
    }

    if (pathOnly === '/attendance/check-out') {
      const rec = {
        jobId: data.jobId,
        workerId: data.workerId || this.currentUser.id,
        checkOutTime: new Date().toISOString(),
        status: 'completed',
      };
      return this.success({ success: true, attendance: rec });
    }

    const attendanceRecordsMatch = pathOnly.match(/^\/attendance\/([^\/]+)$/);
    if (attendanceRecordsMatch) {
      const jobId = attendanceRecordsMatch[1];
      return this.success(this.attendanceRecords[jobId] || [
        { workerId: 'w_1', name: 'Suresh Kumar', status: 'present', checkInTime: '08:15 AM' },
        { workerId: 'w_2', name: 'Lakshmi Devi', status: 'present', checkInTime: '08:20 AM' },
      ]);
    }

    // ── PAYMENTS & EARNINGS ──
    if (pathOnly === '/workers/earnings') {
      return this.success(this.earnings);
    }

    if (pathOnly === '/payments' && method === 'post') {
      const payment = {
        id: `pay_${Date.now()}`,
        jobId: data.jobId,
        amount: data.amount || 2800,
        upiId: data.upiId || 'farmer@upi',
        status: 'completed',
        timestamp: new Date().toISOString(),
      };
      this.payments.push(payment);
      return this.success(payment);
    }

    if (pathOnly.startsWith('/payments/history/')) {
      return this.success(this.earnings.recentPayouts);
    }

    if (pathOnly.startsWith('/payments/razorpay/order')) {
      return this.success({
        id: `order_mock_${Date.now()}`,
        amount: (data.amount || 1000) * 100,
        currency: 'INR',
        keyId: 'rzp_test_mockKey123',
      });
    }

    if (pathOnly.startsWith('/payments/razorpay/verify')) {
      return this.success({
        success: true,
        paymentId: `pay_mock_${Date.now()}`,
        status: 'verified',
      });
    }

    if (pathOnly.match(/^\/payments\/[^\/]+\/confirm$/)) {
      return this.success({ success: true, status: 'confirmed', upiRef: data.upiRef || 'UPI123456789' });
    }

    // ── GROUPS ──
    if (pathOnly === '/groups/my-groups') {
      return this.success(this.groups);
    }

    if (pathOnly === '/groups' && method === 'post') {
      const newGrp = {
        id: `grp_${Date.now()}`,
        name: data.name || 'New Farm Team',
        leaderId: this.currentUser.id,
        leaderName: this.currentUser.name,
        village: data.village || this.currentUser.village,
        membersCount: 1,
        maxCapacity: data.maxCapacity || 15,
        status: 'available',
        members: [{ id: this.currentUser.id, name: this.currentUser.name, role: 'leader', status: 'present' }],
      };
      this.groups.push(newGrp);
      await this.persist();
      return this.success(newGrp);
    }

    const groupDetailMatch = pathOnly.match(/^\/groups\/([^\/]+)$/);
    if (groupDetailMatch && method === 'get') {
      const grp = this.groups.find(g => g.id === groupDetailMatch[1]) || this.groups[0];
      return this.success(grp);
    }

    const groupMembersMatch = pathOnly.match(/^\/groups\/([^\/]+)\/members(\/by-phone)?$/);
    if (groupMembersMatch && method === 'post') {
      const grpId = groupMembersMatch[1];
      const grp = this.groups.find(g => g.id === grpId);
      if (grp) {
        const newMember = {
          id: `m_${Date.now()}`,
          name: data.name || `Worker (${data.phone?.slice(-4) || '9999'})`,
          phone: data.phone || '9876543229',
          role: 'member',
          status: 'present',
          rating: 4.8,
        };
        grp.members.push(newMember);
        grp.membersCount = grp.members.length;
        await this.persist();
        return this.success({ success: true, member: newMember });
      }
      return this.success({ success: true });
    }

    if (pathOnly === '/groups/pending-invites') {
      return this.success([
        { id: 'inv_1', groupId: 'grp_001', groupName: 'Kisan Sena Team', invitedBy: 'Venkatesh Rao' }
      ]);
    }

    // ── NOTIFICATIONS ──
    if (pathOnly === '/notifications') {
      if (method === 'get') return this.success(this.notifications);
      if (method === 'delete') {
        this.notifications = [];
        return this.success({ success: true });
      }
    }

    if (pathOnly === '/notifications/read-all') {
      this.notifications.forEach(n => n.read = true);
      return this.success({ success: true });
    }

    const notifReadMatch = pathOnly.match(/^\/notifications\/([^\/]+)\/read$/);
    if (notifReadMatch) {
      const n = this.notifications.find(item => item.id === notifReadMatch[1]);
      if (n) n.read = true;
      return this.success({ success: true });
    }

    // ── MACHINERY ──
    if (pathOnly === '/machinery/listings' || pathOnly === '/machinery') {
      if (method === 'get') return this.success(this.machinery);
      if (method === 'post') {
        const newMach = {
          id: `mach_${Date.now()}`,
          ...data,
          rating: 5.0,
          totalBookings: 0,
          isAvailable: true,
        };
        this.machinery.push(newMach);
        return this.success(newMach);
      }
    }

    if (pathOnly === '/machinery/book' && method === 'post') {
      const booking = {
        id: `book_${Date.now()}`,
        machineryId: data.machineryId,
        farmerId: this.currentUser.id,
        startDate: data.startDate,
        hours: data.hours || 8,
        totalCost: data.totalCost || 6000,
        status: 'confirmed',
      };
      this.machineryBookings.push(booking);
      return this.success(booking);
    }

    if (pathOnly === '/machinery/bookings') {
      return this.success(this.machineryBookings.length > 0 ? this.machineryBookings : [
        {
          id: 'book_mock_1',
          machinery: this.machinery[0],
          status: 'confirmed',
          date: '2026-09-15',
          hours: 6,
          totalCost: 4500,
        }
      ]);
    }

    if (pathOnly === '/machinery/owner/listings') {
      return this.success(this.machinery.slice(0, 1));
    }

    if (pathOnly === '/machinery/owner/bookings') {
      return this.success([]);
    }

    // ── DISPUTES ──
    if (pathOnly === '/disputes' && method === 'post') {
      const d = { id: `disp_${Date.now()}`, ...data, status: 'open', createdAt: new Date().toISOString() };
      this.disputes.push(d);
      return this.success({ success: true, dispute: d });
    }

    if (pathOnly === '/disputes/my') {
      return this.success(this.disputes);
    }

    // ── RATINGS ──
    if (pathOnly.startsWith('/ratings')) {
      return this.success({ success: true, message: 'Rating recorded successfully' });
    }

    // ── UPLOAD ──
    if (pathOnly === '/upload/profile-picture') {
      return this.success({
        success: true,
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      });
    }

    // ── FALLBACK FOR UNHANDLED PATHS ──
    return this.success({ success: true, mockHandled: true, path: pathOnly });
  }

  success(data, status = 200) {
    return {
      data,
      status,
      statusText: 'OK',
      headers: {},
      config: {},
    };
  }
}

export const mockEngine = new MockStateEngine();
