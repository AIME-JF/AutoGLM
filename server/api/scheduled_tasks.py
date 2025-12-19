"""
定时任务 API
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from server.core import database as db
from server.core.scheduler import scheduler, add_task_job, remove_task_job

router = APIRouter()


class CreateScheduledTaskRequest(BaseModel):
    name: str
    device_id: str
    task_content: str
    schedule_type: str  # "cron" or "interval"
    cron_expression: Optional[str] = None  # e.g., "0 9 * * *" (每天9点)
    interval_seconds: Optional[int] = None  # e.g., 3600 (每小时)


class UpdateScheduledTaskRequest(BaseModel):
    enabled: bool


@router.get("/")
async def list_scheduled_tasks():
    """获取所有定时任务"""
    tasks = db.get_scheduled_tasks()
    return {"tasks": tasks}


@router.post("/")
async def create_scheduled_task(req: CreateScheduledTaskRequest):
    """创建定时任务"""
    if req.schedule_type == "cron" and not req.cron_expression:
        return JSONResponse(status_code=400, content={"error": "cron_expression is required for cron type"})
    if req.schedule_type == "interval" and not req.interval_seconds:
        return JSONResponse(status_code=400, content={"error": "interval_seconds is required for interval type"})
    
    task_id = db.create_scheduled_task(
        name=req.name,
        device_id=req.device_id,
        task_content=req.task_content,
        schedule_type=req.schedule_type,
        cron_expression=req.cron_expression,
        interval_seconds=req.interval_seconds
    )
    
    # 添加到调度器
    add_task_job(
        task_id=task_id,
        device_id=req.device_id,
        task_content=req.task_content,
        schedule_type=req.schedule_type,
        cron_expression=req.cron_expression,
        interval_seconds=req.interval_seconds
    )
    
    return {"id": task_id, "message": "Scheduled task created"}


@router.patch("/{task_id}")
async def update_scheduled_task(task_id: int, req: UpdateScheduledTaskRequest):
    """启用/禁用定时任务"""
    db.update_scheduled_task_status(task_id, req.enabled)
    
    if req.enabled:
        # 重新添加到调度器
        tasks = db.get_scheduled_tasks()
        task = next((t for t in tasks if t["id"] == task_id), None)
        if task:
            add_task_job(
                task_id=task_id,
                device_id=task["device_id"],
                task_content=task["task_content"],
                schedule_type=task["schedule_type"],
                cron_expression=task["cron_expression"],
                interval_seconds=task["interval_seconds"]
            )
    else:
        remove_task_job(task_id)
    
    return {"message": "Updated"}


@router.delete("/{task_id}")
async def delete_scheduled_task(task_id: int):
    """删除定时任务"""
    remove_task_job(task_id)
    db.delete_scheduled_task(task_id)
    return {"message": "Deleted"}
