"""
定时任务调度器
使用 APScheduler 实现 Cron 和间隔调度
"""
import asyncio
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

# 全局调度器实例
scheduler = AsyncIOScheduler()


def init_scheduler():
    """初始化并启动调度器"""
    if not scheduler.running:
        scheduler.start()
        print("Scheduler started")


def shutdown_scheduler():
    """关闭调度器"""
    if scheduler.running:
        scheduler.shutdown()
        print("Scheduler stopped")


async def execute_scheduled_task(device_id: str, task_content: str, scheduled_task_id: int):
    """执行定时任务"""
    from server.core.config import load_settings
    from server.core.agent_wrapper import WebSocketPhoneAgent
    from server.core import database as db
    from phone_agent.agent import AgentConfig
    from phone_agent.model import ModelConfig
    import uuid
    from datetime import datetime
    
    print(f"[Scheduler] Executing scheduled task {scheduled_task_id}: {task_content[:50]}...")
    
    task_id = uuid.uuid4().hex
    settings = load_settings()
    
    # 创建任务记录
    db.create_task(task_id, device_id, task_content, 100)
    
    # 更新定时任务的最后运行时间
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE scheduled_tasks SET last_run_at = ? WHERE id = ?",
            (datetime.now().isoformat(), scheduled_task_id)
        )
    
    # 创建 Agent
    model_config = ModelConfig(
        base_url=settings.base_url,
        model_name=settings.model_name,
        api_key=settings.api_key
    )
    agent_config = AgentConfig(
        max_steps=100,
        device_id=device_id,
        verbose=True
    )
    
    async def callback(event):
        # 保存日志
        if event["type"] in ("thinking", "action", "error", "info"):
            content = event["data"].get("content") if isinstance(event["data"], dict) else str(event["data"])
            if content:
                db.add_log(task_id, event["type"], str(content))
        
        # 更新步骤
        if event["type"] == "step":
            db.update_task_step(task_id, event["data"]["current"])
    
    agent = WebSocketPhoneAgent(
        model_config=model_config,
        agent_config=agent_config,
        event_callback=callback
    )
    
    try:
        result = await agent.run_async(task_content)
        db.finish_task(task_id, "finished", result)
        print(f"[Scheduler] Task {scheduled_task_id} completed: {result}")
    except Exception as e:
        db.finish_task(task_id, "error", str(e))
        print(f"[Scheduler] Task {scheduled_task_id} failed: {e}")


def add_task_job(
    task_id: int,
    device_id: str,
    task_content: str,
    schedule_type: str,
    cron_expression: Optional[str] = None,
    interval_seconds: Optional[int] = None
):
    """添加任务到调度器"""
    job_id = f"scheduled_task_{task_id}"
    
    # 先移除已存在的任务
    remove_task_job(task_id)
    
    if schedule_type == "cron" and cron_expression:
        # 解析 cron 表达式 (分 时 日 月 周)
        parts = cron_expression.split()
        if len(parts) >= 5:
            trigger = CronTrigger(
                minute=parts[0],
                hour=parts[1],
                day=parts[2],
                month=parts[3],
                day_of_week=parts[4]
            )
        else:
            print(f"Invalid cron expression: {cron_expression}")
            return
    elif schedule_type == "interval" and interval_seconds:
        trigger = IntervalTrigger(seconds=interval_seconds)
    else:
        print(f"Invalid schedule config: type={schedule_type}")
        return
    
    scheduler.add_job(
        execute_scheduled_task,
        trigger=trigger,
        id=job_id,
        args=[device_id, task_content, task_id],
        replace_existing=True
    )
    print(f"[Scheduler] Added job {job_id}")


def remove_task_job(task_id: int):
    """从调度器移除任务"""
    job_id = f"scheduled_task_{task_id}"
    try:
        scheduler.remove_job(job_id)
        print(f"[Scheduler] Removed job {job_id}")
    except Exception:
        pass  # 任务不存在


def load_scheduled_tasks():
    """从数据库加载所有启用的定时任务"""
    from server.core import database as db
    
    tasks = db.get_scheduled_tasks()
    for task in tasks:
        if task["enabled"]:
            add_task_job(
                task_id=task["id"],
                device_id=task["device_id"],
                task_content=task["task_content"],
                schedule_type=task["schedule_type"],
                cron_expression=task["cron_expression"],
                interval_seconds=task["interval_seconds"]
            )
    
    print(f"[Scheduler] Loaded {len([t for t in tasks if t['enabled']])} scheduled tasks")
