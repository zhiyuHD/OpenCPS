// Electron 预加载脚本 - 暴露安全的 API 给渲染进程
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 获取用户数据目录路径
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  
  // 🚨 废除：getResourcesPath, showPathDebug, debugListResources
  // 🚨 废除：checkFactoryImage, getFactoryImage
  // 前端只从 userData 读取图片
  
  // 检查用户图片是否存在（现在就是检查 userData 中的图片）
  checkUserImage: (type, name) => ipcRenderer.invoke('check-user-image', type, name),
  
  // 获取用户图片（现在就是从 userData 读取）
  getUserImage: (type, name) => ipcRenderer.invoke('get-user-image', type, name),
  
  // 保存用户自定义图片
  saveUserImage: (type, name, base64Data) => ipcRenderer.invoke('save-user-image', type, name, base64Data),
  
  // 列出所有用户自定义图片
  listUserImages: (type) => ipcRenderer.invoke('list-user-images', type),
  
  // 🔥 新增：手动触发强制拷贝初始宠物（绕过权限拦截）
  forceCopyFactoryImages: () => ipcRenderer.invoke('force-copy-factory-images')
});
