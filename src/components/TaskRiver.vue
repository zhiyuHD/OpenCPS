<script setup>
import { ref, computed, onMounted } from 'vue';
import { getAllStudents, getAllTasks, getStudentTaskRecords, completeTask } from '../db.js';

const emit = defineEmits(['exit', 'dataUpdate']);

const students = ref([]);
const tasks = ref([]);
const selectedStudent = ref(null);
const studentTaskRecords = ref([]);
const showReward = ref(false);
const rewardText = ref('');
const jumpingTaskId = ref(null);

// 河流路径配置（5个任务）
const RIVER_PATH = [
  { x: 10, y: 70 },
  { x: 30, y: 50 },
  { x: 50, y: 60 },
  { x: 70, y: 40 },
  { x: 90, y: 55 }
];

// 加载数据
const loadData = async () => {
  students.value = await getAllStudents();
  tasks.value = await getAllTasks();
  if (students.value.length > 0) {
    selectedStudent.value = students.value[0];
    await loadStudentTasks();
  }
};

// 加载学生任务记录
const loadStudentTasks = async () => {
  if (!selectedStudent.value) return;
  studentTaskRecords.value = await getStudentTaskRecords(selectedStudent.value.id);
};

// 选择学生
const selectStudent = async (student) => {
  selectedStudent.value = student;
  await loadStudentTasks();
};

// 检查任务是否今天已完成
const isTaskCompletedToday = (taskId) => {
  const today = new Date().toDateString();
  return studentTaskRecords.value.some(record => 
    record.taskId === taskId && 
    new Date(record.completedDate).toDateString() === today
  );
};

// 完成任务
const handleCompleteTask = async (task, index) => {
  if (!selectedStudent.value) return;
  
  if (isTaskCompletedToday(task.id)) {
    alert('今天已完成此任务！');
    return;
  }

  try {
    const result = await completeTask(selectedStudent.value.id, task.id);
    
    if (!result.success) {
      alert(result.message);
      return;
    }

    // 显示跳跃动画
    jumpingTaskId.value = task.id;
    
    // 显示奖励提示
    rewardText.value = `任务完成 +${result.rewardPoints}分`;
    showReward.value = true;

    setTimeout(() => {
      showReward.value = false;
      jumpingTaskId.value = null;
    }, 2000);

    // 重新加载数据
    await loadData();
    emit('dataUpdate');

  } catch (error) {
    console.error('完成任务失败:', error);
  }
};

// 计算精灵位置
const elfPosition = computed(() => {
  if (!selectedStudent.value || tasks.value.length === 0) return RIVER_PATH[0];
  
  const completedCount = studentTaskRecords.value.filter(record => {
    const today = new Date().toDateString();
    return new Date(record.completedDate).toDateString() === today;
  }).length;

  const index = Math.min(completedCount, RIVER_PATH.length - 1);
  return RIVER_PATH[index];
});

// 退出
const exitModule = () => {
  emit('exit');
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="fixed inset-0 z-50 bg-gradient-to-b from-sky-300 via-blue-200 to-green-200 overflow-hidden">
    <!-- 顶部导航栏 -->
    <div class="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg p-4 z-10">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="exitModule" class="btn-game bg-gradient-to-r from-gray-400 to-gray-500 text-sm">
            ← 返回主控台
          </button>
          <h1 class="text-3xl font-bold text-gray-800">🌊 精灵过河任务</h1>
        </div>
        
        <!-- 学生选择器 -->
        <div class="flex items-center gap-2">
          <span class="text-gray-600">选择学生：</span>
          <select 
            v-model="selectedStudent" 
            @change="loadStudentTasks"
            class="px-4 py-2 rounded-lg border-2 border-blue-300 bg-white font-semibold text-gray-800 cursor-pointer"
          >
            <option v-for="student in students" :key="student.id" :value="student">
              {{ student.name }} ({{ student.group }})
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- 河流场景 -->
    <div class="relative w-full h-full pt-24">
      <!-- 河流背景 -->
      <div class="absolute inset-0">
        <!-- 波浪效果 -->
        <div class="wave wave1"></div>
        <div class="wave wave2"></div>
        <div class="wave wave3"></div>
      </div>

      <!-- 任务跳板路径 -->
      <div class="relative w-full h-full max-w-6xl mx-auto">
        <!-- 任务石头 -->
        <div 
          v-for="(task, index) in tasks.slice(0, 5)" 
          :key="task.id"
          :style="{ 
            position: 'absolute', 
            left: RIVER_PATH[index].x + '%', 
            top: RIVER_PATH[index].y + '%',
            transform: 'translate(-50%, -50%)'
          }"
          class="task-stone"
        >
          <!-- 石头 -->
          <div 
            :class="[
              'relative w-40 h-40 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300',
              isTaskCompletedToday(task.id) 
                ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/50' 
                : 'bg-gradient-to-br from-gray-300 to-gray-400 hover:scale-110 hover:shadow-xl',
              jumpingTaskId === task.id ? 'animate-jump' : ''
            ]"
            @click="handleCompleteTask(task, index)"
          >
            <!-- 任务内容 -->
            <div class="text-center p-4">
              <div class="text-4xl mb-2">
                {{ isTaskCompletedToday(task.id) ? '✅' : '📋' }}
              </div>
              <div class="text-sm font-bold text-gray-800">{{ task.name }}</div>
              <div class="text-xs text-gray-600 mt-1">+{{ task.rewardPoints }}分</div>
            </div>

            <!-- 完成标记 -->
            <div v-if="isTaskCompletedToday(task.id)" class="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-2 animate-bounce">
              <span class="text-2xl">⭐</span>
            </div>
          </div>

          <!-- 连接线 -->
          <svg 
            v-if="index < tasks.slice(0, 5).length - 1" 
            class="absolute top-1/2 left-full w-32 h-2 pointer-events-none"
            style="transform: translateY(-50%);"
          >
            <line 
              x1="0" y1="1" 
              :x2="(RIVER_PATH[index + 1].x - RIVER_PATH[index].x) * 6" 
              :y2="(RIVER_PATH[index + 1].y - RIVER_PATH[index].y) * 0.5" 
              stroke="#94a3b8" 
              stroke-width="3" 
              stroke-dasharray="5,5"
            />
          </svg>
        </div>

        <!-- 精灵角色 -->
        <div 
          v-if="selectedStudent"
          :style="{ 
            position: 'absolute', 
            left: elfPosition.x + '%', 
            top: elfPosition.y + '%',
            transform: 'translate(-50%, -50%)',
            transition: 'all 1s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
          }"
          class="elf-character"
        >
          <div class="relative">
            <!-- 精灵 -->
            <div class="text-7xl animate-float filter drop-shadow-lg">
              🧚‍♀️
            </div>
            
            <!-- 学生名字 -->
            <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 px-3 py-1 rounded-full text-sm font-bold text-gray-800 whitespace-nowrap shadow-lg">
              {{ selectedStudent.name }}
            </div>
          </div>
        </div>

        <!-- 终点旗帜 -->
        <div 
          :style="{ 
            position: 'absolute', 
            left: '95%', 
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }"
        >
          <div class="text-8xl animate-wave">🏁</div>
          <div class="text-center mt-2 text-xl font-bold text-gray-800">终点</div>
        </div>
      </div>

      <!-- 奖励提示 -->
      <div v-if="showReward" class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
        <div class="text-6xl font-bold text-green-500 animate-scaleIn drop-shadow-lg">
          {{ rewardText }}
        </div>
      </div>

      <!-- 进度统计 -->
      <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6">
        <div class="text-center">
          <div class="text-sm text-gray-600 mb-2">今日完成进度</div>
          <div class="text-4xl font-bold text-blue-600">
            {{ studentTaskRecords.filter(r => new Date(r.completedDate).toDateString() === new Date().toDateString()).length }} / {{ tasks.slice(0, 5).length }}
          </div>
          <div class="text-xs text-gray-500 mt-2">点击石头完成任务</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

@keyframes wave {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

@keyframes jump {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -70%) scale(1.2); }
}

@keyframes scaleIn {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

.animate-wave {
  animation: wave 2s ease-in-out infinite;
}

.animate-jump {
  animation: jump 0.6s ease-in-out;
}

.animate-scaleIn {
  animation: scaleIn 0.5s ease-out;
}

/* 波浪效果 */
.wave {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 200%;
  height: 100px;
  background: linear-gradient(to right, rgba(59, 130, 246, 0.3), rgba(96, 165, 250, 0.3));
  animation: wave-animation 10s linear infinite;
}

.wave1 {
  opacity: 0.3;
  animation-duration: 8s;
}

.wave2 {
  opacity: 0.2;
  animation-duration: 12s;
  animation-delay: -2s;
}

.wave3 {
  opacity: 0.1;
  animation-duration: 15s;
  animation-delay: -4s;
}

@keyframes wave-animation {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.task-stone {
  z-index: 5;
}

.elf-character {
  z-index: 10;
}
</style>
