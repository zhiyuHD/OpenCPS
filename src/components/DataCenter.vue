<script setup>
import { ref, onMounted, computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, PieChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import { getAllStudents, getStudentLogs, getPointsTrend, getRankDistribution, exportAllData, importAllData } from '../db.js';

use([CanvasRenderer, LineChart, PieChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent]);

const emit = defineEmits(['exit']);

const students = ref([]);
const allLogs = ref([]);
const searchQuery = ref('');
const showExportSuccess = ref(false);
const showImportSuccess = ref(false);
const trendData = ref([]);
const rankData = ref({});

// 折线图配置
const trendOption = computed(() => ({
  title: { text: '全班积分趋势（最近7天）', left: 'center' },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: trendData.value.map(d => d.date)
  },
  yAxis: { type: 'value', name: '积分' },
  series: [{
    data: trendData.value.map(d => d.points),
    type: 'line',
    smooth: true,
    itemStyle: { color: '#5470c6' },
    areaStyle: { color: 'rgba(84, 112, 198, 0.2)' }
  }]
}));

// 饼图配置
const rankOption = computed(() => ({
  title: { text: '段位分布', left: 'center' },
  tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
  legend: { orient: 'vertical', left: 'left' },
  series: [{
    type: 'pie',
    radius: '50%',
    data: Object.entries(rankData.value).map(([name, value]) => ({ name, value })),
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    }
  }]
}));

// 过滤后的日志
const filteredLogs = computed(() => {
  if (!searchQuery.value) return allLogs.value;
  return allLogs.value.filter(log => 
    log.studentName.includes(searchQuery.value)
  );
});

// 加载数据
const loadData = async () => {
  students.value = await getAllStudents();
  
  // 加载所有日志并添加学生姓名
  const logs = [];
  for (const student of students.value) {
    const studentLogs = await getStudentLogs(student.id);
    studentLogs.forEach(log => {
      logs.push({
        ...log,
        studentName: student.name
      });
    });
  }
  allLogs.value = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // 加载图表数据
  trendData.value = await getPointsTrend(7);
  rankData.value = await getRankDistribution();
};

// 导出数据
const handleExport = async () => {
  try {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
    a.href = url;
    a.download = `四年级二班_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showExportSuccess.value = true;
    setTimeout(() => { showExportSuccess.value = false; }, 3000);
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败：' + error.message);
  }
};

// 导入数据
const handleImport = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importAllData(data);
      
      if (result.success) {
        showImportSuccess.value = true;
        setTimeout(() => {
          showImportSuccess.value = false;
          window.location.reload(); // 刷新页面
        }, 2000);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败：' + error.message);
    }
  };
  input.click();
};

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN');
};

// 退出
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
          <h1 class="text-3xl font-bold text-gray-800">📊 数据中心</h1>
        </div>
        
        <!-- 数据备份按钮 -->
        <div class="flex gap-3">
          <button 
            @click="handleExport"
            class="btn-game bg-gradient-to-r from-green-500 to-emerald-600 text-lg"
          >
            <span class="text-2xl mr-2">📥</span>
            导出班级数据
          </button>
          
          <button 
            @click="handleImport"
            class="btn-game bg-gradient-to-r from-blue-500 to-cyan-600 text-lg"
          >
            <span class="text-2xl mr-2">📤</span>
            导入备份数据
          </button>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="relative w-full h-full pt-24 pb-8 overflow-y-auto">
      <div class="max-w-7xl mx-auto px-8 space-y-6">
        <!-- 图表区域 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- 积分趋势图 -->
          <div class="card-cute p-6">
            <v-chart :option="trendOption" style="height: 300px;" />
          </div>

          <!-- 段位分布图 -->
          <div class="card-cute p-6">
            <v-chart :option="rankOption" style="height: 300px;" />
          </div>
        </div>

        <!-- 积分明细表 -->
        <div class="card-cute p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-800">📋 积分明细记录</h2>
            
            <!-- 搜索框 -->
            <div class="relative">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索学生姓名..."
                class="px-4 py-2 pr-10 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none"
              />
              <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            </div>
          </div>

          <!-- 表格 -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-100">
                <tr>
                  <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">时间</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">学生</th>
                  <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">积分变动</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">原因</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="log in filteredLogs.slice(0, 50)" 
                  :key="log.id"
                  class="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td class="px-4 py-3 text-sm text-gray-600">{{ formatTime(log.timestamp) }}</td>
                  <td class="px-4 py-3 text-sm font-semibold text-gray-800">{{ log.studentName }}</td>
                  <td class="px-4 py-3 text-center">
                    <span :class="[
                      'px-3 py-1 rounded-full text-sm font-bold',
                      log.points > 0 ? 'bg-green-100 text-green-600' : log.points < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                    ]">
                      {{ log.points > 0 ? '+' : '' }}{{ log.points }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-700">{{ log.reason }}</td>
                </tr>
              </tbody>
            </table>
            
            <div v-if="filteredLogs.length === 0" class="text-center py-12 text-gray-500">
              暂无记录
            </div>
            
            <div v-else-if="filteredLogs.length > 50" class="text-center py-4 text-gray-500 text-sm">
              显示前50条记录，共 {{ filteredLogs.length }} 条
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 导出成功提示 -->
    <div v-if="showExportSuccess" class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
      <div class="bg-white rounded-3xl shadow-2xl p-8 text-center animate-scaleIn">
        <div class="text-8xl mb-4">✅</div>
        <h3 class="text-3xl font-bold text-green-500 mb-2">导出成功！</h3>
        <p class="text-gray-600">数据已保存到下载文件夹</p>
      </div>
    </div>

    <!-- 导入成功提示 -->
    <div v-if="showImportSuccess" class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
      <div class="bg-white rounded-3xl shadow-2xl p-8 text-center animate-scaleIn">
        <div class="text-8xl mb-4">✅</div>
        <h3 class="text-3xl font-bold text-blue-500 mb-2">导入成功！</h3>
        <p class="text-gray-600">页面即将刷新...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes scaleIn {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-scaleIn {
  animation: scaleIn 0.3s ease-out;
}
</style>
