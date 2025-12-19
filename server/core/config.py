import json
import os
from pydantic import BaseModel
from typing import Optional

CONFIG_FILE = "server_config.json"

class ModelSettings(BaseModel):
    base_url: str = "https://open.bigmodel.cn/api/paas/v4"
    model_name: str = "glm-4v"
    api_key: str = "EMPTY"
    
def load_settings() -> ModelSettings:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            return ModelSettings(**data)
        except Exception:
            return ModelSettings()
    return ModelSettings()

def save_settings(settings: ModelSettings):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(settings.model_dump(), f, indent=2)
