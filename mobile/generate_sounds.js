const fs = require('fs');
const path = require('path');

function createWav({ durationSec, sampleRate = 44100, generateSample }) {
  const numSamples = Math.floor(durationSec * sampleRate);
  const blockAlign = 2; // 16-bit mono
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // Subchunk 1 (fmt )
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // 16 for PCM
  buffer.writeUInt16LE(1, 20);  // 1 = Linear PCM
  buffer.writeUInt16LE(1, 22);  // 1 = Mono channel
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // Bits per sample

  // Subchunk 2 (data)
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = generateSample(t, durationSec);
    sample = Math.max(-1, Math.min(1, sample));
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

const dir = path.join(__dirname, 'src', 'assets', 'sounds');
fs.mkdirSync(dir, { recursive: true });

// 1. Job Posted: Warm resonant rural brass/temple bell chime (C5 + E5 + G5 harmonics)
const jobPostedWav = createWav({
  durationSec: 1.4,
  generateSample: (t) => {
    const env = Math.exp(-3.5 * t);
    const s1 = Math.sin(2 * Math.PI * 523.25 * t) * 0.45;
    const s2 = Math.sin(2 * Math.PI * 659.25 * t) * 0.35;
    const s3 = Math.sin(2 * Math.PI * 783.99 * t) * 0.20;
    const overtone = Math.sin(2 * Math.PI * 1046.50 * t) * 0.10 * Math.exp(-6 * t);
    return (s1 + s2 + s3 + overtone) * env;
  }
});
fs.writeFileSync(path.join(dir, 'job_posted.wav'), jobPostedWav);
console.log('✅ Created job_posted.wav:', jobPostedWav.length, 'bytes');

// 2. Job Accepted: Cheerful ascending 4-note harvest arpeggio (D5 -> F#5 -> A5 -> D6)
const jobAcceptedWav = createWav({
  durationSec: 1.6,
  generateSample: (t) => {
    const notes = [
      { start: 0.00, freq: 587.33, amp: 0.30, decay: 4.0 },
      { start: 0.16, freq: 739.99, amp: 0.35, decay: 3.5 },
      { start: 0.32, freq: 880.00, amp: 0.40, decay: 3.0 },
      { start: 0.48, freq: 1174.66, amp: 0.45, decay: 2.2 },
    ];
    let sum = 0;
    for (const n of notes) {
      if (t >= n.start) {
        const dt = t - n.start;
        const env = Math.exp(-n.decay * dt);
        const wave = Math.sin(2 * Math.PI * n.freq * dt) + 0.25 * Math.sin(4 * Math.PI * n.freq * dt);
        sum += wave * n.amp * env;
      }
    }
    return sum;
  }
});
fs.writeFileSync(path.join(dir, 'job_accepted.wav'), jobAcceptedWav);
console.log('✅ Created job_accepted.wav:', jobAcceptedWav.length, 'bytes');

