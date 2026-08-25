// ── Alert Sound Manager ───────────────────────────────────────────
class AlertSoundManager {
  constructor() {
    this.audioContext    = null;
    this.customAudioBuffer = null;
    this.isPlaying       = false;
    this.repeatTimer     = null;
    this.settings = {
      enabled:       true,
      volume:        0.7,
      duration:      5,      // seconds to play
      repeat:        true,
      repeatInterval: 10,    // seconds between repeats
      soundType:     'beep', // 'beep', 'alarm', 'siren', 'custom'
      customFile:    null
    };
  }

  // ── Initialize AudioContext ───────────────────────────────────
  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  // ── Load settings from localStorage ──────────────────────────
  loadSettings() {
    try {
      const saved = localStorage.getItem('alert_sound_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return this.settings;
  }

  // ── Save settings to localStorage ────────────────────────────
  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(
        'alert_sound_settings',
        JSON.stringify(this.settings)
      );
    } catch (e) {}
  }

  // ── Generate beep sound ───────────────────────────────────────
  playBeep(frequency = 880, duration = 0.3, volume = 0.7) {
    const ctx = this.init();
    const oscillator = ctx.createOscillator();
    const gainNode   = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type            = 'sine';
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001, ctx.currentTime + duration
    );

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  // ── Generate alarm sound ──────────────────────────────────────
  playAlarm(volume = 0.7) {
    const ctx = this.init();
    const times = [0, 0.3, 0.6, 0.9, 1.2];

    times.forEach(t => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(440,  ctx.currentTime + t);
      osc.frequency.setValueAtTime(880,  ctx.currentTime + t + 0.15);
      osc.type = 'sawtooth';

      gain.gain.setValueAtTime(volume,   ctx.currentTime + t);
      gain.gain.setValueAtTime(0.001,    ctx.currentTime + t + 0.28);

      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime  + t + 0.3);
    });
  }

  // ── Generate siren sound ──────────────────────────────────────
  playSiren(volume = 0.7) {
    const ctx  = this.init();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Frequency sweep up and down
    osc.frequency.setValueAtTime(400,  ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.5);
    osc.frequency.linearRampToValueAtTime(400,  ctx.currentTime + 1.0);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 1.5);
    osc.frequency.linearRampToValueAtTime(400,  ctx.currentTime + 2.0);
    osc.type = 'sine';

    gain.gain.setValueAtTime(volume,  ctx.currentTime);
    gain.gain.setValueAtTime(volume,  ctx.currentTime + 1.9);
    gain.gain.setValueAtTime(0.001,   ctx.currentTime + 2.0);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2.0);
  }

  // ── Play custom audio file ────────────────────────────────────
  async playCustom(volume = 0.7) {
    if (!this.customAudioBuffer) return;
    const ctx    = this.init();
    const source = ctx.createBufferSource();
    const gain   = ctx.createGain();

    source.buffer = this.customAudioBuffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = volume;
    source.start();
  }

  // ── Load custom audio file ────────────────────────────────────
  async loadCustomFile(file) {
    const ctx        = this.init();
    const arrayBuffer = await file.arrayBuffer();
    this.customAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.settings.soundType  = 'custom';
    this.settings.customFile = file.name;
    this.saveSettings(this.settings);
    console.log('[Sound] Custom file loaded:', file.name);
  }

  // ── Play alert sound ──────────────────────────────────────────
 play(severity = 'High') {
  if (!this.settings.enabled) return;

  // ── Resume if suspended ───────────────────────────────────
  if (this.audioContext && this.audioContext.state === 'suspended') {
    this.audioContext.resume().then(() => {
      this._doPlay(severity);
    });
    return;
  }

  // ── Init if not created yet ───────────────────────────────
  if (!this.audioContext) {
    try {
      this.init();
    } catch (e) {
      return;
    }
  }

  this._doPlay(severity);
}

_doPlay(severity) {
  const vol = this.settings.volume;
  this.stop();

  const doPlay = () => {
    switch (this.settings.soundType) {
      case 'beep':
        if (severity === 'High') {
          this.playBeep(880, 0.2, vol);
          setTimeout(() => this.playBeep(880,  0.2, vol), 250);
          setTimeout(() => this.playBeep(1200, 0.4, vol), 500);
        } else {
          this.playBeep(660, 0.3, vol);
        }
        break;
      case 'alarm':  this.playAlarm(vol);  break;
      case 'siren':  this.playSiren(vol);  break;
      case 'custom': this.playCustom(vol); break;
      default:       this.playBeep(880, 0.3, vol);
    }
  };

  doPlay();

  if (this.settings.repeat) {
    const duration = (this.settings.duration || 30) * 1000;
    const interval = (this.settings.repeatInterval || 5) * 1000;
    const start    = Date.now();

    this.repeatTimer = setInterval(() => {
      if (Date.now() - start >= duration) {
        this.stop();
        return;
      }
      doPlay();
    }, interval);
  }
}
  // ── Stop all sounds ───────────────────────────────────────────
  stop() {
    if (this.repeatTimer) {
      clearInterval(this.repeatTimer);
      this.repeatTimer = null;
    }
  }

  // ── Test sound ────────────────────────────────────────────────
  test(type = null) {
    const savedType = this.settings.soundType;
    if (type) this.settings.soundType = type;
    this.stop();
    this.play('High');
    setTimeout(() => {
      this.stop();
      this.settings.soundType = savedType;
    }, 3000);
  }
}

const alertSound = new AlertSoundManager();
alertSound.loadSettings();
export default alertSound;