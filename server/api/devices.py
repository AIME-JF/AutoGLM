from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from phone_agent.adb import list_devices, ADBConnection, get_screenshot
import subprocess

router = APIRouter()


@router.get("/screenshot/{device_id}")
async def get_device_screenshot(device_id: str):
    """获取设备的实时截图"""
    try:
        screenshot = get_screenshot(device_id)
        return {
            "base64": screenshot.base64_data,
            "width": screenshot.width,
            "height": screenshot.height,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scrcpy/{device_id}")
async def start_scrcpy(device_id: str):
    """启动 scrcpy 实时投屏"""
    import os
    import sys
    
    # scrcpy 路径
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    scrcpy_path = os.path.join(base_dir, "tools", "scrcpy-win64-v3.0", "scrcpy.exe")
    
    if not os.path.exists(scrcpy_path):
        raise HTTPException(status_code=404, detail="scrcpy 未安装")
    
    try:
        if sys.platform == "win32":
            subprocess.Popen([scrcpy_path, "-s", device_id], 
                           creationflags=subprocess.CREATE_NEW_CONSOLE)
        else:
            subprocess.Popen([scrcpy_path, "-s", device_id])
        return {"status": "success", "message": "scrcpy 已启动"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ConnectRequest(BaseModel):
    address: str

@router.get("/list")
async def get_devices():
    devices = list_devices()
    return {
        "devices": [
            {
                "id": d.device_id,
                "status": d.status,
                "type": d.connection_type.value,
                "model": d.model,
            }
            for d in devices
        ]
    }

@router.post("/connect")
async def connect_device(req: ConnectRequest):
    try:
        conn = ADBConnection()
        success, message = conn.connect(req.address)
        if not success:
            raise HTTPException(status_code=400, detail=message)
        return {"status": "success", "message": message}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/disconnect")
async def disconnect_device(req: ConnectRequest):
    try:
        conn = ADBConnection()
        success, message = conn.disconnect(req.address)
        if not success:
            raise HTTPException(status_code=400, detail=message)
        return {"status": "success", "message": message}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
