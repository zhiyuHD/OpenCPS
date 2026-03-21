<script setup>
import { ref, onMounted, computed } from 'vue';
import { 
  getSetting, 
  saveSetting, 
  getPointRules, 
  savePointRules,
  getPetStages,
  savePetStages,
  getShopItems,
  getAllPetTypes,
  createPetType,
  updatePetType,
  deletePetType,
  savePetImage,
  getPetImage,
  getPetTypeImages,
  getAllBosses,
  addBossQuestion,
  deleteBossQuestion,
  getBossQuestions,
  initPetTypes,
  initBosses,
  exportAllData,
  importAllData,
  downloadJSON,
  db,
  resetDBSystemData
} from '../db.js';

const emit = defineEmits(['exit']);

const loading = ref(true);
const currentTab = ref('password');

const password = ref('1234');
const passwordEnabled = ref(false);
const newPassword = ref('');
const confirmPassword = ref('');

// 系统初始化相关
const showSystemResetModal = ref(false);
const systemResetText = ref('');

const pointRules = ref({ add: [], deduct: [] });
const showPointForm = ref(false);
const editingPoint = ref(null);
const pointForm = ref({ label: '', points: 0, icon: '⭐', type: 'add' });

const petStages = ref([]);
const showPetForm = ref(false);
const editingPet = ref(null);
const petForm = ref({ stage: 1, name: '', minExp: 0, maxExp: 50 });

const shopItems = ref([]);
const showShopForm = ref(false);
const editingShop = ref(null);
const shopForm = ref({ name: '', price: 0, stock: 0, icon: '🎁', description: '' });

// 题库管理
const questionBank = ref([]);
const showQuestionForm = ref(false);
const editingQuestion = ref(null);
const questionForm = ref({ title: '', options: ['', '', '', ''], correctAnswer: 0, difficulty: 'medium' });
const showBatchImport = ref(false);
const batchImportText = ref('');

// 精灵图鉴管理
const petTypes = ref([]);
const petImages = ref({});
const showPetTypeForm = ref(false);
const editingPetType = ref(null);
const petTypeForm = ref({ name: '', description: '', emoji: '🔥', element: 'fire' });

// 精灵图鉴两段式管理
const showElementView = ref(true); // 是否显示属性选择视图
const selectedLibraryElement = ref(null); // 当前选中的属性

// Boss管理
const bosses = ref([]);
const selectedBoss = ref(null);
const showBossQuestionEditor = ref(false);
const bossQuestions = ref([]);
const showBossQuestionForm = ref(false);
const editingBossQuestion = ref(null);
const bossQuestionForm = ref({ question: '', options: ['', '', '', ''], correctAnswer: 0 });
const showBossBatchImport = ref(false);
const bossBatchImportText = ref('');
// 数据备份相关
const exportingData = ref(false);
const importingData = ref(false);
// 添加 serverConfig 定义
const serverConfig = ref('https://ocps.zhiyuhub.top/');
// 16种属性定义
const ALL_ELEMENTS = [
  { id: 'fire', name: '火', emoji: '🔥', color: 'from-red-500 to-orange-500' },
  { id: 'water', name: '水', emoji: '💧', color: 'from-blue-500 to-cyan-500' },
  { id: 'wood', name: '木', emoji: '🌳', color: 'from-green-500 to-emerald-500' },
  { id: 'metal', name: '金', emoji: '⚙️', color: 'from-gray-400 to-yellow-600' },
  { id: 'earth', name: '土', emoji: '🪨', color: 'from-amber-700 to-yellow-700' },
  { id: 'thunder', name: '雷', emoji: '⚡', color: 'from-yellow-500 to-amber-500' },
  { id: 'ice', name: '冰', emoji: '❄️', color: 'from-cyan-400 to-blue-400' },
  { id: 'holy', name: '圣', emoji: '✝️', color: 'from-yellow-300 to-pink-300' },
  { id: 'dark', name: '魔', emoji: '😈', color: 'from-purple-700 to-pink-700' },
  { id: 'demon', name: '妖', emoji: '👹', color: 'from-purple-500 to-indigo-500' },
  { id: 'wind', name: '风', emoji: '🌪️', color: 'from-teal-400 to-cyan-400' },
  { id: 'poison', name: '毒', emoji: '☠️', color: 'from-green-700 to-purple-700' },
  { id: 'illusion', name: '幻', emoji: '✨', color: 'from-pink-500 to-purple-500' },
  { id: 'wing', name: '翼', emoji: '🦅', color: 'from-sky-400 to-blue-500' },
  { id: 'machine', name: '机械', emoji: '🤖', color: 'from-gray-500 to-slate-600' },
  { id: 'spirit', name: '灵', emoji: '👻', color: 'from-blue-300 to-purple-300' }
];

// 根据属性过滤精灵
const filteredPetTypesByElement = computed(() => {
  if (!selectedLibraryElement.value) return [];
  return (petTypes.value || []).filter(p => p.element === selectedLibraryElement.value);
});

// 选择属性
const selectLibraryElement = (elementId) => {
  selectedLibraryElement.value = elementId;
  showElementView.value = false;
};

// 返回属性选择
const backToElementView = () => {
  showElementView.value = true;
  selectedLibraryElement.value = null;
};

// 获取属性信息
const getElementInfo = (elementId) => {
  return ALL_ELEMENTS.find(e => e.id === elementId) || { id: 'fire', name: '火', emoji: '🔥', color: 'from-red-500 to-orange-500' };
};

// 属性对应的emoji映射
const elementEmojiMap = {
  fire: '🔥',
  water: '💧',
  wood: '🌳',
  thunder: '⚡',
  ice: '❄️',
  holy: '✝️',
  metal: '⚙️',
  earth: '🪨',
  dark: '😈',
  demon: '👹',
  wind: '🌪️',
  poison: '☠️',
  illusion: '✨',
  wing: '🦅',
  machine: '🤖',
  spirit: '👻'
};

// 当属性改变时自动更新emoji
const onElementChange = () => {
  petTypeForm.value.emoji = elementEmojiMap[petTypeForm.value.element] || '🔥';
};
const uploadingImage = ref({ petTypeId: null, stage: null });

const petEmojis = ['🔥', '💧', '🌿', '⚡', '❄️', '🐉', '🌟', '🌙', '☀️', '🌈', '💎', '👑'];

const iconOptions = ['⭐', '🗣️', '📝', '🤝', '🎨', '🧹', '❌', '🔇', '⏰', '⚠️', '🎁', '📖', '💺', '👑'];

const loadData = async () => {
  try {
    password.value = await getSetting('password') || '1234';
    passwordEnabled.value = await getSetting('passwordEnabled') || false;
    pointRules.value = await getPointRules();
    petStages.value = await getPetStages();
    shopItems.value = await getShopItems(1);
    
    // 加载题库
    try {
      const questions = await getSetting('questionBank');
      if (questions) {
        questionBank.value = JSON.parse(questions);
      }
    } catch (error) {
      console.error('加载题库失败:', error);
      questionBank.value = [];
    }
    
    // 加载精灵类型 - 加强容错
    try {
      petTypes.value = await getAllPetTypes();
      console.log('✅ 加载精灵类型成功:', petTypes.value.length);
      
      // 加载所有精灵图片
      for (const petType of petTypes.value) {
        try {
          const images = await getPetTypeImages(petType.id);
          petImages.value[petType.id] = {};
          for (const img of images) {
            petImages.value[petType.id][img.stage] = img.imageBase64;
          }
        } catch (imgError) {
          console.error(`加载精灵${petType.id}图片失败:`, imgError);
          petImages.value[petType.id] = {};
        }
      }
    } catch (error) {
      console.error('加载精灵类型失败:', error);
      petTypes.value = [];
      petImages.value = {};
    }
    
    // 加载Boss列表
    try {
      bosses.value = await getAllBosses();
      console.log('✅ 加载Boss列表成功:', bosses.value.length);
    } catch (error) {
      console.error('加载Boss失败:', error);
      bosses.value = [];
    }
    
    loading.value = false;
  } catch (error) {
    console.error('加载配置失败:', error);
    alert('加载配置失败：' + error.message + '\n请检查浏览器控制台获取详细信息');
    loading.value = false;
  }
};


const openPointForm = (type, point = null) => {
  if (point) {
    editingPoint.value = point;
    pointForm.value = { ...point, type };
  } else {
    editingPoint.value = null;
    pointForm.value = { label: '', points: type === 'add' ? 5 : -5, icon: '⭐', type };
  }
  showPointForm.value = true;
};

const savePoint = async () => {
  if (!pointForm.value.label.trim()) {
    alert('请输入规则名称');
    return;
  }
  const type = pointForm.value.type;
  const rules = { ...pointRules.value };
  if (editingPoint.value) {
    const index = rules[type].findIndex(r => r.label === editingPoint.value.label);
    if (index > -1) rules[type][index] = { ...pointForm.value };
  } else {
    rules[type].push({ ...pointForm.value });
  }
  await savePointRules(rules);
  pointRules.value = rules;
  showPointForm.value = false;
  alert('保存成功');
};

const deletePoint = async (type, point) => {
  if (!confirm(`确定要删除"${point.label}"吗？`)) return;
  const rules = { ...pointRules.value };
  rules[type] = rules[type].filter(r => r.label !== point.label);
  await savePointRules(rules);
  pointRules.value = rules;
};

const openPetForm = (pet = null) => {
  if (pet) {
    editingPet.value = pet;
    petForm.value = { ...pet };
  } else {
    editingPet.value = null;
    const maxStage = Math.max(...petStages.value.map(p => p.stage), 0);
    petForm.value = { stage: maxStage + 1, name: '', minExp: 0, maxExp: 100 };
  }
  showPetForm.value = true;
};

const savePet = async () => {
  if (!petForm.value.name.trim()) {
    alert('请输入阶段名称');
    return;
  }
  let stages = [...petStages.value];
  if (editingPet.value) {
    const index = stages.findIndex(s => s.stage === editingPet.value.stage);
    if (index > -1) stages[index] = { ...petForm.value };
  } else {
    stages.push({ ...petForm.value });
  }
  stages.sort((a, b) => a.stage - b.stage);
  await savePetStages(stages);
  petStages.value = stages;
  showPetForm.value = false;
  alert('保存成功');
};

const deletePet = async (pet) => {
  if (!confirm(`确定要删除"${pet.name}"吗？`)) return;
  const stages = petStages.value.filter(s => s.stage !== pet.stage);
  await savePetStages(stages);
  petStages.value = stages;
};

const openShopForm = (item = null) => {
  if (item) {
    editingShop.value = item;
    shopForm.value = { ...item };
  } else {
    editingShop.value = null;
    shopForm.value = { name: '', price: 40, stock: 10, icon: '🎁', description: '' };
  }
  showShopForm.value = true;
};

const saveShop = async () => {
  if (!shopForm.value.name.trim()) {
    alert('请输入商品名称');
    return;
  }
  try {
    if (editingShop.value) {
      await db.shopItems.update(editingShop.value.id, shopForm.value);
    } else {
      await db.shopItems.add({ ...shopForm.value, classId: 1 });
    }
    shopItems.value = await getShopItems(1);
    showShopForm.value = false;
    alert('保存成功');
  } catch (error) {
    alert('保存失败：' + error.message);
  }
};

const deleteShop = async (item) => {
  if (!confirm(`确定要删除"${item.name}"吗？`)) return;
  await db.shopItems.delete(item.id);
  shopItems.value = await getShopItems(1);
};

// 题库管理方法
const openQuestionForm = (question = null) => {
  if (question) {
    editingQuestion.value = question;
    questionForm.value = { ...question };
  } else {
    editingQuestion.value = null;
    questionForm.value = { title: '', options: ['', '', '', ''], correctAnswer: 0, difficulty: 'medium' };
  }
  showQuestionForm.value = true;
};

const saveQuestion = async () => {
  if (!questionForm.value.title.trim()) {
    alert('请输入题目');
    return;
  }
  if (questionForm.value.options.some(opt => !opt.trim())) {
    alert('请填写所有选项');
    return;
  }
  
  let questions = [...questionBank.value];
  if (editingQuestion.value) {
    const index = questions.findIndex(q => q.id === editingQuestion.value.id);
    if (index > -1) {
      questions[index] = { ...questionForm.value, id: editingQuestion.value.id };
    }
  } else {
    questions.push({ ...questionForm.value, id: Date.now() });
  }
  
  await saveSetting('questionBank', JSON.stringify(questions));
  questionBank.value = questions;
  showQuestionForm.value = false;
  alert('保存成功');
};

const deleteQuestion = async (question) => {
  if (!confirm(`确定要删除这道题吗？`)) return;
  const questions = questionBank.value.filter(q => q.id !== question.id);
  await saveSetting('questionBank', JSON.stringify(questions));
  questionBank.value = questions;
};

const openBatchImport = () => {
  batchImportText.value = '';
  showBatchImport.value = true;
};

const importBatchQuestions = async () => {
  if (!batchImportText.value.trim()) {
    alert('请输入题目数据');
    return;
  }
  
  try {
    // 解析批量导入的题目
    // 格式：题目|选项A|选项B|选项C|选项D|正确答案(0-3)|难度(easy/medium/hard)
    const lines = batchImportText.value.trim().split('\n');
    const newQuestions = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split('|').map(p => p.trim());
      if (parts.length < 6) {
        alert(`格式错误：${line}\n正确格式：题目|选项A|选项B|选项C|选项D|正确答案(0-3)|难度(可选)`);
        return;
      }
      
      const title = parts[0];
      const options = [parts[1], parts[2], parts[3], parts[4]];
      const correctAnswer = parseInt(parts[5]);
      const difficulty = parts[6] || 'medium';
      
      if (correctAnswer < 0 || correctAnswer > 3) {
        alert(`正确答案必须是0-3之间的数字：${line}`);
        return;
      }
      
      newQuestions.push({
        id: Date.now() + Math.random(),
        title,
        options,
        correctAnswer,
        difficulty
      });
    }
    
    const questions = [...questionBank.value, ...newQuestions];
    await saveSetting('questionBank', JSON.stringify(questions));
    questionBank.value = questions;
    showBatchImport.value = false;
    alert(`成功导入 ${newQuestions.length} 道题目`);
  } catch (error) {
    alert('导入失败：' + error.message);
  }
};

const clearAllQuestions = async () => {
  if (!confirm('确定要清空所有题目吗？此操作不可恢复！')) return;
  await saveSetting('questionBank', JSON.stringify([]));
  questionBank.value = [];
  alert('已清空所有题目');
};

// 精灵图鉴管理方法
const openPetTypeForm = (petType = null) => {
  if (petType) {
    editingPetType.value = petType;
    petTypeForm.value = { ...petType };
  } else {
    editingPetType.value = null;
    // 新增时使用当前选中的属性
    const element = selectedLibraryElement.value || 'fire';
    petTypeForm.value = { name: '', description: '', emoji: '🔥', element: element };
  }
  // 确保emoji与element匹配
  onElementChange();
  showPetTypeForm.value = true;
};

const savePetType = async () => {
  if (!petTypeForm.value.name.trim()) {
    alert('请输入精灵名称');
    return;
  }
  
  try {
    if (editingPetType.value) {
      await updatePetType(editingPetType.value.id, petTypeForm.value);
    } else {
      await createPetType(petTypeForm.value.name, petTypeForm.value.description, petTypeForm.value.emoji, petTypeForm.value.element);
    }
    await loadData();
    showPetTypeForm.value = false;
    alert('保存成功');
  } catch (error) {
    alert('保存失败：' + error.message);
  }
};

const deletePetTypeHandler = async (petType) => {
  if (!confirm(`确定要删除"${petType.name}"吗？该精灵的所有图片也会被删除。`)) return;
  
  const result = await deletePetType(petType.id);
  if (result.success) {
    await loadData();
    alert('删除成功');
  } else {
    alert(result.message);
  }
};

const triggerImageUpload = (petTypeId, stage) => {
  uploadingImage.value = { petTypeId, stage };
  // 触发文件选择
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => handleImageUpload(e, petTypeId, stage);
  input.click();
};

const handleImageUpload = async (event, petTypeId, stage) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // 检查文件大小（限制5MB）
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过5MB');
    return;
  }
  
  // 读取文件并转换为Base64
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result;
    
    try {
      await savePetImage(petTypeId, stage, base64);
      
      // 更新本地显示
      if (!petImages.value[petTypeId]) {
        petImages.value[petTypeId] = {};
      }
      petImages.value[petTypeId][stage] = base64;
      
      alert('图片上传成功！');
    } catch (error) {
      alert('上传失败：' + error.message);
    }
  };
  
  reader.readAsDataURL(file);
};

const getPetImageUrl = (petTypeId, stage) => {
  return petImages.value[petTypeId]?.[stage] || null;
};

const getStageEmoji = (stage) => {
  const emojis = ['🥚', '🐣', '🐥', '🐔', '🦅', '🐉'];
  return emojis[stage - 1] || '🥚';
};

const exitModule = () => {
  emit('exit');
};

// 强制初始化基础数据
const forceInitBasicData = async () => {
  const confirmed = confirm('⚠️ 确定要强制初始化基础数据吗？\n\n这将创建：\n• 5只基础精灵（金木水火土）\n• 16个属性Boss\n\n已存在的数据不会被删除。');
  if (!confirmed) return;
  
  try {
    await initPetTypes();
    await initBosses();
    await loadData();
    alert('✅ 基础数据初始化成功！\n\n已创建5只基础精灵和16个Boss。');
  } catch (error) {
    alert('初始化失败：' + error.message);
    console.error('初始化失败:', error);
  }
};

// 打开系统初始化弹窗
const openSystemReset = () => {
  showSystemResetModal.value = true;
  systemResetText.value = '';
};

// 执行系统初始化/还原
const confirmSystemReset = async () => {
  
  if (systemResetText.value !== "我确认将要重置系统，并彻底销毁本地及服务器数据库。") {
    alert('文本不匹配');
    return;
  }
  
  const finalConfirm = confirm('🚨 最终确认！\n\n此操作将：\n• 清空所有学生数据\n• 清空所有积分记录\n• 清空所有任务记录\n• 重置为5个默认学生\n• 保留教师配置和精灵图鉴\n\n确定要继续吗？');
  
  if (!finalConfirm) return;
  
  try {
    // 导入db以访问所有表
    const { resetDBSystemData, db } = await import('../db.js');
    
    // 直接调用里面的方法
    await resetDBSystemData(db);
    
    alert('本地数据库已重置，正在销毁远程数据库');
    // 将重置后的数据发送到服务器
    await syncServerData();
    alert('销毁完毕，即将刷新页面');
    
    // 刷新页面
    window.location.reload();
  } catch (error) {
    alert('❌ 初始化失败：' + error.message);
    console.error('系统初始化失败:', error);
  }
  
  showSystemResetModal.value = false;
};

// Boss管理函数
const openBossQuestionEditor = async (boss) => {
  selectedBoss.value = boss;
  bossQuestions.value = await getBossQuestions(boss.id);
  showBossQuestionEditor.value = true;
};

const closeBossQuestionEditor = () => {
  showBossQuestionEditor.value = false;
  selectedBoss.value = null;
  bossQuestions.value = [];
};

const openBossQuestionForm = () => {
  editingBossQuestion.value = null;
  bossQuestionForm.value = { question: '', options: ['', '', '', ''], correctAnswer: 0 };
  showBossQuestionForm.value = true;
};

const editBossQuestion = (question) => {
  editingBossQuestion.value = question;
  bossQuestionForm.value = { ...question };
  showBossQuestionForm.value = true;
};

const saveBossQuestion = async () => {
  if (!bossQuestionForm.value.question.trim()) {
    alert('请输入题目内容');
    return;
  }
  
  if (bossQuestionForm.value.options.some(opt => !opt.trim())) {
    alert('请填写所有选项');
    return;
  }
  
  try {
    if (editingBossQuestion.value) {
      // 更新题目
      await db.bossQuestions.update(editingBossQuestion.value.id, bossQuestionForm.value);
      console.log('✅ Boss题目更新成功');
    } else {
      // 新增题目
      await addBossQuestion(
        selectedBoss.value.id,
        bossQuestionForm.value.question,
        bossQuestionForm.value.options,
        bossQuestionForm.value.correctAnswer
      );
      console.log('✅ Boss题目新增成功');
    }
    
    // 刷新题库
    bossQuestions.value = await getBossQuestions(selectedBoss.value.id);
    showBossQuestionForm.value = false;
    alert('✅ 保存成功！当前题库共 ' + bossQuestions.value.length + ' 道题');
  } catch (error) {
    console.error('保存Boss题目失败:', error);
    alert('保存失败：' + error.message);
  }
};

// 批量导入Boss题目
const parseBossBatchImport = async () => {
  if (!bossBatchImportText.value.trim()) {
    alert('请输入题目内容');
    return;
  }
  
  const lines = bossBatchImportText.value.trim().split('\n');
  let successCount = 0;
  let failCount = 0;
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.split('|').map(p => p.trim());
    if (parts.length !== 6) {
      console.warn('格式错误，跳过:', line);
      failCount++;
      continue;
    }
    
    const [question, optA, optB, optC, optD, correctAnswer] = parts;
    const correctIndex = parseInt(correctAnswer) - 1; // 1-4 转为 0-3
    
    if (correctIndex < 0 || correctIndex > 3) {
      console.warn('正确答案超出范围，跳过:', line);
      failCount++;
      continue;
    }
    
    try {
      await addBossQuestion(
        selectedBoss.value.id,
        question,
        [optA, optB, optC, optD],
        correctIndex
      );
      successCount++;
    } catch (error) {
      console.error('导入失败:', line, error);
      failCount++;
    }
  }
  
  // 刷新题库
  bossQuestions.value = await getBossQuestions(selectedBoss.value.id);
  showBossBatchImport.value = false;
  bossBatchImportText.value = '';
  
  alert(`✅ 批量导入完成！\n\n成功：${successCount} 道\n失败：${failCount} 道\n当前题库共：${bossQuestions.value.length} 道题`);
};

const removeBossQuestion = async (questionId) => {
  if (!confirm('确定要删除这道题目吗？')) return;
  
  try {
    await deleteBossQuestion(questionId);
    bossQuestions.value = await getBossQuestions(selectedBoss.value.id);
    alert('删除成功！');
  } catch (error) {
    alert('删除失败：' + error.message);
  }
};

const updateBossInfo = async (bossId, field, value) => {
  try {
    await db.bosses.update(bossId, { [field]: value });
    await loadData();
    alert('更新成功！');
  } catch (error) {
    alert('更新失败：' + error.message);
  }
};

const uploadBossImage = async (bossId) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await db.bosses.update(bossId, { imageBase64: event.target.result });
        await loadData();
        alert('Boss图片上传成功！');
      } catch (error) {
        alert('上传失败：' + error.message);
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

// 数据备份与恢复
const exportData = async () => {
  if (exportingData.value) return;
  
  const confirmed = confirm('📦 确定要导出所有数据吗？\n\n将导出：\n• 所有学生数据\n• 所有配置和规则\n• 所有精灵图鉴和图片（Base64）\n• 所有题库和Boss数据\n• 所有历史记录\n\n导出后会自动下载JSON文件到本地。');
  
  if (!confirmed) return;
  
  try {
    exportingData.value = true;
    const result = await exportAllData();
    
    if (result.success) {
      // 生成文件名
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const filename = `OpenCPS_Backup_${dateStr}.json`;
      
      // 下载文件
      downloadJSON(result.data, filename);
      
      alert('✅ 数据导出成功！\n\n文件已下载到本地，请妥善保管备份文件。');
    } else {
      alert('❌ 导出失败：' + result.error);
    }
  } catch (error) {
    alert('❌ 导出失败：' + error.message);
  } finally {
    exportingData.value = false;
  }
};

const importData = () => {
  if (importingData.value) return;
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 二次确认
    const confirmed = confirm('⚠️ 危险操作！\n\n确定要导入备份数据吗？\n\n此操作将：\n• 清空当前所有数据\n• 用备份文件覆盖所有数据\n• 此操作不可恢复！\n\n请确保备份文件来源可靠！');
    
    if (!confirmed) return;
    
    try {
      importingData.value = true;
      
      // 读取文件
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          const result = await importAllData(jsonData);
          
          if (result.success) {
            alert('✅ 数据导入成功！\n\n页面将自动刷新以加载新数据。');
            window.location.reload();
          } else {
            alert('❌ 导入失败：' + result.error);
            importingData.value = false;
          }
        } catch (error) {
          alert('❌ 导入失败：' + error.message + '\n\n请确保文件格式正确。');
          importingData.value = false;
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      alert('❌ 导入失败：' + error.message);
      importingData.value = false;
    }
  };
  
  input.click();
};

const saveServerConfig = async () => {
  // 直接保存到 localStorage，不动数据库
  localStorage.setItem('serverConfig', JSON.stringify(serverConfig.value));
  alert('保存成功！');
};

const loadServerConfig = async () => {
  const config = localStorage.getItem('serverConfig');
  if (config) {
    serverConfig.value = JSON.parse(config);
  }
};

const syncServerData = async () => {
  // 首先检查服务器可用性
  const serverUrl = serverConfig._value;
  try {
    console.log('服务器地址：', serverUrl._value);
    console.log('serverConfig：', serverConfig);
    const response = await fetch(serverUrl + '/status');
    const result = await response.json();
    if (result.status === 'running') {
      // 服务器可用，开始同步数据
      console.log('status = running');
      // alert('服务器可用，但功能暂未实现。');
      // 将目前的数据打包为JSON格式
      exportingData.value = true;
      const json_data = await exportAllData();
      // 发到服务器
      // @app.post("/upload")
// async def upload_json(data: Dict[str, Any]):
    // """上传新的JSON数据"""
    // global current_data, is_dirty, last_update_time
    
    // with save_lock:
    //    current_data = data
    //    is_dirty = True
    //    last_update_time = time.time()
    
    // return {
    //     "status": "success",
    //     "message": "JSON data uploaded successfully"
    // }
      const response = await fetch(serverUrl + '/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(json_data)
      });
      const result = await response.json();
      if (result.status === 'success') {
        alert('✅ 同步成功');
        // 重新加载数据
        loadData();
      } else {
        alert('❌ 同步失败：' + result.message);
      }
    } else {
      alert('❌ 服务器不可用');

    }
  } catch (error) {
    alert('❌ 同步失败：' + error.message);
  }
};
const downloadServerData = async () => {
  // 测试可用性
  const serverUrl = serverConfig._value;
  try {
    const response = await fetch(serverUrl + '/status');
    const result = await response.json();
    if (result.status === 'running') {
      // 下载服务器数据
      const response = await fetch(serverUrl + '/get');
      const result = await response.json();
      const import_result = await importAllData(result.data);
      if (result.success) {
        alert('✅ 数据导入成功！\n\n页面将自动刷新以加载新数据。');
        window.location.reload();
      } else {
        alert('❌ 导入失败：' + result.error);
        importingData.value = false;
      }

    } else {
      alert('服务器不可用');
    }
  } catch (error) {
    alert('服务器不可用');
  }
};

onMounted(() => {
  loadData();
  loadServerConfig(); // 加载服务端配置
});

</script>

<template>
  <div class="fixed inset-0 z-50 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 overflow-hidden">
    <div class="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg p-4 z-10">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="exitModule" class="btn-game bg-gradient-to-r from-gray-400 to-gray-500 text-sm">
            ← 返回主控台
          </button>
          <h1 class="text-3xl font-bold text-gray-800">OpenCPS Setting</h1>
        </div>
      </div>
    </div>

    <div class="absolute top-20 left-0 right-0 bg-white/80 backdrop-blur-sm shadow-md p-4 z-10">
      <div class="max-w-7xl mx-auto flex gap-3">
        <button @click="currentTab = 'password'" :class="['px-6 py-3 rounded-xl font-bold text-lg transition-all', currentTab === 'password' ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100']">
          安全
        </button>
        <button @click="currentTab = 'points'" :class="['px-6 py-3 rounded-xl font-bold text-lg transition-all', currentTab === 'points' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100']">
          点评
        </button>
        <button @click="currentTab = 'pets'" :class="['px-6 py-3 rounded-xl font-bold text-lg transition-all', currentTab === 'pets' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100']">
          宠物
        </button>
        <button @click="currentTab = 'shop'" :class="['px-6 py-3 rounded-xl font-bold text-lg transition-all', currentTab === 'shop' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100']">
          商店
        </button>
        <button @click="currentTab = 'questions'" :class="['px-6 py-3 rounded-xl font-bold text-lg transition-all', currentTab === 'questions' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100']">
          题库
        </button>
        <button @click="currentTab = 'petLibrary'" :class="['px-6 py-3 rounded-xl font-bold text-lg transition-all', currentTab === 'petLibrary' ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100']">
          图鉴
        </button>
        <button @click="currentTab = 'boss'" :class="['px-6 py-3 rounded-xl font-bold text-lg transition-all', currentTab === 'boss' ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100']">
          BOSS
        </button>
        <button @click="currentTab = 'backup'" :class="['px-6 py-3 rounded-xl font-bold text-lg transition-all', currentTab === 'backup' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100']">
          备份
        </button>
      </div>
    </div>

    <div class="relative w-full h-full pt-40 pb-8 overflow-y-auto">
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="text-4xl text-gray-600">⏳ 加载中...</div>
      </div>

      <div v-else class="max-w-7xl mx-auto px-8">
        <div v-if="currentTab === 'password'" class="card-cute p-8">
          <div class="space-y-4">
            
            <!-- 系统初始化/还原功能 -->
            <div class="border-t pt-6">
              <h3 class="text-xl font-bold text-gray-800 mb-4">🔄 系统初始化/还原</h3>
              <div class="bg-red-50 rounded-xl p-4 mb-4 border-2 border-red-200">
                <h4 class="font-bold text-red-800 mb-2">⚠️ 危险操作区域</h4>
                <ul class="text-sm text-red-700 space-y-1">
                  <li>• 此功能将清空所有学生数据和积分记录</li>
                  <li>• 重置为5个默认测试学生</li>
                  <li>• 保留教师配置、精灵图鉴和题库</li>
                  <li>• 适用于新学期开始或系统重置</li>
                </ul>
              </div>
              <button 
                @click="openSystemReset" 
                class="w-full max-w-md py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all"
              >
                🔄 系统初始化/还原
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="currentTab === 'points'" class="space-y-6">
          <div class="card-cute p-8">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-2xl font-bold text-gray-800">➕ 加分项目</h2>
              <button @click="openPointForm('add')" class="btn-game bg-gradient-to-r from-green-500 to-emerald-500">
                ➕ 新增加分项
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div v-for="rule in pointRules.add" :key="rule.label" class="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-3xl">{{ rule.icon }}</span>
                    <span class="font-bold text-gray-800">{{ rule.label }}</span>
                  </div>
                  <span class="text-2xl font-bold text-green-600">+{{ rule.points }}</span>
                </div>
                <div class="flex gap-2 mt-3">
                  <button @click="openPointForm('add', rule)" class="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                    编辑
                  </button>
                  <button @click="deletePoint('add', rule)" class="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="card-cute p-8">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-2xl font-bold text-gray-800">➖ 扣分项目</h2>
              <button @click="openPointForm('deduct')" class="btn-game bg-gradient-to-r from-red-500 to-rose-500">
                ➕ 新增扣分项
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div v-for="rule in pointRules.deduct" :key="rule.label" class="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-3xl">{{ rule.icon }}</span>
                    <span class="font-bold text-gray-800">{{ rule.label }}</span>
                  </div>
                  <span class="text-2xl font-bold text-red-600">{{ rule.points }}</span>
                </div>
                <div class="flex gap-2 mt-3">
                  <button @click="openPointForm('deduct', rule)" class="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                    编辑
                  </button>
                  <button @click="deletePoint('deduct', rule)" class="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="currentTab === 'pets'" class="card-cute p-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-800">🐾 精灵进化阶段配置</h2>
            <button @click="openPetForm()" class="btn-game bg-gradient-to-r from-purple-500 to-pink-500">
              ➕ 新增阶段
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="pet in petStages" :key="pet.stage" class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <div class="text-center mb-4">
                <div class="text-5xl mb-2">🐾</div>
                <div class="text-2xl font-bold text-purple-600">阶段 {{ pet.stage }}</div>
                <div class="text-xl font-bold text-gray-800 mt-2">{{ pet.name }}</div>
              </div>
              <div class="bg-white rounded-lg p-3 mb-3">
                <div class="text-sm text-gray-600">经验值范围</div>
                <div class="text-lg font-bold text-purple-600">{{ pet.minExp }} - {{ pet.maxExp }}</div>
              </div>
              <div class="flex gap-2">
                <button @click="openPetForm(pet)" class="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                  编辑
                </button>
                <button @click="deletePet(pet)" class="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="currentTab === 'shop'" class="card-cute p-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-800">🛒 商店商品配置</h2>
            <button @click="openShopForm()" class="btn-game bg-gradient-to-r from-orange-500 to-red-500">
              ➕ 新增商品
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="item in shopItems" :key="item.id" class="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border-2 border-orange-200">
              <div class="text-center mb-4">
                <div class="text-5xl mb-2">{{ item.icon }}</div>
                <div class="text-xl font-bold text-gray-800">{{ item.name }}</div>
              </div>
              <div class="bg-white rounded-lg p-3 mb-3 space-y-2">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">价格</span>
                  <span class="text-lg font-bold text-orange-600">{{ item.price }} 积分</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600">库存</span>
                  <span class="text-lg font-bold text-blue-600">{{ item.stock }} 件</span>
                </div>
                <div v-if="item.description" class="text-xs text-gray-500 pt-2 border-t">
                  {{ item.description }}
                </div>
              </div>
              <div class="flex gap-2">
                <button @click="openShopForm(item)" class="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                  编辑
                </button>
                <button @click="deleteShop(item)" class="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="currentTab === 'questions'" class="card-cute p-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-800">📚 题库管理 ({{ questionBank.length }}道题)</h2>
            <div class="flex gap-3">
              <button @click="openQuestionForm()" class="btn-game bg-gradient-to-r from-indigo-500 to-purple-500">
                ➕ 新增题目
              </button>
              <button @click="openBatchImport()" class="btn-game bg-gradient-to-r from-blue-500 to-cyan-500">
                📥 批量导入
              </button>
              <button @click="clearAllQuestions()" class="btn-game bg-gradient-to-r from-red-500 to-pink-500">
                🗑️ 清空题库
              </button>
            </div>
          </div>
          <div class="space-y-4">
            <div v-for="(question, index) in questionBank" :key="question.id" class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <div class="text-lg font-bold text-gray-800 mb-2">{{ index + 1 }}. {{ question.title }}</div>
                  <div class="space-y-2">
                    <div v-for="(option, i) in question.options" :key="i" :class="['px-3 py-2 rounded-lg text-sm', i === question.correctAnswer ? 'bg-green-100 text-green-800 font-bold' : 'bg-white text-gray-700']">
                      {{ String.fromCharCode(65 + i) }}. {{ option }}
                    </div>
                  </div>
                  <div class="mt-3 flex gap-2">
                    <span :class="['px-2 py-1 rounded text-xs font-bold', question.difficulty === 'easy' ? 'bg-green-100 text-green-700' : question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700']">
                      {{ question.difficulty === 'easy' ? '简单' : question.difficulty === 'medium' ? '中等' : '困难' }}
                    </span>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button @click="openQuestionForm(question)" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                    编辑
                  </button>
                  <button @click="deleteQuestion(question)" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                    删除
                  </button>
                </div>
              </div>
            </div>
            <div v-if="questionBank.length === 0" class="text-center py-12 text-gray-500">
              <div class="text-4xl mb-2">📝</div>
              <div class="text-lg">暂无题目，点击"新增题目"开始添加</div>
            </div>
          </div>
        </div>

        <!-- 精灵图鉴管理 - 两段式 -->
        <div v-else-if="currentTab === 'petLibrary'" class="space-y-6">
          <div class="card-cute p-8">
            <!-- 强制初始化按钮 - 醒目位置 -->
            <div class="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-orange-300 rounded-xl p-4 mb-6">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-bold text-orange-800 mb-1">🛠️ 数据初始化工具</h3>
                  <p class="text-sm text-orange-700">如果精灵图鉴为空，点击此按钮强制创建5只基础精灵和16个Boss</p>
                </div>
                <button 
                  @click="forceInitBasicData"
                  class="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  🛠️ 强制初始化基础数据
                </button>
              </div>
            </div>
            
            <!-- 第一步：属性选择视图 -->
            <div v-if="showElementView">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold text-gray-800">🎨 精灵图鉴管理 - 选择属性</h2>
              </div>

              <div class="bg-blue-50 rounded-xl p-4 mb-6">
                <h4 class="font-bold text-blue-800 mb-2">💡 使用说明：</h4>
                <ul class="text-sm text-blue-700 space-y-1">
                  <li>• 点击任意属性进入该属性的精灵管理界面</li>
                  <li>• 可以为每个属性添加多只不同的精灵</li>
                  <li>• 系统默认已创建金木水火土五只基础精灵</li>
                </ul>
              </div>

              <!-- 16种属性网格 -->
              <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div 
                  v-for="element in ALL_ELEMENTS" 
                  :key="element.id"
                  @click="selectLibraryElement(element.id)"
                  class="cursor-pointer bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 hover:shadow-2xl hover:scale-105 transition-all border-2 border-gray-200 hover:border-purple-500"
                >
                  <div class="text-center">
                    <div class="text-5xl mb-3">{{ element.emoji }}</div>
                    <div class="text-lg font-bold text-gray-800">{{ element.name }}</div>
                    <div class="text-xs text-gray-500 mt-2">
                      {{ (petTypes || []).filter(p => p.element === element.id).length }} 只精灵
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 第二步：精灵列表视图（按属性过滤） -->
            <div v-else>
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-4">
                  <button @click="backToElementView" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                    ← 返回属性选择
                  </button>
                  <h2 class="text-2xl font-bold text-gray-800">
                    {{ getElementInfo(selectedLibraryElement).emoji }} {{ getElementInfo(selectedLibraryElement).name }}系精灵 
                    ({{ filteredPetTypesByElement.length }}只)
                  </h2>
                </div>
                <button @click="openPetTypeForm()" class="btn-game bg-gradient-to-r from-pink-500 to-rose-500">
                  ➕ 新增{{ getElementInfo(selectedLibraryElement).name }}系精灵
                </button>
              </div>

              <div class="bg-blue-50 rounded-xl p-4 mb-6">
                <h4 class="font-bold text-blue-800 mb-2">💡 使用说明：</h4>
                <ul class="text-sm text-blue-700 space-y-1">
                  <li>• 点击图片框可上传该精灵对应阶段的图片</li>
                  <li>• 图片会自动转换为Base64存储在数据库中</li>
                  <li>• 如果未上传图片，系统会显示默认的Emoji表情</li>
                  <li>• 建议图片大小不超过5MB，推荐使用正方形图片</li>
                </ul>
              </div>

              <div class="space-y-8">
                <div v-for="petType in filteredPetTypesByElement" :key="petType.id" class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
                  <!-- 精灵类型头部 -->
                  <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-4">
                      <div class="text-5xl">{{ petType?.emoji || '🎨' }}</div>
                      <div>
                        <h3 class="text-2xl font-bold text-gray-800">{{ petType?.name || '未命名精灵' }}</h3>
                        <p class="text-sm text-gray-600">{{ petType?.description || '' }}</p>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button @click="openPetTypeForm(petType)" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                        编辑
                      </button>
                      <button @click="deletePetTypeHandler(petType)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                        删除
                      </button>
                    </div>
                  </div>

                  <!-- 6个阶段的图片上传框 -->
                  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div v-for="stage in 6" :key="stage" class="text-center">
                      <div class="text-xs font-bold text-gray-600 mb-2">阶段{{ stage }}</div>
                      <div 
                        @click="triggerImageUpload(petType.id, stage)"
                        class="relative w-full aspect-square bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-500 cursor-pointer transition-all overflow-hidden group"
                      >
                        <!-- 已上传图片 -->
                        <img 
                          v-if="getPetImageUrl(petType.id, stage)" 
                          :src="getPetImageUrl(petType.id, stage)" 
                          class="w-full h-full object-cover"
                          alt="精灵图片"
                        />
                        <!-- 未上传显示Emoji -->
                        <div v-else class="absolute inset-0 flex flex-col items-center justify-center">
                          <div class="text-4xl mb-2">{{ getStageEmoji(stage) }}</div>
                          <div class="text-xs text-gray-400">点击上传</div>
                        </div>
                        <!-- 悬停提示 -->
                        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div class="text-white text-sm font-bold">📷 更换图片</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="filteredPetTypesByElement.length === 0" class="text-center py-12 text-gray-500">
                  <div class="text-4xl mb-2">🎨</div>
                  <div class="text-lg">该属性暂无精灵，点击"新增精灵"开始创建</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Boss管理Tab -->
        <div v-else-if="currentTab === 'boss'" class="space-y-6">
          <div class="card-cute p-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">👹 史诗BOSS设置</h2>
            
            <div class="bg-red-50 rounded-xl p-4 mb-6">
              <h4 class="font-bold text-red-800 mb-2">💡 使用说明：</h4>
              <ul class="text-sm text-red-700 space-y-1">
                <li>• 系统已为16种属性各创建1个初始Boss</li>
                <li>• 点击Boss名称可直接修改</li>
                <li>• 点击【上传图片】可为Boss设置专属形象</li>
                <li>• 点击【编辑题库】为Boss配置专属题目（学生挑战时使用）</li>
              </ul>
            </div>

            <!-- Boss网格 -->
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
              <div 
                v-for="boss in bosses" 
                :key="boss.id"
                class="bg-gradient-to-br from-red-100 to-orange-100 rounded-2xl p-4 border-2 border-red-300 hover:shadow-xl transition-all"
              >
                <div class="text-center">
                  <!-- Boss图片或emoji -->
                  <div v-if="boss.imageBase64" class="w-24 h-24 mx-auto mb-3 cursor-pointer" @click="uploadBossImage(boss.id)">
                    <img :src="boss.imageBase64" class="w-full h-full object-contain rounded-xl" alt="Boss" />
                  </div>
                  <div v-else class="text-6xl mb-3 cursor-pointer" @click="uploadBossImage(boss.id)">{{ boss.emoji }}</div>
                  
                  <!-- Boss名称（可编辑） -->
                  <input 
                    :value="boss.name"
                    @blur="updateBossInfo(boss.id, 'name', $event.target.value)"
                    class="w-full text-center text-sm font-bold text-gray-800 bg-white/50 rounded px-2 py-1 mb-2 border border-gray-300 focus:border-red-500 focus:outline-none"
                  />
                  
                  <!-- 属性标签 -->
                  <div class="text-xs font-bold text-red-600 mb-3">
                    {{ getElementInfo(boss.element).emoji }} {{ getElementInfo(boss.element).name }}系
                  </div>
                  
                  <!-- 操作按钮 -->
                  <div class="space-y-2">
                    <button 
                      @click="uploadBossImage(boss.id)"
                      class="w-full py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-xs font-bold hover:shadow-lg transition-all"
                    >
                      📷 上传图片
                    </button>
                    <button 
                      @click="openBossQuestionEditor(boss)"
                      class="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs font-bold hover:shadow-lg transition-all"
                    >
                      📝 编辑题库
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="bosses.length === 0" class="text-center py-12 text-gray-500">
              <div class="text-6xl mb-4">👹</div>
              <p class="text-lg mb-4">暂无Boss数据</p>
              <button 
                @click="forceInitBasicData"
                class="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                🛠️ 点击初始化Boss数据
              </button>
            </div>
          </div>
        </div>
        
        <!-- 数据备份Tab -->
        <div v-else-if="currentTab === 'backup'" class="space-y-6">
          <div class="card-cute p-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">OCPS Backup</h2>
            
            <div class="bg-yellow-50 rounded-xl p-4 mb-6 border-2 border-yellow-300">
              <h4 class="font-bold text-yellow-800 mb-2">⚠️ 重要提示：</h4>
              <ul class="text-sm text-yellow-700 space-y-1">
                <li>• 备份文件包含所有数据：学生、配置、图鉴图片（Base64）、题库等</li>
                <li>• 建议每周备份一次，防止数据丢失</li>
                <li>• 导入备份会覆盖当前所有数据，请谨慎操作</li>
                <li>• 备份文件请妥善保管，不要随意分享</li>
              </ul>
            </div>
            <!-- 服务端配置 -->
            <div class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 mb-6 border-2 border-blue-300">
              <div class="flex items-center gap-6">
                <div class="text-7xl">🔧</div>
                <div class="flex-1">
                  <h3 class="text-2xl font-bold text-gray-800 mb-2">服务端配置</h3>
                  <p class="text-sm text-gray-600 mb-4">配置服务端地址，用于同步数据</p>
                  <input
                    v-model="serverConfig"
                    type="text"
                    placeholder="https://ocps.zhiyuhub.top/"
                    class="w-full px-4 py-2 bg-white/50 rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none"
                  />

                  <button 
                    @click="saveServerConfig"
                    class="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all"
                  >
                    确定
                  </button>
                  <button
                    @click="syncServerData"
                    class="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all"
                  >
                    上传数据
                  </button>
                  <button
                    @click="downloadServerData"
                    class="px-8 py-4 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all"
                  >
                    下载数据
                  </button>
                </div>
              </div>
            </div>
            <!-- 导出数据 -->
            <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 mb-6 border-2 border-green-300">
              <div class="flex items-center gap-6">
                <div class="text-7xl">📤</div>
                <div class="flex-1">
                  <h3 class="text-2xl font-bold text-gray-800 mb-2">导出所有数据</h3>
                  <p class="text-sm text-gray-600 mb-4">将所有数据打包为JSON文件，下载到本地保存</p>
                  <button 
                    @click="exportData"
                    :disabled="exportingData"
                    class="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ exportingData ? '⏳ 导出中...' : '📤 导出所有数据' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 导入数据 -->
            <div class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border-2 border-blue-300">
              <div class="flex items-center gap-6">
                <div class="text-7xl">📥</div>
                <div class="flex-1">
                  <h3 class="text-2xl font-bold text-gray-800 mb-2">导入备份数据</h3>
                  <p class="text-sm text-gray-600 mb-4">选择备份文件，一键恢复所有数据（会覆盖当前数据）</p>
                  <button 
                    @click="importData"
                    :disabled="importingData"
                    class="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ importingData ? '⏳ 导入中...' : '📥 选择备份文件导入' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 使用说明 -->
            <div class="bg-purple-50 rounded-xl p-6 border-2 border-purple-300">
              <h4 class="font-bold text-purple-800 mb-3">📖 使用说明：</h4>
              <div class="space-y-3 text-sm text-purple-700">
                <div>
                  <p class="font-bold mb-1">1️⃣ 导出数据（备份）：</p>
                  <p class="ml-4">点击【导出所有数据】按钮，系统会自动生成备份文件并下载到本地。文件名格式：四2班宠物系统备份_日期时间.json</p>
                </div>
                <div>
                  <p class="font-bold mb-1">2️⃣ 导入数据（恢复）：</p>
                  <p class="ml-4">点击【选择备份文件导入】按钮，选择之前导出的.json文件，系统会清空当前数据并恢复备份数据。导入完成后页面会自动刷新。</p>
                </div>
                <div>
                  <p class="font-bold mb-1">3️⃣ 建议备份时机：</p>
                  <p class="ml-4">• 每周五放学前备份一次<br/>• 学期末备份一次<br/>• 重大活动前备份一次<br/>• 系统升级前备份一次</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 精灵类型表单弹窗 -->
    <div v-if="showPetTypeForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showPetTypeForm = false">
      <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">
          {{ editingPetType ? '编辑' : '新增' }}精灵类型
        </h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">精灵名称 ⭐</label>
            <input v-model="petTypeForm.name" type="text" placeholder="例如：炎火猴" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">精灵描述</label>
            <input v-model="petTypeForm.description" type="text" placeholder="例如：热情如火的精灵" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">属性类型 ⭐</label>
            <select v-model="petTypeForm.element" @change="onElementChange" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none">
              <option value="fire">🔥 火</option>
              <option value="water">💧 水</option>
              <option value="wood">🌳 木</option>
              <option value="thunder">⚡ 雷</option>
              <option value="ice">❄️ 冰</option>
              <option value="holy">✝️ 圣</option>
              <option value="metal">⚙️ 金</option>
              <option value="earth">🪨 土</option>
              <option value="dark">😈 魔</option>
              <option value="demon">👹 妖</option>
              <option value="wind">🌪️ 风</option>
              <option value="poison">☠️ 毒</option>
              <option value="illusion">✨ 幻</option>
              <option value="wing">🦅 翼</option>
              <option value="machine">🤖 机械</option>
              <option value="spirit">👻 灵</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">💡 选择属性后，图标会自动匹配</p>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">精灵图标（自动匹配）</label>
            <div class="bg-gray-100 rounded-lg p-4 text-center">
              <div class="text-6xl">{{ petTypeForm.emoji }}</div>
              <p class="text-xs text-gray-500 mt-2">图标已根据属性自动设置</p>
            </div>
          </div>
          <div class="flex gap-3 pt-4">
            <button @click="savePetType" class="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-bold hover:shadow-lg transition-all">
              保存
            </button>
            <button @click="showPetTypeForm = false" class="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPointForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showPointForm = false">
      <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">
          {{ editingPoint ? '编辑' : '新增' }}{{ pointForm.type === 'add' ? '加分' : '扣分' }}项目
        </h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">规则名称</label>
            <input v-model="pointForm.label" type="text" placeholder="例如：积极发言" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">分数</label>
            <input v-model.number="pointForm.points" type="number" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">图标</label>
            <div class="grid grid-cols-7 gap-2">
              <button v-for="icon in iconOptions" :key="icon" @click="pointForm.icon = icon" :class="['text-3xl p-2 rounded-lg border-2 transition-all', pointForm.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400']">
                {{ icon }}
              </button>
            </div>
          </div>
          <div class="flex gap-3 pt-4">
            <button @click="savePoint" class="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-bold hover:shadow-lg transition-all">
              保存
            </button>
            <button @click="showPointForm = false" class="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPetForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showPetForm = false">
      <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">
          {{ editingPet ? '编辑' : '新增' }}精灵阶段
        </h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">阶段编号</label>
            <input v-model.number="petForm.stage" type="number" :disabled="!!editingPet" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">阶段名称</label>
            <input v-model="petForm.name" type="text" placeholder="例如：精灵蛋" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">最小经验值</label>
            <input v-model.number="petForm.minExp" type="number" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">最大经验值</label>
            <input v-model.number="petForm.maxExp" type="number" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none" />
          </div>
          <div class="flex gap-3 pt-4">
            <button @click="savePet" class="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:shadow-lg transition-all">
              保存
            </button>
            <button @click="showPetForm = false" class="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showShopForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showShopForm = false">
      <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">
          {{ editingShop ? '编辑' : '新增' }}商品
        </h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">商品名称</label>
            <input v-model="shopForm.name" type="text" placeholder="例如：免抄写券" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">价格（积分）</label>
            <input v-model.number="shopForm.price" type="number" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">库存数量</label>
            <input v-model.number="shopForm.stock" type="number" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">图标</label>
            <div class="grid grid-cols-7 gap-2">
              <button v-for="icon in iconOptions" :key="icon" @click="shopForm.icon = icon" :class="['text-3xl p-2 rounded-lg border-2 transition-all', shopForm.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400']">
                {{ icon }}
              </button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">商品描述（可选）</label>
            <textarea v-model="shopForm.description" placeholder="简单描述商品用途" rows="3" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none resize-none"></textarea>
          </div>
          <div class="flex gap-3 pt-4">
            <button @click="saveShop" class="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-bold hover:shadow-lg transition-all">
              保存
            </button>
            <button @click="showShopForm = false" class="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量导入弹窗 -->
    <div v-if="showBatchImport" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto" @click.self="showBatchImport = false">
      <div class="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 shadow-2xl my-8">
        <h3 class="text-2xl font-bold text-gray-800 mb-4">📥 批量导入题目</h3>
        
        <div class="bg-blue-50 rounded-xl p-4 mb-4">
          <h4 class="font-bold text-blue-800 mb-2">📝 导入格式说明：</h4>
          <p class="text-sm text-blue-700 mb-2">每行一道题，使用竖线 | 分隔各部分：</p>
          <code class="block bg-white p-3 rounded text-xs text-gray-800 mb-2">
            题目|选项A|选项B|选项C|选项D|正确答案(0-3)|难度(easy/medium/hard)
          </code>
          <p class="text-xs text-blue-600">示例：</p>
          <code class="block bg-white p-3 rounded text-xs text-gray-800">
            中国的首都是哪里？|北京|上海|广州|深圳|0|easy<br/>
            1+1等于几？|1|2|3|4|1|easy<br/>
            以下哪个是编程语言？|HTML|CSS|JavaScript|Photoshop|2|medium
          </code>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold text-gray-700 mb-2">粘贴题目数据（每行一题）</label>
          <textarea 
            v-model="batchImportText" 
            placeholder="题目|选项A|选项B|选项C|选项D|正确答案(0-3)|难度(可选)&#10;中国的首都是哪里？|北京|上海|广州|深圳|0|easy&#10;1+1等于几？|1|2|3|4|1|easy"
            rows="12" 
            class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none resize-none font-mono text-sm"
          ></textarea>
        </div>

        <div class="flex gap-3">
          <button @click="importBatchQuestions" class="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-bold hover:shadow-lg transition-all">
            开始导入
          </button>
          <button @click="showBatchImport = false" class="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all">
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- 题库管理表单 -->
    <div v-if="showQuestionForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto" @click.self="showQuestionForm = false">
      <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl my-8">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">
          {{ editingQuestion ? '编辑' : '新增' }}题目
        </h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">题目</label>
            <input v-model="questionForm.title" type="text" placeholder="请输入题目内容" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none" />
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">选项</label>
            <div class="space-y-2">
              <div v-for="(option, i) in questionForm.options" :key="i" class="flex items-center gap-2">
                <span class="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded font-bold">
                  {{ String.fromCharCode(65 + i) }}
                </span>
                <input v-model="questionForm.options[i]" type="text" :placeholder="`选项 ${String.fromCharCode(65 + i)}`" class="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none" />
                <input type="radio" :value="i" v-model.number="questionForm.correctAnswer" class="w-5 h-5" />
                <span class="text-sm text-gray-600">正确答案</span>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">难度</label>
            <select v-model="questionForm.difficulty" class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none">
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
          </div>

          <div class="flex gap-3 pt-4">
            <button @click="saveQuestion" class="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-bold hover:shadow-lg transition-all">
              保存
            </button>
            <button @click="showQuestionForm = false" class="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Boss题库编辑器弹窗 -->
    <div v-if="showBossQuestionEditor && selectedBoss" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm" @click="closeBossQuestionEditor">
      <div class="bg-white rounded-3xl p-8 max-w-4xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" @click.stop>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-3xl font-bold text-gray-800">
            {{ selectedBoss.emoji }} {{ selectedBoss.name }} - 题库管理
          </h2>
          <button @click="closeBossQuestionEditor" class="text-gray-500 hover:text-gray-700 text-3xl">×</button>
        </div>

        <div class="bg-purple-50 rounded-xl p-4 mb-6">
          <p class="text-sm text-purple-800">
            <span class="font-bold">当前题库：</span>{{ bossQuestions.length }} 道题目
          </p>
          <p class="text-xs text-purple-700 mt-1">学生挑战时会随机抽取10道题</p>
        </div>

        <div class="flex gap-3 mb-6">
          <button 
            @click="openBossQuestionForm"
            class="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all"
          >
            ➕ 新增题目
          </button>
          <button 
            @click="showBossBatchImport = true"
            class="flex-1 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all"
          >
            📝 批量快速导入
          </button>
        </div>

        <!-- 题目列表 -->
        <div class="space-y-4">
          <div 
            v-for="(question, index) in bossQuestions" 
            :key="question.id"
            class="bg-gray-50 rounded-xl p-4 border-2 border-gray-200"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <div class="text-sm text-gray-500 mb-1">第 {{ index + 1 }} 题</div>
                <h4 class="text-lg font-bold text-gray-800">{{ question.question }}</h4>
              </div>
              <div class="flex gap-2">
                <button 
                  @click="editBossQuestion(question)"
                  class="px-3 py-1 bg-blue-500 text-white rounded text-xs font-bold hover:bg-blue-600 transition-all"
                >
                  编辑
                </button>
                <button 
                  @click="removeBossQuestion(question.id)"
                  class="px-3 py-1 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600 transition-all"
                >
                  删除
                </button>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-2">
              <div 
                v-for="(option, optIndex) in question.options" 
                :key="optIndex"
                :class="[
                  'p-2 rounded text-sm',
                  optIndex === question.correctAnswer ? 'bg-green-100 border-2 border-green-500 font-bold' : 'bg-white border border-gray-300'
                ]"
              >
                {{ String.fromCharCode(65 + optIndex) }}. {{ option }}
                <span v-if="optIndex === question.correctAnswer" class="text-green-600 ml-2">✓</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="bossQuestions.length === 0" class="text-center py-12 text-gray-500">
          <div class="text-6xl mb-4">📝</div>
          <p class="text-lg">暂无题目，点击上方按钮添加</p>
        </div>
      </div>
    </div>

    <!-- Boss题目表单弹窗 -->
    <div v-if="showBossQuestionForm" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm" @click="showBossQuestionForm = false">
      <div class="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl" @click.stop>
        <h3 class="text-2xl font-bold text-gray-800 mb-6">{{ editingBossQuestion ? '编辑题目' : '新增题目' }}</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">题目内容</label>
            <input 
              v-model="bossQuestionForm.question"
              type="text"
              placeholder="输入题目"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">选项</label>
            <div class="space-y-2">
              <div v-for="(option, index) in bossQuestionForm.options" :key="index" class="flex items-center gap-2">
                <span class="text-lg font-bold text-gray-700 w-8">{{ String.fromCharCode(65 + index) }}.</span>
                <input 
                  v-model="bossQuestionForm.options[index]"
                  type="text"
                  :placeholder="`选项${String.fromCharCode(65 + index)}`"
                  class="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">正确答案</label>
            <select 
              v-model.number="bossQuestionForm.correctAnswer"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none"
            >
              <option :value="0">A. {{ bossQuestionForm.options[0] || '选项A' }}</option>
              <option :value="1">B. {{ bossQuestionForm.options[1] || '选项B' }}</option>
              <option :value="2">C. {{ bossQuestionForm.options[2] || '选项C' }}</option>
              <option :value="3">D. {{ bossQuestionForm.options[3] || '选项D' }}</option>
            </select>
          </div>

          <div class="flex gap-3 pt-4">
            <button @click="saveBossQuestion" class="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:shadow-lg transition-all">
              保存
            </button>
            <button @click="showBossQuestionForm = false" class="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Boss批量导入弹窗 -->
    <div v-if="showBossBatchImport" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm" @click="showBossBatchImport = false">
      <div class="bg-white rounded-3xl p-8 max-w-4xl w-full mx-4 shadow-2xl" @click.stop>
        <h3 class="text-2xl font-bold text-gray-800 mb-4">📝 批量快速导入Boss题目</h3>
        
        <div class="bg-blue-50 rounded-xl p-4 mb-4">
          <h4 class="font-bold text-blue-800 mb-2">📋 导入格式说明：</h4>
          <p class="text-sm text-blue-700 mb-2">每行一道题，使用竖线 | 分隔各部分：</p>
          <code class="block bg-white p-3 rounded text-xs text-gray-800 mb-2">
            题目|选项A|选项B|选项C|选项D|正确答案(1-4)
          </code>
          <p class="text-xs text-blue-600 mb-1">示例：</p>
          <code class="block bg-white p-3 rounded text-xs text-gray-800">
            中国的首都是哪里？|北京|上海|广州|深圳|1<br/>
            1+1等于几？|1|2|3|4|2<br/>
            以下哪个是编程语言？|HTML|CSS|JavaScript|Photoshop|3
          </code>
          <p class="text-xs text-red-600 mt-2">⚠️ 注意：正确答案填写1-4（对应选项A-D），不是0-3！</p>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold text-gray-700 mb-2">粘贴题目数据（每行一题）</label>
          <textarea 
            v-model="bossBatchImportText" 
            placeholder="题目|选项A|选项B|选项C|选项D|正确答案(1-4)&#10;中国的首都是哪里？|北京|上海|广州|深圳|1&#10;1+1等于几？|1|2|3|4|2"
            rows="12" 
            class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none resize-none font-mono text-sm"
          ></textarea>
        </div>

        <div class="flex gap-3">
          <button @click="parseBossBatchImport" class="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-bold hover:shadow-lg transition-all">
            开始导入
          </button>
          <button @click="showBossBatchImport = false" class="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all">
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- 系统初始化/还原弹窗 -->
    <div v-if="showSystemResetModal" class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center" @click="showSystemResetModal = false">
      <div class="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl" @click.stop>
        <h3 class="text-3xl font-bold text-red-600 mb-4 text-center">⚠️ 系统初始化/还原</h3>
        
        <div class="bg-red-50 rounded-xl p-4 mb-6 border-2 border-red-200">
          <h4 class="font-bold text-red-800 mb-2">🚨 此操作将执行以下操作：</h4>
          <ul class="text-sm text-red-700 space-y-1">
            <li>• 清空所有学生数据</li>
            <li>• 清空所有积分记录</li>
            <li>• 清空所有任务完成记录</li>
            <li>• 清空夸夸墙内容</li>
            <li>• 重置为5个默认测试学生</li>
            <li>• 保留教师配置和精灵图鉴</li>
          </ul>
          <p class="text-xs text-red-600 mt-2 font-bold">⚠️ 此操作不可恢复！请确保已备份重要数据！</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">请输入以下内容</label>
            <p class="text-xs text-gray-600 mb-2">我确认将要重置系统，并彻底销毁本地及服务器数据库。</p>
            <input 
              v-model="systemResetText"
              type="text"
              placeholder="输入框..."
              @keyup.enter="confirmSystemReset"
              class="w-full px-4 py-3 rounded-lg border-2 border-red-300 focus:border-red-500 focus:outline-none text-center text-xl font-bold"
            />
          </div>

          <div class="flex gap-3">
            <button 
              @click="confirmSystemReset"
              class="flex-1 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-bold hover:shadow-lg transition-all"
            >
              🔄 确认初始化
            </button>
            <button 
              @click="showSystemResetModal = false"
              class="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-game {
  @apply px-6 py-3 rounded-xl text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105;
}

.card-cute {
  @apply bg-white rounded-2xl shadow-xl;
}
</style>
