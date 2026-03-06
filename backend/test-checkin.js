async function test() {
  try {
    // 1. Login to get token
    const authRes = await fetch('http://localhost:5000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9888000001', otp: '1234', role: 'worker' })
    });
    const auth = await authRes.json();
    const token = auth.data.accessToken;
    const workerId = auth.data.user.id;

    console.log('Got token for:', auth.data.user.phone);

    // 2. Find the active job
    const jobId = 'a40437d4-ce35-44d4-b0f7-785665190d74';

    // 3. Try to check in
    const res = await fetch('http://localhost:5000/api/attendance/check-in', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        jobId,
        workerId,
        qrCodeIn: jobId + '|' + Date.now(),
        checkInLatitude: 15.744621,
        checkInLongitude: 79.275106
      })
    });
    
    const data = await res.json();
    if (!res.ok) {
      console.error('500 ERROR CAUSE:', JSON.stringify(data, null, 2));
    } else {
      console.log('SUCCESS:', data);
    }
  } catch (err) {
    console.error(err.message);
  }
}
test();
