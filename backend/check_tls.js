const tls = require('tls');

const options = {
  host: 'ep-morning-shape-aqnxyj26.c-8.us-east-1.aws.neon.tech',
  port: 5432,
  servername: 'ep-morning-shape-aqnxyj26.c-8.us-east-1.aws.neon.tech',
  rejectUnauthorized: false
};

console.log('Connecting via TLS...');
const socket = tls.connect(options, () => {
  console.log('✅ TLS connection established!');
  console.log('Authorized:', socket.authorized);
  console.log('Cipher:', socket.getCipher());
  console.log('Peer Certificate:', socket.getPeerCertificate());
  socket.end();
});

socket.on('error', (err) => {
  console.error('❌ TLS Connection Error:', err);
});
