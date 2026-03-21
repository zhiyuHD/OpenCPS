from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from typing import Any, Dict
import json
import os
from datetime import datetime

app = FastAPI(title="OpenCPSServer")

DATA_FILE = "data.json"


def read_data():
    """从文件读取数据"""
    if not os.path.exists(DATA_FILE):
        return {}
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Read failed: {e}")


def write_data(data: Dict[str, Any]):
    """写入数据到文件"""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Write failed: {e}")


@app.get("/get")
async def get_json():
    """获取JSON数据"""
    return JSONResponse(content=read_data())


@app.post("/upload")
async def upload_json(data: Dict[str, Any]):
    """上传JSON数据"""
    write_data(data)
    return {"status": "success", "message": "Data saved"}


@app.get("/status")
async def get_status():
    """查询状态"""
    exists = os.path.exists(DATA_FILE)
    size = os.path.getsize(DATA_FILE) if exists else 0
    
    data = read_data() if exists else {}
    if isinstance(data, dict):
        preview = f"Object with {len(data)} keys"
    elif isinstance(data, list):
        preview = f"Array with {len(data)} items"
    else:
        preview = "Scalar value"
    
    return {
        "status": "running",
        "file_exists": exists,
        "file_size": size,
        "data_preview": preview
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "running", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    uvicorn.run(app, host="127.0.0.1", port=3001)