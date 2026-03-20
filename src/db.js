import Dexie from 'dexie';

// 创建数据库实例
export const db = new Dexie('ClassPetSystem');

// 定义数据库结构
db.version(8).stores({
  // 班级表
  classes: '++id, name, description, createdDate',
  
  // 学生表 - 新增changePetCount(换宠次数)和badges(勋章JSON)
  students: '++id, classId, name, group, studentNumber, totalPoints, availablePoints, petStage, petStatus, consecutiveCheckIn, petExp, lastInteractionTime, birthday, petTypeId, changePetCount, badges',
  
  // 积分变动日志表
  logs: '++id, studentId, points, reason, timestamp',
  
  // 系统设置表
  settings: 'key, value',
  
  // 任务表
  tasks: '++id, classId, name, rewardPoints, status, date',
  
  // 夸夸墙表
  praises: '++id, studentId, content, date, bgColor, style',
  
  // 学生任务完成记录表
  studentTasks: '++id, studentId, taskId, completed, completedDate',
  
  // 小组表
  groups: '++id, classId, name, color, order',
  
  // 商品表
  shopItems: '++id, classId, name, price, stock, icon, description',
  
  // 兑换记录表
  redemptions: '++id, studentId, itemId, timestamp',
  
  // PK对战记录表
  pkBattles: '++id, player1Id, player2Id, winnerId, timestamp, battleData',
  
  // 精灵类型表
  petTypes: '++id, name, description, emoji, element',
  
  // 精灵图片表 (Base64存储) - 添加联合索引
  petImages: '++id, petTypeId, stage, [petTypeId+stage], imageBase64',
  
  // Boss表 - 16种属性Boss
  bosses: '++id, element, name, description, emoji, hp, imageBase64',
  
  // Boss挑战记录表
  bossChallenge: '++id, studentId, bossId, success, timestamp, score',
  
  // Boss题库表
  bossQuestions: '++id, bossId, question, options, correctAnswer',
  
  // 🆕 学生曾经拥有的精灵记录表（精灵图鉴）
  ownedPets: '++id, studentId, petTypeId, maxStage, maxExp, timestamp'
}).upgrade(tx => {
  // 数据迁移：为现有数据添加 classId
  return tx.table('students').toCollection().modify(student => {
    if (!student.classId) {
      student.classId = 1; // 默认班级ID
    }
    if (!student.petTypeId) {
      student.petTypeId = 1; // 默认精灵类型
    }
  });
});

// 初始化测试数据
export async function initTestData() {
  // 初始化默认班级
  const classCount = await db.classes.count();
  if (classCount === 0) {
    await db.classes.add({
      name: '',
      description: '默认班级',
      createdDate: new Date().toISOString()
    });
  }
  
  const count = await db.students.count();
  
  // 如果已有数据，不重复初始化
  if (count > 0) {
    console.log('数据库已有数据，跳过初始化');
    await initTasks(); // 确保任务数据存在
    return;
  }

  // 获取今天的日期（MM-DD格式）
  const today = new Date();
  const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 插入 5 个测试学生 - 所有学生初始都在"未分组"，随机分配五行精灵
  const testStudents = [
    {
      classId: 1,
      name: '小明',
      group: '未分组',
      studentNumber: '001',
      totalPoints: 100,
      availablePoints: 100,
      petStage: 1,
      petStatus: 'happy',
      consecutiveCheckIn: 3,
      petExp: 0,
      lastInteractionTime: new Date().toISOString(),
      birthday: todayStr, // 今天生日
      petTypeId: 1, // 炎火猴
      changePetCount: 0,
      badges: JSON.stringify([])
    },
    {
      classId: 1,
      name: '小红',
      group: '未分组',
      studentNumber: '002',
      totalPoints: 150,
      availablePoints: 150,
      petStage: 1,
      petStatus: 'happy',
      consecutiveCheckIn: 5,
      petExp: 30,
      lastInteractionTime: new Date().toISOString(),
      birthday: '05-20',
      petTypeId: 2, // 水晶兽
      changePetCount: 0,
      badges: JSON.stringify([])
    },
    {
      classId: 1,
      name: '小刚',
      group: '未分组',
      studentNumber: '003',
      totalPoints: 80,
      availablePoints: 80,
      petStage: 1,
      petStatus: 'normal',
      consecutiveCheckIn: 1,
      petExp: 10,
      lastInteractionTime: new Date().toISOString(),
      birthday: '09-15',
      petTypeId: 3, // 绿叶龙
      changePetCount: 0,
      badges: JSON.stringify([])
    },
    {
      classId: 1,
      name: '小美',
      group: '未分组',
      studentNumber: '004',
      totalPoints: 200,
      availablePoints: 200,
      petStage: 2,
      petStatus: 'excited',
      consecutiveCheckIn: 7,
      petExp: 80,
      lastInteractionTime: new Date().toISOString(),
      birthday: todayStr, // 今天生日
      petTypeId: 4, // 金刚石
      changePetCount: 0,
      badges: JSON.stringify([])
    },
    {
      classId: 1,
      name: '小华',
      group: '未分组',
      studentNumber: '005',
      totalPoints: 120,
      availablePoints: 120,
      petStage: 1,
      petStatus: 'happy',
      consecutiveCheckIn: 4,
      petExp: 45,
      lastInteractionTime: new Date().toISOString(),
      birthday: '12-25',
      petTypeId: 5, // 岩石巨人
      changePetCount: 0,
      badges: JSON.stringify([])
    }
  ];

  await db.students.bulkAdd(testStudents);
  
  // 为每个学生添加初始日志
  const students = await db.students.toArray();
  const initialLogs = students.map(student => ({
    studentId: student.id,
    points: student.totalPoints,
    reason: '初始积分',
    timestamp: new Date().toISOString()
  }));
  
  await db.logs.bulkAdd(initialLogs);

  // 初始化系统设置
  await db.settings.bulkAdd([
    { key: 'password', value: '1234' },
    { key: 'pointRules', value: JSON.stringify({
      homework: 10,
      behavior: 5,
      attendance: 3,
      help: 8
    })},
    { key: 'petConfig', value: JSON.stringify({
      stages: ['蛋', '幼年', '少年', '成年'],
      stageThresholds: [0, 100, 300, 600]
    })}
  ]);

  console.log('✅ 测试数据初始化完成');
  
  // 初始化任务
  await initTasks();
  
  // 初始化小组
  await initGroups(1);
  
  // 初始化商品
  await initShopItems(1);
  
  // 初始化默认配置
  await initDefaultSettings();
  
  // 初始化精灵类型
  await initPetTypes();
  
  // 初始化Boss
  await initBosses();
}

// 获取所有学生
export async function getAllStudents() {
  return await db.students.toArray();
}

// 获取单个学生
export async function getStudent(id) {
  return await db.students.get(id);
}

// 更新学生积分
export async function updateStudentPoints(studentId, points, reason) {
  const student = await db.students.get(studentId);
  if (!student) return;

  const newTotal = student.totalPoints + points;
  const newAvailable = student.availablePoints + points;

  await db.students.update(studentId, {
    totalPoints: newTotal,
    availablePoints: newAvailable
  });

  // 记录日志
  await db.logs.add({
    studentId,
    points,
    reason,
    timestamp: new Date().toISOString()
  });
}

// 获取学生的积分日志
export async function getStudentLogs(studentId) {
  return await db.logs
    .where('studentId')
    .equals(studentId)
    .reverse()
    .toArray();
}

// 喂养宠物（消耗金币，增加经验）
export async function feedPet(studentId, cost, expGain, actionName) {
  const student = await db.students.get(studentId);
  if (!student) return { success: false, message: '学生不存在' };
  
  // 检查金币是否充足
  if (student.availablePoints < cost) {
    return { success: false, message: '金币不足！' };
  }
  
  // 扣除金币，增加经验
  const newAvailablePoints = student.availablePoints - cost;
  const newExp = student.petExp + expGain;
  
  // 计算新的宠物阶段
  const newStage = calculatePetStage(newExp);
  const oldStage = student.petStage;
  
  await db.students.update(studentId, {
    availablePoints: newAvailablePoints,
    petExp: newExp,
    petStage: newStage,
    lastInteractionTime: new Date().toISOString()
  });
  
  // 记录日志
  await db.logs.add({
    studentId,
    points: -cost,
    reason: `${actionName}（获得${expGain}经验）`,
    timestamp: new Date().toISOString()
  });
  
  return { 
    success: true, 
    message: `${actionName}成功！`,
    levelUp: newStage > oldStage,
    newStage,
    oldStage
  };
}

// 计算宠物阶段
function calculatePetStage(exp) {
  if (exp >= 1000) return 6; // 究极体
  if (exp >= 600) return 5;  // 完全体
  if (exp >= 300) return 4;  // 青年期
  if (exp >= 150) return 3;  // 成长期
  if (exp >= 50) return 2;   // 幼年期
  return 1;                   // 萌蛋期
}

// 更新宠物状态
export async function updatePetStatus(studentId, status) {
  await db.students.update(studentId, {
    petStatus: status,
    lastInteractionTime: new Date().toISOString()
  });
}


// 初始化任务数据
export async function initTasks() {
  const count = await db.tasks.count();
  if (count > 0) return;

  const defaultTasks = [
    { name: '早读声音洪亮', rewardPoints: 5, status: 'active', date: new Date().toISOString() },
    { name: '按时提交作业', rewardPoints: 5, status: 'active', date: new Date().toISOString() },
    { name: '主动打扫卫生', rewardPoints: 5, status: 'active', date: new Date().toISOString() },
    { name: '踏虎凿花社团练习', rewardPoints: 8, status: 'active', date: new Date().toISOString() },
    { name: '帮助同学解答问题', rewardPoints: 6, status: 'active', date: new Date().toISOString() }
  ];

  await db.tasks.bulkAdd(defaultTasks);
  console.log('✅ 任务数据初始化完成');
}

// 获取所有任务
export async function getAllTasks() {
  return await db.tasks.toArray();
}

// 获取学生的任务完成记录
export async function getStudentTaskRecords(studentId) {
  return await db.studentTasks
    .where('studentId')
    .equals(studentId)
    .toArray();
}

// 完成任务
export async function completeTask(studentId, taskId) {
  const task = await db.tasks.get(taskId);
  if (!task) return { success: false, message: '任务不存在' };

  // 检查今天是否已完成
  const today = new Date().toDateString();
  const existingRecord = await db.studentTasks
    .where(['studentId', 'taskId'])
    .equals([studentId, taskId])
    .first();

  if (existingRecord && new Date(existingRecord.completedDate).toDateString() === today) {
    return { success: false, message: '今天已完成此任务' };
  }

  // 记录任务完成
  await db.studentTasks.add({
    studentId,
    taskId,
    completed: true,
    completedDate: new Date().toISOString()
  });

  // 增加积分
  await updateStudentPoints(studentId, task.rewardPoints, `完成任务：${task.name}`);

  return { success: true, message: '任务完成！', rewardPoints: task.rewardPoints };
}

// 获取所有夸夸墙内容
export async function getAllPraises() {
  return await db.praises.orderBy('date').reverse().toArray();
}

// 添加夸夸墙内容
export async function addPraise(studentId, content, bgColor = '#FFE4E1', style = 'default') {
  const praiseId = await db.praises.add({
    studentId,
    content,
    date: new Date().toISOString(),
    bgColor,
    style
  });

  // 更新宠物状态为超级开心
  await updatePetStatus(studentId, 'excited');

  // 奖励20经验值
  const student = await db.students.get(studentId);
  if (student) {
    const newExp = student.petExp + 20;
    const newStage = calculatePetStage(newExp);
    
    await db.students.update(studentId, {
      petExp: newExp,
      petStage: newStage
    });
  }

  // 记录日志
  await db.logs.add({
    studentId,
    points: 0,
    reason: '收到表扬（获得20经验）',
    timestamp: new Date().toISOString()
  });

  return { success: true, praiseId, expGain: 20 };
}


// 检查今天是否是学生生日
export function isBirthday(student) {
  if (!student.birthday) return false;
  const today = new Date();
  const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return student.birthday === todayStr;
}

// 发送生日礼物
export async function sendBirthdayGift(studentId) {
  const student = await db.students.get(studentId);
  if (!student) return { success: false };

  // 检查今天是否已经发送过生日礼物
  const today = new Date().toDateString();
  const todayLogs = await db.logs
    .where('studentId')
    .equals(studentId)
    .filter(log => {
      return new Date(log.timestamp).toDateString() === today && 
             log.reason === '生日礼物';
    })
    .toArray();

  if (todayLogs.length > 0) {
    return { success: false, message: '今天已经领取过生日礼物了' };
  }

  // 赠送50金币
  await db.students.update(studentId, {
    availablePoints: student.availablePoints + 50,
    totalPoints: student.totalPoints + 50
  });

  // 记录日志
  await db.logs.add({
    studentId,
    points: 50,
    reason: '生日礼物',
    timestamp: new Date().toISOString()
  });

  return { success: true, gift: 50 };
}

// 获取最近7天的积分趋势
export async function getPointsTrend(days = 7) {
  const logs = await db.logs.toArray();
  const trend = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    
    const dayLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.toDateString() === date.toDateString();
    });
    
    const totalPoints = dayLogs.reduce((sum, log) => sum + log.points, 0);
    trend.push({ date: dateStr, points: totalPoints });
  }
  
  return trend;
}

// 获取段位分布
export async function getRankDistribution() {
  const students = await db.students.toArray();
  const distribution = {
    '热血青铜': 0,
    '不屈白银': 0,
    '英勇黄金': 0,
    '不朽星钻': 0,
    '超级王牌': 0,
    '无敌战神': 0
  };

  students.forEach(student => {
    const points = student.totalPoints;
    if (points >= 2001) distribution['无敌战神']++;
    else if (points >= 1501) distribution['超级王牌']++;
    else if (points >= 1001) distribution['不朽星钻']++;
    else if (points >= 501) distribution['英勇黄金']++;
    else if (points >= 201) distribution['不屈白银']++;
    else distribution['热血青铜']++;
  });

  return distribution;
}

// ==================== 班级管理 ====================

// 获取所有班级
export async function getAllClasses() {
  return await db.classes.toArray();
}

// 获取单个班级
export async function getClass(id) {
  return await db.classes.get(id);
}

// 创建班级
export async function createClass(name, description = '') {
  const classId = await db.classes.add({
    name,
    description,
    createdDate: new Date().toISOString()
  });
  return { success: true, classId };
}

// 更新班级
export async function updateClass(id, data) {
  await db.classes.update(id, data);
  return { success: true };
}

// 删除班级
export async function deleteClass(id) {
  // 检查是否有学生
  const students = await db.students.where('classId').equals(id).count();
  if (students > 0) {
    return { success: false, message: '该班级还有学生，无法删除' };
  }
  await db.classes.delete(id);
  return { success: true };
}

// 获取班级的学生列表
export async function getClassStudents(classId) {
  return await db.students.where('classId').equals(classId).toArray();
}

// ==================== 学生管理 ====================

// 创建学生
export async function createStudent(data) {
  // 如果没有指定精灵，随机分配金木水火土五种基础精灵之一（petTypeId: 1-5）
  let petTypeId = data.petTypeId;
  if (!petTypeId) {
    // 随机选择1-5之间的精灵ID（对应金木水火土五只精灵）
    petTypeId = Math.floor(Math.random() * 5) + 1;
  }
  
  const studentId = await db.students.add({
    classId: data.classId || 1,
    name: data.name,
    group: data.group || '未分组',
    studentNumber: data.studentNumber || '',
    totalPoints: 0,
    availablePoints: 0,
    petStage: 1,
    petStatus: 'happy',
    consecutiveCheckIn: 0,
    petExp: 0,
    lastInteractionTime: new Date().toISOString(),
    birthday: data.birthday || '',
    petTypeId: petTypeId,
    changePetCount: 0, // 换宠次数
    badges: JSON.stringify([]) // 勋章列表
  });
  
  // 添加初始日志
  await db.logs.add({
    studentId,
    points: 0,
    reason: '新建学生',
    timestamp: new Date().toISOString()
  });
  
  return { success: true, studentId };
}

// 更新学生信息
export async function updateStudent(id, data) {
  await db.students.update(id, data);
  return { success: true };
}

// 删除学生
export async function deleteStudent(id) {
  await db.students.delete(id);
  // 删除相关日志
  await db.logs.where('studentId').equals(id).delete();
  // 删除相关任务记录
  await db.studentTasks.where('studentId').equals(id).delete();
  // 删除相关夸夸墙
  await db.praises.where('studentId').equals(id).delete();
  return { success: true };
}

// 批量更新学生积分
export async function batchUpdatePoints(studentIds, points, reason) {
  for (const studentId of studentIds) {
    await updateStudentPoints(studentId, points, reason);
  }
  return { success: true };
}



// ==================== 小组管理 ====================

// 初始化默认小组
export async function initGroups(classId = 1) {
  const count = await db.groups.where('classId').equals(classId).count();
  if (count > 0) return;

  const defaultGroups = [
    { classId, name: '阳光小组', color: '#FFD700', order: 1 },
    { classId, name: '彩虹小组', color: '#FF69B4', order: 2 },
    { classId, name: '星星小组', color: '#87CEEB', order: 3 },
    { classId, name: '月亮小组', color: '#9370DB', order: 4 }
  ];

  await db.groups.bulkAdd(defaultGroups);
}

// 获取班级的所有小组
export async function getClassGroups(classId) {
  return await db.groups.where('classId').equals(classId).sortBy('order');
}

// 创建小组
export async function createGroup(classId, name, color = '#3B82F6') {
  const maxOrder = await db.groups.where('classId').equals(classId).count();
  const groupId = await db.groups.add({
    classId,
    name,
    color,
    order: maxOrder + 1
  });
  return { success: true, groupId };
}

// 更新小组
export async function updateGroup(id, data) {
  await db.groups.update(id, data);
  return { success: true };
}

// 删除小组
export async function deleteGroup(id) {
  await db.groups.delete(id);
  return { success: true };
}

// 更新学生小组
export async function updateStudentGroup(studentId, groupName) {
  await db.students.update(studentId, { group: groupName });
  return { success: true };
}

// 获取小组统计
export async function getGroupStats(classId, groupName) {
  const students = await db.students
    .where('classId').equals(classId)
    .and(s => s.group === groupName)
    .toArray();
  
  const totalPoints = students.reduce((sum, s) => sum + s.totalPoints, 0);
  const avgPoints = students.length > 0 ? Math.round(totalPoints / students.length) : 0;
  
  return {
    count: students.length,
    totalPoints,
    avgPoints
  };
}

// ==================== 商店管理 ====================

// 初始化商品
export async function initShopItems(classId = 1) {
  const count = await db.shopItems.where('classId').equals(classId).count();
  if (count > 0) return;

  const defaultItems = [
    { classId, name: '免抄写一次', price: 40, stock: 10, icon: '📝', description: '免除一次抄写作业' },
    { classId, name: '免值日一次', price: 40, stock: 10, icon: '🧹', description: '免除一次值日任务' },
    { classId, name: '免背书一次', price: 40, stock: 10, icon: '📖', description: '免除一次背书任务' },
    { classId, name: '选座位权', price: 60, stock: 5, icon: '💺', description: '可以选择自己的座位' },
    { classId, name: '小组长一周', price: 80, stock: 3, icon: '👑', description: '担任小组长一周' },
    { classId, name: '神秘礼物', price: 100, stock: 2, icon: '🎁', description: '神秘的惊喜礼物' }
  ];

  await db.shopItems.bulkAdd(defaultItems);
}

// 获取商品列表
export async function getShopItems(classId) {
  return await db.shopItems.where('classId').equals(classId).toArray();
}

// 兑换商品
export async function redeemItem(studentId, itemId) {
  const student = await db.students.get(studentId);
  const item = await db.shopItems.get(itemId);
  
  if (!student || !item) {
    return { success: false, message: '数据不存在' };
  }
  
  if (student.availablePoints < item.price) {
    return { success: false, message: '金币不足' };
  }
  
  if (item.stock <= 0) {
    return { success: false, message: '商品已售罄' };
  }
  
  // 扣除金币
  await db.students.update(studentId, {
    availablePoints: student.availablePoints - item.price
  });
  
  // 减少库存
  await db.shopItems.update(itemId, {
    stock: item.stock - 1
  });
  
  // 记录兑换
  await db.redemptions.add({
    studentId,
    itemId,
    timestamp: new Date().toISOString()
  });
  
  // 记录日志
  await db.logs.add({
    studentId,
    points: -item.price,
    reason: `兑换商品：${item.name}`,
    timestamp: new Date().toISOString()
  });
  
  return { success: true, message: '兑换成功' };
}

// 获取兑换记录
export async function getRedemptions(studentId) {
  return await db.redemptions
    .where('studentId')
    .equals(studentId)
    .reverse()
    .toArray();
}


// ==================== 系统配置管理 ====================

// 获取配置
export async function getSetting(key) {
  const setting = await db.settings.get(key);
  return setting ? setting.value : null;
}

// 保存配置
export async function saveSetting(key, value) {
  await db.settings.put({ key, value });
  return { success: true };
}

// 获取所有配置
export async function getAllSettings() {
  const settings = await db.settings.toArray();
  const result = {};
  settings.forEach(s => {
    result[s.key] = s.value;
  });
  return result;
}

// 初始化默认配置
export async function initDefaultSettings() {
  const existingSettings = await db.settings.count();
  if (existingSettings > 0) return;

  const defaultSettings = [
    { key: 'password', value: '1234' },
    { key: 'passwordEnabled', value: false },
    { key: 'theme', value: 'cute' }, // cute: 可爱风格, cool: 炫酷风格
    { 
      key: 'pointRules', 
      value: JSON.stringify({
        add: [
          { label: '积极发言', points: 2, icon: '🗣️' },
          { label: '作业优秀', points: 5, icon: '📝' },
          { label: '帮助同学', points: 3, icon: '🤝' },
          { label: '课堂表现', points: 3, icon: '⭐' },
          { label: '创意作品', points: 8, icon: '🎨' },
          { label: '值日认真', points: 3, icon: '🧹' }
        ],
        deduct: [
          { label: '未交作业', points: -5, icon: '❌' },
          { label: '上课讲话', points: -3, icon: '🔇' },
          { label: '迟到早退', points: -4, icon: '⏰' },
          { label: '不守纪律', points: -6, icon: '⚠️' }
        ]
      })
    },
    {
      key: 'petStages',
      value: JSON.stringify([
        { stage: 1, name: '萌蛋期', minExp: 0, maxExp: 50 },
        { stage: 2, name: '幼年期', minExp: 51, maxExp: 150 },
        { stage: 3, name: '成长期', minExp: 151, maxExp: 300 },
        { stage: 4, name: '青年期', minExp: 301, maxExp: 600 },
        { stage: 5, name: '完全体', minExp: 601, maxExp: 1000 },
        { stage: 6, name: '究极体', minExp: 1001, maxExp: 999999 }
      ])
    }
  ];

  await db.settings.bulkAdd(defaultSettings);
}

// 获取加减分规则
export async function getPointRules() {
  const rules = await getSetting('pointRules');
  return rules ? JSON.parse(rules) : { add: [], deduct: [] };
}

// 保存加减分规则
export async function savePointRules(rules) {
  await saveSetting('pointRules', JSON.stringify(rules));
  return { success: true };
}

// 获取宠物阶段配置
export async function getPetStages() {
  const stages = await getSetting('petStages');
  return stages ? JSON.parse(stages) : [];
}

// 保存宠物阶段配置
export async function savePetStages(stages) {
  await saveSetting('petStages', JSON.stringify(stages));
  return { success: true };
}

// ==================== PK对战系统 ====================

// 创建PK对战
export async function createPKBattle(player1Id, player2Id, battleData) {
  const battleId = await db.pkBattles.add({
    player1Id,
    player2Id,
    winnerId: null,
    timestamp: new Date().toISOString(),
    battleData: JSON.stringify(battleData)
  });
  return { success: true, battleId };
}

// 完成PK对战
export async function completePKBattle(battleId, winnerId, reward) {
  await db.pkBattles.update(battleId, { winnerId });
  
  // 发放奖励
  if (winnerId && reward > 0) {
    await updateStudentPoints(winnerId, reward, 'PK对战获胜');
  }
  
  return { success: true };
}

// 获取PK对战记录
export async function getPKBattles(studentId) {
  return await db.pkBattles
    .filter(b => b.player1Id === studentId || b.player2Id === studentId)
    .reverse()
    .toArray();
}

// ==================== 精灵图片管理 ====================

// 初始化精灵类型
export async function initPetTypes() {
  // 确保5只基础精灵存在（金木水火土）- ID固定为1-5
  const basicPets = [
    { name: '炎火猴', description: '热情如火的精灵', emoji: '🔥', element: 'fire' },
    { name: '水晶兽', description: '温柔如水的精灵', emoji: '💧', element: 'water' },
    { name: '绿叶龙', description: '生机勃勃的精灵', emoji: '🌳', element: 'wood' },
    { name: '金刚石', description: '坚硬无比的精灵', emoji: '⚙️', element: 'metal' },
    { name: '岩石巨人', description: '厚重稳固的精灵', emoji: '🪨', element: 'earth' }
  ];

  for (let i = 0; i < basicPets.length; i++) {
    const petId = i + 1;
    const existing = await db.petTypes.get(petId);
    if (!existing) {
      // 使用put而不是add，确保ID固定
      await db.petTypes.put({ id: petId, ...basicPets[i] });
      console.log(`✅ 创建基础精灵 ID=${petId}: ${basicPets[i].name}`);
    }
  }
  
  console.log('✅ 精灵类型初始化完成');
}

// 获取所有精灵类型
export async function getAllPetTypes() {
  return await db.petTypes.toArray();
}

// 创建精灵类型
export async function createPetType(name, description, emoji, element = '') {
  const petTypeId = await db.petTypes.add({ name, description, emoji, element });
  return { success: true, petTypeId };
}

// 更新精灵类型
export async function updatePetType(id, data) {
  await db.petTypes.update(id, data);
  return { success: true };
}

// 删除精灵类型
export async function deletePetType(id) {
  // 检查是否有学生使用该精灵类型
  const students = await db.students.where('petTypeId').equals(id).count();
  if (students > 0) {
    return { success: false, message: '有学生正在使用该精灵类型，无法删除' };
  }
  
  // 删除该类型的所有图片
  await db.petImages.where('petTypeId').equals(id).delete();
  await db.petTypes.delete(id);
  return { success: true };
}

// 保存精灵图片 (Base64)
export async function savePetImage(petTypeId, stage, imageBase64) {
  // 检查是否已存在该精灵类型和阶段的图片
  const existing = await db.petImages
    .where(['petTypeId', 'stage'])
    .equals([petTypeId, stage])
    .first();
  
  if (existing) {
    // 更新现有图片
    await db.petImages.update(existing.id, { imageBase64 });
  } else {
    // 添加新图片
    await db.petImages.add({ petTypeId, stage, imageBase64 });
  }
  
  return { success: true };
}

// 获取精灵图片
export async function getPetImage(petTypeId, stage) {
  const image = await db.petImages
    .where(['petTypeId', 'stage'])
    .equals([petTypeId, stage])
    .first();
  
  return image ? image.imageBase64 : null;
}

// 获取精灵类型的所有图片
export async function getPetTypeImages(petTypeId) {
  return await db.petImages.where('petTypeId').equals(petTypeId).toArray();
}

// 删除精灵图片
export async function deletePetImage(petTypeId, stage) {
  await db.petImages
    .where(['petTypeId', 'stage'])
    .equals([petTypeId, stage])
    .delete();
  return { success: true };
}

// 获取学生的精灵图片
export async function getStudentPetImage(studentId) {
  const student = await db.students.get(studentId);
  if (!student) return null;
  
  const petTypeId = student.petTypeId || 1;
  const stage = student.petStage || 1;
  
  return await getPetImage(petTypeId, stage);
}

// 获取精灵类型信息（包含Emoji兜底）
export async function getPetTypeInfo(petTypeId) {
  const petType = await db.petTypes.get(petTypeId);
  return petType || { name: '默认精灵', emoji: '🥚', description: '可爱的精灵' };
}


// ==================== Boss副本系统 ====================

// 初始化16种属性Boss
export async function initBosses() {
  const count = await db.bosses.count();
  if (count > 0) return;

  const defaultBosses = [
    { element: 'fire', name: '炎魔领主', description: '火焰的主宰', emoji: '🔥👹', hp: 10 },
    { element: 'water', name: '深海霸主', description: '海洋的统治者', emoji: '💧🐋', hp: 10 },
    { element: 'wood', name: '森林守护', description: '自然的化身', emoji: '🌳🦌', hp: 10 },
    { element: 'metal', name: '钢铁巨兽', description: '金属的意志', emoji: '⚙️🤖', hp: 10 },
    { element: 'earth', name: '大地泰坦', description: '山岳的力量', emoji: '🪨👹', hp: 10 },
    { element: 'thunder', name: '雷霆之神', description: '闪电的怒吼', emoji: '⚡👹', hp: 10 },
    { element: 'ice', name: '冰霜巨龙', description: '寒冰的君王', emoji: '❄️🐉', hp: 10 },
    { element: 'holy', name: '圣光天使', description: '神圣的审判', emoji: '✝️👼', hp: 10 },
    { element: 'dark', name: '暗影魔王', description: '黑暗的支配', emoji: '😈👹', hp: 10 },
    { element: 'demon', name: '妖魔鬼怪', description: '邪恶的化身', emoji: '👹😈', hp: 10 },
    { element: 'wind', name: '风暴之眼', description: '狂风的咆哮', emoji: '🌪️👹', hp: 10 },
    { element: 'poison', name: '剧毒蜘蛛', description: '毒液的源泉', emoji: '☠️🕷️', hp: 10 },
    { element: 'illusion', name: '幻影魅魔', description: '迷幻的诱惑', emoji: '✨👻', hp: 10 },
    { element: 'wing', name: '天空霸主', description: '翱翔的王者', emoji: '🦅👹', hp: 10 },
    { element: 'machine', name: '机械暴君', description: '科技的极致', emoji: '🤖👹', hp: 10 },
    { element: 'spirit', name: '幽灵之王', description: '灵魂的收割', emoji: '👻💀', hp: 10 }
  ];

  await db.bosses.bulkAdd(defaultBosses);
  console.log('✅ Boss初始化完成');
}

// 获取所有Boss
export async function getAllBosses() {
  return await db.bosses.toArray();
}

// 检查学生今天是否已挑战过Boss
export async function hasChallengeBossToday(studentId) {
  const today = new Date().toDateString();
  const record = await db.bossChallenge
    .where('studentId')
    .equals(studentId)
    .filter(r => new Date(r.timestamp).toDateString() === today)
    .first();
  return !!record;
}

// 记录Boss挑战
export async function recordBossChallenge(studentId, bossId, success, score) {
  await db.bossChallenge.add({
    studentId,
    bossId,
    success,
    timestamp: new Date().toISOString(),
    score
  });
  
  // 如果成功，添加勋章
  if (success) {
    const student = await db.students.get(studentId);
    const boss = await db.bosses.get(bossId);
    
    if (student && boss) {
      const badges = JSON.parse(student.badges || '[]');
      const isNewBadge = !badges.includes(boss.element); // 判断是否是新勋章
      
      if (isNewBadge) {
        badges.push(boss.element);
        await db.students.update(studentId, { badges: JSON.stringify(badges) });
      }
      
      // 奖励经验
      const expReward = 50;
      const newExp = student.petExp + expReward;
      const newStage = calculatePetStage(newExp);
      
      await db.students.update(studentId, {
        petExp: newExp,
        petStage: newStage
      });
      
      return { success: true, expReward, newStage, oldStage: student.petStage, isNewBadge };
    }
  }
  
  return { success };
}

// 获取Boss题库
export async function getBossQuestions(bossId) {
  return await db.bossQuestions.where('bossId').equals(bossId).toArray();
}

// 添加Boss题目
export async function addBossQuestion(bossId, question, options, correctAnswer) {
  await db.bossQuestions.add({ bossId, question, options, correctAnswer });
  return { success: true };
}

// 删除Boss题目
export async function deleteBossQuestion(questionId) {
  await db.bossQuestions.delete(questionId);
  return { success: true };
}

// 检查是否有学生达到满级（解锁高级属性）
export async function checkAdvancedUnlock() {
  const students = await db.students.toArray();
  const hasMaxLevel = students.some(s => s.petStage >= 6 && s.petExp >= 1000);
  return hasMaxLevel;
}

// 增加换宠次数
export async function incrementChangePetCount(studentId) {
  const student = await db.students.get(studentId);
  if (!student) return { success: false };
  
  const newCount = (student.changePetCount || 0) + 1;
  await db.students.update(studentId, { changePetCount: newCount });
  return { success: true, count: newCount };
}

// 检查是否可以换宠
export async function canChangePet(studentId) {
  const student = await db.students.get(studentId);
  if (!student) return false;
  
  // 第一次免费
  if ((student.changePetCount || 0) === 0) return true;
  
  // 之后需要满级才能换
  return student.petStage >= 6 && student.petExp >= 1000;
}

// ==================== 数据备份与恢复系统 ====================

// 导出所有数据为JSON
export async function exportAllData() {
  try {
    const data = {
      version: 7,
      exportDate: new Date().toISOString(),
      tables: {}
    };
    
    // 导出所有表的数据
    const tableNames = ['classes', 'students', 'logs', 'settings', 'tasks', 'praises', 
                        'studentTasks', 'groups', 'shopItems', 'redemptions', 'pkBattles', 
                        'petTypes', 'petImages', 'bosses', 'bossChallenge', 'bossQuestions'];
    
    for (const tableName of tableNames) {
      data.tables[tableName] = await db[tableName].toArray();
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('导出数据失败:', error);
    return { success: false, error: error.message };
  }
}

// 导入数据（覆盖现有数据）
export async function importAllData(jsonData) {
  try {
    // 验证数据格式
    if (!jsonData.tables || !jsonData.version) {
      throw new Error('数据格式不正确');
    }
    
    // 清空所有表
    const tableNames = Object.keys(jsonData.tables);
    for (const tableName of tableNames) {
      if (db[tableName]) {
        await db[tableName].clear();
      }
    }
    
    // 导入数据
    for (const tableName of tableNames) {
      if (db[tableName] && jsonData.tables[tableName]) {
        await db[tableName].bulkAdd(jsonData.tables[tableName]);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('导入数据失败:', error);
    return { success: false, error: error.message };
  }
}

// 下载JSON文件
export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==================== 精灵图鉴系统（曾经拥有的精灵） ====================

// 记录学生曾经拥有的精灵（换宠时调用）
export async function recordOwnedPet(studentId, petTypeId, maxStage, maxExp) {
  try {
    // 检查是否已有记录
    const existing = await db.ownedPets
      .where({ studentId, petTypeId })
      .first();
    
    if (existing) {
      // 如果已有记录，更新最高阶段和经验
      if (maxStage > existing.maxStage || (maxStage === existing.maxStage && maxExp > existing.maxExp)) {
        await db.ownedPets.update(existing.id, {
          maxStage,
          maxExp,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // 新增记录
      await db.ownedPets.add({
        studentId,
        petTypeId,
        maxStage,
        maxExp,
        timestamp: new Date().toISOString()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('记录精灵失败:', error);
    return { success: false, error: error.message };
  }
}

// 获取学生曾经拥有的所有精灵
export async function getOwnedPets(studentId) {
  try {
    const records = await db.ownedPets
      .where('studentId')
      .equals(studentId)
      .toArray();
    
    // 按最高阶段排序
    records.sort((a, b) => {
      if (b.maxStage !== a.maxStage) {
        return b.maxStage - a.maxStage;
      }
      return b.maxExp - a.maxExp;
    });
    
    return records;
  } catch (error) {
    console.error('获取精灵记录失败:', error);
    return [];
  }
}

// 获取学生的精灵收藏统计
export async function getOwnedPetsStats(studentId) {
  try {
    const records = await getOwnedPets(studentId);
    
    // 统计各阶段精灵数量
    const stageStats = {
      stage4: records.filter(r => r.maxStage === 4).length,
      stage5: records.filter(r => r.maxStage === 5).length,
      stage6: records.filter(r => r.maxStage >= 6).length,
      total: records.length
    };
    
    return stageStats;
  } catch (error) {
    console.error('获取精灵统计失败:', error);
    return { stage4: 0, stage5: 0, stage6: 0, total: 0 };
  }
}

export async function resetDBSystemData(db) {
  try {
    await db.clear();
    console.log('系统数据已重置');
  } catch (error) {
    console.error('重置系统数据失败:', error);
  }
}