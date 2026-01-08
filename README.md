# Open-AutoGLM · 自媒体养号平台（前后端一体）

Open-AutoGLM 是一个“视觉大模型 + ADB 手机自动化”的完整平台，支持模型配置中心、设备管理大屏、任务控制台（实时画面 + 实时日志）等核心功能，面向刷帖、评论、点赞等场景的自动化运营。

当前项目包含：
- 后端服务（FastAPI）：设备管理、任务执行、WebSocket 实时事件流
- 前端应用（React + Ant Design + Tailwind）：配置、设备可视化、任务控制台
- PhoneAgent 核心库：ADB 操作、屏幕截图、动作执行、模型请求封装

> 提示：本项目仅供学习与研究。请遵循当地法律法规与平台规范。

---

## 快速开始

- 前置要求
  - Windows/macOS，Python 3.10+，Node.js 18+，ADB（已加入 PATH）
  - 安卓设备开启“开发者模式”与“USB 调试”，授权连接电脑
  - 建议安装 ADB Keyboard，用于稳定文本输入

- 安装与启动
  - 后端
    ```bash
    pip install -r requirements.txt
    pip install -e .
    python server/app.py
    ```
    后端默认监听 `http://localhost:8000/`

  - 前端
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    访问 `http://localhost:5173/`

- 配置模型（页面操作）
  - 打开“模型配置”页，填写：
    - Base URL（例如：`https://open.bigmodel.cn/api/paas/v4` 或你自己的 OpenAI 兼容地址）
    - Model Name（例如：`AutoGLM-Phone` 或 `glm-4v`）
    - API Key（如需认证）
  - 这些配置会保存到本地文件 [server_config.json](file:///d:/XM/Open-AutoGLM/server_config.json)

---

## 功能与使用

- 设备管理
  - 支持 USB 与 WiFi 远程调试，显示设备 ID、类型、状态与型号
  - 无线连接示例：
    ```bash
    # USB 设备启用 TCPIP
    adb tcpip 5555
    # 在设备“无线调试”查看 IP:端口，然后在前端输入连接
    adb connect <ip>:<port>
    ```
  - 接口：
    - GET /api/v1/devices/list
    - POST /api/v1/devices/connect  body: { "address": "ip:port" }
    - POST /api/v1/devices/disconnect body: { "address": "ip:port" }

- 任务控制台
  - 选择已连接设备，输入自然语言指令，点击“执行任务”
  - 实时显示：
    - 事件流：start、thinking、action、screenshot、finish、error、close
    - 画面：设备截图（敏感页面将返回黑屏占位）
  - WebSocket 地址：`ws://localhost:8000/api/v1/tasks/ws/{task_id}`
  - 启动接口：
    ```bash
    # 返回 { "task_id": "..." }
    POST /api/v1/tasks/start
    { "device_id": "<adb-id>", "task": "打开抖音刷视频" }
    ```

- 模型配置
  - 接口：
    - GET /api/v1/config/
    - POST /api/v1/config/  body: { base_url, model_name, api_key }

---

## 架构总览

- 后端（FastAPI）
  - 入口与 CORS：[app.py](file:///d:/XM/Open-AutoGLM/server/app.py)
  - 设备管理路由：[devices.py](file:///d:/XM/Open-AutoGLM/server/api/devices.py)
  - 模型配置路由：[config.py](file:///d:/XM/Open-AutoGLM/server/api/config.py)
  - 任务与 WebSocket：
    - 路由：[tasks.py](file:///d:/XM/Open-AutoGLM/server/api/tasks.py)
    - Agent 扩展（事件流）：[agent_wrapper.py](file:///d:/XM/Open-AutoGLM/server/core/agent_wrapper.py)

- PhoneAgent
  - 主类与消息构建：[agent.py](file:///d:/XM/Open-AutoGLM/phone_agent/agent.py)
  - ADB 连接与截图：
    - 连接：[connection.py](file:///d:/XM/Open-AutoGLM/phone_agent/adb/connection.py)
    - 截图：[screenshot.py](file:///d:/XM/Open-AutoGLM/phone_agent/adb/screenshot.py)
    - 操作（点击/滑动/返回等）：[device.py](file:///d:/XM/Open-AutoGLM/phone_agent/adb/device.py)
  - 模型客户端（OpenAI 兼容）：[client.py](file:///d:/XM/Open-AutoGLM/phone_agent/model/client.py)

- 前端（React + Ant Design + Tailwind）
  - 路由与布局：[App.tsx](file:///d:/XM/Open-AutoGLM/frontend/src/App.tsx)
  - 模型配置页：[ConfigPage.tsx](file:///d:/XM/Open-AutoGLM/frontend/src/pages/ConfigPage.tsx)
  - 设备管理页：[DevicePage.tsx](file:///d:/XM/Open-AutoGLM/frontend/src/pages/DevicePage.tsx)
  - 任务控制台：[TaskPage.tsx](file:///d:/XM/Open-AutoGLM/frontend/src/pages/TaskPage.tsx)
  - 状态管理（Zustand）：[stores](file:///d:/XM/Open-AutoGLM/frontend/src/stores)
  - API 客户端（Axios）：[api.ts](file:///d:/XM/Open-AutoGLM/frontend/src/api.ts)

---

## 常见问题

- 设备未识别
  - `adb devices` 无设备：检查 USB 调试与授权弹窗、数据线是否支持数据传输、尝试更换接口或线缆
  - 尝试：
    ```bash
    adb kill-server
    adb start-server
    adb devices
    ```

- 能打开应用但无法点击
  - 某些品牌需要在“开发者选项”开启“USB 调试（安全设置）”

- 截图是黑屏
  - 支付或安全页面可能无法截图，返回黑色占位图。切换到普通页面后再试

- WebSocket 无法连接或无事件
  - 确认已成功调用 `POST /api/v1/tasks/start` 并返回 `task_id`
  - 检查本机防火墙对 `8000` 端口的策略
  - 浏览器开发者工具查看 Network：`WS /api/v1/tasks/ws/{task_id}` 是否建立

- 模型无响应
  - 在“模型配置”页确认 Base URL、Model Name 与 API Key 有效
  - 服务地址必须是 OpenAI 兼容接口（`/v1`）

---

## 许可证

本项目仅供研究与学习使用。请遵守相关法律法规与平台条款。
| `Long Press` | 长按              |
| `Double Tap` | 双击              |
| `Wait`       | 等待页面加载          |
| `Take_over`  | 请求人工接管（登录/验证码等） |

## 自定义回调

处理敏感操作确认和人工接管：

```python
def my_confirmation(message: str) -> bool:
    """敏感操作确认回调"""
    return input(f"确认执行 {message}？(y/n): ").lower() == "y"


def my_takeover(message: str) -> None:
    """人工接管回调"""
    print(f"请手动完成: {message}")
    input("完成后按回车继续...")


agent = PhoneAgent(
    confirmation_callback=my_confirmation,
    takeover_callback=my_takeover,
)
```

## 示例

查看 `examples/` 目录获取更多使用示例：

- `basic_usage.py` - 基础任务执行
- 单步调试模式
- 批量任务执行
- 自定义回调

## 二次开发

### 配置开发环境

二次开发需要使用开发依赖：

```bash
pip install -e ".[dev]"
```

### 运行测试

```bash
pytest tests/
```

### 完整项目结构

```
phone_agent/
├── __init__.py          # 包导出
├── agent.py             # PhoneAgent 主类
├── adb/                 # ADB 工具
│   ├── connection.py    # 远程/本地连接管理
│   ├── screenshot.py    # 屏幕截图
│   ├── input.py         # 文本输入 (ADB Keyboard)
│   └── device.py        # 设备控制 (点击、滑动等)
├── actions/             # 操作处理
│   └── handler.py       # 操作执行器
├── config/              # 配置
│   ├── apps.py          # 支持的应用映射
│   ├── prompts_zh.py    # 中文系统提示词
│   └── prompts_en.py    # 英文系统提示词
└── model/               # AI 模型客户端
    └── client.py        # OpenAI 兼容客户端
```

## 常见问题

我们列举了一些常见的问题，以及对应的解决方案：

### 设备未找到

尝试通过重启 ADB 服务来解决：

```bash
adb kill-server
adb start-server
adb devices
```

如果仍然无法识别，请检查：

1. USB 调试是否已开启
2. 数据线是否支持数据传输（部分数据线仅支持充电）
3. 手机上弹出的授权框是否已点击「允许」
4. 尝试更换 USB 接口或数据线

### 能打开应用，但无法点击

部分机型需要同时开启两个调试选项才能正常使用：

- **USB 调试**
- **USB 调试（安全设置）**

请在 `设置 → 开发者选项` 中检查这两个选项是否都已启用。

### 文本输入不工作

1. 确保设备已安装 ADB Keyboard
2. 在设置 > 系统 > 语言和输入法 > 虚拟键盘 中启用
3. Agent 会在需要输入时自动切换到 ADB Keyboard

### 截图失败（黑屏）

这通常意味着应用正在显示敏感页面（支付、密码、银行类应用）。Agent 会自动检测并请求人工接管。

### windows 编码异常问题

报错信息形如 `UnicodeEncodeError gbk code`

解决办法: 在运行代码的命令前面加上环境变量: `PYTHONIOENCODING=utf-8`

### 交互模式非TTY环境无法使用

报错形如: `EOF when reading a line`

解决办法: 使用非交互模式直接指定任务, 或者切换到 TTY 模式的终端应用.

### 引用

如果你觉得我们的工作有帮助，请引用以下论文：

```bibtex
@article{liu2024autoglm,
  title={Autoglm: Autonomous foundation agents for guis},
  author={Liu, Xiao and Qin, Bo and Liang, Dongzhu and Dong, Guang and Lai, Hanyu and Zhang, Hanchen and Zhao, Hanlin and Iong, Iat Long and Sun, Jiadai and Wang, Jiaqi and others},
  journal={arXiv preprint arXiv:2411.00820},
  year={2024}
}
@article{xu2025mobilerl,
  title={MobileRL: Online Agentic Reinforcement Learning for Mobile GUI Agents},
  author={Xu, Yifan and Liu, Xiao and Liu, Xinghan and Fu, Jiaqi and Zhang, Hanchen and Jing, Bohao and Zhang, Shudan and Wang, Yuting and Zhao, Wenyi and Dong, Yuxiao},
  journal={arXiv preprint arXiv:2509.18119},
  year={2025}
}
```
