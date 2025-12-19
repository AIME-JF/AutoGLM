"""
任务历史和日志的 SQLite 存储
"""
import sqlite3
import json
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

# 数据库文件路径
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "tasks.db")

# 确保数据目录存在
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


@contextmanager
def get_connection():
    """获取数据库连接的上下文管理器"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """初始化数据库表"""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 任务表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                device_id TEXT NOT NULL,
                task_content TEXT NOT NULL,
                status TEXT DEFAULT 'running',
                current_step INTEGER DEFAULT 0,
                max_steps INTEGER DEFAULT 100,
                started_at TEXT NOT NULL,
                finished_at TEXT,
                message TEXT
            )
        """)
        
        # 日志表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS task_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                log_type TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks (id)
            )
        """)
        
        # 操作记录表（用于回放）
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS task_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                params TEXT NOT NULL,
                screenshot TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks (id)
            )
        """)
        
        # 定时任务表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scheduled_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                device_id TEXT NOT NULL,
                task_content TEXT NOT NULL,
                schedule_type TEXT NOT NULL,
                cron_expression TEXT,
                interval_seconds INTEGER,
                enabled INTEGER DEFAULT 1,
                last_run_at TEXT,
                next_run_at TEXT,
                created_at TEXT NOT NULL
            )
        """)
        
        # 创建索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs (task_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_task_actions_task_id ON task_actions (task_id)")


# 初始化数据库
init_db()


# ===== 任务操作 =====

def create_task(task_id: str, device_id: str, task_content: str, max_steps: int = 100) -> None:
    """创建任务记录"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO tasks (id, device_id, task_content, max_steps, started_at)
               VALUES (?, ?, ?, ?, ?)""",
            (task_id, device_id, task_content, max_steps, datetime.now().isoformat())
        )


def update_task_step(task_id: str, current_step: int) -> None:
    """更新任务步骤"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE tasks SET current_step = ? WHERE id = ?",
            (current_step, task_id)
        )


def finish_task(task_id: str, status: str = "finished", message: str = None) -> None:
    """完成任务"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """UPDATE tasks SET status = ?, finished_at = ?, message = ? WHERE id = ?""",
            (status, datetime.now().isoformat(), message, task_id)
        )


def get_task(task_id: str) -> Optional[Dict]:
    """获取单个任务"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_task_history(limit: int = 50, offset: int = 0) -> List[Dict]:
    """获取任务历史列表"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT * FROM tasks ORDER BY started_at DESC LIMIT ? OFFSET ?""",
            (limit, offset)
        )
        return [dict(row) for row in cursor.fetchall()]


def get_task_count() -> int:
    """获取任务总数"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM tasks")
        return cursor.fetchone()[0]


def get_task_stats() -> Dict:
    """获取任务统计"""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 总任务数
        cursor.execute("SELECT COUNT(*) FROM tasks")
        total = cursor.fetchone()[0]
        
        # 完成任务数
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'finished'")
        finished = cursor.fetchone()[0]
        
        # 失败任务数
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'error'")
        failed = cursor.fetchone()[0]
        
        # 今日任务数
        today = datetime.now().strftime("%Y-%m-%d")
        cursor.execute(
            "SELECT COUNT(*) FROM tasks WHERE started_at LIKE ?",
            (f"{today}%",)
        )
        today_count = cursor.fetchone()[0]
        
        return {
            "total": total,
            "finished": finished,
            "failed": failed,
            "today": today_count,
            "success_rate": round(finished / total * 100, 1) if total > 0 else 0,
        }


# ===== 日志操作 =====

def add_log(task_id: str, log_type: str, content: str, timestamp: str = None) -> None:
    """添加日志"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO task_logs (task_id, log_type, content, timestamp)
               VALUES (?, ?, ?, ?)""",
            (task_id, log_type, content, timestamp or datetime.now().isoformat())
        )


def get_task_logs(task_id: str) -> List[Dict]:
    """获取任务日志"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM task_logs WHERE task_id = ? ORDER BY id",
            (task_id,)
        )
        return [dict(row) for row in cursor.fetchall()]


# ===== 操作记录 =====

def add_action(task_id: str, action_type: str, params: Dict, screenshot: str = None, timestamp: str = None) -> None:
    """添加操作记录"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO task_actions (task_id, action_type, params, screenshot, timestamp)
               VALUES (?, ?, ?, ?, ?)""",
            (task_id, action_type, json.dumps(params), screenshot, timestamp or datetime.now().isoformat())
        )


def get_task_actions(task_id: str) -> List[Dict]:
    """获取任务操作记录"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM task_actions WHERE task_id = ? ORDER BY id",
            (task_id,)
        )
        rows = cursor.fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d['params'] = json.loads(d['params'])
            result.append(d)
        return result


# ===== 定时任务 =====

def create_scheduled_task(
    name: str,
    device_id: str,
    task_content: str,
    schedule_type: str,
    cron_expression: str = None,
    interval_seconds: int = None
) -> int:
    """创建定时任务"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO scheduled_tasks 
               (name, device_id, task_content, schedule_type, cron_expression, interval_seconds, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (name, device_id, task_content, schedule_type, cron_expression, interval_seconds, datetime.now().isoformat())
        )
        return cursor.lastrowid


def get_scheduled_tasks() -> List[Dict]:
    """获取所有定时任务"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM scheduled_tasks ORDER BY id")
        return [dict(row) for row in cursor.fetchall()]


def update_scheduled_task_status(task_id: int, enabled: bool) -> None:
    """更新定时任务状态"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE scheduled_tasks SET enabled = ? WHERE id = ?",
            (1 if enabled else 0, task_id)
        )


def delete_scheduled_task(task_id: int) -> None:
    """删除定时任务"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM scheduled_tasks WHERE id = ?", (task_id,))
