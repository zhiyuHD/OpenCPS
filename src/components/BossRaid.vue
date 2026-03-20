<script setup>
import { ref, computed, onMounted } from 'vue';
import { getAllBosses, getBossQuestions, hasChallengeBossToday, recordBossChallenge, getAllPetTypes } from '../db.js';
import { calculateMultiplier } from '../utils/elementLogic.js';
import { audioSynthesizer } from '../audioSynthesizer.js';
import { getPetDisplay, getBossDisplay, isImageType } from '../petImageHelper.js';

const props = defineProps({
  student: Object
});

const emit = defineEmits(['close', 'success']);

const bosses = ref([]);
const petTypes = ref([]);
const selectedBoss = ref(null);
const showBattle = ref(false);
const questions = ref([]);
const currentQuestionIndex = ref(0);
const bossHp = ref(10);
const wrongCount = ref(0);
const battleResult = ref(null);
const hasChallengedToday = ref(false);
const selectedAnswer = ref(null);
const studentPetDisplay = ref(null); // 学生宠物图片
const bossImageUrl = ref(null); // Boss图片
const attackingPlayer = ref(null); // 'student' or 'boss'

// 16种属性定义
const ELEMENTS = [
  { id: 'fire', name: '火', emoji: '🔥' },
  { id: 'water', name: '水', emoji: '💧' },
  { id: 'wood', name: '木', emoji: '🌳' },
  { id: 'thunder', name: '雷', emoji: '⚡' },
  { id: 'ice', name: '冰', emoji: '❄️' },
  { id: 'holy', name: '圣', emoji: '✝️' },
  { id: 'metal', name: '金', emoji: '⚙️' },
  { id: 'earth', name: '土', emoji: '🪨' },
  { id: 'dark', name: '魔', emoji: '😈' },
  { id: 'demon', name: '妖', emoji: '👹' },
  { id: 'wind', name: '风', emoji: '🌪️' },
  { id: 'poison', name: '毒', emoji: '☠️' },
  { id: 'illusion', name: '幻', emoji: '✨' },
  { id: 'wing', name: '翼', emoji: '🦅' },
  { id: 'machine', name: '机械', emoji: '🤖' },
  { id: 'spirit', name: '灵', emoji: '👻' }
];

// 获取学生的精灵属性
const studentElement = computed(() => {
  const petType = petTypes.value.find(p => p.id === props.student?.petTypeId);
  return petType?.element || 'fire';
});

// 获取属性信息
const getElementInfo = (elementId) => {
  return ELEMENTS.find(e => e.id === elementId) || ELEMENTS[0];
};

// 可挑战的Boss（只能挑战被克制的）
const challengeableBosses = computed(() => {
  return bosses.value.map(boss => {
    const multiplier = calculateMultiplier(studentElement.value, boss.element);
    return {
      ...boss,
      canChallenge: multiplier > 1,
      multiplier
    };
  });
});

// 当前题目
const currentQuestion = computed(() => {
  return questions.value[currentQuestionIndex.value];
});

const loadData = async () => {
  bosses.value = await getAllBosses();
  petTypes.value = await getAllPetTypes();
  hasChallengedToday.value = await hasChallengeBossToday(props.student.id);
};

const selectBoss = async (boss) => {
  if (!boss.canChallenge) {
    audioSynthesizer.playFail();
    alert('❌ 你的精灵无法克制这个Boss！');
    return;
  }
  if (hasChallengedToday.value) {
    audioSynthesizer.playFail();
    alert('❌ 今天已经挑战过Boss了，明天再来吧！');
    return;
  }
  selectedBoss.value = boss;
  await startBattle();
};

const startBattle = async () => {
  // 从数据库读取题库
  const dbQuestions = await getBossQuestions(selectedBoss.value.id);
  
  if (dbQuestions.length === 0) {
    // 如果没有题目，使用模拟题库
    questions.value = generateMockQuestions(10);
  } else {
    // 随机抽取10道题
    const shuffled = [...dbQuestions].sort(() => Math.random() - 0.5);
    questions.value = shuffled.slice(0, Math.min(10, shuffled.length));
  }
  
  // 加载学生宠物图片（支持静态图片）
  studentPetDisplay.value = await getPetDisplay(props.student.petTypeId, props.student.petStage, props.student.petName);
  
  // 加载Boss图片（三级降级：静态图片 → Base64 → 巨型Emoji）
  const bossDisplay = await getBossDisplay(selectedBoss.value.name, selectedBoss.value.emoji);
  bossImageUrl.value = isImageType(bossDisplay.type) ? bossDisplay.content : (selectedBoss.value.imageBase64 || null);
  
  bossHp.value = 10;
  wrongCount.value = 0;
  currentQuestionIndex.value = 0;
  battleResult.value = null;
  selectedAnswer.value = null;
  attackingPlayer.value = null;
  showBattle.value = true;
  audioSynthesizer.playBattleStart();
};

const generateMockQuestions = (count) => {
  const mockQuestions = [
    { question: '1+1=?', options: ['1', '2', '3', '4'], correctAnswer: 1 },
    { question: '2+2=?', options: ['2', '3', '4', '5'], correctAnswer: 2 },
    { question: '3+3=?', options: ['5', '6', '7', '8'], correctAnswer: 1 },
    { question: '5+5=?', options: ['8', '9', '10', '11'], correctAnswer: 2 },
    { question: '10-3=?', options: ['6', '7', '8', '9'], correctAnswer: 1 },
    { question: '8-2=?', options: ['4', '5', '6', '7'], correctAnswer: 2 },
    { question: '4×2=?', options: ['6', '7', '8', '9'], correctAnswer: 2 },
    { question: '3×3=?', options: ['6', '8', '9', '12'], correctAnswer: 2 },
    { question: '12÷3=?', options: ['3', '4', '5', '6'], correctAnswer: 1 },
    { question: '20÷5=?', options: ['3', '4', '5', '6'], correctAnswer: 1 }
  ];
  return mockQuestions.slice(0, count);
};

const answerQuestion = (answerIndex) => {
  if (selectedAnswer.value !== null) return; // 防止重复点击
  
  selectedAnswer.value = answerIndex;
  const correct = answerIndex === currentQuestion.value.correctAnswer;
  
  if (correct) {
    // 答对了，学生攻击Boss
    attackingPlayer.value = 'student';
    audioSynthesizer.playBattleHit();
    
    setTimeout(() => {
      bossHp.value--;
      attackingPlayer.value = null;
      
      if (bossHp.value <= 0) {
        // 胜利
        finishBattle(true);
      } else {
        // 下一题
        setTimeout(() => {
          currentQuestionIndex.value++;
          selectedAnswer.value = null;
        }, 500);
      }
    }, 800);
  } else {
    // 答错了，Boss攻击学生
    attackingPlayer.value = 'boss';
    audioSynthesizer.playFail();
    
    setTimeout(() => {
      wrongCount.value++;
      attackingPlayer.value = null;
      
      if (wrongCount.value >= 2) {
        // 失败
        finishBattle(false);
      } else {
        // 继续下一题
        setTimeout(() => {
          alert('❌ 答错了！还有1次机会！');
          currentQuestionIndex.value++;
          selectedAnswer.value = null;
        }, 500);
      }
    }, 800);
  }
};

const finishBattle = async (success) => {
  const score = 10 - bossHp.value;
  
  // 记录挑战
  const result = await recordBossChallenge(props.student.id, selectedBoss.value.id, success, score);
  
  if (success) {
    audioSynthesizer.playLevelUp();
    battleResult.value = {
      success: true,
      message: `🎉 恭喜${props.student.name}击败了${selectedBoss.value.name}！`,
      expReward: result.expReward || 50,
      badge: selectedBoss.value.element,
      levelUp: result.newStage > result.oldStage,
      isNewBadge: result.isNewBadge // 是否是新获得的勋章
    };
  } else {
    audioSynthesizer.playFail();
    battleResult.value = {
      success: false,
      message: `😢 ${props.student.name}挑战失败了...`,
      score
    };
  }
};

const backToSelection = () => {
  showBattle.value = false;
  selectedBoss.value = null;
  selectedAnswer.value = null;
};

const closeAndRefresh = () => {
  emit('success');
  emit('close');
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="fixed inset-0 z-50 bg-gradient-to-br from-purple-900 via-red-900 to-orange-900 overflow-hidden">
    <!-- Boss选择界面 -->
    <div v-if="!showBattle && !battleResult" class="w-full h-full overflow-y-auto">
      <!-- 顶部导航 -->
      <div class="bg-black/50 backdrop-blur-sm p-6 sticky top-0 z-10">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <button @click="emit('close')" class="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-bold hover:shadow-lg transition-all">
            ← 返回
          </button>
          <h1 class="text-4xl font-bold text-white drop-shadow-2xl">⚔️ Boss副本大厅</h1>
          <div class="w-32"></div>
        </div>
      </div>

      <!-- 学生信息卡 -->
      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
          <div class="flex items-center gap-6">
            <div class="text-6xl">{{ getElementInfo(studentElement).emoji }}</div>
            <div>
              <h2 class="text-3xl font-bold text-white mb-2">{{ student.name }}的挑战</h2>
              <p class="text-xl text-white/80">精灵属性：{{ getElementInfo(studentElement).emoji }} {{ getElementInfo(studentElement).name }}系</p>
              <p class="text-lg text-yellow-300 mt-2">{{ hasChallengedToday ? '❌ 今日已挑战' : '✅ 今日可挑战' }}</p>
            </div>
          </div>
        </div>

        <!-- Boss网格 -->
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
          <div 
            v-for="boss in challengeableBosses" 
            :key="boss.id"
            @click="selectBoss(boss)"
            :class="[
              'relative rounded-2xl p-6 transition-all cursor-pointer',
              boss.canChallenge ? 'bg-gradient-to-br from-red-500 to-orange-500 hover:scale-110 hover:shadow-2xl' : 'bg-gray-600/50 opacity-50 cursor-not-allowed'
            ]"
          >
            <!-- 锁定图标 -->
            <div v-if="!boss.canChallenge" class="absolute top-2 right-2 text-3xl">🔒</div>
            
            <div class="text-center">
              <div class="text-6xl mb-3">{{ boss.emoji }}</div>
              <h3 class="text-sm font-bold text-white mb-1">{{ boss.name }}</h3>
              <p class="text-xs text-white/70">{{ getElementInfo(boss.element).emoji }} {{ getElementInfo(boss.element).name }}系</p>
              <div v-if="boss.canChallenge" class="mt-2 text-xs font-bold text-yellow-300">
                ⚡ 可克制 ×{{ boss.multiplier }}
              </div>
            </div>
          </div>
        </div>

        <!-- 规则说明 -->
        <div class="bg-white/10 backdrop-blur-md rounded-2xl p-6 mt-8">
          <h3 class="text-2xl font-bold text-white mb-4">📜 挑战规则</h3>
          <ul class="space-y-2 text-white/90 text-lg">
            <li>• 每天只能挑战1次Boss</li>
            <li>• 只能挑战被你的精灵克制的Boss（属性相克）</li>
            <li>• Boss有10点血量，答对1题扣1点血</li>
            <li>• 答错2次挑战失败</li>
            <li>• 击败Boss获得50点经验和专属勋章</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 答题战斗界面 - RPG左右对峙布局 -->
    <div v-else-if="showBattle && !battleResult" class="w-full h-full flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-red-900">
      <!-- 顶部返回按钮 -->
      <div class="absolute top-4 left-4 z-20">
        <button @click="backToSelection" class="px-4 py-2 bg-gray-600/80 text-white rounded-lg font-bold hover:bg-gray-700 transition-all backdrop-blur-sm">
          ← 返回
        </button>
      </div>

      <!-- 战斗舞台 - 左右对峙 -->
      <div class="flex-1 grid grid-cols-2 gap-8 p-8">
        <!-- 左侧：学生宠物 -->
        <div class="flex flex-col items-center justify-center">
          <div class="bg-white/10 backdrop-blur-md rounded-3xl p-8 w-full max-w-md">
            <!-- 宠物名字 -->
            <h3 class="text-3xl font-bold text-white text-center mb-4">
              {{ student.name }}的精灵
            </h3>
            
            <!-- 宠物立绘 -->
            <div 
              :class="[
                'relative mb-6 transition-all duration-300',
                attackingPlayer === 'student' ? 'animate-attack-right scale-110' : ''
              ]"
            >
              <img 
                v-if="isImageType(studentPetDisplay?.type)"
                :src="studentPetDisplay.content"
                class="w-full h-80 object-contain drop-shadow-2xl"
                alt="学生宠物"
              />
              <div v-else class="text-[12rem] text-center drop-shadow-2xl">
                {{ studentPetDisplay?.content || '🐉' }}
              </div>
            </div>
            
            <!-- 属性标签 -->
            <div class="text-center">
              <span class="inline-block px-6 py-2 bg-blue-500 text-white rounded-full font-bold text-lg">
                {{ getElementInfo(studentElement).emoji }} {{ getElementInfo(studentElement).name }}系
              </span>
            </div>
          </div>
        </div>

        <!-- 右侧：Boss -->
        <div class="flex flex-col items-center justify-center">
          <div class="bg-white/10 backdrop-blur-md rounded-3xl p-8 w-full max-w-md">
            <!-- Boss名字 -->
            <h3 class="text-3xl font-bold text-red-400 text-center mb-4">
              {{ selectedBoss.name }}
            </h3>
            
            <!-- Boss立绘 -->
            <div 
              :class="[
                'relative mb-6 transition-all duration-300',
                attackingPlayer === 'boss' ? 'animate-attack-left scale-110' : '',
                attackingPlayer === 'student' ? 'animate-shake-boss' : ''
              ]"
            >
              <img 
                v-if="bossImageUrl"
                :src="bossImageUrl"
                class="w-full h-80 object-contain drop-shadow-2xl"
                alt="Boss"
              />
              <div v-else class="text-[12rem] text-center drop-shadow-2xl">
                {{ selectedBoss.emoji }}
              </div>
            </div>
            
            <!-- Boss血量条 -->
            <div class="mb-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-white font-bold text-lg">Boss HP</span>
                <span class="text-red-400 font-bold text-xl">{{ bossHp }}/10</span>
              </div>
              <div class="w-full bg-gray-700 rounded-full h-6 overflow-hidden border-2 border-red-500">
                <div 
                  class="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-500 flex items-center justify-center"
                  :style="{ width: `${(bossHp / 10) * 100}%` }"
                >
                  <span class="text-white font-bold text-sm">❤️</span>
                </div>
              </div>
            </div>
            
            <!-- 错误次数 -->
            <div class="text-center">
              <span class="text-yellow-300 text-lg font-bold">
                ❌ 错误次数: {{ wrongCount }}/2
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部答题面板 -->
      <div class="absolute bottom-0 left-0 right-0 p-6">
        <div class="max-w-5xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl">
          <!-- 题目 -->
          <div class="mb-4 text-center">
            <div class="text-sm text-gray-500 mb-2">第 {{ currentQuestionIndex + 1 }}/{{ questions.length }} 题</div>
            <h3 class="text-2xl font-bold text-gray-800">{{ currentQuestion?.question }}</h3>
          </div>

          <!-- 选项 - 横向紧凑布局 -->
          <div class="grid grid-cols-4 gap-3">
            <button 
              v-for="(option, index) in currentQuestion?.options" 
              :key="index"
              @click="answerQuestion(index)"
              :disabled="selectedAnswer !== null"
              :class="[
                'py-4 px-3 rounded-xl font-bold text-lg transition-all',
                selectedAnswer === null ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-xl hover:scale-105' : 
                selectedAnswer === index ? (index === currentQuestion.correctAnswer ? 'bg-green-500 text-white animate-pulse' : 'bg-red-500 text-white animate-shake') :
                'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
              ]"
            >
              <div class="text-xs mb-1">{{ String.fromCharCode(65 + index) }}</div>
              <div class="text-sm">{{ option }}</div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 战斗结果界面 -->
    <div v-else-if="battleResult" class="w-full h-full flex items-center justify-center p-6">
      <div class="bg-white rounded-3xl p-12 max-w-2xl w-full shadow-2xl text-center">
        <div v-if="battleResult.success">
          <div class="text-9xl mb-6 animate-bounce">🎉</div>
          <h2 class="text-4xl font-bold text-green-600 mb-4">挑战成功！</h2>
          <p class="text-2xl text-gray-800 mb-6">{{ battleResult.message }}</p>
          
          <div class="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 mb-6">
            <div :class="['text-6xl mb-4', battleResult.isNewBadge ? 'animate-flip-in' : '']">
              {{ getElementInfo(battleResult.badge).emoji }}
            </div>
            <p class="text-xl font-bold text-gray-800 mb-2">
              {{ battleResult.isNewBadge ? '🎊 获得新勋章' : '✨ 勋章已拥有' }}
            </p>
            <p class="text-lg text-gray-600">{{ getElementInfo(battleResult.badge).name }}系征服者</p>
          </div>
          
          <div class="space-y-3 text-lg text-gray-700">
            <p>✨ 经验值 +{{ battleResult.expReward }}</p>
            <p v-if="battleResult.levelUp" class="text-2xl font-bold text-purple-600 animate-pulse">🎊 精灵进化了！</p>
          </div>
        </div>
        
        <div v-else>
          <div class="text-9xl mb-6">😢</div>
          <h2 class="text-4xl font-bold text-red-600 mb-4">挑战失败</h2>
          <p class="text-2xl text-gray-800 mb-6">{{ battleResult.message }}</p>
          <p class="text-lg text-gray-600">击败了 {{ battleResult.score }}/10 点血量</p>
          <p class="text-lg text-gray-600 mt-4">明天再来挑战吧！</p>
        </div>

        <button 
          @click="closeAndRefresh"
          class="w-full mt-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-xl hover:shadow-2xl transition-all"
        >
          返回主控台
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@keyframes flip-in {
  0% { 
    transform: rotateY(0deg) scale(0.5);
    opacity: 0;
  }
  50% { 
    transform: rotateY(180deg) scale(1.2);
  }
  100% { 
    transform: rotateY(360deg) scale(1);
    opacity: 1;
  }
}

@keyframes attack-right {
  0%, 100% { transform: translateX(0) scale(1); }
  50% { transform: translateX(30px) scale(1.1); }
}

@keyframes attack-left {
  0%, 100% { transform: translateX(0) scale(1); }
  50% { transform: translateX(-30px) scale(1.1); }
}

@keyframes shake-boss {
  0%, 100% { transform: translateX(0); filter: brightness(1); }
  25% { transform: translateX(-10px); filter: brightness(1.5) hue-rotate(20deg); }
  50% { transform: translateX(10px); filter: brightness(0.8) hue-rotate(-20deg); }
  75% { transform: translateX(-10px); filter: brightness(1.5) hue-rotate(20deg); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.animate-bounce {
  animation: bounce 1s infinite;
}

.animate-flip-in {
  animation: flip-in 1s ease-out;
  transform-style: preserve-3d;
}

.animate-attack-right {
  animation: attack-right 0.8s ease-out;
}

.animate-attack-left {
  animation: attack-left 0.8s ease-out;
}

.animate-shake-boss {
  animation: shake-boss 0.8s ease-out;
}

.animate-shake {
  animation: shake 0.5s ease-out;
}
</style>
