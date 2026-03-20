<script setup>
import { ref, onMounted, computed } from 'vue';
import draggable from 'vuedraggable';
import { 
  getAllStudents, 
  getClassGroups, 
  createGroup, 
  updateGroup, 
  deleteGroup,
  updateStudentGroup,
  getGroupStats
} from '../db.js';

const emit = defineEmits(['exit', 'dataUpdate']);

const students = ref([]);
const groups = ref([]);
const ungroupedStudents = ref([]);
const groupedStudents = ref({});
const groupStats = ref({});
const showGroupForm = ref(false);
const editingGroup = ref(null);
const groupForm = ref({ name: '', color: '#3B82F6' });
const loading = ref(true);

const colorOptions = [
  '#FFD700', '#FF69B4', '#87CEEB', '#9370DB', 
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#F9CA24',
  '#6C5CE7', '#FD79A8', '#A29BFE', '#74B9FF'
];

const loadData = async () => {
  try {
    students.value = await getAllStudents();
    groups.value = await getClassGroups(1);
    
    // 分类学生 - 所有学生初始在"未分组"
    ungroupedStudents.value = students.value.filter(s => !s.group || s.group === '未分组' || s.group === '默认小组');
    
    // 按小组分类
    groupedStudents.value = {};
    for (const group of groups.value) {
      groupedStudents.value[group.name] = students.value.filter(s => s.group === group.name);
      groupStats.value[group.name] = await getGroupStats(1, group.name);
    }
    
    loading.value = false;
  } catch (error) {
    console.error('加载数据失败:', error);
    loading.value = false;
  }
};

const onStudentDrop = async (groupName) => {
  // 更新数据库
  const groupStudents = groupedStudents.value[groupName];
  for (const student of groupStudents) {
    if (student.group !== groupName) {
      await updateStudentGroup(student.id, groupName);
    }
  }
  
  // 重新加载数据
  await loadData();
  emit('dataUpdate');
};

const onUngroupedDrop = async () => {
  // 更新未分组学生 - 将他们的group设置为"未分组"
  for (const student of ungroupedStudents.value) {
    if (student.group && student.group !== '未分组') {
      await updateStudentGroup(student.id, '未分组');
    }
  }
  
  await loadData();
  emit('dataUpdate');
};

const openGroupForm = () => {
  editingGroup.value = null;
  groupForm.value = { name: '', color: '#3B82F6' };
  showGroupForm.value = true;
};

const editGroup = (group) => {
  editingGroup.value = group;
  groupForm.value = { name: group.name, color: group.color };
  showGroupForm.value = true;
};

const saveGroup = async () => {
  if (!groupForm.value.name.trim()) {
    alert('请输入小组名称');
    return;
  }
  
  try {
    if (editingGroup.value) {
      await updateGroup(editingGroup.value.id, groupForm.value);
    } else {
      await createGroup(1, groupForm.value.name, groupForm.value.color);
    }
    showGroupForm.value = false;
    await loadData();
  } catch (error) {
    alert('保存失败：' + error.message);
  }
};

const handleDeleteGroup = async (group) => {
  if (!confirm(`确定要删除小组"${group.name}"吗？该小组的学生将移到未分组。`)) return;
  
  // 将该小组的学生移到未分组
  const groupStudents = groupedStudents.value[group.name] || [];
  for (const student of groupStudents) {
    await updateStudentGroup(student.id, '未分组');
  }
  
  await deleteGroup(group.id);
  await loadData();
};

const exitModule = () => {
  emit('exit');
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="fixed inset-0 z-50 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 overflow-hidden">
    <!-- 顶部导航栏 -->
    <div class="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg p-4 z-10">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="exitModule" class="btn-game bg-gradient-to-r from-gray-400 to-gray-500 text-sm">
            ← 返回主控台
          </button>
          <h1 class="text-3xl font-bold text-gray-800">👥 小组管理</h1>
        </div>
        
        <button @click="openGroupForm" class="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg transition-all">
          ➕ 新建小组
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="relative w-full h-full pt-24 pb-8 overflow-y-auto">
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="text-4xl text-gray-600">🌟 加载中...</div>
      </div>

      <div v-else class="max-w-7xl mx-auto px-8">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <!-- 左侧：未分组学生 -->
          <div class="card-cute p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">
              📋 未分组 ({{ ungroupedStudents.length }}人)
            </h2>
            
            <draggable
              v-model="ungroupedStudents"
              group="students"
              @change="onUngroupedDrop"
              item-key="id"
              class="space-y-3 min-h-[200px] p-3 bg-gray-50 rounded-xl"
            >
              <template #item="{element}">
                <div class="p-3 bg-white rounded-xl shadow-md cursor-move hover:shadow-xl transition-all border-2 border-gray-200">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center text-2xl">
                      {{ ['🥚', '🐣', '🐥', '🐔', '🦅', '🐉'][element.petStage - 1] || '🥚' }}
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-gray-800">{{ element.name }}</div>
                      <div class="text-xs text-gray-600">{{ element.totalPoints }}分</div>
                    </div>
                    <div class="text-gray-400 text-xl">⋮⋮</div>
                  </div>
                </div>
              </template>
            </draggable>

            <div v-if="ungroupedStudents.length === 0" class="text-center py-12 text-gray-500">
              <div class="text-4xl mb-2">✅</div>
              <div class="text-sm">全部已分组</div>
            </div>
          </div>

          <!-- 右侧：小组容器 -->
          <div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="(group, index) in groups"
              :key="group.id"
              class="card-cute p-6"
              :style="{ borderTop: `4px solid ${group.color}` }"
            >
              <!-- 小组头部 -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div 
                    class="w-6 h-6 rounded-full"
                    :style="{ backgroundColor: group.color }"
                  ></div>
                  <h3 class="text-xl font-bold text-gray-800">{{ group.name }}</h3>
                </div>
                
                <div class="flex gap-2">
                  <button
                    @click="editGroup(group)"
                    class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    编辑
                  </button>
                  <button
                    @click="handleDeleteGroup(group)"
                    class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>

              <!-- 小组统计 -->
              <div class="grid grid-cols-3 gap-2 mb-4">
                <div class="bg-blue-50 rounded-lg p-2 text-center">
                  <div class="text-xs text-blue-600">人数</div>
                  <div class="text-lg font-bold text-blue-700">{{ groupStats[group.name]?.count || 0 }}</div>
                </div>
                <div class="bg-amber-50 rounded-lg p-2 text-center">
                  <div class="text-xs text-amber-600">总积分</div>
                  <div class="text-lg font-bold text-amber-700">{{ groupStats[group.name]?.totalPoints || 0 }}</div>
                </div>
                <div class="bg-green-50 rounded-lg p-2 text-center">
                  <div class="text-xs text-green-600">平均分</div>
                  <div class="text-lg font-bold text-green-700">{{ groupStats[group.name]?.avgPoints || 0 }}</div>
                </div>
              </div>

              <!-- 学生列表 -->
              <draggable
                v-model="groupedStudents[group.name]"
                group="students"
                @change="() => onStudentDrop(group.name)"
                item-key="id"
                class="space-y-3 min-h-[200px] p-3 bg-gray-50 rounded-xl"
              >
                <template #item="{element}">
                  <div class="p-3 bg-white rounded-xl shadow-md cursor-move hover:shadow-xl transition-all border-2 border-gray-200">
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center text-2xl">
                        {{ ['🥚', '🐣', '🐥', '🐔', '🦅', '🐉'][element.petStage - 1] || '🥚' }}
                      </div>
                      <div class="flex-1">
                        <div class="font-bold text-gray-800">{{ element.name }}</div>
                        <div class="text-xs text-gray-600">{{ element.totalPoints }}分 · {{ element.availablePoints }}币</div>
                      </div>
                      <div class="text-gray-400 text-xl">⋮⋮</div>
                    </div>
                  </div>
                </template>
              </draggable>

              <div v-if="!groupedStudents[group.name] || groupedStudents[group.name].length === 0" class="text-center py-8 text-gray-400">
                <div class="text-3xl mb-2">📦</div>
                <div class="text-sm">拖拽学生到这里</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 小组表单弹窗 -->
    <div v-if="showGroupForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">
          {{ editingGroup ? '编辑小组' : '新建小组' }}
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">小组名称</label>
            <input
              v-model="groupForm.name"
              type="text"
              placeholder="例如：阳光小组"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">小组颜色</label>
            <div class="grid grid-cols-6 gap-2">
              <button
                v-for="color in colorOptions"
                :key="color"
                @click="groupForm.color = color"
                :class="[
                  'w-10 h-10 rounded-lg transition-all',
                  groupForm.color === color ? 'ring-4 ring-blue-500 scale-110' : 'hover:scale-105'
                ]"
                :style="{ backgroundColor: color }"
              ></button>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="saveGroup"
            class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-bold hover:shadow-lg transition-all"
          >
            保存
          </button>
          <button
            @click="showGroupForm = false"
            class="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all"
          >
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- 操作提示 -->
    <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-8 py-4 rounded-2xl shadow-2xl">
      <div class="text-center">
        <div class="text-lg font-bold">💡 拖拽学生卡片到小组容器中完成分配</div>
        <div class="text-sm opacity-90 mt-1">小组统计会自动更新</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 拖拽样式 */
.sortable-ghost {
  opacity: 0.5;
  background: #e0e7ff;
}

.sortable-drag {
  opacity: 0.8;
  transform: rotate(5deg);
}
</style>
