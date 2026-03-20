from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, AnyHttpUrl
import json
import os
import asyncio
from datetime import datetime
from typing import Any, Dict
import threading
import time

app = FastAPI(title="JSON API Server")

# 数据存储文件
DATA_FILE = "data.json"
# 空闲保存时间（秒）
IDLE_SAVE_SECONDS = 2

# 全局状态
current_data = {}
last_update_time = time.time()
is_dirty = False
save_lock = threading.Lock()

def load_from_file():
    """从本地文件加载数据"""
    global current_data
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                current_data = json.load(f)
            print(f"Loaded data from {DATA_FILE}")
        except Exception as e:
            print(f"Failed to load data: {e}")
            current_data = {}
    else:
        print("No existing data file found, starting with empty object")
        current_data = {}

def save_to_file():
    """保存数据到本地文件"""
    global current_data, last_update_time, is_dirty
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(current_data, f, indent=2, ensure_ascii=False)
        print(f"Saved data to {DATA_FILE} at {datetime.now()}")
        with save_lock:
            is_dirty = False
            last_update_time = time.time()
    except Exception as e:
        print(f"Failed to save data: {e}")

def background_saver():
    """后台任务：检查空闲状态并保存"""
    global is_dirty, last_update_time
    while True:
        time.sleep(0.1)  # 每100ms检查一次
        with save_lock:
            if is_dirty and (time.time() - last_update_time) >= IDLE_SAVE_SECONDS:
                save_to_file()

# 启动后台保存线程
saver_thread = threading.Thread(target=background_saver, daemon=True)
saver_thread.start()

# 启动时加载数据
load_from_file()

# API 端点

@app.get("/get")
async def get_json():
    """获取当前JSON数据"""
    with save_lock:
        return JSONResponse(content=current_data)

@app.post("/upload")
async def upload_json(data: Dict[str, Any]):
    """上传新的JSON数据"""
    global current_data, is_dirty, last_update_time
    
    with save_lock:
        current_data = data
        is_dirty = True
        last_update_time = time.time()
    
    return {
        "status": "success",
        "message": "JSON data uploaded successfully"
    }

@app.get("/status")
async def get_status():
    """查询服务端状态"""
    with save_lock:
        data_str = json.dumps(current_data, ensure_ascii=False)
        idle_time = time.time() - last_update_time
        
        # 生成数据预览
        if isinstance(current_data, dict):
            keys = list(current_data.keys())
            if len(keys) > 5:
                preview = f"Object with {len(keys)} keys: {keys[:5]}..."
            else:
                preview = f"Object with {len(keys)} keys: {keys}"
        elif isinstance(current_data, list):
            preview = f"Array with {len(current_data)} items"
        else:
            preview = "Scalar value"
        
        return {
            "status": "running",
            "data_size": len(data_str),
            "last_update_ago_seconds": round(idle_time, 2),
            "dirty": is_dirty,
            "idle_save_seconds": IDLE_SAVE_SECONDS,
            "data_preview": preview,
            "last_save_time": datetime.fromtimestamp(last_update_time).isoformat() if last_update_time else None
        }

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=3000)