// 精灵图片辅助函数
import { getPetImage, getPetTypeInfo } from './db.js';

// 默认Emoji映射
const DEFAULT_EMOJIS = {
  1: '🥚',
  2: '🐣',
  3: '🐥',
  4: '🐔',
  5: '🦅',
  6: '🐉'
};

// 属性ID到中文名称的映射
const ELEMENT_NAMES = {
  'fire': '火',
  'water': '水',
  'wood': '木',
  'metal': '金',
  'earth': '土',
  'thunder': '雷',
  'ice': '冰',
  'holy': '圣',
  'dark': '魔',
  'demon': '妖',
  'wind': '风',
  'poison': '毒',
  'illusion': '幻',
  'wing': '翼',
  'machine': '机械',
  'spirit': '灵'
};

// 检查是否在 Electron 环境
const isElectron = () => {
  return window.electronAPI !== undefined;
};

// 检查是否为图片类型（包含所有图片类型）
export function isImageType(displayType) {
  return ['image', 'user'].includes(displayType);
}

// 🚀 新策略：只从 userData 读取图片（三级降级：userData图片 → Base64 → Emoji）
export async function getPetDisplay(petTypeId, stage, petName = null) {
  // 获取精灵类型信息（包含element属性）
  const petType = await getPetTypeInfo(petTypeId || 1);
  const element = petType?.element || 'fire';
  const elementName = ELEMENT_NAMES[element] || '火';
  
  // 构建图片文件名：属性 (等级)
  const imageName = `${elementName} (${stage || 1})`;
  
  console.log(`🎯 获取精灵显示内容:`, {
    petTypeId,
    stage,
    petName,
    element,
    elementName,
    imageName,
    expectedFile: `${imageName}.png`
  });
  
  // 第一优先级：Electron环境下，从 userData 读取图片
  if (isElectron()) {
    try {
      // 优先尝试 PNG 格式（透明效果）
      const pngResult = await window.electronAPI.checkUserImage('pet', imageName);
      if (pngResult.exists) {
        const base64 = await window.electronAPI.getUserImage('pet', imageName);
        if (base64) {
          console.log('✅ 使用 userData 中的 PNG 图片:', imageName);
          return {
            type: 'user',
            content: base64
          };
        }
      }
    } catch (error) {
      console.warn('❌ 读取 userData 图片失败:', error);
    }
  }
  
  // 第二优先级：尝试获取Base64图片
  const imageBase64 = await getPetImage(petTypeId || 1, stage || 1);
  
  if (imageBase64) {
    console.log('✅ 使用 Base64 图片');
    return {
      type: 'image',
      content: imageBase64
    };
  }
  
  // 第三优先级：返回Emoji
  const emoji = DEFAULT_EMOJIS[stage] || '🥚';
  console.log('✅ 使用 Emoji 占位符:', emoji);
  
  return {
    type: 'emoji',
    content: emoji,
    petTypeEmoji: petType.emoji
  };
}

// 获取学生的精灵显示内容
export async function getStudentPetDisplay(student) {
  if (!student) return { type: 'emoji', content: '🥚' };
  
  return await getPetDisplay(student.petTypeId || 1, student.petStage || 1, student.petName);
}

// 获取Boss显示内容（三级降级：userData图片 → Base64 → 巨型Emoji）
export async function getBossDisplay(bossName, bossEmoji = '👹') {
  // 第一优先级：Electron环境下，从 userData 读取图片
  if (isElectron() && bossName) {
    try {
      // 优先尝试 PNG 格式
      const pngResult = await window.electronAPI.checkUserImage('boss', bossName);
      if (pngResult.exists) {
        const base64 = await window.electronAPI.getUserImage('boss', bossName);
        if (base64) {
          console.log('✅ 使用 userData 中的 Boss PNG 图片:', bossName);
          return {
            type: 'user',
            content: base64
          };
        }
      }
    } catch (error) {
      console.warn('❌ 读取 userData Boss图片失败:', error);
    }
  }
  
  // 第二优先级：可以扩展为从数据库读取Boss Base64图片
  // TODO: 如果未来需要Boss图片也存Base64，在这里添加逻辑
  
  // 第三优先级：返回巨型Emoji
  return {
    type: 'emoji',
    content: bossEmoji
  };
}

// 保存用户上传的图片到 userData 目录
export async function saveUserUploadedImage(type, name, file) {
  if (!isElectron()) {
    console.warn('非Electron环境，无法保存到userData');
    return false;
  }
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Data = e.target.result;
        const result = await window.electronAPI.saveUserImage(type, name, base64Data);
        resolve(result.success);
      } catch (error) {
        console.error('保存图片失败:', error);
        resolve(false);
      }
    };
    reader.readAsDataURL(file);
  });
}

