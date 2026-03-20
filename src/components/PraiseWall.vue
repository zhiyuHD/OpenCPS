<script setup>
import { ref, onMounted } from 'vue';
import { getAllStudents, getAllPraises, addPraise } from '../db.js';

const emit = defineEmits(['exit', 'dataUpdate']);

const students = ref([]);
const praises = ref([]);
const showAddForm = ref(false);
const selectedStudent = ref(null);
const praiseContent = ref('');
const selectedColor = ref('#FFE4E1');
const showSuccess = ref(false);

// 便利贴颜色选项
const COLORS = [
  { name: '粉色', value: '#FFE4E1', textColor: '#8B4513' },
  { name: '黄色', value: '#FFFACD', textColor: '#8B4513' },
  { name: '绿色', value: '#E0FFE0', textColor: '#2F4F2F' },
  { name: '蓝色', value: '#E0F2FF', textColor: '#1E3A8A' },
  { name: '紫色', value: '#F3E5FF', textColor: '#6B21A8' },
  { name: '橙色', value: '#FFE5CC', textColor: '#8B4513' }
];

// 加载数据
const loadData = async () => {
  students.value = await getAllStudents();
  praises.value = await getAllPraises();
};

// 打开表扬表单
const openAddForm = () => {
  showAddForm.value = true;
  selectedStudent.value = students.value[0] || null;
  praiseContent.value = '';
  selectedColor.value = '#FFE4E1';
};

// 发布表扬
const publishPraise = async () => {
  if (!selectedStudent.value || !praiseContent.value.trim()) {
    alert('请选择学生并输入表扬内容！');
    return;
  }

  try {
    const result = await addPraise(
      selectedStudent.value.id,
      praiseContent.value.trim(),
      selectedColor.value
    );

    if (result.success) {
      // 显示成功提示
      showSuccess.value = true;
      setTimeout(() => {
        showSuccess.value = false;
      }, 2000);

      // 重新加载数据
      await loadData();
      emit('dataUpdate');

      // 关闭表单
      showAddForm.value = false;
    }
  } catch (error) {
    console.error('发布表扬失败:', error);
    alert('发布失败，请重试');
  }
};

// 取消发布
const cancelPublish = () => {
  showAddForm.value = false;
};

// 退出
const exitModule = () => {
  emit('exit');
};

// 获取学生姓名
const getStudentName = (studentId) => {
  const student = students.value.find(s => s.id === studentId);
  return student ? student.name : '未知';
};

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="fixed inset-0 z-50 bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 overflow-hidden">
    <!-- 顶部导航栏 -->
    <div class="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg p-4 z-10">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="exitModule" class="btn-game bg-gradient-to-r from-gray-400 to-gray-500 text-sm">
            ← 返回主控台
          </button>
          <h1 class="text-3xl font-bold text-gray-800">💖 心里话</h1>
          <span class="text-sm text-gray-600">温馨的班级文化展示区</span>
        </div>
        
        <button 
          @click="openAddForm"
          class="btn-game bg-gradient-to-r from-pink-400 to-rose-500 text-lg"
        >
          <span class="text-2xl mr-2">✍️</span>
          写表扬信
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="relative w-full h-full pt-24 pb-8 overflow-y-auto">
      <div class="max-w-7xl mx-auto px-8">
        <!-- 空状态 -->
        <div v-if="praises.length === 0" class="flex flex-col items-center justify-center h-96">
          <div class="text-9xl mb-4">📌</div>
          <h2 class="text-3xl font-bold text-gray-600 mb-2">心里话墙还是空的</h2>
          <p class="text-gray-500 mb-6">快来写第一封表扬信吧！</p>
          <button @click="openAddForm" class="btn-game bg-gradient-to-r from-pink-400 to-rose-500">
            ✍️ 写表扬信
          </button>
        </div>

        <!-- 瀑布流布局 -->
        <div v-else class="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6">
          <div
            v-for="praise in praises"
            :key="praise.id"
            class="break-inside-avoid mb-6 animate-fadeIn"
          >
            <!-- 便利贴 -->
            <div 
              :style="{ 
                backgroundColor: praise.bgColor,
                transform: `rotate(${Math.random() * 6 - 3}deg)`
              }"
              class="praise-note relative p-6 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              <!-- 图钉 -->
              <div class="absolute -top-3 left-1/2 transform -translate-x-1/2 text-4xl">
                📌
              </div>

              <!-- 内容 -->
              <div class="mt-4">
                <!-- 学生名字 -->
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-3xl">⭐</span>
                  <span class="text-2xl font-bold" :style="{ color: COLORS.find(c => c.value === praise.bgColor)?.textColor || '#8B4513' }">
                    {{ getStudentName(praise.studentId) }}
                  </span>
                </div>

                <!-- 表扬内容 -->
                <p 
                  class="text-lg leading-relaxed mb-4 font-medium"
                  :style="{ color: COLORS.find(c => c.value === praise.bgColor)?.textColor || '#8B4513' }"
                >
                  {{ praise.content }}
                </p>

                <!-- 日期和奖励 -->
                <div class="flex items-center justify-between text-sm opacity-70">
                  <span>{{ formatDate(praise.date) }}</span>
                  <span class="flex items-center gap-1">
                    <span class="text-lg">✨</span>
                    <span>+20经验</span>
                  </span>
                </div>
              </div>

              <!-- 装饰元素 -->
              <div class="absolute bottom-2 right-2 text-4xl opacity-20">
                💖
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 写表扬信弹窗 -->
    <div v-if="showAddForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-scaleIn">
        <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">✍️ 写表扬信</h2>

        <!-- 选择学生 -->
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">选择学生</label>
          <select 
            v-model="selectedStudent"
            class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-pink-400 focus:outline-none text-lg"
          >
            <option v-for="student in students" :key="student.id" :value="student">
              {{ student.name }} ({{ student.group }})
            </option>
          </select>
        </div>

        <!-- 表扬内容 -->
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">表扬内容</label>
          <textarea
            v-model="praiseContent"
            placeholder="例如：今天主动辅导了同桌的数学，特别棒！"
            class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-pink-400 focus:outline-none text-lg resize-none"
            rows="4"
          ></textarea>
        </div>

        <!-- 选择颜色 -->
        <div class="mb-8">
          <label class="block text-sm font-semibold text-gray-700 mb-3">便利贴颜色</label>
          <div class="grid grid-cols-6 gap-3">
            <button
              v-for="color in COLORS"
              :key="color.value"
              @click="selectedColor = color.value"
              :style="{ backgroundColor: color.value }"
              :class="[
                'w-full aspect-square rounded-xl border-4 transition-all',
                selectedColor === color.value ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'
              ]"
              :title="color.name"
            >
              <span v-if="selectedColor === color.value" class="text-2xl">✓</span>
            </button>
          </div>
        </div>

        <!-- 按钮 -->
        <div class="flex gap-4">
          <button
            @click="cancelPublish"
            class="flex-1 px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-lg transition-all"
          >
            取消
          </button>
          <button
            @click="publishPraise"
            class="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 text-white font-bold text-lg transition-all transform hover:scale-105"
          >
            发布表扬 🎉
          </button>
        </div>
      </div>
    </div>

    <!-- 成功提示 -->
    <div v-if="showSuccess" class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
      <div class="bg-white rounded-3xl shadow-2xl p-8 text-center animate-scaleIn">
        <div class="text-8xl mb-4">🎉</div>
        <h3 class="text-3xl font-bold text-green-500 mb-2">发布成功！</h3>
        <p class="text-gray-600">学生获得了20经验值</p>
        <p class="text-gray-600">宠物状态变为超级开心！</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-out;
}

.animate-scaleIn {
  animation: scaleIn 0.3s ease-out;
}

.praise-note {
  box-shadow: 
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 10px 15px rgba(0, 0, 0, 0.1);
}

.praise-note:hover {
  box-shadow: 
    0 10px 20px rgba(0, 0, 0, 0.15),
    0 20px 30px rgba(0, 0, 0, 0.15);
}
</style>
