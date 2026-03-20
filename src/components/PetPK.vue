<script setup>
import { ref, onMounted, computed } from 'vue';
import { getAllStudents, createPKBattle, completePKBattle } from '../db.js';
import { getPetDisplay, isImageType } from '../petImageHelper.js';

const emit = defineEmits(['exit', 'dataUpdate']);

const students = ref([]);
const player1 = ref(null);
const player2 = ref(null);
const battleStarted = ref(false);
const currentQuestion = ref(null);
const player1Answer = ref(null);
const player2Answer = ref(null);
const player1HP = ref(100);
const player2HP = ref(100);
const countdown = ref(10);
const countdownInterval = ref(null);
const battleResult = ref(null);
const showResult = ref(false);
const attackingPlayer = ref(null);
const winnerEmotion = ref(null); // 'win' or 'lose' for each player

// 宠物图片缓存
const petDisplayCache = ref({});

// 题库
const questions = [
  {
    question: '下列哪些是水果？',
    options: ['苹果', '西红柿', '黄瓜', '香蕉'],
    correctAnswers: [0, 3], // 多选
    type: 'multiple'
  },
  {
    question: '3 × 7 = ?',
    options: ['18', '21', '24', '28'],
    correctAnswers: [1],
    type: 'single'
  },
  {
    question: '下列哪个是中国的首都？',
    options: ['上海', '北京', '广州', '深圳'],
    correctAnswers: [1],
    type: 'single'
  },
  {
    question: '下列哪些是偶数？',
    options: ['2', '3', '4', '5'],
    correctAnswers: [0, 2],
    type: 'multiple'
  }
];

const PET_EMOJIS = ['🥚', '🐣', '🐥', '🐔', '🦅', '🐉'];

const getPetEmoji = (stage) => {
  return PET_EMOJIS[stage - 1] || '🥚';
};

const loadData = async () => {
  students.value = await getAllStudents();
  
  // 预加载所有学生的宠物图片（支持静态图片）
  for (const student of students.value) {
    const display = await getPetDisplay(student.petTypeId, student.petStage, student.petName);
    petDisplayCache.value[student.id] = display;
  }
};

// 获取宠物显示内容
const getPetDisplayContent = (studentId) => {
  return petDisplayCache.value[studentId] || { type: 'emoji', content: '🥚' };
};

const selectPlayer = (player, student) => {
  if (player === 1) {
    player1.value = student;
  } else {
    player2.value = student;
  }
};

const startBattle = () => {
  if (!player1.value || !player2.value) {
    alert('请选择两位对战选手');
    return;
  }
  
  if (player1.value.id === player2.value.id) {
    alert('不能选择同一个学生');
    return;
  }
  
  battleStarted.value = true;
  player1HP.value = 100;
  player2HP.value = 100;
  player1Answer.value = null;
  player2Answer.value = null;
  battleResult.value = null;
  showResult.value = false;
  
  // 随机选择题目
  currentQuestion.value = questions[Math.floor(Math.random() * questions.length)];
  
  // 开始倒计时
  countdown.value = 10;
  countdownInterval.value = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownInterval.value);
      checkAnswers();
    }
  }, 1000);
};

const selectAnswer = (player, index) => {
  if (player === 1) {
    if (currentQuestion.value.type === 'multiple') {
      if (!player1Answer.value) player1Answer.value = [];
      const idx = player1Answer.value.indexOf(index);
      if (idx > -1) {
        player1Answer.value.splice(idx, 1);
      } else {
        player1Answer.value.push(index);
      }
    } else {
      player1Answer.value = [index];
    }
  } else {
    if (currentQuestion.value.type === 'multiple') {
      if (!player2Answer.value) player2Answer.value = [];
      const idx = player2Answer.value.indexOf(index);
      if (idx > -1) {
        player2Answer.value.splice(idx, 1);
      } else {
        player2Answer.value.push(index);
      }
    } else {
      player2Answer.value = [index];
    }
  }
};

const isAnswerSelected = (player, index) => {
  const answer = player === 1 ? player1Answer.value : player2Answer.value;
  return answer && answer.includes(index);
};

const checkAnswers = async () => {
  clearInterval(countdownInterval.value);
  
  const correctAnswers = currentQuestion.value.correctAnswers;
  
  // 检查答案
  const player1Correct = player1Answer.value && 
    player1Answer.value.length === correctAnswers.length &&
    player1Answer.value.every(a => correctAnswers.includes(a));
    
  const player2Correct = player2Answer.value && 
    player2Answer.value.length === correctAnswers.length &&
    player2Answer.value.every(a => correctAnswers.includes(a));
  
  // 攻击动画
  if (player1Correct && !player2Correct) {
    attackingPlayer.value = 1;
    setTimeout(() => {
      player2HP.value = Math.max(0, player2HP.value - 30);
      attackingPlayer.value = null;
    }, 500);
  } else if (player2Correct && !player1Correct) {
    attackingPlayer.value = 2;
    setTimeout(() => {
      player1HP.value = Math.max(0, player1HP.value - 30);
      attackingPlayer.value = null;
    }, 500);
  }
  
  // 判断胜负
  setTimeout(async () => {
    if (player1HP.value <= 0 || player2HP.value <= 0) {
      const winner = player1HP.value > player2HP.value ? player1.value : player2.value;
      
      // 显示胜负表情
      winnerEmotion.value = {
        player1: player1HP.value > player2HP.value ? 'win' : 'lose',
        player2: player2HP.value > player1HP.value ? 'win' : 'lose'
      };
      
      battleResult.value = {
        winner,
        player1Correct,
        player2Correct
      };
      showResult.value = true;
      
      // 记录对战并发放奖励
      await completePKBattle(0, winner.id, 20);
      emit('dataUpdate');
    } else {
      // 继续下一回合
      setTimeout(() => {
        player1Answer.value = null;
        player2Answer.value = null;
        currentQuestion.value = questions[Math.floor(Math.random() * questions.length)];
        countdown.value = 10;
        countdownInterval.value = setInterval(() => {
          countdown.value--;
          if (countdown.value <= 0) {
            clearInterval(countdownInterval.value);
            checkAnswers();
          }
        }, 1000);
      }, 2000);
    }
  }, 1000);
};

// 一键出结果
const quickFinish = async () => {
  if (!battleStarted.value || showResult.value) return;
  
  clearInterval(countdownInterval.value);
  
  // 随机决定胜负（50%概率）
  const randomWinner = Math.random() > 0.5 ? player1.value : player2.value;
  
  // 显示胜负表情
  winnerEmotion.value = {
    player1: randomWinner.id === player1.value.id ? 'win' : 'lose',
    player2: randomWinner.id === player2.value.id ? 'win' : 'lose'
  };
  
  battleResult.value = {
    winner: randomWinner,
    player1Correct: false,
    player2Correct: false
  };
  showResult.value = true;
  
  // 记录对战并发放奖励
  await completePKBattle(0, randomWinner.id, 20);
  emit('dataUpdate');
};

const resetBattle = () => {
  battleStarted.value = false;
  player1.value = null;
  player2.value = null;
  showResult.value = false;
  winnerEmotion.value = null;
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value);
  }
};

const exitModule = () => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value);
  }
  emit('exit');
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="fixed inset-0 z-50 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 overflow-hidden">
    <!-- 顶部导航栏 -->
    <div class="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg p-4 z-10">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="exitModule" class="btn-game bg-gradient-to-r from-gray-400 to-gray-500 text-sm">
            ← 返回主控台
          </button>
          <h1 class="text-3xl font-bold text-gray-800">⚔️ 精灵PK对战</h1>
        </div>
      </div>
    </div>

    <!-- 选手选择界面 -->
    <div v-if="!battleStarted" class="relative w-full h-full pt-24 pb-8 overflow-y-auto">
      <div class="max-w-7xl mx-auto px-8 overflow-y-auto">
        <div class="card-cute p-8 mb-6 text-center">
          <h2 class="text-4xl font-bold text-gray-800 mb-4">选择对战选手</h2>
          <p class="text-lg text-gray-600">请选择两位学生进行PK对战</p>
        </div>

        <div class="grid grid-cols-2 gap-8 mb-8">
          <!-- 选手1 -->
          <div class="card-cute p-6">
            <h3 class="text-2xl font-bold text-blue-600 mb-4 text-center">选手1</h3>
            
            <div v-if="player1" class="text-center mb-4">
              <div class="mb-4">
                <img 
                  v-if="isImageType(getPetDisplayContent(player1.id).type)"
                  :src="getPetDisplayContent(player1.id).content"
                  class="w-32 h-32 mx-auto object-contain"
                  alt="宠物"
                />
                <div v-else class="text-8xl">{{ getPetDisplayContent(player1.id).content }}</div>
              </div>
              <div class="text-3xl font-bold text-gray-800">{{ player1.name }}</div>
              <div class="text-lg text-gray-600">{{ player1.group }}</div>
              <div class="text-xl text-amber-600 mt-2">{{ player1.totalPoints }}分</div>
            </div>
            
            <div class="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              <button
                v-for="student in students"
                :key="student.id"
                @click="selectPlayer(1, student)"
                :class="[
                  'p-3 rounded-lg transition-all',
                  player1?.id === student.id 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white hover:bg-blue-100'
                ]"
              >
                <div class="text-2xl">{{ getPetEmoji(student.petStage) }}</div>
                <div class="text-sm font-bold">{{ student.name }}</div>
              </button>
            </div>
          </div>

          <!-- 选手2 -->
          <div class="card-cute p-6">
            <h3 class="text-2xl font-bold text-red-600 mb-4 text-center">选手2</h3>
            
            <div v-if="player2" class="text-center mb-4">
              <div class="mb-4">
                <img 
                  v-if="isImageType(getPetDisplayContent(player2.id).type)"
                  :src="getPetDisplayContent(player2.id).content"
                  class="w-32 h-32 mx-auto object-contain"
                  alt="宠物"
                />
                <div v-else class="text-8xl">{{ getPetDisplayContent(player2.id).content }}</div>
              </div>
              <div class="text-3xl font-bold text-gray-800">{{ player2.name }}</div>
              <div class="text-lg text-gray-600">{{ player2.group }}</div>
              <div class="text-xl text-amber-600 mt-2">{{ player2.totalPoints }}分</div>
            </div>
            
            <div class="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              <button
                v-for="student in students"
                :key="student.id"
                @click="selectPlayer(2, student)"
                :class="[
                  'p-3 rounded-lg transition-all',
                  player2?.id === student.id 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white hover:bg-red-100'
                ]"
              >
                <div class="text-2xl">{{ getPetEmoji(student.petStage) }}</div>
                <div class="text-sm font-bold">{{ student.name }}</div>
              </button>
            </div>
          </div>
        </div>

        <div class="text-center">
          <button
            @click="startBattle"
            :disabled="!player1 || !player2"
            class="px-12 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold text-2xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⚔️ 开始对战
          </button>
        </div>
      </div>
    </div>

    <!-- 对战界面 -->
    <div v-else class="relative w-full h-full pt-24 pb-8 overflow-y-auto">
      <!-- 对战舞台 -->
      <div class="max-w-7xl mx-auto px-8 h-full flex flex-col overflow-y-auto">
        <!-- 精灵对战区 -->
        <div class="grid grid-cols-2 gap-8 mb-6">
          <!-- 选手1精灵 -->
          <div class="card-cute p-6">
            <div class="text-center relative">
              <div class="text-2xl font-bold text-blue-600 mb-2">{{ player1.name }}</div>
              
              <!-- 胜负表情 -->
              <div v-if="winnerEmotion && winnerEmotion.player1 === 'win'" class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8 text-6xl animate-bounce z-10">
                😎
              </div>
              <div v-if="winnerEmotion && winnerEmotion.player1 === 'lose'" class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8 text-6xl animate-shake z-10">
                😭
              </div>
              
              <div 
                :class="[
                  'mb-4 transition-all duration-300',
                  attackingPlayer === 1 ? 'animate-attack-right' : '',
                  attackingPlayer === 2 ? 'animate-shake' : '',
                  winnerEmotion?.player1 === 'lose' ? 'opacity-50 grayscale' : ''
                ]"
              >
                <img 
                  v-if="isImageType(getPetDisplayContent(player1.id).type)"
                  :src="getPetDisplayContent(player1.id).content"
                  class="w-48 h-48 mx-auto object-contain"
                  alt="宠物"
                />
                <div v-else class="text-9xl">{{ getPetDisplayContent(player1.id).content }}</div>
              </div>
              
              <!-- HP血条 -->
              <div class="mb-2">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-bold text-gray-700">HP</span>
                  <span class="text-sm font-bold text-blue-600">{{ player1HP }}/100</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    :class="[
                      'h-full transition-all duration-500',
                      player1HP > 50 ? 'bg-green-500' : player1HP > 20 ? 'bg-yellow-500' : 'bg-red-500'
                    ]"
                    :style="{ width: player1HP + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 选手2精灵 -->
          <div class="card-cute p-6">
            <div class="text-center relative">
              <div class="text-2xl font-bold text-red-600 mb-2">{{ player2.name }}</div>
              
              <!-- 胜负表情 -->
              <div v-if="winnerEmotion && winnerEmotion.player2 === 'win'" class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8 text-6xl animate-bounce z-10">
                😎
              </div>
              <div v-if="winnerEmotion && winnerEmotion.player2 === 'lose'" class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8 text-6xl animate-shake z-10">
                😭
              </div>
              
              <div 
                :class="[
                  'mb-4 transition-all duration-300',
                  attackingPlayer === 2 ? 'animate-attack-left' : '',
                  attackingPlayer === 1 ? 'animate-shake' : '',
                  winnerEmotion?.player2 === 'lose' ? 'opacity-50 grayscale' : ''
                ]"
              >
                <img 
                  v-if="isImageType(getPetDisplayContent(player2.id).type)"
                  :src="getPetDisplayContent(player2.id).content"
                  class="w-48 h-48 mx-auto object-contain"
                  alt="宠物"
                />
                <div v-else class="text-9xl">{{ getPetDisplayContent(player2.id).content }}</div>
              </div>
              
              <!-- HP血条 -->
              <div class="mb-2">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-bold text-gray-700">HP</span>
                  <span class="text-sm font-bold text-red-600">{{ player2HP }}/100</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    :class="[
                      'h-full transition-all duration-500',
                      player2HP > 50 ? 'bg-green-500' : player2HP > 20 ? 'bg-yellow-500' : 'bg-red-500'
                    ]"
                    :style="{ width: player2HP + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 题目区 -->
        <div class="card-cute p-6 mb-6 text-center">
          <div class="flex items-center justify-center gap-4 mb-4">
            <div class="text-6xl font-bold text-red-600">{{ countdown }}</div>
            <div class="text-2xl font-bold text-gray-800">秒</div>
          </div>
          
          <h3 class="text-3xl font-bold text-gray-800 mb-2">{{ currentQuestion.question }}</h3>
          <p class="text-sm text-gray-600">{{ currentQuestion.type === 'multiple' ? '(多选题)' : '(单选题)' }}</p>
          
          <!-- 一键出结果按钮 -->
          <button 
            @click="quickFinish"
            class="mt-4 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all"
          >
            ⚡ 一键出结果
          </button>
        </div>

        <!-- 作答区 -->
        <div class="grid grid-cols-2 gap-8 flex-1">
          <!-- 选手1作答区 -->
          <div class="card-cute p-6 bg-blue-50">
            <h4 class="text-xl font-bold text-blue-600 mb-4 text-center">{{ player1.name }} 的答案</h4>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="(option, index) in currentQuestion.options"
                :key="index"
                @click="selectAnswer(1, index)"
                :class="[
                  'p-4 rounded-xl font-bold text-lg transition-all',
                  isAnswerSelected(1, index)
                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 hover:bg-blue-100'
                ]"
              >
                {{ String.fromCharCode(65 + index) }}. {{ option }}
              </button>
            </div>
          </div>

          <!-- 选手2作答区 -->
          <div class="card-cute p-6 bg-red-50">
            <h4 class="text-xl font-bold text-red-600 mb-4 text-center">{{ player2.name }} 的答案</h4>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="(option, index) in currentQuestion.options"
                :key="index"
                @click="selectAnswer(2, index)"
                :class="[
                  'p-4 rounded-xl font-bold text-lg transition-all',
                  isAnswerSelected(2, index)
                    ? 'bg-red-500 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 hover:bg-red-100'
                ]"
              >
                {{ String.fromCharCode(65 + index) }}. {{ option }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 对战结果弹窗 -->
    <div v-if="showResult" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div class="bg-white rounded-3xl p-12 max-w-2xl w-full mx-4 shadow-2xl text-center animate-scaleIn">
        <div class="text-9xl mb-6">🏆</div>
        <h2 class="text-5xl font-bold text-gray-800 mb-4">对战结束！</h2>
        
        <div class="mb-6">
          <img 
            v-if="isImageType(getPetDisplayContent(battleResult.winner.id).type)"
            :src="getPetDisplayContent(battleResult.winner.id).content"
            class="w-48 h-48 mx-auto object-contain"
            alt="获胜宠物"
          />
          <div v-else class="text-8xl">{{ getPetDisplayContent(battleResult.winner.id).content }}</div>
        </div>
        <p class="text-4xl font-bold text-purple-600 mb-6">{{ battleResult.winner.name }} 获胜！</p>
        <p class="text-xl text-gray-600 mb-8">获得 20 积分奖励</p>
        
        <div class="flex gap-4 justify-center">
          <button
            @click="resetBattle"
            class="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all"
          >
            再来一局
          </button>
          
          <button
            @click="exitModule"
            class="px-8 py-3 bg-gray-300 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-400 transition-all"
          >
            返回主控台
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes attack-right {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(50px); }
}

@keyframes attack-left {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-50px); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

@keyframes scaleIn {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-attack-right {
  animation: attack-right 0.5s ease-out;
}

.animate-attack-left {
  animation: attack-left 0.5s ease-out;
}

.animate-shake {
  animation: shake 0.5s ease-out;
}

.animate-scaleIn {
  animation: scaleIn 0.5s ease-out;
}

/* 失败者变灰 */
.grayscale {
  filter: grayscale(100%);
}
</style>
