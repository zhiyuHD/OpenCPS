<script setup>
import { ref, onMounted, watch } from 'vue';
import { getPetDisplay } from '../petImageHelper.js';

const props = defineProps({
  petTypeId: {
    type: Number,
    default: 1
  },
  stage: {
    type: Number,
    default: 1
  },
  size: {
    type: String,
    default: 'medium' // small, medium, large, xlarge
  }
});

const display = ref({ type: 'emoji', content: '🥚' });
const loading = ref(true);

const sizeClasses = {
  small: 'text-3xl',
  medium: 'text-5xl',
  large: 'text-7xl',
  xlarge: 'text-9xl'
};

const loadPetDisplay = async () => {
  loading.value = true;
  display.value = await getPetDisplay(props.petTypeId, props.stage);
  loading.value = false;
};

onMounted(() => {
  loadPetDisplay();
});

watch(() => [props.petTypeId, props.stage], () => {
  loadPetDisplay();
});
</script>

<template>
  <div class="pet-image-container">
    <!-- 加载状态 -->
    <div v-if="loading" :class="['animate-pulse', sizeClasses[size]]">
      ⏳
    </div>
    <!-- 图片显示 -->
    <img 
      v-else-if="display.type === 'image' || display.type === 'static' || display.type === 'factory' || display.type === 'user'" 
      :src="display.content" 
      class="w-full h-full object-contain rounded-lg"
      alt="精灵图片"
    />
    <!-- Emoji占位符 -->
    <div v-else :class="sizeClasses[size]">
      {{ display.content }}
    </div>
  </div>
</template>

<style scoped>
.pet-image-container {
  display: flex;
  align-items: center;
  justify-center;
}
</style>
