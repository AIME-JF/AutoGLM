import asyncio
import json
import traceback
from typing import Any, Callable, Optional
from phone_agent import PhoneAgent
from phone_agent.agent import StepResult
from phone_agent.adb import get_current_app, get_screenshot
from phone_agent.model.client import MessageBuilder
from phone_agent.actions.handler import finish, parse_action
from phone_agent.config import get_messages

class WebSocketPhoneAgent(PhoneAgent):
    """
    Extended PhoneAgent that streams events via a callback.
    """
    def __init__(self, *args, event_callback: Optional[Callable[[dict], Any]] = None, **kwargs):
        super().__init__(*args, **kwargs)
        self.event_callback = event_callback

    async def _emit(self, event_type: str, data: Any):
        if self.event_callback:
            event = {"type": event_type, "data": data}
            if asyncio.iscoroutinefunction(self.event_callback):
                await self.event_callback(event)
            else:
                self.event_callback(event)

    async def run_async(self, task: str) -> str:
        """Async version of run loop."""
        self._context = []
        self._step_count = 0
        
        # Emit start event with max_steps
        await self._emit("start", {
            "task": task,
            "max_steps": self.agent_config.max_steps
        })

        try:
            # First step
            result = await self._execute_step_async(task, is_first=True)
            
            if result.finished:
                await self._emit("finish", {"message": result.message})
                return result.message or "Task completed"

            while self._step_count < self.agent_config.max_steps:
                result = await self._execute_step_async(is_first=False)
                if result.finished:
                    await self._emit("finish", {"message": result.message})
                    return result.message or "Task completed"

            await self._emit("finish", {"message": "Max steps reached"})
            return "Max steps reached"
        except Exception as e:
            await self._emit("error", {"message": str(e)})
            raise e

    async def _execute_step_async(self, user_prompt: str | None = None, is_first: bool = False) -> StepResult:
        self._step_count += 1
        
        # Emit step event (进度信息)
        await self._emit("step", {
            "current": self._step_count,
            "max": self.agent_config.max_steps
        })
        
        # 1. Capture State
        screenshot = get_screenshot(self.agent_config.device_id)
        current_app = get_current_app(self.agent_config.device_id)
        
        # Emit screenshot event
        await self._emit("screenshot", {
            "base64": screenshot.base64_data,
            "width": screenshot.width,
            "height": screenshot.height
        })

        # 2. Build Context
        if is_first:
            self._context.append(MessageBuilder.create_system_message(self.agent_config.system_prompt))
            screen_info = MessageBuilder.build_screen_info(current_app)
            text_content = f"{user_prompt}\n\n{screen_info}"
            self._context.append(MessageBuilder.create_user_message(text=text_content, image_base64=screenshot.base64_data))
        else:
            screen_info = MessageBuilder.build_screen_info(current_app)
            text_content = f"** Screen Info **\n\n{screen_info}"
            self._context.append(MessageBuilder.create_user_message(text=text_content, image_base64=screenshot.base64_data))

        # 3. Model Request (在线程池中执行，避免阻塞事件循环)
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, self.model_client.request, self._context)
        except Exception as e:
            traceback.print_exc()
            return StepResult(False, True, None, "", f"Model error: {e}")

        # Emit thinking event
        await self._emit("thinking", {"content": response.thinking})

        # 4. Parse Action
        try:
            action = parse_action(response.action)
        except ValueError:
            traceback.print_exc()
            action = finish(message=response.action)

        # Emit action event
        await self._emit("action", {"content": action})

        # 5. Execute Action
        self._context[-1] = MessageBuilder.remove_images_from_message(self._context[-1])
        
        try:
            result = self.action_handler.execute(action, screenshot.width, screenshot.height)
        except Exception as e:
            traceback.print_exc()
            result = self.action_handler.execute(finish(message=str(e)), screenshot.width, screenshot.height)

        # 6. Update Context
        self._context.append(MessageBuilder.create_assistant_message(
            f"<think>{response.thinking}</think><answer>{response.action}</answer>"
        ))

        finished = action.get("_metadata") == "finish" or result.should_finish
        return StepResult(result.success, finished, action, response.thinking, result.message or action.get("message"))
