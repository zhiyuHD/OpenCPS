<script setup>
import { ref, onMounted, computed } from 'vue';
import { getAllStudents, updateStudentPoints, getSetting, saveSetting } from '../db.js';
import { getStudentPetDisplay, isImageType } from '../petImageHelper.js';

const emit = defineEmits(['exit', 'dataUpdate']);

const students = ref([]);
const submittedStudents = ref(new Set());
const loading = ref(true);
const animatingStudent = ref(null);

// 🆕 批量选择功能
const selectedStudents = ref(new Set());
const showBatchPanel = ref(false);

// 🎨 精灵显示内容缓存
const petDisplays = ref({});

// 宠物进化阶段配置
const PET_STAGES = [
  { stage: 1, emoji: '🥚' },
  { stage: 2, emoji: '🐣' },
  { stage: 3, emoji: '🐥' },
  { stage: 4, emoji: '🐔' },
  { stage: 5, emoji: '🦅' },
  { stage: 6, emoji: '🐉' }
];

const getPetEmoji = (stage) => {
  return PET_STAGES.find(s => s.stage === stage)?.emoji || '🥚';
};

// 🎨 获取精灵显示内容（支持图片）
const getPetDisplayContent = async (student) => {
  if (!petDisplays.value[student.id]) {
    const display = await getStudentPetDisplay(student);
    petDisplays.value[student.id] = display;
  }
  return petDisplays.value[student.id];
};

// 左侧学生（未交作业）
const unsubmittedStudents = computed(() => {
  return students.value.filter(s => !submittedStudents.value.has(s.id));
});

// 右侧学生（已交作业）
const submittedStudentsComputed = computed(() => {
  return students.value.filter(s => submittedStudents.value.has(s.id));
});

// 🆕 批量操作相关
const toggleStudent = (studentId) => {
  if (selectedStudents.value.has(studentId)) {
    selectedStudents.value.delete(studentId);
  } else {
    selectedStudents.value.add(studentId);
  }
  showBatchPanel.value = selectedStudents.value.size > 0;
};

const toggleAll = () => {
  if (selectedStudents.value.size === unsubmittedStudents.value.length) {
    selectedStudents.value.clear();
  } else {
    unsubmittedStudents.value.forEach(s => selectedStudents.value.add(s.id));
  }
  showBatchPanel.value = selectedStudents.value.size > 0;
};

const invertSelection = () => {
  const newSelection = new Set();
  unsubmittedStudents.value.forEach(s => {
    if (!selectedStudents.value.has(s.id)) {
      newSelection.add(s.id);
    }
  });
  selectedStudents.value = newSelection;
  showBatchPanel.value = selectedStudents.value.size > 0;
};

const batchSubmit = async () => {
  if (selectedStudents.value.size === 0) {
    alert('请先选择学生');
    return;
  }
  
  const confirmed = confirm(`确定要为选中的 ${selectedStudents.value.size} 位学生批量签到吗？\n\n每人将获得 +10 积分`);
  if (!confirmed) return;
  
  try {
    // 批量提交
    for (const studentId of selectedStudents.value) {
      if (!submittedStudents.value.has(studentId)) {
        await updateStudentPoints(studentId, 10, '作业提交');
        submittedStudents.value.add(studentId);
      }
    }
    
    // 保存提交记录
    const submissionList = Array.from(submittedStudents.value);
    await saveSetting('dailySubmissions', JSON.stringify(submissionList));
    
    emit('dataUpdate');
    selectedStudents.value.clear();
    showBatchPanel.value = false;
    
    // 触发礼花特效
    triggerConfetti();
    
    alert('✅ 批量签到成功！');
  } catch (error) {
    alert('批量签到失败：' + error.message);
  }
};

const loadData = async () => {
  try {
    students.value = await getAllStudents();
    await loadTodaySubmissions();
    
    // 🎨 预加载所有精灵图片
    for (const student of students.value) {
      await getPetDisplayContent(student);
    }
    
    loading.value = false;
  } catch (error) {
    console.error('加载数据失败:', error);
    loading.value = false;
  }
};

// 加载今天的作业提交记录
const loadTodaySubmissions = async () => {
  const today = new Date().toDateString();
  const lastResetDate = await getSetting('dailySubmissionDate');
  
  // 如果不是今天，重置提交记录
  if (lastResetDate !== today) {
    await saveSetting('dailySubmissionDate', today);
    await saveSetting('dailySubmissions', JSON.stringify([]));
    submittedStudents.value.clear();
  } else {
    // 加载今天的提交记录
    const submissions = await getSetting('dailySubmissions');
    if (submissions) {
      const submissionList = JSON.parse(submissions);
      submittedStudents.value = new Set(submissionList);
    }
  }
};

// 触发礼花特效
const triggerConfetti = () => {
  const confetti = document.createElement('div');
  confetti.className = 'fixed inset-0 pointer-events-none z-50';
  confetti.innerHTML = '🎉🎊✨🌟💫⭐🎈🎁';
  document.body.appendChild(confetti);
  
  // 创建礼花动画
  const chars = confetti.textContent.split('');
  confetti.innerHTML = '';
  chars.forEach((char, i) => {
    const span = document.createElement('span');
    span.textContent = char;
    span.className = 'absolute text-4xl animate-confetti';
    span.style.left = Math.random() * 100 + '%';
    span.style.top = '-50px';
    span.style.animation = `confetti-fall ${2 + Math.random() * 1}s ease-in forwards`;
    span.style.animationDelay = (i * 0.1) + 's';
    confetti.appendChild(span);
  });
  
  setTimeout(() => confetti.remove(), 3000);
};

// 作业提交
const handleSubmit = async (student) => {
  if (submittedStudents.value.has(student.id)) {
    alert('该学生今天已经提交过作业了');
    return;
  }
  
  // 触发跳跃动画
  animatingStudent.value = student.id;
  
  setTimeout(async () => {
    try {
      // 发放提交奖励
      await updateStudentPoints(student.id, 10, '作业提交');
      
      // 记录提交
      submittedStudents.value.add(student.id);
      
      // 保存提交记录
      const submissionList = Array.from(submittedStudents.value);
      await saveSetting('dailySubmissions', JSON.stringify(submissionList));
      
      emit('dataUpdate');
      animatingStudent.value = null;
      
      // 触发礼花特效
      triggerConfetti();
      
      // 显示成功提示
      showSuccessToast(student.name);
    } catch (error) {
      alert('提交失败：' + error.message);
      animatingStudent.value = null;
    }
  }, 800);
};

const showSuccessToast = (name) => {
  const toast = document.createElement('div');
  toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-8 py-4 rounded-2xl shadow-2xl text-xl font-bold z-50 animate-bounce';
  toast.textContent = `${name} 作业已提交！+10分 ✅`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 2000);
};

const exitModule = () => {
  emit('exit');
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="fixed inset-0 z-50 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 overflow-hidden">
    <!-- 顶部导航栏 -->
    <div class="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg p-4 z-10">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="exitModule" class="btn-game bg-gradient-to-r from-gray-400 to-gray-500 text-sm">
            ← 返回主控台
          </button>
          <h1 class="text-3xl font-bold text-gray-800">🗂️ 精灵历险 - 作业检查器</h1>
        </div>
        <div class="flex items-center gap-4">
          <!-- 🆕 批量操作按钮 -->
          <button @click="toggleAll" class="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all">
            {{ selectedStudents.size === unsubmittedStudents.length ? '取消全选' : '全选' }}
          </button>
          <button @click="invertSelection" class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all">
            反选
          </button>
          <button 
            v-if="selectedStudents.size > 0"
            @click="batchSubmit" 
            class="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all animate-pulse"
          >
            批量签到 ({{ selectedStudents.size }}人)
          </button>
          <div class="text-lg font-bold text-blue-600">
            已提交: {{ submittedStudentsComputed.length }} / {{ students.length }}
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="relative w-full h-full pt-24 pb-8">
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="text-4xl text-gray-600">🌟 加载中...</div>
      </div>

      <div v-else class="h-full max-w-7xl mx-auto px-8 flex items-center">
        <div class="grid grid-cols-3 gap-8 w-full items-center">
          <!-- 左侧：未交作业 -->
          <div class="card-cute p-6 h-[600px] flex flex-col">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-2xl font-bold text-gray-800">
                📋 未交作业
              </h2>
              <div class="text-xl font-bold text-red-600">
                {{ unsubmittedStudents.length }}人
              </div>
            </div>

            <!-- 🆕 圆形勋章样式网格布局 -->
            <div class="flex-1 overflow-y-auto">
              <div class="grid grid-cols-4 gap-4">
                <div
                  v-for="student in unsubmittedStudents"
                  :key="student.id"
                  @click="handleSubmit(student)"
                  :class="[
                    'relative p-3 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:scale-105 border-2',
                    selectedStudents.has(student.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400',
                    animatingStudent === student.id ? 'animate-jump-right' : ''
                  ]"
                >
                  <!-- 复选框 -->
                  <input
                    type="checkbox"
                    :checked="selectedStudents.has(student.id)"
                    @click.stop="toggleStudent(student.id)"
                    class="absolute top-2 right-2 w-4 h-4 rounded z-10"
                  />
                  
                  <div class="flex flex-col items-center gap-2">
                    <!-- 🎨 圆形精灵头像 -->
                    <div class="relative w-16 h-16 rounded-full overflow-hidden border-4 border-purple-300 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                      <!-- 图片层 -->
                      <img 
                        v-if="petDisplays[student.id] && isImageType(petDisplays[student.id].type)"
                        :src="petDisplays[student.id].content"
                        :alt="student.petName || '精灵'"
                        class="w-full h-full object-cover"
                      />
                      <!-- Emoji占位符层 -->
                      <div 
                        v-else
                        class="text-4xl"
                      >
                        {{ getPetEmoji(student.petStage) }}
                      </div>
                    </div>
                    
                    <!-- 主人名 + 宠物名 -->
                    <div class="text-center">
                      <h3 class="text-sm font-bold text-gray-800 leading-tight">{{ student.name }}</h3>
                      <div class="text-xs text-purple-600 font-medium">{{ student.petName || '精灵' }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="unsubmittedStudents.length === 0" class="text-center py-20 text-gray-500">
                <div class="text-6xl mb-4">🎉</div>
                <div class="text-2xl font-bold">全员作业已提交！</div>
              </div>
            </div>
          </div>

          <!-- 中间：分割线 -->
          <div class="flex flex-col items-center justify-center">
            <div class="h-full w-1 bg-gradient-to-b from-blue-300 via-purple-400 to-pink-300 rounded-full"></div>
            <div class="text-center bg-blue-50 rounded-xl p-4 -mt-20">
              <div class="text-2xl font-bold text-blue-600 mb-2">精灵历险</div>
              <div class="text-sm text-blue-700">点击左侧精灵</div>
              <div class="text-sm text-blue-700">提交作业</div>
              <div class="text-lg font-bold text-green-600 mt-2">+10积分</div>
            </div>
          </div>

          <!-- 右侧：已交作业 -->
          <div class="card-cute p-6 h-[600px] flex flex-col bg-gradient-to-br from-green-50 to-emerald-50">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-2xl font-bold text-gray-800">
                ✅ 已交作业
              </h2>
              <div class="text-xl font-bold text-green-600">
                {{ submittedStudentsComputed.length }}人
              </div>
            </div>

            <!-- 🆕 圆形勋章样式网格布局 -->
            <div class="flex-1 overflow-y-auto">
              <div class="grid grid-cols-4 gap-4">
                <div
                  v-for="student in submittedStudentsComputed"
                  :key="student.id"
                  class="p-3 bg-white rounded-2xl shadow-md border-2 border-green-400"
                >
                  <div class="flex flex-col items-center gap-2">
                    <!-- 🎨 圆形精灵头像 -->
                    <div class="relative w-16 h-16 rounded-full overflow-hidden border-4 border-green-400 bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                      <!-- 图片层 -->
                      <img 
                        v-if="petDisplays[student.id] && isImageType(petDisplays[student.id].type)"
                        :src="petDisplays[student.id].content"
                        :alt="student.petName || '精灵'"
                        class="w-full h-full object-cover"
                      />
                      <!-- Emoji占位符层 -->
                      <div 
                        v-else
                        class="text-4xl"
                      >
                        {{ getPetEmoji(student.petStage) }}
                      </div>
                      
                      <!-- 绿色对勾标记 -->
                      <div class="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        ✓
                      </div>
                    </div>
                    
                    <!-- 主人名 + 宠物名 -->
                    <div class="text-center">
                      <h3 class="text-sm font-bold text-gray-800 leading-tight">{{ student.name }}</h3>
                      <div class="text-xs text-green-600 font-medium">{{ student.petName || '精灵' }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="submittedStudentsComputed.length === 0" class="text-center py-20 text-gray-500">
                <div class="text-6xl mb-4">📝</div>
                <div class="text-xl">暂无提交记录</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作提示 -->
    <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-8 py-4 rounded-2xl shadow-2xl">
      <div class="text-center">
        <div class="text-lg font-bold">💡 每日凌晨0点自动重置作业提交状态</div>
        <div class="text-sm opacity-90 mt-1">点击左侧学生卡片完成作业提交，获得10积分奖励</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes jump-right {
  0% { transform: translateX(0) translateY(0); }
  50% { transform: translateX(200px) translateY(-100px); }
  100% { transform: translateX(400px) translateY(0); opacity: 0; }
}

@keyframes confetti-fall {
  0% { 
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% { 
    transform: translateY(100vh) rotate(360deg);
    opacity: 0;
  }
}

.animate-jump-right {
  animation: jump-right 0.8s ease-out forwards;
}

.animate-confetti {
  animation: confetti-fall 2s ease-in forwards;
}
</style>
