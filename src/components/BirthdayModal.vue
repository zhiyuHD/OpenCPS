<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  student: {
    type: Object,
    required: true
  },
  gift: {
    type: Number,
    default: 50
  }
});

const emit = defineEmits(['close']);

const show = ref(false);

onMounted(() => {
  show.value = true;
});

const close = () => {
  show.value = false;
  setTimeout(() => {
    emit('close');
  }, 300);
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-fadeIn">
    <!-- 礼花特效 -->
    <div class="confetti-container">
      <div v-for="i in 50" :key="i" class="confetti" :style="{
        left: Math.random() * 100 + '%',
        animationDelay: Math.random() * 3 + 's',
        backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8'][Math.floor(Math.random() * 6)]
      }"></div>
    </div>

    <!-- 生日卡片 -->
    <div class="birthday-card animate-scaleIn">
      <!-- 气球装饰 -->
      <div class="balloons">
        <div class="balloon balloon-1">🎈</div>
        <div class="balloon balloon-2">🎈</div>
        <div class="balloon balloon-3">🎈</div>
      </div>

      <!-- 主内容 -->
      <div class="text-center relative z-10">
        <div class="text-9xl mb-6 animate-bounce">🎂</div>
        
        <h1 class="text-6xl font-bold mb-4 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
          生日快乐！
        </h1>
        
        <p class="text-4xl font-bold text-gray-800 mb-6">
          祝 {{ student.name }} 生日快乐！
        </p>
        
        <div class="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-6 mb-8 inline-block">
          <p class="text-2xl text-white font-bold">
            🎁 生日礼物：{{ gift }} 金币
          </p>
        </div>
        
        <p class="text-xl text-gray-600 mb-8">
          愿你在新的一岁里，学习进步，快乐成长！
        </p>
        
        <button 
          @click="close"
          class="px-12 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-2xl font-bold rounded-full shadow-lg transform transition-all hover:scale-110 active:scale-95"
        >
          收下了
        </button>
      </div>

      <!-- 蛋糕装饰 -->
      <div class="cake-decoration">
        <div class="text-6xl">🍰</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  0% { transform: scale(0) rotate(-180deg); opacity: 0; }
  50% { transform: scale(1.1) rotate(10deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

@keyframes confettiFall {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

.animate-scaleIn {
  animation: scaleIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.birthday-card {
  position: relative;
  background: white;
  border-radius: 3rem;
  padding: 4rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 800px;
  overflow: hidden;
}

.birthday-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, 
    rgba(255, 182, 193, 0.1) 0%,
    rgba(255, 218, 185, 0.1) 25%,
    rgba(255, 255, 224, 0.1) 50%,
    rgba(224, 255, 255, 0.1) 75%,
    rgba(230, 230, 250, 0.1) 100%
  );
  animation: rotate 10s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.confetti-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.confetti {
  position: absolute;
  width: 10px;
  height: 10px;
  animation: confettiFall 3s linear infinite;
}

.balloons {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  pointer-events: none;
}

.balloon {
  font-size: 4rem;
  animation: float 3s ease-in-out infinite;
}

.balloon-1 {
  animation-delay: 0s;
}

.balloon-2 {
  animation-delay: 0.5s;
}

.balloon-3 {
  animation-delay: 1s;
}

.cake-decoration {
  position: absolute;
  bottom: 20px;
  right: 20px;
  animation: float 2s ease-in-out infinite;
  animation-delay: 0.3s;
}
</style>
