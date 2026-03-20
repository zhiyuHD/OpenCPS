// Web Audio API 原生音效合成器
class AudioSynthesizer {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.volume = 0.5;
    this.init();
  }

  init() {
    try {
      // 创建AudioContext（兼容性处理）
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
    } catch (error) {
      console.warn('Web Audio API 不支持:', error);
      this.enabled = false;
    }
  }

  // 播放音效的通用方法
  playTone(frequency, duration, type = 'sine', volumeMultiplier = 1) {
    if (!this.enabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(this.volume * volumeMultiplier, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      console.warn('音效播放失败:', error);
    }
  }

  // ① 加分音效（清脆的高音）
  playAddPoints() {
    if (!this.enabled) return;
    
    // 快速上升的音阶
    this.playTone(523, 0.1, 'sine', 0.3); // C5
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.3), 50); // E5
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.4), 100); // G5
  }

  // ② 扣分音效（低沉的错误音）
  playDeductPoints() {
    if (!this.enabled) return;
    
    // 下降的低音
    this.playTone(220, 0.15, 'sawtooth', 0.4); // A3
    setTimeout(() => this.playTone(185, 0.2, 'sawtooth', 0.5), 80); // F#3
  }

  // ③ 喂食/玩耍音效（快乐的跳跃音）
  playHappyAction() {
    if (!this.enabled) return;
    
    // 轻快的跳跃音
    this.playTone(440, 0.08, 'sine', 0.3); // A4
    setTimeout(() => this.playTone(554, 0.08, 'sine', 0.3), 60); // C#5
    setTimeout(() => this.playTone(659, 0.12, 'sine', 0.4), 120); // E5
  }

  // ④ 升级音效（华丽的和弦）
  playLevelUp() {
    if (!this.enabled) return;
    
    // 上升的华丽音阶
    this.playTone(523, 0.1, 'sine', 0.3); // C5
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.3), 80); // E5
    setTimeout(() => this.playTone(784, 0.1, 'sine', 0.3), 160); // G5
    setTimeout(() => this.playTone(1047, 0.25, 'sine', 0.5), 240); // C6
  }

  // ⑤ PK战斗碰撞音效
  playBattleHit() {
    if (!this.enabled) return;
    
    // 爆炸式的碰撞音
    this.playTone(100, 0.1, 'sawtooth', 0.6);
    setTimeout(() => this.playTone(80, 0.15, 'square', 0.5), 50);
  }

  // ⑥ 成功音效
  playSuccess() {
    if (!this.enabled) return;
    
    this.playTone(659, 0.1, 'sine', 0.3);
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.4), 80);
  }

  // ⑦ 失败音效
  playFail() {
    if (!this.enabled) return;
    
    this.playTone(196, 0.2, 'sawtooth', 0.4);
  }

  // 设置音量
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  // 切换开关
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // 获取状态
  isEnabled() {
    return this.enabled;
  }
}

// 创建全局实例
export const audioSynthesizer = new AudioSynthesizer();
