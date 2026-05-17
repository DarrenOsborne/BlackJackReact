class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public enable() {
    this.enabled = true;
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public disable() {
    this.enabled = false;
  }

  public playChipClink() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // Two high frequency oscillators slightly detuned
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(3500, t);
    osc2.frequency.setValueAtTime(4500, t);
    
    // Quick decay
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.5, t + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.1);
    osc2.stop(t + 0.1);
  }

  public playCardSlide() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const duration = 0.15;

    // Create a short noise burst
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to make it sound like paper/felt sliding
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + duration);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noise.start(t);
  }

  public playShuffle() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const duration = 0.8;

    // Riffle shuffle sound: longer noise with modulating amplitude
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1500;
    filter.Q.value = 0.5;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    
    // Riffle effect: modulating volume rapidly
    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 30; // 30Hz riffle
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.2;
    
    lfo.connect(lfoGain);
    
    const lfoGainOffset = this.ctx.createGain();
    lfoGainOffset.gain.value = 0; // we don't want the LFO directly, we want it to modulate gain
    
    // We can just modulate the gain directly or use an envelope
    gainNode.gain.linearRampToValueAtTime(0.4, t + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.3, t + 0.6);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noise.start(t);
    lfo.start(t);
    lfo.stop(t + duration);
  }
}

export const soundEngine = new SoundEngine();
