// 音频管理器
class AudioManager {
  constructor() {
    this.bgmPlayer = null;
    this.effectsCache = {};
    this.bgmVolume = 0.3;
    this.effectVolume = 0.5;
    this.bgmEnabled = true;
    this.effectEnabled = true;
    this.currentBgm = null;
  }

  // 初始化
  init() {
    this.bgmPlayer = new Audio();
    this.bgmPlayer.loop = true;
    this.bgmPlayer.volume = this.bgmVolume;
    
    // 从localStorage加载设置
    const savedSettings = localStorage.getItem('audioSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      this.bgmVolume = settings.bgmVolume ?? 0.3;
      this.effectVolume = settings.effectVolume ?? 0.5;
      this.bgmEnabled = settings.bgmEnabled ?? true;
      this.effectEnabled = settings.effectEnabled ?? true;
    }
  }

  // 播放背景音乐
  playBGM(name) {
    if (!this.bgmEnabled) return;
    
    try {
      // 如果已经在播放相同的音乐，不重复播放
      if (this.currentBgm === name && !this.bgmPlayer.paused) {
        return;
      }
      
      this.currentBgm = name;
      this.bgmPlayer.src = `/src/assets/sounds/bgm/${name}.mp3`;
      this.bgmPlayer.volume = this.bgmVolume;
      this.bgmPlayer.play().catch(err => {
        console.log('BGM播放失败（可能需要用户交互）:', err);
      });
    } catch (error) {
      console.log('BGM加载失败:', error);
    }
  }

  // 停止背景音乐
  stopBGM() {
    if (this.bgmPlayer) {
      this.bgmPlayer.pause();
      this.bgmPlayer.currentTime = 0;
      this.currentBgm = null;
    }
  }

  // 暂停背景音乐
  pauseBGM() {
    if (this.bgmPlayer) {
      this.bgmPlayer.pause();
    }
  }

  // 继续播放背景音乐
  resumeBGM() {
    if (this.bgmPlayer && this.bgmEnabled) {
      this.bgmPlayer.play().catch(err => {
        console.log('BGM恢复播放失败:', err);
      });
    }
  }

  // 播放音效
  playEffect(name) {
    if (!this.effectEnabled) return;
    
    try {
      // 创建新的Audio实例以支持同时播放多个音效
      const audio = new Audio(`/src/assets/sounds/effects/${name}.mp3`);
      audio.volume = this.effectVolume;
      audio.play().catch(err => {
        console.log(`音效 ${name} 播放失败:`, err);
      });
    } catch (error) {
      console.log(`音效 ${name} 加载失败:`, error);
    }
  }

  // 设置背景音乐音量
  setBGMVolume(volume) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgmPlayer) {
      this.bgmPlayer.volume = this.bgmVolume;
    }
    this.saveSettings();
  }

  // 设置音效音量
  setEffectVolume(volume) {
    this.effectVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  // 切换背景音乐开关
  toggleBGM() {
    this.bgmEnabled = !this.bgmEnabled;
    if (this.bgmEnabled) {
      this.resumeBGM();
    } else {
      this.pauseBGM();
    }
    this.saveSettings();
    return this.bgmEnabled;
  }

  // 切换音效开关
  toggleEffect() {
    this.effectEnabled = !this.effectEnabled;
    this.saveSettings();
    return this.effectEnabled;
  }

  // 保存设置到localStorage
  saveSettings() {
    const settings = {
      bgmVolume: this.bgmVolume,
      effectVolume: this.effectVolume,
      bgmEnabled: this.bgmEnabled,
      effectEnabled: this.effectEnabled
    };
    localStorage.setItem('audioSettings', JSON.stringify(settings));
  }

  // 获取当前设置
  getSettings() {
    return {
      bgmVolume: this.bgmVolume,
      effectVolume: this.effectVolume,
      bgmEnabled: this.bgmEnabled,
      effectEnabled: this.effectEnabled,
      currentBgm: this.currentBgm
    };
  }
}

// 创建全局实例
export const audioManager = new AudioManager();

// 自动初始化
if (typeof window !== 'undefined') {
  audioManager.init();
}
