import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initTestData } from './db.js'

// 初始化数据库
initTestData().then(() => {
  console.log('数据库初始化完成');
});

createApp(App).mount('#app')
