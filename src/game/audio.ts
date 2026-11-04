/**
 * Procedural Web Audio Synthesizer
 * 100% code-generated sound effects, engine telemetry drone, and ambient synthwave soundtrack
 * Zero external audio assets required.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private isMusicRunning: boolean = false;
  private musicStep: number = 0;
  private musicTimer: number | null = null;

  constructor() {
    // Loaded from localStorage if available
    try {
      this.isMuted = localStorage.getItem('cyber_horizon_muted') === 'true';
    } catch {
      this.isMuted = false;
    }
  }

  private initContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.isMuted ? 0 : 0.7;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.35;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.85;
    this.sfxGain.connect(this.masterGain);

    this.startEngineDrone();
    this.startMusicLoop();
  }

  public activate() {
    this.initContext();
  }

  public toggleMute(): boolean {
    this.initContext();
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('cyber_horizon_muted', String(this.isMuted));
    } catch {}

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.7, now + 0.05);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Continuous procedural engine thruster sound
   */
  private startEngineDrone() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // Low A1

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);

      this.engineOsc.start();
    } catch {
      // Audio might be blocked initially
    }
  }

  public updateEngineTelemetry(speedRatio: number, isBoosting: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineFilter || !this.engineGain) return;
    const now = this.ctx.currentTime;
    const targetFreq = 50 + speedRatio * 80 + (isBoosting ? 60 : 0);
    const filterFreq = 120 + speedRatio * 400 + (isBoosting ? 450 : 0);
    const targetGain = 0.04 + speedRatio * 0.08 + (isBoosting ? 0.06 : 0);

    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  /**
   * Player plasma laser shot
   */
  public playLaser(weaponLevel: number = 1) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = weaponLevel >= 3 ? 'square' : 'sawtooth';
    const startFreq = 780 + weaponLevel * 60;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Heavy cannon / Mortar fire
   */
  public playHeavyShot() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * EMP Shockwave Nova release
   */
  public playEmpShockwave() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.6);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.6);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  /**
   * Enemy or projectile explosion
   */
  public playExplosion(isLarge: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const duration = isLarge ? 0.7 : 0.35;
    const now = this.ctx.currentTime;

    // Filtered noise buffer for visceral explosion crunch
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLarge ? 700 : 900, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isLarge ? 0.65 : 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(now);

    // Sub rumble layer
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(isLarge ? 90 : 130, now);
    subOsc.frequency.exponentialRampToValueAtTime(20, now + duration);

    subGain.gain.setValueAtTime(isLarge ? 0.5 : 0.25, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    subOsc.start(now);
    subOsc.stop(now + duration);
  }

  /**
   * Shield deflection / hit flash sound
   */
  public playShieldHit() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Player Hull Damage Impact
   */
  public playHullDamage() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Powerup pickup chime - uplifting pentatonic sweep
   */
  public playPowerupPickup() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const start = this.ctx.currentTime + idx * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.2);
    });
  }

  /**
   * Boss incoming alarm siren
   */
  public playBossWarning() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    for (let rep = 0; rep < 2; rep++) {
      const timeOffset = rep * 0.45;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now + timeOffset);
      osc.frequency.linearRampToValueAtTime(880, now + timeOffset + 0.25);

      gain.gain.setValueAtTime(0.28, now + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + 0.35);
    }
  }

  /**
   * Ambient procedural synthwave arpeggio loop
   */
  private startMusicLoop() {
    if (this.isMusicRunning) return;
    this.isMusicRunning = true;

    // Cyberpunk progression: Dm - F - C - Bb
    const rootNotes = [146.83, 174.61, 130.81, 116.54]; // D3, F3, C3, Bb2
    const arpScales = [
      [293.66, 349.23, 440.0, 587.33], // D4, F4, A4, D5
      [349.23, 440.0, 523.25, 698.46], // F4, A4, C5, F5
      [261.63, 329.63, 392.0, 523.25], // C4, E4, G4, C5
      [233.08, 293.66, 349.23, 466.16], // Bb3, D4, F4, Bb4
    ];

    const stepDuration = 0.16; // ~94 BPM 16th notes

    const tickMusic = () => {
      if (!this.ctx || !this.musicGain || this.isMuted) {
        this.musicTimer = window.setTimeout(tickMusic, stepDuration * 1000);
        return;
      }

      const now = this.ctx.currentTime;
      const measure = Math.floor(this.musicStep / 16) % 4;
      const stepInMeasure = this.musicStep % 16;

      // Bass punch on beats 0, 4, 8, 12
      if (stepInMeasure % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(rootNotes[measure] / 2, now);

        bassGain.gain.setValueAtTime(0.25, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 3.5);

        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);

        bassOsc.start(now);
        bassOsc.stop(now + stepDuration * 3.5);
      }

      // Arpeggiator note
      const arpNotes = arpScales[measure];
      const noteFreq = arpNotes[stepInMeasure % arpNotes.length];

      const arpOsc = this.ctx.createOscillator();
      const arpFilter = this.ctx.createBiquadFilter();
      const arpGain = this.ctx.createGain();

      arpOsc.type = 'sawtooth';
      arpOsc.frequency.setValueAtTime(noteFreq, now);

      arpFilter.type = 'lowpass';
      arpFilter.frequency.setValueAtTime(950 + (stepInMeasure % 8) * 120, now);

      arpGain.gain.setValueAtTime(0.09, now);
      arpGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.95);

      arpOsc.connect(arpFilter);
      arpFilter.connect(arpGain);
      arpGain.connect(this.musicGain);

      arpOsc.start(now);
      arpOsc.stop(now + stepDuration);

      this.musicStep++;
      this.musicTimer = window.setTimeout(tickMusic, stepDuration * 1000);
    };

    this.musicTimer = window.setTimeout(tickMusic, 200);
  }

  public dispose() {
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {}
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const sound = new SoundEngine();
