<script setup>
import { ref, onMounted, computed } from 'vue';
import { getAllStudents, getOwnedPets, getAllPetTypes } from '../db.js';
import { getPetDisplay, isImageType } from '../petImageHelper.js';

const emit = defineEmits(['exit']);

const students = ref([]);
const viewMode = ref('card'); // 'card' | 'badge' | 'history'
const loading = ref(true);
const petDisplayCache = ref({});
const selectedStudent = ref(null); // 🆕 选中的学生（查看历史精灵）
const ownedPetsHistory = ref([]); // 🆕 学生曾经拥有的精灵
const allPetTypes = ref([]); // 🆕 所有精灵类型

const PET_STAGES = [
  { stage: 1, name: '萌蛋期', emoji: '🥚', color: 'from-yellow-200 to-orange-200', stars: 1 },
  { stage: 2, name: '幼年期', emoji: '🐣', color: 'from-yellow-300 to-amber-300', stars: 2 },
  { stage: 3, name: '成长期', emoji: '🐥', color: 'from-amber-300 to-orange-400', stars: 3 },
  { stage: 4, name: '青年期', emoji: '🐔', color: 'from-orange-400 to-red-400', stars: 4 },
  { stage: 5, name: '完全体', emoji: '🦅', color: 'from-blue-400 to-purple-500', stars: 5 },
  { stage: 6, name: '究极体', emoji: '🐉', color: 'from-purple-500 to-pink-500', stars: 6 }
];

const getPetStageInfo = (stage) => {
  return PET_STAGES.find(s => s.stage === stage) || PET_STAGES[0];
};

// 高级精灵（阶段4及以上）
const advancedPets = computed(() => {
  return students.value
    .filter(s => s.petStage >= 4)
    .map(s => ({
      ...s,
      stageInfo: getPetStageInfo(s.petStage)
    }))
    .sort((a, b) => b.petStage - a.petStage);
});

// 🆕 查看学生的历史精灵
const viewStudentHistory = async (student) => {
  selectedStudent.value = student;
  viewMode.value = 'history';
  
  // 加载该学生曾经拥有的精灵
  ownedPetsHistory.value = await getOwnedPets(student.id);
  
  // 预加载历史精灵的图片
  for (const record of ownedPetsHistory.value) {
    const key = `history_${record.petTypeId}_${record.maxStage}`;
    if (!petDisplayCache.value[key]) {
      const petType = allPetTypes.value.find(p => p.id === record.petTypeId);
      const display = await getPetDisplay(record.petTypeId, record.maxStage, petType?.name || '精灵');
      petDisplayCache.value[key] = display;
    }
  }
};

// 🆕 返回图鉴主页
const backToPokedex = () => {
  viewMode.value = 'card';
  selectedStudent.value = null;
  ownedPetsHistory.value = [];
};

const loadData = async () => {
  try {
    students.value = await getAllStudents();
    allPetTypes.value = await getAllPetTypes();
    
    // 预加载所有高级精灵的图片（支持静态图片）
    for (const student of students.value) {
      if (student.petStage >= 4) {
        const display = await getPetDisplay(student.petTypeId, student.petStage, student.petName);
        petDisplayCache.value[student.id] = display;
      }
    }
    
    loading.value = false;
  } catch (error) {
    console.error('加载数据失败:', error);
    loading.value = false;
  }
};

// 获取宠物显示内容
const getPetDisplayContent = (studentId) => {
  return petDisplayCache.value[studentId] || { type: 'emoji', content: '🐉' };
};

// 🆕 获取历史精灵显示内容
const getHistoryPetDisplay = (petTypeId, stage) => {
  const key = `history_${petTypeId}_${stage}`;
  return petDisplayCache.value[key] || { type: 'emoji', content: '🐉' };
};

// 🆕 获取精灵类型名称
const getPetTypeName = (petTypeId) => {
  const petType = allPetTypes.value.find(p => p.id === petTypeId);
  return petType?.name || '未知精灵';
};

const exitModule = () => {
  emit('exit');
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="fixed inset-0 z-50 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden">
    <!-- 顶部导航栏 -->
    <div class="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg p-4 z-10">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="exitModule" class="btn-game bg-gradient-to-r from-gray-400 to-gray-500 text-sm">
            ← 返回主控台
          </button>
          <h1 class="text-3xl font-bold text-gray-800">📖 精灵图鉴</h1>
        </div>
        
        <!-- 视图切换 -->
        <div class="flex gap-3">
          <button
            @click="viewMode = 'card'"
            :class="[
              'px-6 py-3 rounded-xl font-bold text-lg transition-all',
              viewMode === 'card'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            ]"
          >
            🎴 卡片模式
          </button>
          
          <button
            @click="viewMode = 'badge'"
            :class="[
              'px-6 py-3 rounded-xl font-bold text-lg transition-all',
              viewMode === 'badge'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            ]"
          >
            🏅 徽章模式
          </button>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="relative w-full h-full pt-24 pb-8 overflow-y-auto">
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="text-4xl text-gray-600">🌟 加载中...</div>
      </div>

      <div v-else class="max-w-7xl mx-auto px-8">
        <!-- 统计信息 -->
        <div class="card-cute p-6 mb-6 text-center">
          <h2 class="text-3xl font-bold text-gray-800 mb-2">高级精灵收藏馆</h2>
          <p class="text-lg text-gray-600">已收集 <span class="text-3xl font-bold text-purple-600">{{ advancedPets.length }}</span> 只高级精灵</p>
        </div>

        <!-- 卡片模式 -->
        <div v-if="viewMode === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="pet in advancedPets"
            :key="pet.id"
            class="pokemon-card"
          >
            <!-- 卡片边框 -->
            <div class="card-border">
              <!-- 卡片头部 -->
              <div class="card-header">
                <div class="text-2xl font-bold text-white">{{ pet.name }}</div>
                <div class="flex gap-1">
                  <span v-for="i in pet.stageInfo.stars" :key="i" class="text-yellow-300 text-xl">⭐</span>
                </div>
              </div>

              <!-- 精灵图像 -->
              <div :class="['card-image bg-gradient-to-br', pet.stageInfo.color]">
                <img 
                  v-if="isImageType(getPetDisplayContent(pet.id).type)"
                  :src="getPetDisplayContent(pet.id).content"
                  class="w-full h-full object-contain animate-float p-4"
                  alt="精灵"
                />
                <div v-else class="text-9xl animate-float">{{ getPetDisplayContent(pet.id).content }}</div>
              </div>

              <!-- 卡片信息 -->
              <div class="card-info">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-bold text-gray-600">阶段</span>
                  <span class="text-lg font-bold text-purple-600">{{ pet.stageInfo.name }}</span>
                </div>
                
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-bold text-gray-600">攻击力</span>
                  <span class="text-lg font-bold text-red-600">{{ pet.totalPoints }}</span>
                </div>
                
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-bold text-gray-600">经验值</span>
                  <span class="text-lg font-bold text-blue-600">{{ pet.petExp }}</span>
                </div>
                
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-gray-600">小组</span>
                  <span class="text-sm font-bold text-gray-800">{{ pet.group }}</span>
                </div>
              </div>

              <!-- 卡片描述 -->
              <div class="card-description">
                <p class="text-xs text-gray-600 italic mb-2">
                  "{{ pet.name }}的精灵经过不懈努力，已经进化到{{ pet.stageInfo.name }}，展现出强大的力量！"
                </p>
                <!-- 🆕 查看历史精灵按钮 -->
                <button 
                  @click="viewStudentHistory(pet)"
                  class="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:shadow-lg transition-all text-sm"
                >
                  📜 查看历史精灵
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 徽章模式 -->
        <div v-else-if="viewMode === 'badge'" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          <div
            v-for="pet in advancedPets"
            :key="pet.id"
            class="badge-container"
            @click="viewStudentHistory(pet)"
          >
            <div :class="['badge bg-gradient-to-br', pet.stageInfo.color]">
              <!-- 外圈装饰 -->
              <div class="badge-ring"></div>
              
              <!-- 精灵图标 -->
              <div class="badge-icon">
                <img 
                  v-if="isImageType(getPetDisplayContent(pet.id).type)"
                  :src="getPetDisplayContent(pet.id).content"
                  class="w-16 h-16 object-contain"
                  alt="精灵"
                />
                <span v-else>{{ getPetDisplayContent(pet.id).content }}</span>
              </div>
              
              <!-- 星级 -->
              <div class="badge-stars">
                <span v-for="i in pet.stageInfo.stars" :key="i" class="text-yellow-400 text-xs">⭐</span>
              </div>
            </div>
            
            <!-- 徽章信息 -->
            <div class="text-center mt-3">
              <div class="text-lg font-bold text-gray-800">{{ pet.name }}</div>
              <div class="text-sm text-gray-600">{{ pet.stageInfo.name }}</div>
              <div class="text-xs text-purple-600 font-bold mt-1">Lv.{{ pet.petStage }}</div>
            </div>
          </div>
        </div>

        <!-- 🆕 历史精灵视图 -->
        <div v-else-if="viewMode === 'history' && selectedStudent" class="space-y-6">
          <!-- 返回按钮 -->
          <button 
            @click="backToPokedex"
            class="px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            ← 返回图鉴
          </button>

          <!-- 学生信息卡片 -->
          <div class="card-cute p-6 text-center">
            <h2 class="text-3xl font-bold text-gray-800 mb-2">{{ selectedStudent.name }} 的精灵收藏</h2>
            <p class="text-lg text-gray-600">曾经拥有 <span class="text-2xl font-bold text-purple-600">{{ ownedPetsHistory.length }}</span> 只高阶精灵</p>
          </div>

          <!-- 历史精灵列表 -->
          <div v-if="ownedPetsHistory.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="record in ownedPetsHistory"
              :key="record.id"
              class="pokemon-card"
            >
              <div class="card-border">
                <!-- 卡片头部 -->
                <div class="card-header">
                  <div class="text-2xl font-bold text-white">{{ getPetTypeName(record.petTypeId) }}</div>
                  <div class="flex gap-1">
                    <span v-for="i in getPetStageInfo(record.maxStage).stars" :key="i" class="text-yellow-300 text-xl">⭐</span>
                  </div>
                </div>

                <!-- 精灵图像 -->
                <div :class="['card-image bg-gradient-to-br', getPetStageInfo(record.maxStage).color]">
                  <img 
                    v-if="isImageType(getHistoryPetDisplay(record.petTypeId, record.maxStage).type)"
                    :src="getHistoryPetDisplay(record.petTypeId, record.maxStage).content"
                    class="w-full h-full object-contain animate-float p-4"
                    alt="精灵"
                  />
                  <div v-else class="text-9xl animate-float">{{ getHistoryPetDisplay(record.petTypeId, record.maxStage).content }}</div>
                </div>

                <!-- 卡片信息 -->
                <div class="card-info">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-bold text-gray-600">最高阶段</span>
                    <span class="text-lg font-bold text-purple-600">{{ getPetStageInfo(record.maxStage).name }}</span>
                  </div>
                  
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-bold text-gray-600">最高经验</span>
                    <span class="text-lg font-bold text-blue-600">{{ record.maxExp }}</span>
                  </div>
                  
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-bold text-gray-600">记录时间</span>
                    <span class="text-xs text-gray-600">{{ new Date(record.timestamp).toLocaleDateString() }}</span>
                  </div>
                </div>

                <!-- 卡片描述 -->
                <div class="card-description">
                  <p class="text-xs text-gray-600 italic">
                    "这只{{ getPetTypeName(record.petTypeId) }}曾陪伴{{ selectedStudent.name }}成长到{{ getPetStageInfo(record.maxStage).name }}，留下了珍贵的回忆。"
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="text-center py-20">
            <div class="text-8xl mb-4">📜</div>
            <div class="text-3xl font-bold text-gray-500 mb-2">暂无历史记录</div>
            <div class="text-lg text-gray-400">{{ selectedStudent.name }} 还没有更换过高阶精灵</div>
            <div class="text-sm text-gray-400 mt-2">（只记录4阶及以上的精灵）</div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="advancedPets.length === 0 && viewMode !== 'history'" class="text-center py-20">
          <div class="text-8xl mb-4">📖</div>
          <div class="text-3xl font-bold text-gray-500 mb-2">图鉴空空如也</div>
          <div class="text-lg text-gray-400">还没有学生的精灵达到高级阶段</div>
          <div class="text-sm text-gray-400 mt-2">（需要达到青年期及以上）</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 卡片模式样式 */
.pokemon-card {
  perspective: 1000px;
  transition: transform 0.3s ease;
}

.pokemon-card:hover {
  transform: translateY(-10px);
}

.card-border {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 4px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px;
  border-radius: 16px 16px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-image {
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  min-height: 200px;
}

.card-info {
  background: white;
  padding: 16px;
}

.card-description {
  background: #f3f4f6;
  padding: 12px;
  border-radius: 0 0 16px 16px;
}

/* 徽章模式样式 */
.badge-container {
  transition: transform 0.3s ease;
}

.badge-container:hover {
  transform: scale(1.1);
}

.badge {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  margin: 0 auto;
}

.badge-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.5);
  animation: rotate 10s linear infinite;
}

.badge-icon {
  font-size: 4rem;
  animation: float 3s ease-in-out infinite;
}

.badge-stars {
  position: absolute;
  bottom: 10px;
  display: flex;
  gap: 2px;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
</style>
