import asyncio
import uuid
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from phone_agent.agent import AgentConfig
from phone_agent.model import ModelConfig
from server.core.config import load_settings
from server.core.agent_wrapper import WebSocketPhoneAgent
from server.core import database as db

router = APIRouter()

# Store active tasks: task_id -> {"agent": agent_instance, "queue": asyncio.Queue}
active_tasks: Dict[str, Dict] = {}


class StartTaskRequest(BaseModel):
    device_id: str
    task: str
    max_steps: int = 100


@router.post("/start")
async def start_task(req: StartTaskRequest):
    task_id = uuid.uuid4().hex
    settings = load_settings()
    
    # 保存到数据库
    db.create_task(task_id, req.device_id, req.task, req.max_steps)
    
    # Create Agent
    model_config = ModelConfig(
        base_url=settings.base_url,
        model_name=settings.model_name,
        api_key=settings.api_key
    )
    agent_config = AgentConfig(
        max_steps=req.max_steps,
        device_id=req.device_id,
        verbose=True
    )
    
    # Event Queue for WebSocket
    event_queue = asyncio.Queue()
    
    async def callback(event):
        await event_queue.put(event)
        
        # 保存日志到数据库
        if event["type"] in ("thinking", "action", "error", "info"):
            content = event["data"].get("content") if isinstance(event["data"], dict) else str(event["data"])
            if content:
                db.add_log(task_id, event["type"], str(content))
        
        # 更新步骤
        if event["type"] == "step":
            db.update_task_step(task_id, event["data"]["current"])
        
        # 保存操作记录
        if event["type"] == "action":
            action_data = event["data"].get("content", {})
            action_type = next((k for k in action_data.keys() if not k.startswith("_")), "unknown")
            db.add_action(task_id, action_type, action_data)

    agent = WebSocketPhoneAgent(
        model_config=model_config, 
        agent_config=agent_config,
        event_callback=callback
    )
    
    # 取消事件
    cancel_event = asyncio.Event()
    
    # Start Agent in background
    async def run_agent():
        try:
            # 使用 asyncio.wait 实现可取消的任务
            agent_task = asyncio.create_task(agent.run_async(req.task))
            cancel_task = asyncio.create_task(cancel_event.wait())
            
            done, pending = await asyncio.wait(
                [agent_task, cancel_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # 取消未完成的任务
            for task in pending:
                task.cancel()
            
            if cancel_task in done:
                # 用户取消了任务
                await event_queue.put({"type": "info", "data": {"message": "任务已被用户中断"}})
                db.finish_task(task_id, "cancelled", "用户中断")
            else:
                # 正常完成
                result = agent_task.result()
                db.finish_task(task_id, "finished", result)
        except asyncio.CancelledError:
            await event_queue.put({"type": "info", "data": {"message": "任务已取消"}})
            db.finish_task(task_id, "cancelled", "任务取消")
        except Exception as e:
            await event_queue.put({"type": "error", "data": {"message": str(e)}})
            db.finish_task(task_id, "error", str(e))
        finally:
            await event_queue.put({"type": "close", "data": ""})

    asyncio.create_task(run_agent())
    
    active_tasks[task_id] = {"queue": event_queue, "cancel_event": cancel_event}
    return JSONResponse(content={"task_id": task_id})


@router.post("/stop/{task_id}")
async def stop_task(task_id: str):
    """停止正在执行的任务"""
    if task_id not in active_tasks:
        return JSONResponse(status_code=404, content={"error": "Task not found or already finished"})
    
    cancel_event = active_tasks[task_id].get("cancel_event")
    if cancel_event:
        cancel_event.set()  # 触发取消事件
        return {"status": "success", "message": "任务停止信号已发送"}
    
    return JSONResponse(status_code=400, content={"error": "Cannot stop this task"})


@router.websocket("/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await websocket.accept()
    
    if task_id not in active_tasks:
        await websocket.close(code=4004, reason="Task not found")
        return

    queue = active_tasks[task_id]["queue"]
    
    try:
        while True:
            event = await queue.get()
            
            # 处理心跳
            if event.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue
                
            if event["type"] == "close":
                await websocket.send_json(event)
                break
            await websocket.send_json(event)
    except WebSocketDisconnect:
        print(f"Client disconnected from task {task_id}")
    finally:
        if task_id in active_tasks:
            del active_tasks[task_id]


# ===== 任务历史 API =====

@router.get("/history")
async def get_task_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """获取任务历史列表"""
    tasks = db.get_task_history(limit, offset)
    total = db.get_task_count()
    return {
        "tasks": tasks,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/stats")
async def get_task_stats():
    """获取任务统计"""
    return db.get_task_stats()


@router.get("/{task_id}")
async def get_task_detail(task_id: str):
    """获取任务详情"""
    task = db.get_task(task_id)
    if not task:
        return JSONResponse(status_code=404, content={"error": "Task not found"})
    
    logs = db.get_task_logs(task_id)
    actions = db.get_task_actions(task_id)
    
    return {
        "task": task,
        "logs": logs,
        "actions": actions,
    }


@router.post("/{task_id}/replay")
async def replay_task(task_id: str):
    """重跑任务"""
    task = db.get_task(task_id)
    if not task:
        return JSONResponse(status_code=404, content={"error": "Task not found"})
    
    # 使用原任务的设备和内容创建新任务
    new_req = StartTaskRequest(
        device_id=task["device_id"],
        task=task["task_content"],
        max_steps=task["max_steps"]
    )
    return await start_task(new_req)
