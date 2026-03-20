<script setup>
import { ref, onMounted, computed } from 'vue';
import { getAllStudents, getShopItems, redeemItem, updateStudentPoints } from '../db.js';

const emit = defineEmits(['exit', 'dataUpdate']);

const currentTab = ref('shop'); // 'shop' | 'lottery'
const students = ref([]);
const selectedStudent = ref(null);
const shopItems = ref([]);
const loading = ref(true);

// 翻牌相关
const cards = ref(Array(9).fill({ flipped: false, prize: null }));
const lotteryRunning = ref(false);
const showPrizeModal = ref(false);
const currentPrize = ref(null);

const prizes = [
  { name: '谢谢参与', icon: '😊', color: 'bg-gray-100', value: 0 },
  { name: '三等奖 +10分', icon: '🎉', color: 'bg-blue-100', value: 10 },
  { name: '二等奖 +20分', icon: '🎊', color: 'bg-purple-100', value: 20 },
  { name: '一等奖 +50分', icon: '🏆', color: 'bg-yellow-100', value: 50 },
  { name: '隐藏稀有精灵蛋', icon: '🥚✨', color: 'bg-pink-100', value: 100 }
];

const loadData = async () => {
  try {
    students.value = await getAllStudents();
    shopItems.value = await getShopItems(1);
    
    if (students.value.length > 0) {
      selectedStudent.value = students.value[0];
    }
    
    loading.value = false;
  } catch (error) {
    console.error('加载数据失败:', error);
    loading.value = false;
  }
};

const selectStudent = (student) => {
  selectedStudent.value = student;
};

const handleRedeem = async (item) => {
  if (!selectedStudent.value) {
    alert('请先选择学生');
    return;
  }
  
  if (!confirm(`确定要为 ${selectedStudent.value.name} 兑换"${item.name}"吗？`)) return;
  
  try {
    const result = await redeemItem(selectedStudent.value.id, item.id);
    
    if (result.success) {
      alert('兑换成功！');
      await loadData();
      // 更新选中学生的数据
      selectedStudent.value = students.value.find(s => s.id === selectedStudent.value.id);
      emit('dataUpdate');
    } else {
      alert(result.message);
    }
  } catch (error) {
    alert('兑换失败：' + error.message);
  }
};

const flipCard = async (index) => {
  if (lotteryRunning.value || cards.value[index].flipped) return;
  
  if (!selectedStudent.value) {
    alert('请先选择学生');
    return;
  }
  
  if (selectedStudent.value.availablePoints < 20) {
    alert('金币不足！需要20金币');
    return;
  }
  
  lotteryRunning.value = true;
  
  // 扣除金币
  await updateStudentPoints(selectedStudent.value.id, -20, '翻牌抽奖');
  
  // 随机奖品（权重）
  const random = Math.random();
  let prize;
  if (random < 0.5) prize = prizes[0]; // 50% 谢谢参与
  else if (random < 0.8) prize = prizes[1]; // 30% 三等奖
  else if (random < 0.95) prize = prizes[2]; // 15% 二等奖
  else if (random < 0.99) prize = prizes[3]; // 4% 一等奖
  else prize = prizes[4]; // 1% 隐藏大奖
  
  // 翻牌动画
  cards.value[index] = { flipped: true, prize };
  
  setTimeout(async () => {
    currentPrize.value = prize;
    showPrizeModal.value = true;
    
    // 发放奖励
    if (prize.value > 0) {
      await updateStudentPoints(selectedStudent.value.id, prize.value, `抽奖获得：${prize.name}`);
    }
    
    await loadData();
    selectedStudent.value = students.value.find(s => s.id === selectedStudent.value.id);
    emit('dataUpdate');
    
    lotteryRunning.value = false;
  }, 1000);
};

const resetCards = () => {
  cards.value = Array(9).fill(null).map(() => ({ flipped: false, prize: null }));
};

const closePrizeModal = () => {
  showPrizeModal.value = false;
  currentPrize.value = null;
};

const exitModule = () => {
  emit('exit');
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="fixed inset-0 z-50 bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 overflow-hidden">
    <!-- 顶部导航栏 -->
    <div class="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg p-4 z-10">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="exitModule" class="btn-game bg-gradient-to-r from-gray-400 to-gray-500 text-sm">
            ← 返回主控台
          </button>
          <h1 class="text-3xl font-bold text-gray-800">🛒 积分商店 & 🎰 翻牌抽奖</h1>
        </div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="absolute top-20 left-0 right-0 bg-white/80 backdrop-blur-sm shadow-md p-4 z-10">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex gap-4">
          <button
            @click="currentTab = 'shop'"
            :class="[
              'px-8 py-3 rounded-xl font-bold text-xl transition-all transform hover:scale-105',
              currentTab === 'shop'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            ]"
          >
            🛒 积分商店
          </button>
          <button
            @click="currentTab = 'lottery'"
            :class="[
              'px-8 py-3 rounded-xl font-bold text-xl transition-all transform hover:scale-105',
              currentTab === 'lottery'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            ]"
          >
            🎰 翻牌抽奖
          </button>
        </div>

        <!-- 学生选择 -->
        <div class="flex items-center gap-3">
          <span class="text-lg font-bold text-gray-700">当前学生：</span>
          <select
            v-model="selectedStudent"
            class="px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none font-bold"
          >
            <option v-for="student in students" :key="student.id" :value="student">
              {{ student.name }} ({{ student.availablePoints }}币)
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="relative w-full h-full pt-40 pb-8 overflow-y-auto">
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="text-4xl text-gray-600">🌟 加载中...</div>
      </div>

      <!-- 积分商店 -->
      <div v-else-if="currentTab === 'shop'" class="max-w-7xl mx-auto px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="item in shopItems"
            :key="item.id"
            class="card-cute p-6 hover:shadow-2xl transition-all transform hover:scale-105"
          >
            <!-- 商品图标 -->
            <div class="text-center mb-4">
              <div class="text-8xl mb-2">{{ item.icon }}</div>
              <h3 class="text-2xl font-bold text-gray-800">{{ item.name }}</h3>
              <p class="text-sm text-gray-600 mt-2">{{ item.description }}</p>
            </div>

            <!-- 价格和库存 -->
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <span class="text-3xl">💰</span>
                <span class="text-2xl font-bold text-amber-600">{{ item.price }}</span>
              </div>
              <div :class="[
                'px-3 py-1 rounded-full text-sm font-bold',
                item.stock > 5 ? 'bg-green-100 text-green-600' : 
                item.stock > 0 ? 'bg-yellow-100 text-yellow-600' : 
                'bg-red-100 text-red-600'
              ]">
                库存: {{ item.stock }}
              </div>
            </div>

            <!-- 兑换按钮 -->
            <button
              @click="handleRedeem(item)"
              :disabled="!selectedStudent || selectedStudent.availablePoints < item.price || item.stock <= 0"
              :class="[
                'w-full py-3 rounded-xl font-bold text-lg transition-all',
                selectedStudent && selectedStudent.availablePoints >= item.price && item.stock > 0
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              ]"
            >
              {{ item.stock <= 0 ? '已售罄' : '立即兑换' }}
            </button>
          </div>
        </div>

        <div v-if="shopItems.length === 0" class="text-center py-20">
          <div class="text-6xl mb-4">🛒</div>
          <div class="text-2xl text-gray-500">商店暂无商品</div>
        </div>
      </div>

      <!-- 翻牌抽奖 -->
      <div v-else-if="currentTab === 'lottery'" class="max-w-5xl mx-auto px-8">
        <!-- 抽奖说明 -->
        <div class="card-cute p-6 mb-6 text-center">
          <h2 class="text-3xl font-bold text-gray-800 mb-4">🎰 翻牌抽奖</h2>
          <p class="text-lg text-gray-600 mb-2">每次抽奖消耗 <span class="text-2xl font-bold text-amber-600">20金币</span></p>
          <p class="text-sm text-gray-500">点击任意卡片翻开，看看你的运气如何！</p>
          
          <button
            @click="resetCards"
            class="mt-4 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-bold hover:shadow-lg transition-all"
          >
            🔄 重置卡片
          </button>
        </div>

        <!-- 九宫格卡片 -->
        <div class="grid grid-cols-3 gap-6 mb-6">
          <div
            v-for="(card, index) in cards"
            :key="index"
            @click="flipCard(index)"
            :class="[
              'aspect-square cursor-pointer transition-all duration-500 transform',
              card.flipped ? '' : 'hover:scale-105',
              lotteryRunning ? 'pointer-events-none' : ''
            ]"
            style="perspective: 1000px;"
          >
            <div
              :class="[
                'relative w-full h-full transition-transform duration-500',
                card.flipped ? 'rotate-y-180' : ''
              ]"
              style="transform-style: preserve-3d;"
            >
              <!-- 卡片背面 -->
              <div
                class="absolute inset-0 rounded-3xl shadow-2xl flex items-center justify-center"
                style="backface-visibility: hidden;"
                :style="{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }"
              >
                <div class="text-center text-white">
                  <div class="text-6xl mb-2">🎴</div>
                  <div class="text-2xl font-bold">?</div>
                </div>
              </div>

              <!-- 卡片正面 -->
              <div
                v-if="card.prize"
                :class="[
                  'absolute inset-0 rounded-3xl shadow-2xl flex items-center justify-center',
                  card.prize.color
                ]"
                style="backface-visibility: hidden; transform: rotateY(180deg);"
              >
                <div class="text-center">
                  <div class="text-7xl mb-2">{{ card.prize.icon }}</div>
                  <div class="text-xl font-bold text-gray-800">{{ card.prize.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 奖品说明 -->
        <div class="card-cute p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">🎁 奖品列表</h3>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div v-for="prize in prizes" :key="prize.name" :class="['p-3 rounded-lg text-center', prize.color]">
              <div class="text-3xl mb-1">{{ prize.icon }}</div>
              <div class="text-sm font-bold text-gray-700">{{ prize.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 中奖弹窗 -->
    <div v-if="showPrizeModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-3xl p-12 max-w-md w-full mx-4 shadow-2xl text-center animate-scaleIn">
        <div class="text-9xl mb-6 animate-bounce">{{ currentPrize.icon }}</div>
        <h2 class="text-4xl font-bold text-gray-800 mb-4">恭喜你！</h2>
        <p class="text-2xl font-bold text-purple-600 mb-6">{{ currentPrize.name }}</p>
        
        <button
          @click="closePrizeModal"
          class="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all"
        >
          太棒了！
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rotate-y-180 {
  transform: rotateY(180deg);
}

@keyframes scaleIn {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-scaleIn {
  animation: scaleIn 0.5s ease-out;
}
</style>
