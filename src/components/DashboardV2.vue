<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { getAllStudents, batchUpdatePoints, isBirthday, sendBirthdayGift, updateStudentPoints, getSetting, saveSetting, getAllPetTypes, getPointRules, updateStudent, canChangePet, incrementChangePetCount, checkAdvancedUnlock } from '../db.js';
import { getPetDisplay, isImageType } from '../petImageHelper.js';
import { audioManager } from '../audioManager.js';
import { audioSynthesizer } from '../audioSynthesizer.js';
import { calculateMultiplier, getMultiplierDescription } from '../utils/elementLogic.js';
import confetti from 'canvas-confetti';
import TaskRiverV2 from './TaskRiverV2.vue';
import PraiseWall from './PraiseWall.vue';
import DataCenter from './DataCenter.vue';
import BirthdayModal from './BirthdayModal.vue';
import ClassManager from './ClassManager.vue';
import GroupManager from './GroupManager.vue';
import ShopAndLottery from './ShopAndLottery.vue';
import PetPK from './PetPK.vue';
import PetPokedex from './PetPokedex.vue';
import SystemSettings from './SystemSettings.vue';
import BossRaid from './BossRaid.vue';

// 段位配置
const RANKS = [
  { name: '热血青铜', min: 0, max: 200, color: 'text-amber-700', bgColor: 'bg-amber-100', icon: '🥉' },
  { name: '不屈白银', min: 201, max: 500, color: 'text-gray-500', bgColor: 'bg-gray-100', icon: '🥈' },
  { name: '英勇黄金', min: 501, max: 1000, color: 'text-yellow-500', bgColor: 'bg-yellow-100', icon: '🥇' },
  { name: '不朽星钻', min: 1001, max: 1500, color: 'text-blue-500', bgColor: 'bg-blue-100', icon: '💎' },
  { name: '超级王牌', min: 1501, max: 2000, color: 'text-purple-500', bgColor: 'bg-purple-100', icon: '👑' },
  { name: '无敌战神', min: 2001, max: Infinity, color: 'text-red-500', bgColor: 'bg-red-100', icon: '⚡' }
];

// 宠物进化阶段配置
const PET_STAGES = [
  { stage: 1, name: '萌蛋期', emoji: '🥚', minExp: 0, maxExp: 50, color: 'from-yellow-200 to-orange-200' },
  { stage: 2, name: '幼年期', emoji: '🐣', minExp: 51, maxExp: 150, color: 'from-yellow-300 to-amber-300' },
  { stage: 3, name: '成长期', emoji: '🐥', minExp: 151, maxExp: 300, color: 'from-amber-300 to-orange-400' },
  { stage: 4, name: '青年期', emoji: '🐔', minExp: 301, maxExp: 600, color: 'from-orange-400 to-red-400' },
  { stage: 5, name: '完全体', emoji: '🦅', minExp: 601, maxExp: 1000, color: 'from-blue-400 to-purple-500' },
  { stage: 6, name: '究极体', emoji: '🐉', minExp: 1001, maxExp: Infinity, color: 'from-purple-500 to-pink-500' }
];

const students = ref([]);
const selectedStudents = ref(new Set());
const showBatchPanel = ref(false);
const showBatchModal = ref(false);
const batchTab = ref('add');
const loading = ref(true);
const currentView = ref('dashboard');
const birthdayStudent = ref(null);
const birthdayGift = ref(0);
const customPoints = ref(0);
const customReason = ref('');

// 宠物图片缓存
const petDisplayCache = ref({});

// 主题设置
const currentTheme = ref('cute');

// 音乐控制
const showAudioPanel = ref(false);
const audioSettings = ref({
  bgmEnabled: true,
  effectEnabled: true,
  bgmVolume: 0.3,
  effectVolume: 0.5,
  currentBgm: null
});

// 宠物特效
const petEffects = ref({}); // { studentId: { type: 'heart'/'freeze'/'sigh', timestamp: Date.now() } }

// 更换精灵弹窗
const showChangePetModal = ref(false);
const showElementSelector = ref(false); // 第一步：选择属性
const selectedElement = ref(null); // 选中的属性
const availablePetTypes = ref([]);

// 🆕 精灵图片缓存（用于显示终极形态剪影）
const petImages = ref({});

// 获取宠物真实名称
const getPetRealName = (petTypeId) => {
  const petType = availablePetTypes.value.find(p => p.id === petTypeId);
  return petType?.name || '精灵';
};

// 获取学生的属性emoji
const getStudentElementEmoji = (student) => {
  const petType = availablePetTypes.value.find(p => p.id === student.petTypeId);
  if (!petType?.element) return '';
  const element = ELEMENTS.find(e => e.id === petType.element);
  return element?.emoji || '';
};

// 获取属性信息（用于Boss副本界面）
const getElementInfo = (elementId) => {
  return ELEMENTS.find(e => e.id === elementId) || ELEMENTS[0];
};

// 宠物互动弹窗
const showPetModal = ref(false);
const selectedPet = ref(null);
const petModalTab = ref('add'); // 'add' or 'deduct' - 单独学生弹窗的Tab

// 🆕 使用说明弹窗
const showHelpModal = ref(false);

const openHelpModal = () => {
  showHelpModal.value = true;
};

const closeHelpModal = () => {
  showHelpModal.value = false;
};

// 🔥 强制加载初始宠物（手动触发，绕过权限拦截）
const forceLoadInitialPets = async () => {
  const confirmed = confirm('🎨 一键加载初始宠物\n\n此功能将强制拷贝出厂图片到系统数据目录，解决图片显示为占位符的问题。\n\n适用场景：\n• 学校大屏权限拦截导致图片无法自动加载\n• 图片显示为占位符emoji\n• 首次启动自动拷贝失败\n\n确定要执行吗？');
  
  if (!confirmed) return;
  
  try {
    // 🔥 暴力方案：直接使用 ipcRenderer
    const { ipcRenderer } = window.require('electron');
    const result = await ipcRenderer.invoke('force-copy-factory-images');
    
    if (result.success) {
      audioSynthesizer.playSuccess();
      alert('✅ 初始宠物加载成功！\n\n图片已成功拷贝到系统数据目录。\n页面将自动刷新以加载新图片。');
      
      // 刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      audioSynthesizer.playFail();
      alert('❌ 加载失败：' + result.message);
    }
  } catch (error) {
    audioSynthesizer.playFail();
    alert('❌ 加载失败：' + error.message);
    console.error('强制加载初始宠物失败:', error);
  }
};

// 检查当前选中学生是否可以换宠
const canChangePetNow = computed(() => {
  if (!selectedPet.value) return false;
  
  const changePetCount = selectedPet.value.changePetCount || 0;
  
  // 第一次免费
  if (changePetCount === 0) return true;
  
  // 之后需要满级
  return selectedPet.value.petStage >= 6 && selectedPet.value.petExp >= 1000;
});

// 宠物对战模块
const showBattleModal = ref(false);
const battlePlayer1 = ref(null);
const battlePlayer2 = ref(null);
const battleResult = ref(null);
const battleAnimating = ref(false);

// 课堂工具
const showRandomPicker = ref(false);
const showTimer = ref(false);
const randomPickerRunning = ref(false);
const randomPickerResult = ref(null);
const timerMinutes = ref(3);
const timerSeconds = ref(0);
const timerRunning = ref(false);
const timerInterval = ref(null);
const timerStarted = ref(false);

// 锁屏功能
const isLocked = ref(false);
const lockPassword = ref('');
const lockMessage = ref('OpenCPS');
const lockMessageIndex = ref(0);
const lockMessageInterval = ref(null);

// 温馨彩蛋语料库
const teacherMessages = [
  '666'
];

// 系统初始化功能
const showResetModal = ref(false);
const resetPassword = ref('');

// 智能气泡聊天系统
const petBubbles = ref({}); // { studentId: { message: '', visible: true, timestamp: Date.now() } }
const bubblePatrolTimer = ref(null);

// Boss副本系统
const showBossRaid = ref(false);
const bossRaidStudent = ref(null);
const advancedUnlocked = ref(false); // 高级属性是否解锁

// 宠物语料库
const PET_MESSAGES = {
  // 常规鼓励
  normal: [
    '{name}，今天也要元气满满哦！✨',
    '{name}，主人最棒啦！😎',
    '{name}，加油加油！💪',
    '{name}，你是最优秀的！🌟',
    '{name}，继续保持哦！👍'
  ],
  // 求关注/求投喂
  hungry: [
    '{name}，肚子咕噜噜了，想吃好吃的~ 🍖',
    '主人{name}理理我嘛，想玩游戏了 🎮',
    '{name}，好久没互动了，想你啦~ 🥺',
    '{name}，陪我玩一会儿嘛~ 🎪',
    '{name}，我需要你的关注！💕'
  ],
  // 升级/高分状态
  excited: [
    '哇！{name}太厉害了，感觉全身充满了力量！🔥',
    '{name}，我们越来越强了！⚡',
    '{name}，一起冲向更高的目标！🚀',
    '{name}，你的努力我都看到了！👀',
    '{name}，我们是最强组合！💎'
  ]
};

// 键盘监听 - 按E键弹出初始化
const handleKeyPress = (e) => {
  if (e.key === 'e' || e.key === 'E') {
    // 只在主界面且未锁屏时响应
    if (currentView.value === 'dashboard' && !isLocked.value && !showResetModal.value) {
      showResetModal.value = true;
      resetPassword.value = '';
    }
  }
};

// 执行系统初始化
const confirmReset = async () => {
  const correctPassword = await getSetting('password') || '1234';
  
  if (resetPassword.value !== correctPassword) {
    audioSynthesizer.playFail();
    alert('❌ 密码错误！');
    return;
  }
  
  const confirmed = confirm('⚠️ 危险操作！\n\n确定要重置系统吗？\n\n此操作将：\n• 删除所有学生数据\n• 删除所有积分记录\n• 删除所有任务完成记录\n• 删除所有心里话内容\n• 删除所有PK对战记录\n• 删除所有兑换记录\n\n保留：\n✅ 教师配置（密码、加减分规则等）\n✅ 精灵图鉴和图片\n✅ 商店商品配置\n✅ 题库内容\n\n此操作不可恢复！');
  
  if (!confirmed) return;
  
  // 二次确认
  const doubleConfirmed = confirm('最后确认：真的要重置系统吗？');
  if (!doubleConfirmed) return;
  
  try {
    // 导入db以访问所有表
    const { db, initTestData } = await import('../db.js');
    
    // 只清空学生相关的运营数据，保留教师配置
    await db.students.clear();
    await db.logs.clear();
    await db.studentTasks.clear();
    await db.praises.clear();
    await db.redemptions.clear();
    await db.pkBattles.clear();
    
    // 重新初始化测试学生（5个默认学生）
    await initTestData();
    
    audioSynthesizer.playSuccess();
    alert('✅ 系统重置完成！\n\n已恢复5个测试学生，所有教师配置已保留。\n页面即将刷新...');
    
    // 刷新页面
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    audioSynthesizer.playFail();
    alert('重置失败：' + error.message);
    console.error('系统重置失败:', error);
  }
  
  showResetModal.value = false;
};

// 智能气泡巡逻机制
const startBubblePatrol = () => {
  // 每20秒触发一次（测试用，实际可调整为1-2分钟）
  bubblePatrolTimer.value = setInterval(() => {
    triggerRandomBubbles();
  }, 20000);
};

const triggerRandomBubbles = () => {
  if (students.value.length === 0) return;
  
  // 随机选择1-3个学生
  const count = Math.min(Math.floor(Math.random() * 3) + 1, students.value.length);
  const shuffled = [...students.value].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  
  selected.forEach(student => {
    showPetBubble(student);
  });
};

const showPetBubble = (student) => {
  // 判断宠物状态，选择合适的语料
  let messageType = 'normal';
  
  // 如果经验值低或积分低，显示求关注
  if (student.petExp < 30 || student.availablePoints < 20) {
    messageType = 'hungry';
  }
  // 如果经验值高或积分高，显示兴奋状态
  else if (student.petExp > 200 || student.totalPoints > 500) {
    messageType = 'excited';
  }
  
  // 随机选择一条消息
  const messages = PET_MESSAGES[messageType];
  const template = messages[Math.floor(Math.random() * messages.length)];
  const message = template.replace('{name}', student.name);
  
  // 显示气泡
  petBubbles.value[student.id] = {
    message,
    visible: true,
    timestamp: Date.now()
  };
  
  // 7秒后自动消失
  setTimeout(() => {
    if (petBubbles.value[student.id]) {
      petBubbles.value[student.id].visible = false;
      // 再过1秒完全移除（等待淡出动画）
      setTimeout(() => {
        delete petBubbles.value[student.id];
      }, 1000);
    }
  }, 7000);
};

const getPetBubble = (studentId) => {
  return petBubbles.value[studentId];
};

// 获取学生的勋章列表
const getStudentBadges = (student) => {
  try {
    return JSON.parse(student.badges || '[]');
  } catch {
    return [];
  }
};

// 获取勋章emoji
const getBadgeEmoji = (elementId) => {
  const element = ELEMENTS.find(e => e.id === elementId);
  return element?.emoji || '🏆';
};

// 打开Boss副本
const openBossRaid = (student) => {
  bossRaidStudent.value = student;
  showBossRaid.value = true;
};

// 关闭Boss副本并刷新
const closeBossRaid = () => {
  showBossRaid.value = false;
  bossRaidStudent.value = null;
  loadStudents();
};
const encourageMessages = [
  '加油！你是最棒的！',
  '坚持就是胜利！',
  '相信自己，你能行！',
  '每一天都要进步一点点！',
  '努力的你最美丽！'
];

// 16种属性定义（模拟数据，为后续真实矩阵做准备）
const ELEMENTS = [
  { id: 'fire', name: '火', emoji: '🔥', color: 'from-red-500 to-orange-500' },
  { id: 'water', name: '水', emoji: '💧', color: 'from-blue-500 to-cyan-500' },
  { id: 'wood', name: '木', emoji: '🌳', color: 'from-green-500 to-emerald-500' },
  { id: 'thunder', name: '雷', emoji: '⚡', color: 'from-yellow-500 to-amber-500' },
  { id: 'ice', name: '冰', emoji: '❄️', color: 'from-cyan-400 to-blue-400' },
  { id: 'holy', name: '圣', emoji: '✝️', color: 'from-yellow-300 to-pink-300' },
  { id: 'metal', name: '金', emoji: '⚙️', color: 'from-gray-400 to-yellow-600' },
  { id: 'earth', name: '土', emoji: '🪨', color: 'from-amber-700 to-yellow-700' },
  { id: 'dark', name: '魔', emoji: '😈', color: 'from-purple-700 to-pink-700' },
  { id: 'demon', name: '妖', emoji: '👹', color: 'from-purple-500 to-indigo-500' },
  { id: 'wind', name: '风', emoji: '🌪️', color: 'from-teal-400 to-cyan-400' },
  { id: 'poison', name: '毒', emoji: '☠️', color: 'from-green-700 to-purple-700' },
  { id: 'illusion', name: '幻', emoji: '✨', color: 'from-pink-500 to-purple-500' },
  { id: 'wing', name: '翼', emoji: '🦅', color: 'from-sky-400 to-blue-500' },
  { id: 'machine', name: '机械', emoji: '🤖', color: 'from-gray-500 to-slate-600' },
  { id: 'spirit', name: '灵', emoji: '👻', color: 'from-blue-300 to-purple-300' }
];

// 加减分规则
const POINT_RULES = {
  add: [
    { label: '积极发言', points: 2, icon: '🗣️' },
    { label: '作业优秀', points: 5, icon: '📝' },
    { label: '帮助同学', points: 3, icon: '🤝' },
    { label: '课堂表现', points: 3, icon: '⭐' },
    { label: '创意作品', points: 8, icon: '🎨' },
    { label: '值日认真', points: 3, icon: '🧹' }
  ],
  deduct: [
    { label: '未交作业', points: -5, icon: '❌' },
    { label: '上课讲话', points: -3, icon: '🔇' },
    { label: '迟到早退', points: -4, icon: '⏰' },
    { label: '不守纪律', points: -6, icon: '⚠️' }
  ]
};

const calculateRank = (totalPoints) => {
  return RANKS.find(rank => totalPoints >= rank.min && totalPoints <= rank.max) || RANKS[0];
};

const getPetStage = (stage) => {
  return PET_STAGES.find(s => s.stage === stage) || PET_STAGES[0];
};

const studentsWithRank = computed(() => {
  return students.value
    .map(student => ({ 
      ...student, 
      rank: calculateRank(student.totalPoints),
      petStageInfo: getPetStage(student.petStage)
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
});

const selectedCount = computed(() => selectedStudents.value.size);

const isAllSelected = computed(() => {
  return students.value.length > 0 && selectedStudents.value.size === students.value.length;
});

const loadStudents = async () => {
  try {
    students.value = await getAllStudents();
    checkBirthdays();
    
    // 加载主题设置
    const theme = await getSetting('theme');
    if (theme) {
      currentTheme.value = theme;
    }
    
    // 加载精灵类型
    availablePetTypes.value = await getAllPetTypes();
    
    // 🆕 加载所有精灵的图片（用于终极形态剪影）
    const { getPetTypeImages } = await import('../db.js');
    for (const petType of availablePetTypes.value) {
      try {
        const images = await getPetTypeImages(petType.id);
        petImages.value[petType.id] = {};
        for (const img of images) {
          petImages.value[petType.id][img.stage] = img.imageBase64;
        }
      } catch (error) {
        console.warn(`加载精灵${petType.id}图片失败:`, error);
      }
    }
    
    // 检查是否解锁高级属性
    advancedUnlocked.value = await checkAdvancedUnlock();
    
    // 预加载所有学生的精灵图片（支持静态图片优先读取）
    for (const student of students.value) {
      const key = `${student.id}_${student.petTypeId || 1}_${student.petStage || 1}`;
      if (!petDisplayCache.value[key]) {
        petDisplayCache.value[key] = await getPetDisplay(student.petTypeId || 1, student.petStage || 1, student.petName);
      }
    }
    
    // 更新音频设置
    audioSettings.value = audioManager.getSettings();
    
    loading.value = false;
  } catch (error) {
    console.error('加载学生数据失败:', error);
    loading.value = false;
  }
};

const checkBirthdays = async () => {
  for (const student of students.value) {
    if (isBirthday(student)) {
      const result = await sendBirthdayGift(student.id);
      if (result.success) {
        birthdayStudent.value = student;
        birthdayGift.value = result.gift;
        await loadStudents();
        break;
      }
    }
  }
};

const toggleStudent = (studentId, event) => {
  event.stopPropagation();
  
  if (selectedStudents.value.has(studentId)) {
    selectedStudents.value.delete(studentId);
  } else {
    selectedStudents.value.add(studentId);
  }
  showBatchPanel.value = selectedStudents.value.size > 0;
};

const openPetModal = (student) => {
  selectedPet.value = student;
  petModalTab.value = 'add'; // 默认显示加分Tab
  showPetModal.value = true;
};

// 计算攻击力
const calculateAttackPower = (petExp) => {
  return Math.floor(petExp * 0.1);
};

const closePetModal = () => {
  showPetModal.value = false;
  selectedPet.value = null;
};

// 宠物互动弹窗的快捷加分（会关闭弹窗）
const quickAddPointsInModal = async (points, reason) => {
  if (!selectedPet.value) return;
  await quickAddPoints(selectedPet.value.id, points, reason);
  closePetModal();
};

const toggleAll = () => {
  if (isAllSelected.value) {
    selectedStudents.value.clear();
    showBatchPanel.value = false;
  } else {
    students.value.forEach(s => selectedStudents.value.add(s.id));
    showBatchPanel.value = true;
  }
};

const openBatchModal = () => {
  showBatchModal.value = true;
  batchTab.value = 'add';
  customPoints.value = 0;
  customReason.value = '';
};

const applyBatchPoints = async (points, reason) => {
  if (selectedStudents.value.size === 0) return;
  
  try {
    await batchUpdatePoints(Array.from(selectedStudents.value), points, reason);
    
    // 🎉 触发全屏彩带特效
    triggerBatchConfetti();
    
    // 🎉 触发所有选中宠物的跳跃+爱心动画
    selectedStudents.value.forEach(studentId => {
      showPetEffect(studentId, 'heart');
    });
    
    await loadStudents();
    selectedStudents.value.clear();
    showBatchPanel.value = false;
    showBatchModal.value = false;
    
    audioSynthesizer.playSuccess();
  } catch (error) {
    alert('批量操作失败：' + error.message);
  }
};

// 🎉 批量彩带特效
const triggerBatchConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    
    // 从左侧发射
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
    });
    
    // 从右侧发射
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
    });
  }, 250);
};

// 🆕 批量喂食
const batchFeed = async () => {
  if (selectedStudents.value.size === 0) {
    alert('请先选择学生');
    return;
  }
  
  const confirmed = confirm(`确定要为选中的 ${selectedStudents.value.size} 位学生批量喂食吗？\n\n每人消耗 -10 积分，获得 +5 经验`);
  if (!confirmed) return;
  
  try {
    const { feedPet } = await import('../db.js');
    let successCount = 0;
    let failCount = 0;
    
    for (const studentId of selectedStudents.value) {
      const result = await feedPet(studentId, 10, 5, '批量喂食');
      if (result.success) {
        successCount++;
        showPetEffect(studentId, 'heart');
      } else {
        failCount++;
      }
    }
    
    // 🎉 触发彩带特效
    if (successCount > 0) {
      triggerBatchConfetti();
      audioSynthesizer.playHappyAction();
    }
    
    await loadStudents();
    selectedStudents.value.clear();
    showBatchPanel.value = false;
    
    alert(`✅ 批量喂食完成！\n\n成功：${successCount} 人\n失败：${failCount} 人（积分不足）`);
  } catch (error) {
    alert('批量喂食失败：' + error.message);
  }
};

// 🆕 批量玩耍
const batchPlay = async () => {
  if (selectedStudents.value.size === 0) {
    alert('请先选择学生');
    return;
  }
  
  const confirmed = confirm(`确定要为选中的 ${selectedStudents.value.size} 位学生批量玩耍吗？\n\n每人消耗 -5 积分，获得 +3 经验`);
  if (!confirmed) return;
  
  try {
    const { feedPet } = await import('../db.js');
    let successCount = 0;
    let failCount = 0;
    
    for (const studentId of selectedStudents.value) {
      const result = await feedPet(studentId, 5, 3, '批量玩耍');
      if (result.success) {
        successCount++;
        showPetEffect(studentId, 'heart');
      } else {
        failCount++;
      }
    }
    
    // 🎉 触发彩带特效
    if (successCount > 0) {
      triggerBatchConfetti();
      audioSynthesizer.playHappyAction();
    }
    
    await loadStudents();
    selectedStudents.value.clear();
    showBatchPanel.value = false;
    
    alert(`✅ 批量玩耍完成！\n\n成功：${successCount} 人\n失败：${failCount} 人（积分不足）`);
  } catch (error) {
    alert('批量玩耍失败：' + error.message);
  }
};

const applyCustomPoints = () => {
  if (!customReason.value.trim()) {
    alert('请输入原因');
    return;
  }
  if (customPoints.value === 0) {
    alert('请输入积分');
    return;
  }
  applyBatchPoints(customPoints.value, customReason.value);
};

const closeBirthdayModal = () => {
  birthdayStudent.value = null;
};


const openTaskRiver = () => {
  currentView.value = 'task';
};

const openPraiseWall = () => {
  currentView.value = 'praise';
};

const openDataCenter = () => {
  currentView.value = 'data';
};

const openClassManager = () => {
  currentView.value = 'manager';
};

const openGroupManager = () => {
  currentView.value = 'group';
};

const openShopAndLottery = () => {
  currentView.value = 'shop';
};

const openPetPK = () => {
  currentView.value = 'pk';
};

const openPetPokedex = () => {
  currentView.value = 'pokedex';
};

const openSystemSettings = () => {
  currentView.value = 'settings';
};

const openBattle = () => {
  currentView.value = 'battle';
};

const closeModule = () => {
  currentView.value = 'dashboard';
  loadStudents();
};

// 宠物对战系统
const startBattle = async () => {
  if (!battlePlayer1.value || !battlePlayer2.value) {
    alert('请选择两个学生进行对战！');
    return;
  }
  
  if (battlePlayer1.value.id === battlePlayer2.value.id) {
    alert('不能选择同一个学生对战！');
    return;
  }
  
  battleAnimating.value = true;
  audioSynthesizer.playBattleHit();
  
  // 获取双方精灵的属性
  const pet1 = availablePetTypes.value.find(p => p.id === battlePlayer1.value.petTypeId);
  const pet2 = availablePetTypes.value.find(p => p.id === battlePlayer2.value.petTypeId);
  
  const element1 = pet1?.element || 'fire';
  const element2 = pet2?.element || 'fire';
  
  // 计算基础攻击力
  const basePower1 = calculateAttackPower(battlePlayer1.value.petExp);
  const basePower2 = calculateAttackPower(battlePlayer2.value.petExp);
  
  // 计算属性克制倍率
  const multiplier1 = calculateMultiplier(element1, element2);
  const multiplier2 = calculateMultiplier(element2, element1);
  
  // 计算最终攻击力
  const finalPower1 = Math.floor(basePower1 * multiplier1);
  const finalPower2 = Math.floor(basePower2 * multiplier2);
  
  // 获取克制描述
  const desc1 = getMultiplierDescription(multiplier1);
  const desc2 = getMultiplierDescription(multiplier2);
  
  // 等待动画完成
  setTimeout(async () => {
    let winner = null;
    let result = '';
    
    if (finalPower1 > finalPower2) {
      winner = battlePlayer1.value;
      result = `${battlePlayer1.value.name} 获胜！`;
    } else if (finalPower2 > finalPower1) {
      winner = battlePlayer2.value;
      result = `${battlePlayer2.value.name} 获胜！`;
    } else {
      result = '平局！双方实力相当！';
    }
    
    // 发放奖励
    if (winner) {
      await updateStudentPoints(winner.id, 0, '对战获胜');
      const { feedPet } = await import('../db.js');
      await feedPet(winner.id, 0, 10, '对战获胜');
      audioSynthesizer.playLevelUp();
    }
    
    battleResult.value = {
      winner,
      result,
      power1: basePower1,
      power2: basePower2,
      finalPower1,
      finalPower2,
      multiplier1,
      multiplier2,
      desc1,
      desc2
    };
    
    battleAnimating.value = false;
    await loadStudents();
  }, 1500);
};

const resetBattle = () => {
  battlePlayer1.value = null;
  battlePlayer2.value = null;
  battleResult.value = null;
  battleAnimating.value = false;
};

// 随机点名 - 修复版本
const startRandomPicker = () => {
  if (students.value.length === 0) {
    alert('没有学生数据');
    return;
  }
  
  showRandomPicker.value = true;
  randomPickerRunning.value = true;
  randomPickerResult.value = null;
  
  let count = 0;
  const maxCount = 30; // 总共闪烁30次
  const interval = setInterval(() => {
    const randomIndex = Math.floor(Math.random() * students.value.length);
    randomPickerResult.value = students.value[randomIndex];
    count++;
    
    // 3秒后停止（30次 * 100ms = 3000ms）
    if (count >= maxCount) {
      clearInterval(interval);
      randomPickerRunning.value = false;
      audioSynthesizer.playSuccess();
    }
  }, 100);
};

const closeRandomPicker = () => {
  showRandomPicker.value = false;
  randomPickerResult.value = null;
};

// 倒计时 - 修复版本
const startTimer = (minutes) => {
  // 清除旧的定时器
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
  
  timerMinutes.value = minutes;
  timerSeconds.value = 0;
  showTimer.value = true;
  timerRunning.value = false;
  timerStarted.value = false;
};

const beginTimer = () => {
  if (timerStarted.value) return;
  
  timerStarted.value = true;
  timerRunning.value = true;
  
  timerInterval.value = setInterval(() => {
    if (timerSeconds.value > 0) {
      timerSeconds.value--;
    } else if (timerMinutes.value > 0) {
      timerMinutes.value--;
      timerSeconds.value = 59;
    } else {
      clearInterval(timerInterval.value);
      timerRunning.value = false;
      alert('⏰ 时间到！');
    }
  }, 1000);
};

const pauseTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
  timerRunning.value = false;
};

const resumeTimer = () => {
  if (timerRunning.value) return;
  
  timerRunning.value = true;
  
  timerInterval.value = setInterval(() => {
    if (timerSeconds.value > 0) {
      timerSeconds.value--;
    } else if (timerMinutes.value > 0) {
      timerMinutes.value--;
      timerSeconds.value = 59;
    } else {
      clearInterval(timerInterval.value);
      timerRunning.value = false;
      alert('⏰ 时间到！');
    }
  }, 1000);
};

const closeTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
  timerRunning.value = false;
  timerStarted.value = false;
  showTimer.value = false;
};

const getPetDisplayContent = (student) => {
  const key = `${student.id}_${student.petTypeId || 1}_${student.petStage || 1}`;
  const display = petDisplayCache.value[key];
  
  if (!display) {
    return { type: 'emoji', content: student.petStageInfo.emoji };
  }
  
  return display;
};

// 音乐控制方法
const toggleBGM = () => {
  const enabled = audioManager.toggleBGM();
  audioSettings.value.bgmEnabled = enabled;
  if (enabled && !audioSettings.value.currentBgm) {
    audioManager.playBGM('happy');
    audioSettings.value.currentBgm = 'happy';
  }
};

const toggleEffect = () => {
  const enabled = audioManager.toggleEffect();
  audioSettings.value.effectEnabled = enabled;
};

const changeBGM = (bgmName) => {
  audioManager.playBGM(bgmName);
  audioSettings.value.currentBgm = bgmName;
};

const setBGMVolume = (volume) => {
  audioManager.setBGMVolume(volume);
  audioSettings.value.bgmVolume = volume;
};

const setEffectVolume = (volume) => {
  audioManager.setEffectVolume(volume);
  audioSettings.value.effectVolume = volume;
};

// 切换主题
const toggleTheme = async () => {
  currentTheme.value = currentTheme.value === 'cute' ? 'cool' : 'cute';
  await saveSetting('theme', currentTheme.value);
};

// 显示宠物特效
const showPetEffect = (studentId, effectType) => {
  petEffects.value[studentId] = {
    type: effectType,
    timestamp: Date.now()
  };
  
  // 3秒后自动移除特效
  setTimeout(() => {
    if (petEffects.value[studentId]?.timestamp === petEffects.value[studentId]?.timestamp) {
      delete petEffects.value[studentId];
    }
  }, 3000);
};

// 获取宠物特效
const getPetEffect = (studentId) => {
  return petEffects.value[studentId];
};

// 重写加分方法，添加特效和音效
const quickAddPoints = async (studentId, points, reason) => {
  await updateStudentPoints(studentId, points, reason);
  
  // 播放合成音效
  if (points > 0) {
    audioSynthesizer.playAddPoints();
    showPetEffect(studentId, 'heart');
  } else {
    audioSynthesizer.playDeductPoints();
    showPetEffect(studentId, 'freeze');
    showPetEffect(studentId, 'cry'); // 新增哭泣特效
  }
  
  await loadStudents();
};

// 重写喂食方法，添加特效
const feedPetAction = async (cost, expGain, actionName) => {
  if (!selectedPet.value) return;
  
  const { feedPet } = await import('../db.js');
  const result = await feedPet(selectedPet.value.id, cost, expGain, actionName);
  
  if (result.success) {
    audioSynthesizer.playHappyAction();
    showPetEffect(selectedPet.value.id, 'heart');
    
    if (result.levelUp) {
      audioSynthesizer.playLevelUp();
    }
    
    alert(result.message + (result.levelUp ? `\n🎉 精灵进化到${result.newStage}阶！` : ''));
    await loadStudents();
    closePetModal();
  } else {
    audioSynthesizer.playFail();
    alert(result.message);
  }
};

// 快捷喂食（不打开弹窗）
const quickFeed = async (studentId, event) => {
  event.stopPropagation();
  
  const student = students.value.find(s => s.id === studentId);
  if (!student) return;
  
  const { feedPet } = await import('../db.js');
  const result = await feedPet(studentId, 10, 5, '喂食');
  
  if (result.success) {
    audioSynthesizer.playHappyAction();
    showPetEffect(studentId, 'heart');
    
    if (result.levelUp) {
      audioSynthesizer.playLevelUp();
      alert(`🎉 ${student.name}的精灵进化到${result.newStage}阶！`);
    }
    
    await loadStudents();
  } else {
    audioSynthesizer.playFail();
    alert(result.message);
  }
};

// 快捷玩耍（不打开弹窗）
const quickPlay = async (studentId, event) => {
  event.stopPropagation();
  
  const student = students.value.find(s => s.id === studentId);
  if (!student) return;
  
  const { feedPet } = await import('../db.js');
  const result = await feedPet(studentId, 5, 3, '玩耍');
  
  if (result.success) {
    audioSynthesizer.playHappyAction();
    showPetEffect(studentId, 'heart');
    
    if (result.levelUp) {
      audioSynthesizer.playLevelUp();
      alert(`🎉 ${student.name}的精灵进化到${result.newStage}阶！`);
    }
    
    await loadStudents();
  } else {
    audioSynthesizer.playFail();
    alert(result.message);
  }
};

// 计算升级所需经验
const getExpToNextLevel = (student) => {
  return student.petStageInfo.maxExp - student.petExp;
};

// 打开更换精灵弹窗 - 两段式选择 + 换宠限制
const openChangePetModal = async () => {
  if (!selectedPet.value) return;
  
  // 检查是否可以换宠
  const canChange = await canChangePet(selectedPet.value.id);
  
  if (!canChange) {
    audioSynthesizer.playFail();
    alert('❌ 换宠限制\n\n第一次换宠免费，之后需要精灵达到满级（究极体 + 1000经验）才能再次更换！\n\n这是羁绊系统的一部分，请珍惜你的精灵伙伴！');
    return;
  }
  
  showElementSelector.value = true;
  selectedElement.value = null;
  showChangePetModal.value = false;
};

// 选择属性后显示该属性的宠物
const selectElement = (element) => {
  selectedElement.value = element;
  showElementSelector.value = false;
  showChangePetModal.value = true;
};

// 返回属性选择
const backToElementSelector = () => {
  showChangePetModal.value = false;
  showElementSelector.value = true;
};

// 过滤属性对应的宠物 + 高级属性解锁逻辑
const filteredPetTypes = computed(() => {
  if (!selectedElement.value) return availablePetTypes.value;
  return availablePetTypes.value.filter(pet => pet.element === selectedElement.value.id);
});

// 可选择的属性列表（根据解锁状态）
const availableElements = computed(() => {
  // 基础五行属性
  const basicElements = ['metal', 'wood', 'water', 'fire', 'earth'];
  
  if (advancedUnlocked.value) {
    // 全部解锁
    return ELEMENTS;
  } else {
    // 只显示基础五行
    return ELEMENTS.filter(e => basicElements.includes(e.id));
  }
});

// 更换精灵
const changePetType = async (petTypeId) => {
  if (!selectedPet.value) return;
  
  try {
    // 🆕 记录旧精灵信息（如果达到高阶段，记录到精灵图鉴）
    const oldPetTypeId = selectedPet.value.petTypeId;
    const oldPetStage = selectedPet.value.petStage;
    const oldPetExp = selectedPet.value.petExp;
    
    // 如果旧精灵达到了4阶或以上，记录到"曾经拥有"列表
    if (oldPetStage >= 4) {
      const { recordOwnedPet } = await import('../db.js');
      await recordOwnedPet(selectedPet.value.id, oldPetTypeId, oldPetStage, oldPetExp);
    }
    
    // 🆕 更换精灵：重置经验值和阶段，但保留总积分
    await updateStudent(selectedPet.value.id, { 
      petTypeId,
      petExp: 0,        // 经验值重置为0
      petStage: 1       // 阶段重置为1（萌蛋期）
    });
    
    // 增加换宠次数
    await incrementChangePetCount(selectedPet.value.id);
    
    audioSynthesizer.playSuccess();
    alert('✅ 精灵更换成功！\n\n新精灵将从萌蛋期开始成长，你的总积分已保留。\n' + 
          (oldPetStage >= 4 ? `\n🏆 你的${availablePetTypes.value.find(p => p.id === oldPetTypeId)?.name || '精灵'}（${oldPetStage}阶）已记录到精灵图鉴！` : ''));
    
    showChangePetModal.value = false;
    showElementSelector.value = false;
    
    // 🔧 修复白屏BUG：清空图片缓存，强制重新加载
    const key = `${selectedPet.value.id}_${oldPetTypeId}_${oldPetStage}`;
    delete petDisplayCache.value[key];
    
    await loadStudents();
    
    // 更新弹窗中的宠物信息
    selectedPet.value = students.value.find(s => s.id === selectedPet.value.id);
  } catch (error) {
    audioSynthesizer.playFail();
    alert('更换失败：' + error.message);
    console.error('更换精灵失败:', error);
  }
};

// 应用加减分规则（单独学生）
const applyPointRule = async (rule) => {
  if (!selectedPet.value) return;
  
  await quickAddPoints(selectedPet.value.id, rule.points, rule.label);
  alert(`✅ ${rule.label} ${rule.points > 0 ? '+' : ''}${rule.points}分`);
  closePetModal();
};

// 锁屏功能
const toggleLock = async () => {
  const systemPassword = await getSetting('password') || '1234';
  const passwordEnabled = await getSetting('passwordEnabled') || false;
  
  if (!passwordEnabled) {
    alert('请先在系统设置中启用密码保护功能！');
    return;
  }
  
  if (!isLocked.value) {
    // 锁定
    isLocked.value = true;
    lockPassword.value = '';
    lockMessageIndex.value = 0;
    lockMessage.value = teacherMessages[0];
    
    // 启动消息轮播（每10秒切换）
    lockMessageInterval.value = setInterval(() => {
      lockMessageIndex.value = (lockMessageIndex.value + 1) % teacherMessages.length;
      lockMessage.value = teacherMessages[lockMessageIndex.value];
    }, 10000);
  }
};

const unlockScreen = async () => {
  const systemPassword = await getSetting('password') || '1234';
  
  if (lockPassword.value === systemPassword) {
    isLocked.value = false;
    lockPassword.value = '';
    if (lockMessageInterval.value) {
      clearInterval(lockMessageInterval.value);
    }
    audioSynthesizer.playSuccess();
  } else {
    audioSynthesizer.playFail();
    alert('密码错误！');
    lockPassword.value = '';
  }
};

onMounted(() => {
  loadStudents();
  
  // 启动背景音乐
  setTimeout(() => {
    if (audioSettings.value.bgmEnabled) {
      audioManager.playBGM('happy');
    }
  }, 1000);
  
  // 添加键盘监听
  window.addEventListener('keypress', handleKeyPress);
  
  // 启动气泡巡逻（延迟10秒后开始，然后每20秒一次）
  setTimeout(() => {
    triggerRandomBubbles(); // 立即触发一次
    startBubblePatrol();
  }, 10000);
});

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('keypress', handleKeyPress);
  if (lockMessageInterval.value) {
    clearInterval(lockMessageInterval.value);
  }
  if (bubblePatrolTimer.value) {
    clearInterval(bubblePatrolTimer.value);
  }
});
</script>

<template>
  <div :class="['min-h-screen', currentTheme === 'cool' ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-black' : 'bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50']">
    <!-- 主控台视图 -->
    <div v-if="currentView === 'dashboard'" class="w-full">
      <!-- 顶部导航栏 -->
      <div :class="['sticky top-0 z-40 shadow-lg', currentTheme === 'cool' ? 'bg-gray-900/90' : 'bg-white/90', 'backdrop-blur-sm']">
        <div class="max-w-7xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              
              
              <h1 :class="['text-3xl font-bold', currentTheme === 'cool' ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400' : 'text-gray-800']">
                OpenCPS
              </h1>
            </div>
            <div class="flex gap-3 flex-wrap">
              <button @click="openHelpModal" class="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                使用说明
              </button>
              <button @click="forceLoadInitialPets" class="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm animate-pulse">
                一键加载初始宠物
              </button>
              <button @click="openSystemSettings" class="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                系统配置
              </button>
              <button @click="openClassManager" class="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                班级管理
              </button>
              <button @click="openGroupManager" class="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                小组管理
              </button>
              <button @click="openDataCenter" class="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                数据中心
              </button>
              <button @click="openTaskRiver" class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                精灵历险
              </button>
              <button @click="openPetPokedex" class="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                精灵图鉴
              </button>
              <button @click="openShopAndLottery" class="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                商店抽奖
              </button>
              <button @click="openBattle" class="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                宠物对战
              </button>
              <button @click="currentView = 'boss'" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                副本冒险
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 学生列表 -->
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- 批量操作栏 -->
        <div v-if="selectedCount > 0" class="mb-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl p-4 shadow-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <span class="text-lg font-bold">已选择 {{ selectedCount }} 个学生</span>
              <button @click="toggleAll" class="px-4 py-2 bg-white text-blue-500 rounded-lg font-bold hover:bg-blue-50 transition-all">
                {{ isAllSelected ? '取消全选' : '全选' }}
              </button>
            </div>
            <div class="flex gap-3">
              <button @click="openBatchModal" class="px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-800 rounded-lg font-bold hover:shadow-lg transition-all">
                📊 批量加减分
              </button>
              <button @click="batchFeed" class="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-bold hover:shadow-lg transition-all">
                🍖 批量喂食
              </button>
              <button @click="batchPlay" class="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-bold hover:shadow-lg transition-all">
                🎮 批量玩耍
              </button>
            </div>
          </div>
        </div>

        <!-- 学生卡片网格 - 6列布局 + 史诗级UI重构 -->
        <div class="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 gap-4 pb-24">
          <div
            v-for="student in studentsWithRank"
            :key="student.id"
            :class="[
              'relative rounded-2xl shadow-2xl cursor-pointer transition-all transform hover:scale-105 overflow-hidden',
              currentTheme === 'cool' ? 'bg-gradient-to-br from-gray-800 via-purple-900 to-black border-3 border-purple-500' : 'bg-gradient-to-br from-white via-purple-50 to-pink-50 border-2 border-purple-200',
              selectedStudents.has(student.id) ? 'ring-4 ring-blue-500 shadow-2xl' : 'hover:shadow-xl'
            ]"
          >
            <!-- 复选框 -->
            <input
              type="checkbox"
              :checked="selectedStudents.has(student.id)"
              @click.stop="toggleStudent(student.id, $event)"
              class="absolute top-2 right-2 w-5 h-5 rounded z-10"
            />

            <!-- 史诗级弧形标题 - SVG技术 -->
            <div class="relative h-16 overflow-visible">
              <!-- 属性图标徽章 - 左上角 -->
              <div v-if="student.element" class="absolute top-1 left-1 z-20 text-2xl drop-shadow-lg">
                {{ getStudentElementEmoji(student) }}
              </div>
              
              <!-- SVG弧形路径 -->
              <svg class="absolute inset-0 w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <!-- 定义弧形路径 -->
                  <path id="arc" d="M 20,50 Q 100,10 180,50" fill="none" />
                  <!-- 金属质感渐变 -->
                  <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#FFF8DC;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#FFD700;stop-opacity:1" />
                  </linearGradient>
                </defs>
                
                <!-- 弧形文字 -->
                <text font-size="12" font-weight="900" fill="url(#goldGradient)" text-anchor="middle">
                  <textPath href="#arc" startOffset="50%">
                    <tspan class="drop-shadow-lg">⚔️{{ calculateAttackPower(student.petExp) }} {{ student.name }}的{{ getPetRealName(student.petTypeId) }}</tspan>
                  </textPath>
                </text>
              </svg>
              
              <!-- 背景装饰 -->
              <div :class="['absolute inset-0 opacity-30', currentTheme === 'cool' ? 'bg-gradient-to-b from-purple-600 to-transparent' : 'bg-gradient-to-b from-purple-400 to-transparent']"></div>
            </div>

            <!-- 宠物图片区域 - 史诗级放大，占据卡片主要空间，支持PNG透明效果 -->
            <div 
              @click="openPetModal(student)"
              class="relative w-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
              style="height: 200px; min-height: 200px;"
            >
              <!-- 勋章墙 - 左侧垂直排列 -->
              <div v-if="getStudentBadges(student).length > 0" class="absolute left-1 top-1 z-20 flex flex-col gap-1">
                <div 
                  v-for="badge in getStudentBadges(student).slice(0, 6)" 
                  :key="badge"
                  class="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg animate-badge-glow"
                  :title="`${ELEMENTS.find(e => e.id === badge)?.name}系征服者`"
                >
                  <span class="text-lg">{{ getBadgeEmoji(badge) }}</span>
                </div>
                <!-- 更多勋章提示 -->
                <div v-if="getStudentBadges(student).length > 6" class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg text-xs font-bold text-white">
                  +{{ getStudentBadges(student).length - 6 }}
                </div>
              </div>
              
              <!-- 智能气泡 - 漫画风 -->
              <div 
                v-if="getPetBubble(student.id)?.visible" 
                :class="['absolute -top-16 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none', getPetBubble(student.id)?.visible ? 'animate-fade-in' : 'animate-fade-out']"
              >
                <div class="relative bg-white rounded-2xl px-4 py-2 shadow-2xl border-2 border-purple-300 max-w-[200px]">
                  <p class="text-xs font-bold text-gray-800 text-center leading-tight">
                    {{ getPetBubble(student.id)?.message }}
                  </p>
                  <!-- 气泡尾巴 -->
                  <div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white"></div>
                  <div class="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-purple-300"></div>
                </div>
              </div>
              
              <!-- 宠物特效层 -->
              <div v-if="getPetEffect(student.id)" class="absolute inset-0 z-10 pointer-events-none">
                <!-- 爱心特效 -->
                <div v-if="getPetEffect(student.id).type === 'heart'" class="absolute inset-0 flex items-center justify-center">
                  <div class="animate-ping text-6xl">❤️</div>
                  <div class="absolute top-0 left-1/4 animate-bounce text-4xl">❤️</div>
                  <div class="absolute top-0 right-1/4 animate-bounce text-4xl delay-100">❤️</div>
                  <div class="absolute bottom-0 left-1/3 animate-bounce text-4xl delay-200">❤️</div>
                </div>
                
                <!-- 冰冻特效 -->
                <div v-if="getPetEffect(student.id).type === 'freeze'" class="absolute inset-0 flex items-center justify-center animate-shake">
                  <div class="text-9xl opacity-70">🧊</div>
                  <div class="absolute inset-0 bg-blue-500/20 animate-pulse"></div>
                </div>
                
                <!-- 哭泣特效 -->
                <div v-if="getPetEffect(student.id).type === 'cry'" class="absolute top-0 left-1/2 transform -translate-x-1/2">
                  <div class="animate-bounce text-5xl">😭</div>
                </div>
                
                <!-- 叹气特效 -->
                <div v-if="getPetEffect(student.id).type === 'sigh'" class="absolute top-0 left-1/2 transform -translate-x-1/2">
                  <div class="animate-bounce text-5xl">😮‍💨</div>
                </div>
              </div>

              <!-- 显示精灵图片或Emoji - 史诗级放大 + 动画 -->
              <div 
                v-if="isImageType(getPetDisplayContent(student).type)" 
                :class="['w-full h-full p-2 animate-bounce-slow', getPetEffect(student.id)?.type === 'freeze' || getPetEffect(student.id)?.type === 'cry' ? 'animate-shake' : '']"
              >
                <img 
                  :src="getPetDisplayContent(student).content" 
                  class="w-full h-full object-contain" 
                  style="transform: scale(1.3);"
                  alt="精灵" 
                />
              </div>
              <div 
                v-else 
                :class="['text-8xl animate-bounce-slow', getPetEffect(student.id)?.type === 'freeze' || getPetEffect(student.id)?.type === 'cry' ? 'animate-shake' : '']"
              >
                {{ getPetDisplayContent(student).content }}
              </div>
            </div>

            <!-- 底部快捷互动区 + 阶段名 -->
            <div :class="['px-2 py-1.5 space-y-1', currentTheme === 'cool' ? 'bg-gray-800/90' : 'bg-white/90']">
              <!-- 阶段名（降级显示） -->
              <div class="text-center">
                <span :class="['text-[10px] font-medium', currentTheme === 'cool' ? 'text-gray-400' : 'text-gray-500']">
                  {{ student.petStageInfo.emoji }} {{ student.petStageInfo.name }}
                </span>
              </div>
              
              <!-- 经验条 -->
              <div class="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" :style="{ width: `${(student.petExp / student.petStageInfo.maxExp) * 100}%` }"></div>
              </div>
              
              <!-- 快捷互动 -->
              <div class="flex items-center justify-between">
                <span :class="['text-[10px] font-bold truncate flex-1', currentTheme === 'cool' ? 'text-purple-300' : 'text-purple-600']">
                  还需{{ getExpToNextLevel(student) }}经验
                </span>
                <div class="flex gap-1 ml-1">
                  <button 
                    @click="quickFeed(student.id, $event)"
                    class="w-6 h-6 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center justify-center text-xs"
                    title="喂食 (-10币, +5经验)"
                  >
                    🍖
                  </button>
                  <button 
                    @click="quickPlay(student.id, $event)"
                    class="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center justify-center text-xs"
                    title="玩耍 (-5币, +3经验)"
                  >
                    🎮
                  </button>
                  <button 
                    @click="openBossRaid(student); $event.stopPropagation()"
                    class="w-6 h-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center justify-center text-xs"
                    title="Boss副本"
                  >
                    ⚔️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧垂直悬浮菜单 - 课堂即时互动工具 -->
      <div class="fixed right-4 top-1/2 transform -translate-y-1/2 z-40 flex flex-col gap-3">
        <button @click="currentView = 'boss'" :class="['p-4 rounded-2xl font-bold hover:shadow-2xl transition-all shadow-lg animate-pulse', currentTheme === 'cool' ? 'bg-gradient-to-br from-red-600 to-orange-600 text-white' : 'bg-gradient-to-br from-red-500 to-orange-500 text-white']" title="Boss副本冒险">
          <div class="text-2xl">🏰</div>
          <div class="text-xs mt-1">副本</div>
        </button>
        <button @click="startRandomPicker" :class="['p-4 rounded-2xl font-bold hover:shadow-2xl transition-all shadow-lg', currentTheme === 'cool' ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white' : 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white']" title="随机点名">
          <div class="text-2xl">🎲</div>
          <div class="text-xs mt-1">点名</div>
        </button>
        <button @click="startTimer(3)" :class="['p-4 rounded-2xl font-bold hover:shadow-2xl transition-all shadow-lg', currentTheme === 'cool' ? 'bg-gradient-to-br from-orange-600 to-red-600 text-white' : 'bg-gradient-to-br from-orange-500 to-red-500 text-white']" title="倒计时">
          <div class="text-2xl">⏱️</div>
          <div class="text-xs mt-1">计时</div>
        </button>
        <button @click="openPetPK" :class="['p-4 rounded-2xl font-bold hover:shadow-2xl transition-all shadow-lg', currentTheme === 'cool' ? 'bg-gradient-to-br from-red-600 to-pink-600 text-white' : 'bg-gradient-to-br from-red-500 to-pink-500 text-white']" title="精灵PK">
          <div class="text-2xl">⚔️</div>
          <div class="text-xs mt-1">PK</div>
        </button>
      </div>

    </div>


    <TaskRiverV2 v-else-if="currentView === 'task'" @exit="closeModule" @dataUpdate="loadStudents" />
    <PraiseWall v-else-if="currentView === 'praise'" @exit="closeModule" />
    <DataCenter v-else-if="currentView === 'data'" @exit="closeModule" />
    <ClassManager v-else-if="currentView === 'manager'" @exit="closeModule" />
    <GroupManager v-else-if="currentView === 'group'" @exit="closeModule" />
    <ShopAndLottery v-else-if="currentView === 'shop'" @exit="closeModule" />
    <PetPK v-else-if="currentView === 'pk'" @exit="closeModule" />
    <PetPokedex v-else-if="currentView === 'pokedex'" @exit="closeModule" />
    <SystemSettings v-else-if="currentView === 'settings'" @exit="closeModule" />
    
    <!-- Boss副本冒险 -->
    <div v-else-if="currentView === 'boss'" class="fixed inset-0 z-50">
      <div class="bg-white/10 backdrop-blur-sm p-6 sticky top-0 z-10">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <button @click="closeModule" class="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-bold hover:shadow-lg transition-all">
            ← 返回主控台
          </button>
          <h1 class="text-4xl font-bold text-white drop-shadow-2xl">🏰 Boss副本大厅</h1>
          <div class="w-32"></div>
        </div>
      </div>
      
      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
          <p class="text-xl text-white text-center">选择一个学生开始挑战Boss副本</p>
        </div>
        
        <!-- 学生选择网格 -->
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          <div 
            v-for="student in studentsWithRank" 
            :key="student.id"
            @click="openBossRaid(student)"
            class="bg-white rounded-2xl p-4 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all"
          >
            <div class="text-center">
              <div v-if="isImageType(getPetDisplayContent(student).type)" class="w-20 h-20 mx-auto mb-3">
                <img :src="getPetDisplayContent(student).content" class="w-full h-full object-contain" alt="精灵" />
              </div>
              <div v-else class="text-5xl mb-3">{{ getPetDisplayContent(student).content }}</div>
              
              <h3 class="text-lg font-bold text-gray-800">{{ student.name }}</h3>
              <p class="text-sm text-gray-600">{{ student.petStageInfo.name }}</p>
              <p class="text-sm font-bold text-purple-600 mt-2">{{ getElementInfo(availablePetTypes.find(p => p.id === student.petTypeId)?.element || 'fire').emoji }} {{ getElementInfo(availablePetTypes.find(p => p.id === student.petTypeId)?.element || 'fire').name }}系</p>
              
              <!-- 勋章数量 -->
              <div v-if="getStudentBadges(student).length > 0" class="mt-2 text-xs font-bold text-yellow-600">
                🏆 {{ getStudentBadges(student).length }} 个勋章
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 宠物对战模块 -->
    <div v-else-if="currentView === 'battle'" class="fixed inset-0 z-50 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 overflow-hidden">
      <!-- 顶部导航 -->
      <div class="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg p-4 z-10">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <button @click="closeModule" class="px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl font-bold hover:shadow-lg transition-all">
            ← 返回主控台
          </button>
          <h1 class="text-3xl font-bold text-gray-800">⚔️ 宠物数值大乱斗</h1>
          <button @click="resetBattle" class="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all">
            🔄 重置
          </button>
        </div>
      </div>

      <!-- 对战区域 -->
      <div class="relative w-full h-full pt-24 pb-8 overflow-y-auto">
        <div class="max-w-6xl mx-auto px-8">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <!-- 左侧：选手1 -->
            <div class="bg-white rounded-3xl shadow-2xl p-6">
              <h3 class="text-2xl font-bold text-blue-600 mb-4 text-center">🔵 选手1</h3>
              <select 
                v-model="battlePlayer1" 
                class="w-full px-4 py-3 rounded-xl border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-lg mb-4"
              >
                <option :value="null">-- 选择学生 --</option>
                <option v-for="student in studentsWithRank" :key="student.id" :value="student">
                  {{ student.name }} (⚔️{{ calculateAttackPower(student.petExp) }})
                </option>
              </select>

              <div v-if="battlePlayer1" class="text-center">
                <div v-if="isImageType(getPetDisplayContent(battlePlayer1).type)" class="w-40 h-40 mx-auto mb-4">
                  <img 
                    :src="getPetDisplayContent(battlePlayer1).content" 
                    :class="['w-full h-full object-contain', battleAnimating ? 'animate-battle-left' : '']"
                    alt="精灵" 
                  />
                </div>
                <div v-else :class="['text-8xl mb-4', battleAnimating ? 'animate-battle-left' : '']">
                  {{ getPetDisplayContent(battlePlayer1).content }}
                </div>
                <h4 class="text-2xl font-bold text-gray-800 mb-2">{{ battlePlayer1.name }}</h4>
                <p class="text-lg text-gray-600 mb-2">{{ battlePlayer1.petStageInfo.name }}</p>
                <div class="bg-gradient-to-r from-orange-100 to-red-100 rounded-xl p-4">
                  <p class="text-3xl font-bold text-red-600">⚔️ {{ calculateAttackPower(battlePlayer1.petExp) }}</p>
                  <p class="text-sm text-gray-600">攻击力</p>
                </div>
                <div v-if="battleResult && battleResult.winner?.id === battlePlayer1.id" class="mt-4 text-6xl animate-bounce">
                  👑
                </div>
              </div>
            </div>

            <!-- 右侧：选手2 -->
            <div class="bg-white rounded-3xl shadow-2xl p-6">
              <h3 class="text-2xl font-bold text-red-600 mb-4 text-center">🔴 选手2</h3>
              <select 
                v-model="battlePlayer2" 
                class="w-full px-4 py-3 rounded-xl border-2 border-red-300 focus:border-red-500 focus:outline-none text-lg mb-4"
              >
                <option :value="null">-- 选择学生 --</option>
                <option v-for="student in studentsWithRank" :key="student.id" :value="student">
                  {{ student.name }} (⚔️{{ calculateAttackPower(student.petExp) }})
                </option>
              </select>

              <div v-if="battlePlayer2" class="text-center">
                <div v-if="isImageType(getPetDisplayContent(battlePlayer2).type)" class="w-40 h-40 mx-auto mb-4">
                  <img 
                    :src="getPetDisplayContent(battlePlayer2).content" 
                    :class="['w-full h-full object-contain', battleAnimating ? 'animate-battle-right' : '']"
                    alt="精灵" 
                  />
                </div>
                <div v-else :class="['text-8xl mb-4', battleAnimating ? 'animate-battle-right' : '']">
                  {{ getPetDisplayContent(battlePlayer2).content }}
                </div>
                <h4 class="text-2xl font-bold text-gray-800 mb-2">{{ battlePlayer2.name }}</h4>
                <p class="text-lg text-gray-600 mb-2">{{ battlePlayer2.petStageInfo.name }}</p>
                <div class="bg-gradient-to-r from-orange-100 to-red-100 rounded-xl p-4">
                  <p class="text-3xl font-bold text-red-600">⚔️ {{ calculateAttackPower(battlePlayer2.petExp) }}</p>
                  <p class="text-sm text-gray-600">攻击力</p>
                </div>
                <div v-if="battleResult && battleResult.winner?.id === battlePlayer2.id" class="mt-4 text-6xl animate-bounce">
                  👑
                </div>
              </div>
            </div>
          </div>

          <!-- 战斗按钮和结果 -->
          <div class="text-center">
            <button 
              v-if="!battleResult"
              @click="startBattle" 
              :disabled="!battlePlayer1 || !battlePlayer2 || battleAnimating"
              :class="[
                'px-12 py-6 rounded-2xl font-bold text-2xl hover:shadow-2xl transition-all',
                battleAnimating ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:scale-105'
              ]"
            >
              {{ battleAnimating ? '⚔️ 战斗中...' : '⚔️ 开始战斗' }}
            </button>

            <div v-if="battleResult" class="bg-white rounded-3xl shadow-2xl p-8">
              <h3 class="text-4xl font-bold text-gray-800 mb-6">{{ battleResult.result }}</h3>
              
              <!-- 属性克制提示 -->
              <div class="grid grid-cols-2 gap-4 mb-6">
                <!-- 选手1克制信息 -->
                <div :class="['rounded-xl p-4 border-2', battleResult.desc1.bgColor, battleResult.desc1.shake ? 'animate-pulse' : '']">
                  <div class="text-3xl mb-2">{{ battleResult.desc1.icon }}</div>
                  <div :class="['text-lg font-bold mb-1', battleResult.desc1.color]">
                    {{ battlePlayer1.name }}
                  </div>
                  <div :class="['text-2xl font-black', battleResult.desc1.color]">
                    {{ battleResult.desc1.text }}
                  </div>
                  <div class="text-sm text-gray-600 mt-2">
                    基础攻击: {{ battleResult.power1 }} → 最终: {{ battleResult.finalPower1 }}
                  </div>
                  <div :class="['text-xl font-bold mt-1', battleResult.desc1.color]">
                    {{ battleResult.desc1.multiplierText }}
                  </div>
                </div>
                
                <!-- 选手2克制信息 -->
                <div :class="['rounded-xl p-4 border-2', battleResult.desc2.bgColor, battleResult.desc2.shake ? 'animate-pulse' : '']">
                  <div class="text-3xl mb-2">{{ battleResult.desc2.icon }}</div>
                  <div :class="['text-lg font-bold mb-1', battleResult.desc2.color]">
                    {{ battlePlayer2.name }}
                  </div>
                  <div :class="['text-2xl font-black', battleResult.desc2.color]">
                    {{ battleResult.desc2.text }}
                  </div>
                  <div class="text-sm text-gray-600 mt-2">
                    基础攻击: {{ battleResult.power2 }} → 最终: {{ battleResult.finalPower2 }}
                  </div>
                  <div :class="['text-xl font-bold mt-1', battleResult.desc2.color]">
                    {{ battleResult.desc2.multiplierText }}
                  </div>
                </div>
              </div>
              
              <p v-if="battleResult.winner" class="text-lg text-green-600 font-bold mb-4">
                🎉 {{ battleResult.winner.name }} 获得 10 点经验值奖励！
              </p>
              
              <button 
                @click="resetBattle"
                class="mt-6 px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                再来一局
              </button>
            </div>
          </div>

          <!-- 规则说明 -->
          <div class="bg-white/80 rounded-2xl p-6 mt-8">
            <h4 class="text-xl font-bold text-gray-800 mb-3">📜 对战规则</h4>
            <ul class="space-y-2 text-gray-700">
              <li>• 基础攻击力 = 宠物经验值 × 0.1（向下取整）</li>
              <li>• 最终攻击力 = 基础攻击力 × 属性克制倍率</li>
              <li>• 最终攻击力高的一方获胜，获得 10 点经验值奖励</li>
              <li>• 攻击力相同则平局，双方都不获得奖励</li>
              <li class="text-red-600 font-bold">• ⚡ 16种属性相克系统已激活！</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- 锁屏界面 -->
    <div v-if="isLocked" class="fixed inset-0 z-[100] bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 backdrop-blur-xl flex items-center justify-center">
      <div class="text-center space-y-8 max-w-2xl px-8">
        <!-- 轮播消息 -->
        <div class="text-5xl font-black text-white drop-shadow-2xl animate-pulse leading-tight">
          {{ lockMessage }}
        </div>
        
        <!-- 密码输入框 -->
        <div class="bg-white/20 backdrop-blur-md rounded-3xl p-8 shadow-2xl">
          <p class="text-xl text-white mb-4 font-bold">🔐 请输入密码解锁</p>
          <input 
            v-model="lockPassword"
            type="password"
            placeholder="输入密码"
            @keyup.enter="unlockScreen"
            class="w-full px-6 py-4 rounded-xl text-2xl text-center font-bold border-4 border-white/50 focus:border-white focus:outline-none bg-white/90"
          />
          <button 
            @click="unlockScreen"
            class="w-full mt-4 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-xl hover:shadow-2xl transition-all"
          >
            🔓 解锁
          </button>
        </div>
        
        <!-- 装饰元素 -->
        <div class="text-6xl opacity-50 animate-bounce">🔒</div>
      </div>
      
    </div>

    <!-- 系统重置弹窗 - 按E键触发 -->
    <div v-if="showResetModal" class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center" @click="showResetModal = false">
      <div class="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl" @click.stop>
        <h3 class="text-3xl font-bold text-red-600 mb-4 text-center">⚠️ 系统重置</h3>
        
        <div class="bg-red-50 rounded-xl p-4 mb-6">
          <p class="text-sm text-red-800 mb-2 font-bold">此操作将删除：</p>
          <ul class="text-xs text-red-700 space-y-1">
            <li>❌ 所有学生数据</li>
            <li>❌ 所有积分记录</li>
            <li>❌ 所有任务完成记录</li>
            <li>❌ 所有心里话内容</li>
            <li>❌ 所有PK对战记录</li>
            <li>❌ 所有兑换记录</li>
          </ul>
          <p class="text-sm text-green-800 mt-3 font-bold">保留配置：</p>
          <ul class="text-xs text-green-700 space-y-1">
            <li>✅ 教师密码和设置</li>
            <li>✅ 加减分规则</li>
            <li>✅ 精灵图鉴和图片</li>
            <li>✅ 商店商品配置</li>
            <li>✅ 题库内容</li>
          </ul>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">请输入教师密码确认</label>
            <input 
              v-model="resetPassword"
              type="password"
              placeholder="输入密码"
              @keyup.enter="confirmReset"
              class="w-full px-4 py-3 rounded-lg border-2 border-red-300 focus:border-red-500 focus:outline-none text-center text-xl font-bold"
            />
          </div>
          
          <div class="flex gap-3">
            <button 
              @click="confirmReset"
              class="flex-1 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-bold hover:shadow-lg transition-all"
            >
              🔄 确认重置
            </button>
            <button 
              @click="showResetModal = false"
              class="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all"
            >
              取消
            </button>
          </div>
        </div>
        
        <p class="text-xs text-gray-500 text-center mt-4">💡 提示：按键盘E键可快速打开此面板</p>
      </div>
    </div>

    <!-- 生日弹窗 -->
    <BirthdayModal v-if="birthdayStudent" :student="birthdayStudent" :gift="birthdayGift" @close="closeBirthdayModal" />

    <!-- 宠物互动弹窗 - 深度融合评分功能 -->
    <div v-if="showPetModal && selectedPet" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click="closePetModal">
      <div class="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" @click.stop>
        <!-- 关闭按钮 -->
        <button @click="closePetModal" class="absolute top-2 right-2 z-10 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-red-600 transition-all">
          ×
        </button>

        <!-- 学生基本信息 - 紧凑头部 -->
        <div class="bg-gradient-to-br from-purple-200 to-pink-200 p-3">
          <div class="flex items-center gap-3">
            <!-- 宠物图片 - 缩小 -->
            <div class="flex-shrink-0">
              <div v-if="isImageType(getPetDisplayContent(selectedPet).type)" class="w-16 h-16">
                <img :src="getPetDisplayContent(selectedPet).content" class="w-full h-full object-cover rounded-xl shadow-lg" alt="精灵" />
              </div>
              <div v-else class="text-5xl animate-bounce-slow">{{ getPetDisplayContent(selectedPet).content }}</div>
            </div>
            
            <!-- 学生信息 -->
            <div class="flex-1">
              <h2 class="text-xl font-bold text-gray-800">{{ selectedPet.name }}</h2>
              <p class="text-xs text-gray-700">{{ selectedPet.petStageInfo.name }}</p>
              <div class="flex items-center gap-3 mt-1">
                <span class="text-sm font-bold text-orange-600">⚔️ 攻击力: {{ calculateAttackPower(selectedPet.petExp) }}</span>
              </div>
            </div>
          </div>

          <!-- 经验值和积分 - 紧凑显示 -->
          <div class="mt-2 space-y-1">
            <div class="bg-white/80 rounded-lg p-1.5">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-gray-700">经验值</span>
                <span class="font-bold text-purple-600">{{ selectedPet.petExp }}/{{ selectedPet.petStageInfo.maxExp }}</span>
              </div>
              <div class="bg-gray-200 rounded h-1.5 overflow-hidden mt-1">
                <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" :style="{ width: `${(selectedPet.petExp / selectedPet.petStageInfo.maxExp) * 100}%` }"></div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-1">
              <div class="bg-blue-50 rounded p-1 text-center">
                <div class="text-xs text-blue-600">总积分</div>
                <div class="text-sm font-bold text-blue-700">{{ selectedPet.totalPoints }}</div>
              </div>
              <div class="bg-green-50 rounded p-1 text-center">
                <div class="text-xs text-green-600">可用币</div>
                <div class="text-sm font-bold text-green-700">{{ selectedPet.availablePoints }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 宠物信息和互动 - 可滚动 -->
        <div class="p-3 space-y-2 overflow-y-auto flex-1">
          <!-- 宠物互动按钮组 - 移到最上面 -->
          <div class="mb-3">
            <p class="text-xs text-gray-500 mb-2 text-center font-bold">🎮 宠物互动</p>
            <div class="grid grid-cols-4 gap-2">
              <button 
                @click="openChangePetModal" 
                :disabled="!canChangePetNow"
                :class="[
                  'py-2 rounded-lg font-bold hover:shadow-lg transition-all text-xs',
                  canChangePetNow 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                ]"
                :title="canChangePetNow ? '更换精灵' : '需要满级才能再次更换'"
              >
                {{ canChangePetNow ? '🔄 更换' : '🔒 锁定' }}
              </button>
              <button @click="feedPetAction(10, 5, '喂食')" class="py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-bold hover:shadow-lg transition-all text-xs">
                🍖 喂食
              </button>
              <button @click="feedPetAction(5, 3, '玩耍')" class="py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-bold hover:shadow-lg transition-all text-xs">
                🎮 玩耍
              </button>
              <button @click="openBossRaid(selectedPet); closePetModal()" class="py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-bold hover:shadow-lg transition-all text-xs">
                ⚔️ 副本
              </button>
            </div>
          </div>

          <!-- 评分网格部分 - 移到下面 -->
          <div class="pt-2 border-t">
            <p class="text-xs text-gray-500 mb-2 text-center font-bold">📊 课堂评分</p>
            <!-- Tab切换 - 紧凑版 -->
            <div class="flex gap-2 mb-2">
              <button 
                @click="petModalTab = 'add'" 
                :class="['flex-1 py-2 rounded-lg font-bold text-sm transition-all', petModalTab === 'add' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700']"
              >
                ➕ 加分
              </button>
              <button 
                @click="petModalTab = 'deduct'" 
                :class="['flex-1 py-2 rounded-lg font-bold text-sm transition-all', petModalTab === 'deduct' ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700']"
              >
                ➖ 扣分
              </button>
            </div>

            <!-- 加分规则网格 -->
            <div v-if="petModalTab === 'add'" class="space-y-2">
              <button 
                v-for="rule in POINT_RULES.add" 
                :key="rule.label"
                @click="applyPointRule(rule)"
                class="w-full p-2 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-lg border-2 border-green-200 transition-all flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  <span class="text-xl">{{ rule.icon }}</span>
                  <span class="text-sm font-bold text-gray-800">{{ rule.label }}</span>
                </div>
                <span class="text-lg font-bold text-green-600">+{{ rule.points }}</span>
              </button>
            </div>

            <!-- 扣分规则网格 -->
            <div v-else-if="petModalTab === 'deduct'" class="space-y-2">
              <button 
                v-for="rule in POINT_RULES.deduct" 
                :key="rule.label"
                @click="applyPointRule(rule)"
                class="w-full p-2 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 rounded-lg border-2 border-red-200 transition-all flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  <span class="text-xl">{{ rule.icon }}</span>
                  <span class="text-sm font-bold text-gray-800">{{ rule.label }}</span>
                </div>
                <span class="text-lg font-bold text-red-600">{{ rule.points }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 第一步：属性选择器（元素罗盘） + 高级属性解锁 -->
    <div v-if="showElementSelector" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click="showElementSelector = false">
      <div class="bg-white rounded-3xl p-8 max-w-5xl w-full mx-4 shadow-2xl" @click.stop>
        <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">✨ 选择精灵属性</h2>
        <p class="text-center text-gray-600 mb-2">先选择一种属性，再挑选该属性的专属精灵</p>
        
        <!-- 解锁提示 -->
        <div v-if="!advancedUnlocked" class="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6 text-center">
          <p class="text-sm font-bold text-yellow-800">🔒 高级属性已锁定</p>
          <p class="text-xs text-yellow-700 mt-1">当班级中有任意学生的精灵达到满级（究极体+1000经验）时，全班解锁所有16种属性！</p>
        </div>
        <div v-else class="bg-green-50 border-2 border-green-300 rounded-xl p-4 mb-6 text-center">
          <p class="text-sm font-bold text-green-800">✅ 全属性已解锁</p>
          <p class="text-xs text-green-700 mt-1">恭喜！班级中有满级精灵，所有16种属性现已开放！</p>
        </div>
        
        <!-- 16属性网格 -->
        <div class="grid grid-cols-4 md:grid-cols-8 gap-4">
          <div 
            v-for="element in ELEMENTS" 
            :key="element.id"
            @click="availableElements.some(e => e.id === element.id) ? selectElement(element) : null"
            :class="[
              'rounded-2xl p-4 transition-all border-4',
              availableElements.some(e => e.id === element.id) ? 'cursor-pointer hover:shadow-2xl hover:scale-110 border-transparent hover:border-white' : 'opacity-30 cursor-not-allowed border-gray-400'
            ]"
            :style="{ background: availableElements.some(e => e.id === element.id) ? `linear-gradient(to bottom right, ${element.color.split(' ')[1]}, ${element.color.split(' ')[3]})` : '#ccc' }"
          >
            <div class="text-center">
              <div :class="['text-4xl mb-2 transition-transform', availableElements.some(e => e.id === element.id) ? 'group-hover:scale-125' : '']">
                {{ element.emoji }}
                <span v-if="!availableElements.some(e => e.id === element.id)" class="text-2xl">🔒</span>
              </div>
              <div class="text-xs font-bold text-white drop-shadow-lg">{{ element.name }}</div>
            </div>
          </div>
        </div>

        <button 
          @click="showElementSelector = false"
          class="w-full mt-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition-all"
        >
          取消
        </button>
      </div>
    </div>

    <!-- 第二步：宠物选择器（属性过滤后） -->
    <div v-if="showChangePetModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click="showChangePetModal = false">
      <div class="bg-white rounded-3xl p-8 max-w-4xl w-full mx-4 shadow-2xl" @click.stop>
        <!-- 返回按钮 -->
        <button @click="backToElementSelector" class="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all">
          ← 返回属性选择
        </button>
        
        <h2 class="text-3xl font-bold text-gray-800 mb-2 text-center">
          {{ selectedElement?.emoji }} {{ selectedElement?.name }}系精灵
        </h2>
        <p class="text-center text-gray-600 mb-6">选择你喜欢的{{ selectedElement?.name }}系精灵</p>
        
        <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
          <!-- 🆕 终极形态神秘剪影卡片 -->
          <div class="relative cursor-not-allowed bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border-4 border-purple-600 overflow-hidden shadow-2xl">
            <!-- 终极形态图片（第6阶段）- 黑色剪影 -->
            <div class="relative h-48 flex items-center justify-center">
              <!-- 尝试显示该属性第一个精灵的第6阶段图片作为剪影 -->
              <div 
                v-if="filteredPetTypes.length > 0 && petImages[filteredPetTypes[0]?.id]?.[6]"
                class="absolute inset-0 flex items-center justify-center"
              >
                <img 
                  :src="petImages[filteredPetTypes[0]?.id]?.[6]"
                  class="w-32 h-32 object-contain"
                  style="filter: brightness(0) opacity(0.6);"
                  alt="终极形态"
                />
              </div>
              
              <!-- 如果没有图片，显示神秘emoji剪影 -->
              <div 
                v-else
                class="absolute inset-0 flex items-center justify-center text-8xl opacity-60"
                style="filter: brightness(0);"
              >
                🐉
              </div>
              
              <!-- 锁图标和提示文字（叠加层） -->
              <div class="absolute inset-0 flex flex-col items-center justify-center z-10">
                <div class="text-7xl mb-2 animate-pulse drop-shadow-2xl">🔒</div>
                <div class="text-white font-bold text-xl drop-shadow-lg">❓ 终极形态</div>
                <div class="text-gray-300 text-sm mt-2 text-center px-2 drop-shadow-md">
                  精灵达到究极体后解锁
                </div>
              </div>
            </div>
            
            <!-- 神秘光效 -->
            <div class="absolute inset-0 bg-gradient-to-t from-purple-600/30 to-transparent pointer-events-none"></div>
            <div class="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-pink-600/10 pointer-events-none animate-pulse"></div>
          </div>
          
          <!-- 现有的精灵卡片 -->
          <div 
            v-for="petType in filteredPetTypes" 
            :key="petType.id"
            @click="changePetType(petType.id)"
            class="cursor-pointer bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-6 hover:shadow-2xl hover:scale-105 transition-all border-4 border-transparent hover:border-purple-500"
          >
            <div class="text-center">
              <div class="text-7xl mb-4">{{ petType.emoji }}</div>
              <h3 class="text-xl font-bold text-gray-800 mb-2">{{ petType.name }}</h3>
              <p class="text-sm text-gray-600">{{ petType.description }}</p>
            </div>
          </div>
        </div>

        <div v-if="filteredPetTypes.length === 0" class="text-center py-12 text-gray-500">
          <div class="text-6xl mb-4">🔍</div>
          <p class="text-lg">该属性暂无精灵，请返回选择其他属性</p>
        </div>

        <button 
          @click="showChangePetModal = false"
          class="w-full mt-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition-all"
        >
          取消
        </button>
      </div>
    </div>

    <!-- 随机点名弹窗 -->
    <div v-if="showRandomPicker" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click="closeRandomPicker">
      <div class="bg-white rounded-3xl p-12 max-w-md w-full mx-4 shadow-2xl text-center" @click.stop>
        <div class="text-9xl mb-6 animate-spin">🎲</div>
        <h2 class="text-3xl font-bold text-gray-800 mb-4">随机点名</h2>
        
        <div v-if="randomPickerRunning" class="text-2xl font-bold text-blue-600 mb-6">
          抽取中...
        </div>
        <div v-else-if="randomPickerResult" class="space-y-4">
          <!-- 显示精灵图片或Emoji -->
          <div v-if="isImageType(getPetDisplayContent(randomPickerResult).type)" class="w-32 h-32 mx-auto mb-4">
            <img :src="getPetDisplayContent(randomPickerResult).content" class="w-full h-full object-cover rounded-2xl shadow-lg" alt="精灵" />
          </div>
          <div v-else class="text-6xl mb-4">{{ getPetDisplayContent(randomPickerResult).content }}</div>
          <div class="text-4xl font-bold text-gray-800">{{ randomPickerResult.name }}</div>
          <div class="text-lg text-gray-600">{{ randomPickerResult.group }}</div>
          <button @click="closeRandomPicker" class="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg transition-all">
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 倒计时弹窗 - 扩充时间选项 -->
    <div v-if="showTimer" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click="closeTimer">
      <div class="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl" @click.stop>
        <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">⏱️ 倒计时</h2>
        
        <!-- 快捷时间选项 - 新增 -->
        <div v-if="!timerStarted" class="grid grid-cols-4 gap-2 mb-6">
          <button @click="startTimer(1)" class="py-3 bg-gradient-to-r from-blue-400 to-cyan-400 text-white rounded-xl font-bold hover:shadow-lg transition-all">
            1分钟
          </button>
          <button @click="startTimer(3)" class="py-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white rounded-xl font-bold hover:shadow-lg transition-all">
            3分钟
          </button>
          <button @click="startTimer(5)" class="py-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-xl font-bold hover:shadow-lg transition-all">
            5分钟
          </button>
          <button @click="startTimer(10)" class="py-3 bg-gradient-to-r from-red-400 to-pink-400 text-white rounded-xl font-bold hover:shadow-lg transition-all">
            10分钟
          </button>
        </div>
        
        <!-- 时间显示 -->
        <div class="bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl p-8 mb-6 text-center">
          <div class="text-7xl font-bold text-red-600 font-mono">
            {{ String(timerMinutes).padStart(2, '0') }}:{{ String(timerSeconds).padStart(2, '0') }}
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="space-y-3">
          <button
            v-if="!timerStarted"
            @click="beginTimer"
            class="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all"
          >
            ▶️ 开始
          </button>
          
          <div v-else class="flex gap-3">
            <button
              v-if="!timerRunning"
              @click="resumeTimer"
              class="flex-1 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              ▶️ 继续
            </button>
            <button
              v-else
              @click="pauseTimer"
              class="flex-1 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              ⏸️ 暂停
            </button>
            <button
              @click="closeTimer"
              class="flex-1 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              ✕ 关闭
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量加减分弹窗 -->
    <div v-if="showBatchModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click="showBatchModal = false">
      <div class="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl" @click.stop>
        <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">批量加减分</h2>
        
        <div class="mb-6 bg-blue-50 rounded-xl p-4">
          <p class="text-blue-800 font-semibold">已选择 {{ selectedCount }} 个学生</p>
        </div>

        <!-- Tab切换 -->
        <div class="flex gap-4 mb-6">
          <button 
            @click="batchTab = 'add'" 
            :class="['flex-1 py-3 rounded-xl font-bold text-lg transition-all', batchTab === 'add' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700']"
          >
            ➕ 加分
          </button>
          <button 
            @click="batchTab = 'deduct'" 
            :class="['flex-1 py-3 rounded-xl font-bold text-lg transition-all', batchTab === 'deduct' ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700']"
          >
            ➖ 扣分
          </button>
          <button 
            @click="batchTab = 'custom'" 
            :class="['flex-1 py-3 rounded-xl font-bold text-lg transition-all', batchTab === 'custom' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700']"
          >
            ✏️ 自定义
          </button>
        </div>

        <!-- 加分规则 -->
        <div v-if="batchTab === 'add'" class="space-y-3">
          <button 
            v-for="rule in POINT_RULES.add" 
            :key="rule.label"
            @click="applyBatchPoints(rule.points, rule.label)"
            class="w-full p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl border-2 border-green-200 transition-all flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <span class="text-3xl">{{ rule.icon }}</span>
              <span class="text-lg font-bold text-gray-800">{{ rule.label }}</span>
            </div>
            <span class="text-2xl font-bold text-green-600">+{{ rule.points }}</span>
          </button>
        </div>

        <!-- 扣分规则 -->
        <div v-else-if="batchTab === 'deduct'" class="space-y-3">
          <button 
            v-for="rule in POINT_RULES.deduct" 
            :key="rule.label"
            @click="applyBatchPoints(rule.points, rule.label)"
            class="w-full p-4 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 rounded-xl border-2 border-red-200 transition-all flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <span class="text-3xl">{{ rule.icon }}</span>
              <span class="text-lg font-bold text-gray-800">{{ rule.label }}</span>
            </div>
            <span class="text-2xl font-bold text-red-600">{{ rule.points }}</span>
          </button>
        </div>

        <!-- 自定义加减分 -->
        <div v-else-if="batchTab === 'custom'" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">积分数值</label>
            <input 
              v-model.number="customPoints" 
              type="number" 
              placeholder="输入积分（正数加分，负数扣分）"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none text-lg"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">原因说明</label>
            <input 
              v-model="customReason" 
              type="text" 
              placeholder="例如：课堂表现优秀"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none text-lg"
            />
          </div>
          <button 
            @click="applyCustomPoints"
            class="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all"
          >
            确认执行
          </button>
        </div>

        <button 
          @click="showBatchModal = false"
          class="w-full mt-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-400 transition-all"
        >
          取消
        </button>
      </div>
    </div>

    <!-- 音乐控制面板 -->
    <div v-if="showAudioPanel" class="fixed top-20 left-6 z-50 bg-white rounded-2xl shadow-2xl p-6 w-80">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-800">🎵 音乐控制</h3>
        <button @click="showAudioPanel = false" class="text-gray-500 hover:text-gray-700">✕</button>
      </div>

      <!-- 背景音乐控制 -->
      <div class="space-y-4">
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-semibold text-gray-700">背景音乐</label>
            <button 
              @click="toggleBGM"
              :class="['px-3 py-1 rounded-lg text-sm font-bold transition-all', audioSettings.bgmEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700']"
            >
              {{ audioSettings.bgmEnabled ? '开启' : '关闭' }}
            </button>
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            :value="audioSettings.bgmVolume * 100"
            @input="setBGMVolume($event.target.value / 100)"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">选择音乐</label>
          <div class="space-y-2">
            <button 
              @click="changeBGM('happy')"
              :class="['w-full py-2 rounded-lg text-sm font-bold transition-all', audioSettings.currentBgm === 'happy' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']"
            >
              😊 欢快音乐
            </button>
            <button 
              @click="changeBGM('calm')"
              :class="['w-full py-2 rounded-lg text-sm font-bold transition-all', audioSettings.currentBgm === 'calm' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']"
            >
              😌 平静音乐
            </button>
            <button 
              @click="changeBGM('exciting')"
              :class="['w-full py-2 rounded-lg text-sm font-bold transition-all', audioSettings.currentBgm === 'exciting' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']"
            >
              🎉 激动音乐
            </button>
          </div>
        </div>

        <!-- 音效控制 -->
        <div class="border-t pt-4">
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-semibold text-gray-700">音效</label>
            <button 
              @click="toggleEffect"
              :class="['px-3 py-1 rounded-lg text-sm font-bold transition-all', audioSettings.effectEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700']"
            >
              {{ audioSettings.effectEnabled ? '开启' : '关闭' }}
            </button>
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            :value="audioSettings.effectVolume * 100"
            @input="setEffectVolume($event.target.value / 100)"
            class="w-full"
          />
        </div>
      </div>
    </div>
    
    <!-- Boss副本弹窗 -->
    <BossRaid 
      v-if="showBossRaid && bossRaidStudent" 
      :student="bossRaidStudent" 
      @close="closeBossRaid" 
      @success="closeBossRaid"
    />
    
    <!-- 🆕 使用说明弹窗 -->
    <div v-if="showHelpModal" class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" @click="closeHelpModal">
      <div class="bg-white rounded-3xl p-8 max-w-4xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" @click.stop>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-3xl font-bold text-gray-800">❓ 使用说明</h2>
          <button @click="closeHelpModal" class="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-red-600 transition-all">
            ×
          </button>
        </div>
        
        <div class="space-y-6 text-gray-700">
          <!-- 基础操作 -->
          <div class="bg-blue-50 rounded-2xl p-6">
            <h3 class="text-2xl font-bold text-blue-600 mb-4">🎯 基础操作</h3>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <span class="text-2xl">👆</span>
                <div>
                  <strong>点击学生卡片：</strong>打开学生详情，可以加减分、喂养精灵、查看属性
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-2xl">☑️</span>
                <div>
                  <strong>勾选复选框：</strong>选中多个学生后，可以批量加减分
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-2xl">🎨</span>
                <div>
                  <strong>更换精灵：</strong>在学生详情中点击"更换精灵"，先选属性再选精灵
                </div>
              </li>
            </ul>
          </div>
          
          <!-- 核心功能 -->
          <div class="bg-green-50 rounded-2xl p-6">
            <h3 class="text-2xl font-bold text-green-600 mb-4">⭐ 核心功能</h3>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <span class="text-2xl">🌊</span>
                <div>
                  <strong>精灵历险（作业签到）：</strong>点击顶部"精灵历险"按钮，学生提交作业可获得积分
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-2xl">⚔️</span>
                <div>
                  <strong>宠物对战：</strong>选择两位学生进行PK，答题正确可攻击对手
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-2xl">🏰</span>
                <div>
                  <strong>副本冒险：</strong>挑战Boss，答对题目可造成伤害，击败Boss获得奖励
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-2xl">🛒</span>
                <div>
                  <strong>商店抽奖：</strong>学生可以用积分购买道具或参与抽奖
                </div>
              </li>
            </ul>
          </div>
          
          <!-- 管理功能 -->
          <div class="bg-purple-50 rounded-2xl p-6">
            <h3 class="text-2xl font-bold text-purple-600 mb-4">⚙️ 管理功能</h3>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <span class="text-2xl">🏫</span>
                <div>
                  <strong>班级管理：</strong>添加、编辑、删除学生信息
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-2xl">👥</span>
                <div>
                  <strong>小组管理：</strong>创建小组，拖拽学生到不同小组
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-2xl">⚙️</span>
                <div>
                  <strong>系统配置：</strong>设置密码、管理精灵类型、配置积分规则、编辑题库
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-2xl">🔄</span>
                <div>
                  <strong>系统还原：</strong>在系统配置中找到"系统初始化/还原"按钮，输入密码（默认1234）可重置所有数据
                </div>
              </li>
            </ul>
          </div>
          
          <!-- 🆕 高级功能 -->
          <div class="bg-pink-50 rounded-2xl p-6">
            <h3 class="text-2xl font-bold text-pink-600 mb-4">🎨 高级功能</h3>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <span class="text-2xl">🖼️</span>
                <div>
                  <strong>更换宠物图片：</strong>
                  <ol class="mt-2 space-y-1 text-sm text-gray-600 ml-4">
                    <li>1. 准备好PNG格式的透明图片（推荐尺寸：256x256）</li>
                    <li>2. 图片命名格式：<code class="bg-gray-200 px-1 rounded">属性 (等级).png</code>，例如 <code class="bg-gray-200 px-1 rounded">火 (1).png</code></li>
                    <li>3. 找到软件数据目录（通常在 <code class="bg-gray-200 px-1 rounded">C:\Users\你的用户名\AppData\Roaming\class-pet-system\pets\</code>）</li>
                    <li>4. 将图片复制到 pets 文件夹，替换同名文件即可</li>
                    <li>5. 重启软件，新图片就会生效</li>
                  </ol>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-2xl">✨</span>
                <div>
                  <strong>新建宠物类型：</strong>
                  <ol class="mt-2 space-y-1 text-sm text-gray-600 ml-4">
                    <li>1. 点击顶部"⚙️ 系统配置"按钮</li>
                    <li>2. 选择"精灵类型管理"标签页</li>
                    <li>3. 点击"新增精灵类型"按钮</li>
                    <li>4. 填写精灵名称（如：炎火猴）、描述、选择属性（火/水/木/金/土等）</li>
                    <li>5. 点击保存，新精灵类型就创建好了</li>
                    <li>6. 学生可以在"更换精灵"时选择新创建的精灵</li>
                  </ol>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-2xl">📸</span>
                <div>
                  <strong>快速找到数据目录：</strong>
                  <div class="mt-2 text-sm text-gray-600">
                    按 <code class="bg-gray-200 px-2 py-1 rounded">Win + R</code> 键，输入 <code class="bg-gray-200 px-2 py-1 rounded">%APPDATA%\class-pet-system</code>，回车即可打开数据目录
                  </div>
                </div>
              </li>
            </ul>
          </div>
          
          <!-- 快捷操作 -->
          <div class="bg-orange-50 rounded-2xl p-6">
            <h3 class="text-2xl font-bold text-orange-600 mb-4">⚡ 快捷操作</h3>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <span class="text-2xl">🔒</span>
                <div>
                  <strong>锁屏功能：</strong>点击"锁屏"按钮可锁定界面，防止学生误操作
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-2xl">🎵</span>
                <div>
                  <strong>音乐控制：</strong>点击"音乐"按钮可开关背景音乐和音效
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-2xl">🎀</span>
                <div>
                  <strong>主题切换：</strong>点击主题按钮可在"可爱"和"炫酷"两种风格间切换
                </div>
              </li>
            </ul>
          </div>
          
          <!-- 提示 -->
          <div class="bg-yellow-50 rounded-2xl p-6 border-2 border-yellow-300">
            <h3 class="text-2xl font-bold text-yellow-600 mb-3">💡 温馨提示</h3>
            <p class="text-gray-700 leading-relaxed">
              • 精灵会根据积分自动升级，从萌蛋期到究极体共6个阶段<br>
              • 每个精灵都有独特的属性，属性相克会影响战斗伤害<br>
              • 定期备份数据，避免意外丢失<br>
              • 如需帮助，请联系技术支持
            </p>
          </div>
        </div>
        
        <div class="mt-8 text-center">
          <button @click="closeHelpModal" class="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg transition-all">
            我知道了
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-cute {
  @apply bg-white rounded-2xl shadow-lg;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.animate-bounce {
  animation: bounce 1s infinite;
}

/* 慢速弹跳动画 */
@keyframes bounce-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.animate-bounce-slow {
  animation: bounce-slow 3s ease-in-out infinite;
}

/* 延迟动画 */
.delay-100 {
  animation-delay: 0.1s;
}

.delay-200 {
  animation-delay: 0.2s;
}

/* 摇晃动画 - 扣分时触发 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
  20%, 40%, 60%, 80% { transform: translateX(10px); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

/* 战斗动画 - 左侧攻击 */
@keyframes battle-left {
  0% { transform: translateX(0); }
  50% { transform: translateX(100px) scale(1.2); }
  100% { transform: translateX(0); }
}

.animate-battle-left {
  animation: battle-left 1s ease-in-out;
}

/* 战斗动画 - 右侧攻击 */
@keyframes battle-right {
  0% { transform: translateX(0); }
  50% { transform: translateX(-100px) scale(1.2); }
  100% { transform: translateX(0); }
}

.animate-battle-right {
  animation: battle-right 1s ease-in-out;
}

/* SVG文字阴影效果 */
svg text {
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5));
}

/* 气泡淡入动画 */
@keyframes fade-in {
  0% { 
    opacity: 0; 
    transform: translateX(-50%) translateY(10px) scale(0.8);
  }
  100% { 
    opacity: 1; 
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out forwards;
}

/* 气泡淡出动画 */
@keyframes fade-out {
  0% { 
    opacity: 1; 
    transform: translateX(-50%) translateY(0) scale(1);
  }
  100% { 
    opacity: 0; 
    transform: translateX(-50%) translateY(-10px) scale(0.8);
  }
}

.animate-fade-out {
  animation: fade-out 0.5s ease-in forwards;
}

/* 勋章辉光动画 */
@keyframes badge-glow {
  0%, 100% { 
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.5);
  }
  50% { 
    box-shadow: 0 0 20px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 215, 0, 0.8);
  }
}

.animate-badge-glow {
  animation: badge-glow 2s ease-in-out infinite;
}

/* 勋章扫光效果 */
@keyframes badge-shine {
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-badge-glow::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  background-size: 50% 100%;
  animation: badge-shine 3s ease-in-out infinite;
  border-radius: 50%;
}
</style>
