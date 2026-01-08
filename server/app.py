from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.api import devices, config, tasks, scheduled_tasks
from server.core.scheduler import init_scheduler, shutdown_scheduler, load_scheduled_tasks


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动�?    init_scheduler()
    load_scheduled_tasks()
    yield
    # 关闭�?    shutdown_scheduler()


app = FastAPI(title="Open-AutoGLM Web API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices.router, prefix="/api/v1/devices", tags=["Devices"])
app.include_router(config.router, prefix="/api/v1/config", tags=["Config"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["Tasks"])
app.include_router(scheduled_tasks.router, prefix="/api/v1/scheduled-tasks", tags=["Scheduled Tasks"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
