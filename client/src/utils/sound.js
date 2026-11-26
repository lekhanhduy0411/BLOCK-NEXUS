/**
 * Pure Web Audio API Synthesizer for BLOCK NEXUS
 * Zero external audio files — procedural tactile SFX + toggleable ambient cyber synth BGM.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.bgmEnabled = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bgmGain = null;
    this.isBgmPlaying = false;
  }

  ensureContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlock() {
    const ctx = this.ensureContext();
    if (ctx && this.bgmEnabled && !this.isBgmPlaying) {
      this.startBgm();
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = Boolean(enabled);
  }

  setBgmEnabled(enabled) {
    this.bgmEnabled = Boolean(enabled);
    if (this.bgmEnabled) {
      this.startBgm();
    } else {
      this.stopBgm();
    }
  }

  playTone({
    freqStart = 440,
    freqEnd = null,
    type = 'sine',
    duration = 0.1,
    volume = 0.14,
    delay = 0,
    attack = 0.006,
  }) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqStart), now);
    if (freqEnd !== null && freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playNoiseBurst({ duration = 0.07, volume = 0.09, filterFreq = 900, delay = 0 } = {}) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration + 0.01);
  }

  playButtonClick() {
    this.playTone({ freqStart: 540, freqEnd: 740, type: 'triangle', duration: 0.05, volume: 0.09 });
  }

  playPickup() {
    this.playTone({ freqStart: 390, freqEnd: 660, type: 'triangle', duration: 0.065, volume: 0.13 });
    this.playTone({ freqStart: 780, freqEnd: 980, type: 'sine', duration: 0.045, volume: 0.06, delay: 0.015 });
  }

  playPlace() {
    this.playTone({ freqStart: 195, freqEnd: 92, type: 'triangle', duration: 0.09, volume: 0.2 });
    this.playTone({ freqStart: 520, freqEnd: 340, type: 'sine', duration: 0.055, volume: 0.09 });
  }

  playInvalid() {
    this.playTone({ freqStart: 170, freqEnd: 120, type: 'sawtooth', duration: 0.085, volume: 0.1 });
    this.playTone({ freqStart: 135, freqEnd: 95, type: 'sawtooth', duration: 0.1, volume: 0.1, delay: 0.09 });
  }

  playRotate() {
    this.playTone({ freqStart: 520, freqEnd: 820, type: 'sine', duration: 0.045, volume: 0.1 });
  }

  playMove() {
    this.playTone({ freqStart: 310, freqEnd: 350, type: 'triangle', duration: 0.025, volume: 0.055 });
  }

  playHold() {
    this.playTone({ freqStart: 440, freqEnd: 660, type: 'sine', duration: 0.06, volume: 0.1 });
    this.playTone({ freqStart: 660, freqEnd: 520, type: 'triangle', duration: 0.06, volume: 0.08, delay: 0.05 });
  }

  playHardDrop() {
    this.playTone({ freqStart: 155, freqEnd: 44, type: 'triangle', duration: 0.14, volume: 0.28 });
    this.playNoiseBurst({ duration: 0.065, volume: 0.11, filterFreq: 650 });
  }

  playLineClear(combo = 1, linesCount = 1) {
    // Continuous 1-semitone pitch escalation per comboStreak (capped safely at +24 semitones / 2 octaves)
    const step = Math.min(Math.max(0, combo - 1), 24);
    const pitchRatio = Math.pow(1.059463, step);

    const notes =
      linesCount >= 4
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
        : linesCount >= 2
          ? [493.88, 622.25, 739.99, 987.77]
          : [440, 554.37, 659.25];

    notes.forEach((freq, idx) => {
      const scaled = Math.min(3600, freq * pitchRatio);
      this.playTone({
        freqStart: scaled,
        freqEnd: Math.min(3900, scaled * 1.025),
        type: idx === notes.length - 1 ? 'triangle' : 'sine',
        duration: 0.18 + idx * 0.03,
        volume: 0.14,
        delay: idx * 0.042,
      });
    });

    // Extra shimmering harmonic sparkle at x4+ and Hyper-Nova chime at x8+
    if (combo >= 4) {
      const overtone = Math.min(4200, 880 * pitchRatio);
      this.playTone({
        freqStart: overtone,
        freqEnd: Math.min(4600, overtone * 1.12),
        type: 'triangle',
        duration: 0.24,
        volume: 0.11,
        delay: 0.08,
      });
    }

    if (combo >= 8) {
      const hyperFreq = Math.min(4800, 1318.5 * Math.pow(1.059463, Math.min(step, 18)));
      this.playTone({
        freqStart: hyperFreq,
        freqEnd: Math.min(5200, hyperFreq * 1.25),
        type: 'sine',
        duration: 0.3,
        volume: 0.12,
        delay: 0.12,
      });
    }

    if (linesCount >= 2 || combo >= 2) {
      this.playNoiseBurst({
        duration: combo >= 8 ? 0.14 : 0.1,
        volume: combo >= 4 ? 0.085 : 0.065,
        filterFreq: Math.min(5000, 2200 + step * 110),
        delay: 0.03,
      });
    }
  }

  playLevelUp() {
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((freq, idx) => {
      this.playTone({
        freqStart: freq,
        freqEnd: freq * 1.01,
        type: 'triangle',
        duration: idx === fanfare.length - 1 ? 0.32 : 0.12,
        volume: 0.15,
        delay: idx * 0.075,
      });
    });
  }

  playCoinPurchase() {
    this.playTone({ freqStart: 987.77, freqEnd: 1046.5, type: 'sine', duration: 0.1, volume: 0.15 });
    this.playTone({ freqStart: 1318.5, freqEnd: 1567.98, type: 'triangle', duration: 0.24, volume: 0.16, delay: 0.08 });
  }

  playRivalOvertake() {
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      this.playTone({
        freqStart: freq,
        freqEnd: freq * 1.02,
        type: idx === notes.length - 1 ? 'triangle' : 'sine',
        duration: idx === notes.length - 1 ? 0.26 : 0.11,
        volume: 0.13,
        delay: idx * 0.055,
      });
    });
  }

  playCountdownBeep(step = 3) {
    // Ascending crisp synth pips: 3 -> 2 -> 1 -> GO(0)
    const freqMap = { 3: 523.25, 2: 659.25, 1: 880.0, 0: 1046.5 };
    const freq = freqMap[step] || 587.33;
    const isFinal = step <= 1;
    this.playTone({
      freqStart: freq,
      freqEnd: isFinal ? freq * 1.04 : freq,
      type: isFinal ? 'triangle' : 'sine',
      duration: isFinal ? 0.18 : 0.11,
      volume: isFinal ? 0.16 : 0.12,
    });
  }

  playStageVictory() {
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((freq, idx) => {
      this.playTone({
        freqStart: freq,
        freqEnd: freq * 1.015,
        type: idx === fanfare.length - 1 ? 'triangle' : 'sine',
        duration: idx === fanfare.length - 1 ? 0.36 : 0.13,
        volume: 0.15,
        delay: idx * 0.08,
      });
    });
  }

  playBossVictory() {
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    fanfare.forEach((freq, idx) => {
      this.playTone({
        freqStart: freq,
        freqEnd: freq * 1.025,
        type: idx >= 3 ? 'triangle' : 'sine',
        duration: idx === fanfare.length - 1 ? 0.52 : 0.16,
        volume: idx === fanfare.length - 1 ? 0.19 : 0.15,
        delay: idx * 0.075,
      });
    });
    // Shimmering harmonic sparkle chord
    this.playTone({
      freqStart: 2093.0,
      freqEnd: 2349.32,
      type: 'sine',
      duration: 0.45,
      volume: 0.11,
      delay: 0.36,
    });
    this.playNoiseBurst({
      duration: 0.18,
      volume: 0.07,
      filterFreq: 3800,
      delay: 0.32,
    });
  }

  playGameOver() {
    const descent = [392.0, 349.23, 311.13, 261.63, 196.0];
    descent.forEach((freq, idx) => {
      this.playTone({
        freqStart: freq,
        freqEnd: freq * 0.94,
        type: idx >= 3 ? 'sawtooth' : 'triangle',
        duration: idx === descent.length - 1 ? 0.42 : 0.16,
        volume: 0.11,
        delay: idx * 0.11,
      });
    });
  }

  // Ambient Cyberpunk Synthwave BGM Loop
  startBgm() {
    if (!this.bgmEnabled || this.isBgmPlaying) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.isBgmPlaying = true;
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.001, ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(0.065, ctx.currentTime + 0.6);
    this.bgmGain.connect(ctx.destination);

    // D minor cyberpunk synthwave arpeggio + sub bass
    const bassPattern = [73.42, 73.42, 87.31, 73.42, 65.41, 65.41, 58.27, 65.41];
    const arpPattern = [
      293.66, 349.23, 440.0, 523.25, 440.0, 349.23, 329.63, 293.66,
      261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 220.0,
    ];

    const stepMs = 240; // ~125 BPM 8th-notes
    const playStep = () => {
      if (!this.isBgmPlaying || !this.bgmEnabled || !this.ctx || !this.bgmGain) return;
      if (this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const step = this.bgmStep % 16;

      // Soft pulsing synth arp
      const arpOsc = this.ctx.createOscillator();
      const arpFilter = this.ctx.createBiquadFilter();
      const arpEnv = this.ctx.createGain();

      arpOsc.type = 'triangle';
      arpOsc.frequency.setValueAtTime(arpPattern[step], now);

      arpFilter.type = 'lowpass';
      arpFilter.frequency.setValueAtTime(1100, now);
      arpFilter.frequency.exponentialRampToValueAtTime(360, now + 0.21);

      arpEnv.gain.setValueAtTime(0.001, now);
      arpEnv.gain.linearRampToValueAtTime(0.42, now + 0.015);
      arpEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      arpOsc.connect(arpFilter);
      arpFilter.connect(arpEnv);
      arpEnv.connect(this.bgmGain);
      arpOsc.start(now);
      arpOsc.stop(now + 0.24);

      // Deep warm bass every 2 steps
      if (step % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassFilter = this.ctx.createBiquadFilter();
        const bassEnv = this.ctx.createGain();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassPattern[Math.floor(step / 2) % bassPattern.length], now);

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(240, now);

        bassEnv.gain.setValueAtTime(0.001, now);
        bassEnv.gain.linearRampToValueAtTime(0.55, now + 0.02);
        bassEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassEnv);
        bassEnv.connect(this.bgmGain);
        bassOsc.start(now);
        bassOsc.stop(now + 0.45);
      }

      this.bgmStep += 1;
    };

    playStep();
    this.bgmTimer = setInterval(playStep, stepMs);
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.bgmGain.gain.cancelScheduledValues(now);
        this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
        this.bgmGain.gain.linearRampToValueAtTime(0.0001, now + 0.2);
      } catch {
        // Ignore cleanup race
      }
      this.bgmGain = null;
    }
  }
}

export const soundEngine = new SoundEngine();
