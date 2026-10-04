/**
 * An anvil strike synthesized with the Web Audio API: no audio file to load. A short filtered
 * noise burst is the hammer's impact; inharmonic partials with staggered decays are the ring of
 * struck steel.
 */

/** Frequency (Hz), level and decay (s) of each partial; inharmonic ratios make it sound like metal. */
const PARTIALS = [
  { frequency: 520, gain: 0.5, decay: 1.4 },
  { frequency: 1185, gain: 0.32, decay: 0.95 },
  { frequency: 1747, gain: 0.24, decay: 0.7 },
  { frequency: 2540, gain: 0.14, decay: 0.45 },
  { frequency: 3310, gain: 0.09, decay: 0.3 },
];

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
    return null;
  }
  context ??= new AudioContext();
  return context;
}

/** Plays one strike. Call it from a user gesture (a click) so browsers allow the audio. */
export function playAnvilStrike(volume = 0.35): void {
  const ctx = audioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  for (const { frequency, gain, decay } of PARTIALS) {
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    // A slight random detune keeps repeated strikes from sounding identical.
    oscillator.frequency.value = frequency * (1 + (Math.random() - 0.5) * 0.01);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.003);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    oscillator.connect(envelope).connect(master);
    oscillator.start(now);
    oscillator.stop(now + decay + 0.05);
  }

  const length = Math.floor(ctx.sampleRate * 0.03);
  const noise = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  const impact = ctx.createBufferSource();
  impact.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3200;
  filter.Q.value = 0.8;
  const impactGain = ctx.createGain();
  impactGain.gain.value = 0.6;
  impact.connect(filter).connect(impactGain).connect(master);
  impact.start(now);
}
