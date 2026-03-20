// 16属性相克底层矩阵系统
// 赛尔号级别的属性相克逻辑

// 16种属性定义
export const ELEMENTS = {
  METAL: { id: 'metal', name: '金', emoji: '⚙️', color: '#C0C0C0' },
  WOOD: { id: 'wood', name: '木', emoji: '🌳', color: '#228B22' },
  WATER: { id: 'water', name: '水', emoji: '💧', color: '#1E90FF' },
  FIRE: { id: 'fire', name: '火', emoji: '🔥', color: '#FF4500' },
  EARTH: { id: 'earth', name: '土', emoji: '🪨', color: '#8B4513' },
  DEMON: { id: 'demon', name: '妖', emoji: '👹', color: '#8B008B' },
  DARK: { id: 'dark', name: '魔', emoji: '😈', color: '#2F4F4F' },
  WING: { id: 'wing', name: '翼', emoji: '🦅', color: '#87CEEB' },
  WIND: { id: 'wind', name: '风', emoji: '🌪️', color: '#B0E0E6' },
  POISON: { id: 'poison', name: '毒', emoji: '☠️', color: '#9370DB' },
  THUNDER: { id: 'thunder', name: '雷', emoji: '⚡', color: '#FFD700' },
  ILLUSION: { id: 'illusion', name: '幻', emoji: '✨', color: '#FF69B4' },
  ICE: { id: 'ice', name: '冰', emoji: '❄️', color: '#00CED1' },
  MACHINE: { id: 'machine', name: '机械', emoji: '🤖', color: '#708090' },
  SPIRIT: { id: 'spirit', name: '灵', emoji: '👻', color: '#E6E6FA' },
  HOLY: { id: 'holy', name: '圣', emoji: '✝️', color: '#FFD700' }
};

// 属性相克矩阵（完整版 - 严格按照用户提供的数据）
const ELEMENT_MATRIX = {
  metal: {
    wood: 2.0, demon: 2.0, wind: 2.0,
    fire: 0.5, holy: 0.5, metal: 0.5
  },
  wood: {
    earth: 2.0, dark: 2.0, thunder: 2.0, spirit: 2.0,
    metal: 0.5, wing: 0.5, wind: 0.5, illusion: 0.5, ice: 0.5, machine: 0.5, wood: 0.5
  },
  water: {
    fire: 2.0, wing: 2.0, poison: 2.0, ice: 2.0,
    earth: 0.5, spirit: 0.5
  },
  fire: {
    metal: 2.0, wing: 2.0, illusion: 2.0, poison: 2.0, machine: 2.0,
    water: 0.5, demon: 0.5, spirit: 0.5, fire: 0.5
  },
  earth: {
    water: 2.0, thunder: 2.0, poison: 2.0, machine: 2.0,
    wood: 0.5, wing: 0.5, wind: 0.5, ice: 0.5
  },
  demon: {
    wood: 2.0, water: 2.0, machine: 2.0,
    dark: 0.5, poison: 0.5, thunder: 0.5, illusion: 0.5, holy: 0.5, demon: 0.5
  },
  dark: {
    fire: 2.0, demon: 2.0, ice: 2.0, holy: 2.0,
    wood: 0.5, earth: 0.5, thunder: 0.5, illusion: 0.5, dark: 0.5
  },
  wing: {
    metal: 2.0, earth: 2.0, wind: 2.0, spirit: 2.0,
    water: 0.5, thunder: 0.5, ice: 0.5, machine: 0.5, wing: 0.5
  },
  wind: {
    wood: 2.0, wing: 2.0, ice: 2.0,
    metal: 0.5, illusion: 0.5, machine: 0.5, holy: 0.5, wind: 0.5
  },
  poison: {
    wood: 2.0, demon: 2.0, wind: 2.0,
    water: 0.5, fire: 0.5, earth: 0.5, illusion: 0.5, holy: 0.5, poison: 0.5
  },
  thunder: {
    demon: 2.0, dark: 2.0, wing: 2.0, illusion: 2.0, holy: 2.0,
    water: 0.5, earth: 0.5, ice: 0.5, thunder: 0.5
  },
  illusion: {
    demon: 2.0, poison: 2.0, spirit: 2.0, holy: 2.0,
    metal: 0.5, water: 0.5, fire: 0.5, thunder: 0.5, ice: 0.5, holy: 0.5, illusion: 0.5
  },
  ice: {
    wood: 2.0, wing: 2.0, illusion: 2.0, spirit: 2.0,
    fire: 0.5, earth: 0.5, poison: 0.5, machine: 0.5, holy: 0.5
  },
  machine: {
    metal: 2.0, wing: 2.0, illusion: 2.0, ice: 2.0, holy: 2.0,
    fire: 0.5, earth: 0.5, poison: 0.5, thunder: 0.5, holy: 0.5
  },
  spirit: {
    dark: 2.0, thunder: 2.0, illusion: 2.0, holy: 2.0,
    wood: 0.5, wing: 0.5, wind: 0.5, ice: 0.5, holy: 0.5
  },
  holy: {
    metal: 2.0, wood: 2.0, water: 2.0, fire: 2.0, earth: 2.0,
    dark: 0.5, illusion: 0.5, ice: 0.5, machine: 0.5, spirit: 0.5
  }
};

/**
 * 计算属性克制倍率
 * @param {string} attackerElement - 攻击方属性ID
 * @param {string} defenderElement - 防御方属性ID
 * @returns {number} 伤害倍率
 */
export function calculateMultiplier(attackerElement, defenderElement) {
  if (!attackerElement || !defenderElement) return 1.0;
  
  // 获取攻击方对防御方的克制关系
  const attackerMatrix = ELEMENT_MATRIX[attackerElement];
  if (!attackerMatrix) return 1.0;
  
  const multiplier = attackerMatrix[defenderElement];
  return multiplier !== undefined ? multiplier : 1.0;
}

/**
 * 获取克制关系描述（用于战斗UI提示）
 * @param {number} multiplier - 伤害倍率
 * @returns {object} { text: string, color: string, bgColor: string, icon: string, multiplierText: string, shake: boolean }
 */
export function getMultiplierDescription(multiplier) {
  if (multiplier >= 4.0) {
    return { 
      text: '超级克制！', 
      color: 'text-red-600', 
      bgColor: 'bg-red-100', 
      icon: '💥', 
      multiplierText: '×4',
      shake: true 
    };
  } else if (multiplier >= 2.0) {
    return { 
      text: '属性克制！', 
      color: 'text-red-500', 
      bgColor: 'bg-red-50', 
      icon: '⚡', 
      multiplierText: '×2',
      shake: true 
    };
  } else if (multiplier > 1.0) {
    return { 
      text: '略有优势', 
      color: 'text-orange-500', 
      bgColor: 'bg-orange-50', 
      icon: '✨', 
      multiplierText: `×${multiplier}`,
      shake: false 
    };
  } else if (multiplier === 1.0) {
    return { 
      text: '势均力敌', 
      color: 'text-gray-600', 
      bgColor: 'bg-gray-50', 
      icon: '⚖️', 
      multiplierText: '×1',
      shake: false 
    };
  } else if (multiplier > 0.5) {
    return { 
      text: '略有劣势', 
      color: 'text-blue-500', 
      bgColor: 'bg-blue-50', 
      icon: '🛡️', 
      multiplierText: `×${multiplier}`,
      shake: false 
    };
  } else {
    return { 
      text: '被克制...', 
      color: 'text-green-600', 
      bgColor: 'bg-green-50', 
      icon: '🛡️', 
      multiplierText: '×0.5',
      shake: false 
    };
  }
}

/**
 * 获取属性信息
 * @param {string} elementId - 属性ID
 * @returns {object} 属性信息
 */
export function getElementInfo(elementId) {
  if (!elementId) return ELEMENTS.FIRE;
  const key = elementId.toUpperCase();
  return ELEMENTS[key] || ELEMENTS.FIRE;
}

/**
 * 获取所有属性列表
 * @returns {array} 属性数组
 */
export function getAllElements() {
  return Object.values(ELEMENTS);
}
