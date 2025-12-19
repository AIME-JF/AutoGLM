from fastapi import APIRouter
from server.core.config import ModelSettings, load_settings, save_settings

router = APIRouter()

@router.get("/")
async def get_config():
    return load_settings()

@router.post("/")
async def update_config(settings: ModelSettings):
    save_settings(settings)
    return {"status": "success", "settings": settings}
