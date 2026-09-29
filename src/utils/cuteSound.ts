/**
 * Cute Audio Synthesizer via Web Audio API
 * Generates sweet, melodic music box & glockenspiel chimes with zero external assets.
 */

class CuteSoundService {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Sweet, adorable music box chime (E6 -> G#6 -> B6 -> E7 arpeggio)
   */
  public playCuteChime() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Sweet sparkling pentatonic arpeggio (C6, E6, G6, C7)
    const notes = [1046.5, 1318.51, 1567.98, 2093.0];
    const startTime = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const noteTime = startTime + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Sine wave with soft harmonic blend for a celesta/music box timbre
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.25, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.7);
    });
  }

  /**
   * Playful cute sparkle twinkle (shimmer effect)
   */
  public playSparkle() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const pitches = [1760.0, 2093.0, 2637.0, 3135.9];
    const startTime = ctx.currentTime;

    pitches.forEach((freq, i) => {
      const t = startTime + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  /**
   * Gentle cute pop (for Snooze, Dismiss, or check)
   */
  public playCutePop() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  /**
   * Joyful celebration fanfare for completed sessions & goals
   */
  public playCelebrationFanfare() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Sweet fanfare: G5, C6, E6, G6 (held bright)
    const fanfareNotes = [
      { freq: 783.99, delay: 0, dur: 0.15 },
      { freq: 1046.5, delay: 0.12, dur: 0.15 },
      { freq: 1318.51, delay: 0.24, dur: 0.18 },
      { freq: 1567.98, delay: 0.38, dur: 0.6 },
    ];
    const startTime = ctx.currentTime;

    fanfareNotes.forEach((n) => {
      const t = startTime + n.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + n.dur + 0.05);
    });
  }

  /**
   * Camera shutter sound for Barbie Polaroid fashion snaps
   */
  public playCameraClick() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Quick white-noise burst and mechanical click
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(ctx.currentTime);

    // Secondary shutter click
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.04);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

    oscGain.gain.setValueAtTime(0.001, ctx.currentTime);
    oscGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.04);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(ctx.currentTime + 0.04);
    osc.stop(ctx.currentTime + 0.1);
  }

  /**
   * Cute magical whoosh when changing outfits
   */
  public playOutfitWhoosh() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.15); // E6

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);

    // Followed by little sparkle
    setTimeout(() => {
      this.playSparkle();
    }, 60);
  }
}

export const cuteSound = new CuteSoundService();
