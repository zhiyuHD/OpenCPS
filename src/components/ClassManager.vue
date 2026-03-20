<script setup>
import { ref, onMounted, computed } from 'vue';
import { 
  getAllClasses, 
  getClassStudents, 
  createClass, 
  updateClass, 
  deleteClass,
  createStudent,
  updateStudent,
  deleteStudent
} from '../db.js';

const emit = defineEmits(['exit', 'classChanged']);

const classes = ref([]);
const currentClassId = ref(1);
const students = ref([]);
const showClassForm = ref(false);
const showStudentForm = ref(false);
const showBatchImport = ref(false);
const editingClass = ref(null);
const editingStudent = ref(null);
const batchImportText = ref('');

const classForm = ref({
  name: '',
  description: ''
});

const studentForm = ref({
  name: '',
  studentNumber: '',
  group: '',
  birthday: ''
});

const currentClass = computed(() => {
  return classes.value.find(c => c.id === currentClassId.value);
});

// 加载数据
const loadData = async () => {
  classes.value = await getAllClasses();
  if (classes.value.length > 0 && !currentClassId.value) {
    currentClassId.value = classes.value[0].id;
  }
  await loadStudents();
};

const loadStudents = async () => {
  if (currentClassId.value) {
    students.value = await getClassStudents(currentClassId.value);
  }
};

// 切换班级
const switchClass = async (classId) => {
  currentClassId.value = classId;
  await loadStudents();
  emit('classChanged', classId);
};

// 新建班级
const openClassForm = () => {
  editingClass.value = null;
  classForm.value = { name: '', description: '' };
  showClassForm.value = true;
};

// 编辑班级
const editClass = (cls) => {
  editingClass.value = cls;
  classForm.value = { name: cls.name, description: cls.description };
  showClassForm.value = true;
};

// 保存班级
const saveClass = async () => {
  if (!classForm.value.name.trim()) {
    alert('请输入班级名称');
    return;
  }
  
  try {
    if (editingClass.value) {
      await updateClass(editingClass.value.id, classForm.value);
    } else {
      await createClass(classForm.value.name, classForm.value.description);
    }
    showClassForm.value = false;
    await loadData();
  } catch (error) {
    alert('保存失败：' + error.message);
  }
};

// 删除班级
const handleDeleteClass = async (cls) => {
  if (!confirm(`确定要删除班级"${cls.name}"吗？`)) return;
  
  const result = await deleteClass(cls.id);
  if (result.success) {
    await loadData();
  } else {
    alert(result.message);
  }
};

// 新建学生
const openStudentForm = () => {
  editingStudent.value = null;
  studentForm.value = { name: '', studentNumber: '', group: '', birthday: '' };
  showStudentForm.value = true;
};

// 编辑学生
const editStudent = (student) => {
  editingStudent.value = student;
  studentForm.value = {
    name: student.name,
    studentNumber: student.studentNumber,
    group: student.group,
    birthday: student.birthday
  };
  showStudentForm.value = true;
};

// 保存学生
const saveStudent = async () => {
  if (!studentForm.value.name.trim()) {
    alert('请输入学生姓名');
    return;
  }
  
  try {
    if (editingStudent.value) {
      await updateStudent(editingStudent.value.id, studentForm.value);
    } else {
      await createStudent({
        ...studentForm.value,
        classId: currentClassId.value
      });
    }
    showStudentForm.value = false;
    await loadStudents();
  } catch (error) {
    alert('保存失败：' + error.message);
  }
};

// 删除学生
const handleDeleteStudent = async (student) => {
  if (!confirm(`确定要删除学生"${student.name}"吗？这将删除该学生的所有数据！`)) return;
  
  await deleteStudent(student.id);
  await loadStudents();
};

// 打开批量导入
const openBatchImport = () => {
  batchImportText.value = '';
  showBatchImport.value = true;
};

// 批量导入学生
const handleBatchImport = async () => {
  if (!batchImportText.value.trim()) {
    alert('请输入学生数据');
    return;
  }
  
  try {
    const lines = batchImportText.value.trim().split('\n');
    let successCount = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // 支持多种分隔符：空格、制表符、逗号
      const parts = trimmedLine.split(/[\s\t,]+/);
      
      if (parts.length >= 1) {
        const name = parts[0];
        const studentNumber = parts[1] || '';
        // 第三列是生日，不是小组！所有学生默认进入"未分组"
        const birthday = parts[2] || '';
        
        await createStudent({
          name,
          studentNumber,
          group: '未分组', // 所有学生默认未分组
          birthday,
          classId: currentClassId.value
        });
        
        successCount++;
      }
    }
    
    alert(`成功导入 ${successCount} 名学生！`);
    showBatchImport.value = false;
    await loadStudents();
  } catch (error) {
    alert('导入失败：' + error.message);
  }
};

// 批量删除所有学生
const handleBatchDeleteAll = async () => {
  if (students.value.length === 0) {
    alert('当前班级没有学生');
    return;
  }
  
  const confirmed = confirm(`⚠️ 危险操作！\n\n确定要删除本班所有 ${students.value.length} 名学生吗？\n此操作将删除所有学生数据，包括积分、日志、任务记录等，且无法恢复！\n\n请再次确认！`);
  
  if (!confirmed) return;
  
  // 二次确认
  const doubleConfirmed = confirm(`最后确认：真的要删除全部 ${students.value.length} 名学生吗？`);
  if (!doubleConfirmed) return;
  
  try {
    for (const student of students.value) {
      await deleteStudent(student.id);
    }
    alert(`✅ 已成功删除 ${students.value.length} 名学生`);
    await loadStudents();
  } catch (error) {
    alert('删除失败：' + error.message);
  }
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="fixed inset-0 z-50 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
    <!-- 顶部导航栏 -->
    <div class="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg p-4 z-10">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="emit('exit')" class="btn-game bg-gradient-to-r from-gray-400 to-gray-500 text-sm">
            ← 返回主控台
          </button>
          <h1 class="text-3xl font-bold text-gray-800">🏫 班级与学生管理</h1>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="relative w-full h-full pt-24 pb-8 overflow-y-auto">
      <div class="max-w-7xl mx-auto px-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 左侧：班级列表 -->
          <div class="card-cute p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-2xl font-bold text-gray-800">📚 班级列表</h2>
              <button @click="openClassForm" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                ➕ 新建
              </button>
            </div>

            <div class="space-y-2">
              <div
                v-for="cls in classes"
                :key="cls.id"
                :class="[
                  'p-4 rounded-xl cursor-pointer transition-all',
                  currentClassId === cls.id 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                    : 'bg-white/50 hover:bg-white/80'
                ]"
                @click="switchClass(cls.id)"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-bold text-lg">{{ cls.name }}</div>
                    <div class="text-sm opacity-80">{{ cls.description || '暂无描述' }}</div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      @click.stop="editClass(cls)"
                      class="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                    >
                      编辑
                    </button>
                    <button
                      v-if="classes.length > 1"
                      @click.stop="handleDeleteClass(cls)"
                      class="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：学生列表 -->
          <div class="lg:col-span-2 card-cute p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-2xl font-bold text-gray-800">
                👥 {{ currentClass?.name }} - 学生列表 ({{ students.length }}人)
              </h2>
              <div class="flex gap-2">
                <button @click="openBatchImport" class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                  📋 批量导入
                </button>
                <button @click="openStudentForm" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                  ➕ 添加学生
                </button>
                <button 
                  v-if="students.length > 0"
                  @click="handleBatchDeleteAll" 
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold"
                >
                  🗑️ 批量删除
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">学号</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">姓名</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">小组</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">总积分</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">金币</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">生日</th>
                    <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="student in students"
                    :key="student.id"
                    class="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td class="px-4 py-3 text-sm text-gray-600">{{ student.studentNumber }}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-gray-800">{{ student.name }}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">{{ student.group }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-sm font-bold">
                        {{ student.totalPoints }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-bold">
                        {{ student.availablePoints }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">{{ student.birthday || '-' }}</td>
                    <td class="px-4 py-3 text-center">
                      <div class="flex gap-2 justify-center">
                        <button
                          @click="editStudent(student)"
                          class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                          编辑
                        </button>
                        <button
                          @click="handleDeleteStudent(student)"
                          class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div v-if="students.length === 0" class="text-center py-12 text-gray-500">
                暂无学生，点击"添加学生"开始添加
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 班级表单弹窗 -->
    <div v-if="showClassForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">
          {{ editingClass ? '编辑班级' : '新建班级' }}
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">班级名称</label>
            <input
              v-model="classForm.name"
              type="text"
              placeholder="例如：四年级二班"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">班级描述</label>
            <textarea
              v-model="classForm.description"
              placeholder="选填"
              rows="3"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none"
            ></textarea>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="saveClass"
            class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-bold hover:shadow-lg transition-all"
          >
            保存
          </button>
          <button
            @click="showClassForm = false"
            class="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all"
          >
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- 学生表单弹窗 -->
    <div v-if="showStudentForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">
          {{ editingStudent ? '编辑学生' : '添加学生' }}
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">学生姓名 *</label>
            <input
              v-model="studentForm.name"
              type="text"
              placeholder="例如：张三"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">学号</label>
            <input
              v-model="studentForm.studentNumber"
              type="text"
              placeholder="例如：001"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">小组</label>
            <input
              v-model="studentForm.group"
              type="text"
              placeholder="例如：阳光小组"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">生日 (MM-DD)</label>
            <input
              v-model="studentForm.birthday"
              type="text"
              placeholder="例如：08-20"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none"
            />
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="saveStudent"
            class="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold hover:shadow-lg transition-all"
          >
            保存
          </button>
          <button
            @click="showStudentForm = false"
            class="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all"
          >
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- 批量导入弹窗 -->
    <div v-if="showBatchImport" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-3xl p-8 max-w-3xl w-full mx-4 shadow-2xl">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">
          📋 批量导入学生
        </h3>

        <div class="bg-blue-50 rounded-xl p-4 mb-4">
          <h4 class="font-bold text-blue-800 mb-2">📝 导入格式说明</h4>
          <p class="text-sm text-blue-700 mb-2">每行一个学生，格式：姓名 学号 生日(MM-DD)</p>
          <p class="text-sm text-blue-700 mb-2">可以使用空格、制表符或逗号分隔</p>
          <p class="text-sm text-blue-700 mb-2 font-semibold text-purple-600">✨ 系统会自动为每位学生随机分配金木水火土五种精灵之一</p>
          <p class="text-sm text-blue-700 mb-2 font-semibold text-red-600">⚠️ 所有学生导入后默认进入"未分组"状态</p>
          <p class="text-sm text-blue-700 font-bold">示例：</p>
          <pre class="text-xs bg-white p-2 rounded mt-2 text-gray-700">张三 001 08-20
李四 002 09-15
王五 003 12-25
赵六 004</pre>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              粘贴学生数据（支持从Excel复制）
            </label>
            <textarea
              v-model="batchImportText"
              placeholder="请粘贴学生数据，每行一个学生"
              rows="12"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-400 focus:outline-none font-mono text-sm"
            ></textarea>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="handleBatchImport"
            class="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:shadow-lg transition-all"
          >
            开始导入
          </button>
          <button
            @click="showBatchImport = false"
            class="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-all"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 样式继承自全局 */
</style>
