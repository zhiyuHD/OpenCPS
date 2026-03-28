// Electron 主进程
import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🚀 首发自动拷贝策略：启动时自动拷贝出厂图片到 userData
const initializeFactoryImages = () => {
  const userDataPath = app.getPath('userData');
  const userPetsDir = join(userDataPath, 'pets');
  const userBossesDir = join(userDataPath, 'bosses');
  
  // 确保 userData 目录存在
  if (!existsSync(userPetsDir)) mkdirSync(userPetsDir, { recursive: true });
  if (!existsSync(userBossesDir)) mkdirSync(userBossesDir, { recursive: true });
  
  // 获取出厂图片源目录
  let factoryPetsDir, factoryBossesDir;
  
  if (app.isPackaged) {
    // 打包环境：从 resources 目录读取
    factoryPetsDir = join(process.resourcesPath, 'pets');
    factoryBossesDir = join(process.resourcesPath, 'bosses');
  } else {
    // 开发环境：从 public 目录读取
    factoryPetsDir = join(__dirname, '../public/pets');
    factoryBossesDir = join(__dirname, '../public/bosses');
  }
  
  console.log('🚀 【首发自动拷贝】开始检查...');
  console.log('📂 UserData Pets目录:', userPetsDir);
  console.log('📂 出厂 Pets目录:', factoryPetsDir);
  
  // 检查 userData/pets 是否为空或不存在图片
  const userPetsFiles = existsSync(userPetsDir) ? readdirSync(userPetsDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f)) : [];
  
  if (userPetsFiles.length === 0) {
    console.log('🚨 【首发自动拷贝】检测到 userData/pets 为空，开始拷贝出厂图片...');
    
    // 拷贝 pets 图片
    if (existsSync(factoryPetsDir)) {
      const factoryFiles = readdirSync(factoryPetsDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
      console.log(`📋 找到 ${factoryFiles.length} 个出厂精灵图片`);
      
      factoryFiles.forEach(file => {
        const srcPath = join(factoryPetsDir, file);
        const destPath = join(userPetsDir, file);
        try {
          copyFileSync(srcPath, destPath);
          console.log(`✅ 拷贝成功: ${file}`);
        } catch (error) {
          console.error(`❌ 拷贝失败: ${file}`, error);
        }
      });
      
      console.log('🎉 【首发自动拷贝】精灵图片拷贝完成！');
    } else {
      console.error('❌ 出厂 pets 目录不存在:', factoryPetsDir);
    }
  } else {
    console.log(`✅ 【首发自动拷贝】userData/pets 已有 ${userPetsFiles.length} 个图片，跳过拷贝`);
  }
  
  // 检查 userData/bosses 是否为空
  const userBossesFiles = existsSync(userBossesDir) ? readdirSync(userBossesDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f)) : [];
  
  if (userBossesFiles.length === 0 && existsSync(factoryBossesDir)) {
    console.log('🚨 【首发自动拷贝】检测到 userData/bosses 为空，开始拷贝出厂图片...');
    
    const factoryBossFiles = readdirSync(factoryBossesDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    console.log(`📋 找到 ${factoryBossFiles.length} 个出厂Boss图片`);
    
    factoryBossFiles.forEach(file => {
      const srcPath = join(factoryBossesDir, file);
      const destPath = join(userBossesDir, file);
      try {
        copyFileSync(srcPath, destPath);
        console.log(`✅ 拷贝成功: ${file}`);
      } catch (error) {
        console.error(`❌ 拷贝失败: ${file}`, error);
      }
    });
    
    console.log('🎉 【首发自动拷贝】Boss图片拷贝完成！');
  } else {
    console.log(`✅ 【首发自动拷贝】userData/bosses 已有 ${userBossesFiles.length} 个图片，跳过拷贝`);
  }
};

// 获取用户数据目录
const getUserDataDir = () => {
  const userDataPath = app.getPath('userData');
  const petsDir = join(userDataPath, 'pets');
  const bossesDir = join(userDataPath, 'bosses');
  
  // 确保目录存在
  if (!existsSync(petsDir)) mkdirSync(petsDir, { recursive: true });
  if (!existsSync(bossesDir)) mkdirSync(bossesDir, { recursive: true });
  
  return { userDataPath, petsDir, bossesDir };
};

// IPC 处理器
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

// 🚨 废除 get-resources-path，前端只从 userData 读取
// ipcMain.handle('get-resources-path', () => {
//   return getResourcesPath();
// });

// 🚨 废除 show-path-debug，不再需要路径调试
// ipcMain.handle('show-path-debug', () => { ... });

// 🚨 废除 debug-list-resources，不再需要
// ipcMain.handle('debug-list-resources', (event, type) => { ... });

// 🚨 废除 check-factory-image 和 get-factory-image
// 前端只从 userData 读取，不再访问 resources
// ipcMain.handle('check-factory-image', ...) { ... }
// ipcMain.handle('get-factory-image', ...) { ... }

// 🔥 新增：手动触发强制拷贝初始宠物（绕过权限拦截）
ipcMain.handle('force-copy-factory-images', () => {
  try {
    console.log('🚀 【手动触发】强制拷贝初始宠物...');
    initializeFactoryImages();
    return { success: true, message: '初始宠物加载成功！' };
  } catch (error) {
    console.error('❌ 强制拷贝失败:', error);
    return { success: false, message: error.message };
  }
});

// 检查用户自定义图片是否存在（现在就是检查 userData 中的图片）
ipcMain.handle('check-user-image', (event, type, name) => {
  const { petsDir, bossesDir } = getUserDataDir();
  const baseDir = type === 'pet' ? petsDir : bossesDir;
  
  // 优先检查 PNG，然后 JPG
  const extensions = ['png', 'jpg', 'jpeg'];
  for (const ext of extensions) {
    const filePath = join(baseDir, `${name}.${ext}`);
    if (existsSync(filePath)) {
      return { exists: true, path: filePath, ext };
    }
  }
  return { exists: false };
});

// 获取用户图片（现在就是从 userData 读取）
ipcMain.handle('get-user-image', (event, type, name) => {
  const { petsDir, bossesDir } = getUserDataDir();
  const baseDir = type === 'pet' ? petsDir : bossesDir;
  
  const extensions = ['png', 'jpg', 'jpeg'];
  for (const ext of extensions) {
    const filePath = join(baseDir, `${name}.${ext}`);
    if (existsSync(filePath)) {
      const buffer = readFileSync(filePath);
      const base64 = buffer.toString('base64');
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      return `data:${mimeType};base64,${base64}`;
    }
  }
  return null;
});

ipcMain.handle('save-user-image', (event, type, name, base64Data) => {
  try {
    const { petsDir, bossesDir } = getUserDataDir();
    const baseDir = type === 'pet' ? petsDir : bossesDir;
    
    // 解析 base64 数据
    const matches = base64Data.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
    if (!matches) throw new Error('Invalid base64 format');
    
    const ext = matches[1] === 'png' ? 'png' : 'jpg';
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    
    const filePath = join(baseDir, `${name}.${ext}`);
    writeFileSync(filePath, buffer);
    
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-user-images', (event, type) => {
  const { petsDir, bossesDir } = getUserDataDir();
  const baseDir = type === 'pet' ? petsDir : bossesDir;
  
  if (!existsSync(baseDir)) return [];
  
  const files = readdirSync(baseDir);
  return files.filter(f => /\.(jpg|png|jpeg)$/i.test(f));
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    autoHideMenuBar: true,
    webPreferences: {
      // 🔥 暴力方案：直接开启 Node 集成，关闭上下文隔离
      nodeIntegration: true,
      contextIsolation: false
      // 不再需要 preload
    }
  });

  // 窗口最大化
  win.maximize();

  // 🚨 路径自检（仅控制台输出，不弹窗）
  win.webContents.on('did-finish-load', () => {
    const userDataPath = app.getPath('userData');
    const petsPath = join(userDataPath, 'pets');
    
    console.log('🚨 资源路径自检:');
    console.log('📂 UserData路径:', userDataPath);
    console.log('📂 Pets目录:', petsPath);
    console.log('📂 示例图片:', join(petsPath, '火 (1).png'));
  });

  // 开发环境加载 Vite 服务器，生产环境加载打包文件
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  // 🚀 首发自动拷贝：在窗口创建前执行
  initializeFactoryImages();
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
