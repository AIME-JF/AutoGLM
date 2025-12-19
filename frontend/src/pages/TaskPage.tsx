import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input, Button, Image, Switch, Slider, Progress, Badge } from 'antd';
import {
  PlayCircleOutlined,
  SyncOutlined,
  RobotOutlined,
  MobileOutlined,
  SendOutlined,
  ThunderboltOutlined,
  ExpandOutlined,
  VideoCameraOutlined,
  FullscreenOutlined,
  ColumnWidthOutlined,
  DesktopOutlined,
  WifiOutlined,
  DisconnectOutlined,
  StopOutlined
} from '@ant-design/icons';
import { useDeviceStore } from '../stores/deviceStore';
import { useTaskStore } from '../stores/taskStore';
import { DEVICES_API } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import GlassCard from '../components/GlassCard';
import StatusIndicator from '../components/StatusIndicator';
import ActionOverlay from '../components/ActionOverlay';

const { TextArea } = Input;

const PRESET_TASKS = [
  { label: "刷抖音", desc: "打开抖音刷视频，每个视频停留5-10秒" },
  { label: "小红书美食", desc: "打开小红书，搜索'美食'，浏览并点赞" },
  { label: "朋友圈点赞", desc: "打开朋友圈，给第一条动态点赞" },
  { label: "微博热搜", desc: "打开微博查看热搜榜前三条" },
];

const TaskPage: React.FC = () => {
  const { devices, fetchDevices } = useDeviceStore();
  const {
    currentTaskId, logs, screenshot, status,
    currentStep, maxSteps, lastAction,
    startTask, stopTask, addLog, setScreenshot, setStep, addAction, finishTask
  } = useTaskStore();

  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [taskInput, setTaskInput] = useState('');
  const [livePreview, setLivePreview] = useState(true);
  const [liveScreenshot, setLiveScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(400);
  const [scrcpyLoading, setScrcpyLoading] = useState(false);
  const [screenSize, setScreenSize] = useState({ width: 1080, height: 1920 });

  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const previewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  // WebSocket 连接
  const wsUrl = currentTaskId ? `ws://localhost:8000/api/v1/tasks/ws/${currentTaskId}` : null;

  const { status: wsStatus, reconnectCount } = useWebSocket(wsUrl, {
    onOpen: () => {
      const timestamp = new Date().toLocaleTimeString();
      addLog({ type: 'info', content: '已连接到任务流', timestamp });
    },
    onMessage: (msg) => {
      const timestamp = new Date().toLocaleTimeString();

      switch (msg.type) {
        case 'start':
          addLog({ type: 'info', content: `任务开始: ${msg.data.task}`, timestamp });
          if (msg.data.max_steps) {
            setStep(0, msg.data.max_steps);
          }
          break;
        case 'step':
          setStep(msg.data.current, msg.data.max);
          break;
        case 'thinking':
          addLog({ type: 'thinking', content: msg.data.content, timestamp });
          break;
        case 'action':
          addLog({ type: 'action', content: JSON.stringify(msg.data.content, null, 2), timestamp });
          // 添加操作记录用于轨迹显示
          addAction({
            type: Object.keys(msg.data.content).find(k => !k.startsWith('_')) || 'unknown',
            params: msg.data.content,
            timestamp,
          });
          break;
        case 'screenshot':
          setScreenshot(msg.data.base64);
          setScreenSize({ width: msg.data.width || 1080, height: msg.data.height || 1920 });
          break;
        case 'finish':
          addLog({ type: 'info', content: `任务结束: ${msg.data.message}`, timestamp });
          finishTask();
          break;
        case 'error':
          addLog({ type: 'error', content: msg.data?.message || String(msg.data), timestamp });
          finishTask();
          break;
        case 'close':
          finishTask();
          break;
      }
    },
    onError: () => {
      const timestamp = new Date().toLocaleTimeString();
      addLog({ type: 'error', content: 'WebSocket 连接错误', timestamp });
    },
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0].id);
    }
  }, [devices]);

  // 实时截图轮询
  const captureScreenshot = useCallback(async () => {
    if (!selectedDevice || isCapturing) return;

    setIsCapturing(true);
    try {
      const res = await DEVICES_API.screenshot(selectedDevice);
      if (res.data?.base64) {
        setLiveScreenshot(res.data.base64);
        if (res.data.width && res.data.height) {
          setScreenSize({ width: res.data.width, height: res.data.height });
        }
      }
    } catch (error) {
      console.log('截图失败');
    } finally {
      setIsCapturing(false);
    }
  }, [selectedDevice, isCapturing]);

  // 启动/停止实时预览
  useEffect(() => {
    if (livePreview && selectedDevice) {
      captureScreenshot();
      previewIntervalRef.current = setInterval(captureScreenshot, 500);
    } else {
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
    }

    return () => {
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
      }
    };
  }, [livePreview, selectedDevice, captureScreenshot]);

  const handleStart = () => {
    if (!selectedDevice || !taskInput) return;
    startTask(selectedDevice, taskInput);
  };

  // 启动 scrcpy
  const handleStartScrcpy = async () => {
    if (!selectedDevice) return;
    setScrcpyLoading(true);
    try {
      await DEVICES_API.scrcpy(selectedDevice);
    } catch (error) {
      console.error('启动 scrcpy 失败', error);
    } finally {
      setScrcpyLoading(false);
    }
  };

  useEffect(() => {
    const el = logContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  const onlineDevices = devices.filter(d => d.status === 'device');
  const displayScreenshot = screenshot || liveScreenshot;

  // WebSocket 状态显示
  const getWsStatusBadge = () => {
    switch (wsStatus) {
      case 'connected':
        return <Badge status="success" text="已连接" />;
      case 'connecting':
        return <Badge status="processing" text="连接中..." />;
      case 'reconnecting':
        return <Badge status="warning" text={`重连中(${reconnectCount})`} />;
      default:
        return <Badge status="default" text="未连接" />;
    }
  };

  // 获取预览容器尺寸
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const updateSize = () => {
      if (previewContainerRef.current) {
        setContainerSize({
          width: previewContainerRef.current.clientWidth,
          height: previewContainerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [previewWidth]);

  return (
    <div className="h-full p-6 flex gap-6">
      {/* 左侧 - 设备选择和屏幕预览 */}
      <div
        className="shrink-0 flex flex-col gap-4"
        style={{ width: previewWidth }}
      >
        {/* 设备选择 */}
        <GlassCard
          icon={<MobileOutlined />}
          extra={
            <Button
              type="text"
              size="small"
              icon={<SyncOutlined />}
              onClick={() => fetchDevices()}
              style={{ color: 'var(--color-text-secondary)' }}
            />
          }
          bodyClassName="py-2"
        >
          {onlineDevices.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {onlineDevices.map(device => (
                <div
                  key={device.id}
                  onClick={() => setSelectedDevice(device.id)}
                  className={`px-3 py-2 rounded-lg cursor-pointer transition-all ${selectedDevice === device.id
                    ? 'bg-indigo-500/20 border border-indigo-500/50'
                    : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <StatusIndicator status="online" size="sm" showPulse={false} />
                    <span className="text-sm font-medium text-slate-200 truncate" style={{ maxWidth: 150 }}>
                      {device.id}
                    </span>
                    <span className="text-xs text-slate-500">{device.type.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2 text-center text-slate-500 text-sm">
              暂无在线设备
            </div>
          )}
        </GlassCard>

        {/* 屏幕预览 */}
        <GlassCard
          title="当前画面"
          icon={<ExpandOutlined />}
          extra={
            <div className="flex items-center gap-3">
              <Button
                type="text"
                size="small"
                icon={<DesktopOutlined />}
                onClick={handleStartScrcpy}
                loading={scrcpyLoading}
                disabled={!selectedDevice}
                style={{ color: '#8b5cf6', fontSize: 12 }}
              >
                实时投屏
              </Button>
              <div className="flex items-center gap-1">
                <ColumnWidthOutlined style={{ color: 'var(--color-text-muted)', fontSize: 12 }} />
                <Slider
                  min={280}
                  max={600}
                  value={previewWidth}
                  onChange={setPreviewWidth}
                  style={{ width: 60 }}
                  tooltip={{ formatter: (v) => `${v}px` }}
                />
              </div>
              <div className="flex items-center gap-1">
                <VideoCameraOutlined style={{ color: livePreview ? '#22c55e' : '#64748b', fontSize: 12 }} />
                <Switch
                  size="small"
                  checked={livePreview}
                  onChange={setLivePreview}
                />
              </div>
            </div>
          }
          className="flex-1 flex flex-col min-h-0"
          bodyClassName="flex-1 flex items-center justify-center p-2 overflow-hidden relative"
        >
          <div ref={previewContainerRef} className="w-full h-full relative flex items-center justify-center">
            {displayScreenshot ? (
              <>
                <Image
                  src={`data:image/png;base64,${displayScreenshot}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: '8px',
                  }}
                  preview={{
                    mask: <FullscreenOutlined style={{ fontSize: 24 }} />,
                  }}
                />
                {/* 操作轨迹覆盖层 */}
                {lastAction && status === 'running' && (
                  <ActionOverlay
                    action={lastAction.params}
                    screenWidth={screenSize.width}
                    screenHeight={screenSize.height}
                    containerWidth={containerSize.width}
                    containerHeight={containerSize.height}
                  />
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.1))',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  <MobileOutlined style={{ fontSize: 20, color: '#6366f1' }} />
                </div>
                <div className="text-slate-400 text-sm">
                  {selectedDevice ? '正在获取画面...' : '请先选择设备'}
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* 任务进度 */}
        {status === 'running' && (
          <GlassCard bodyClassName="py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping absolute" />
                  <div className="w-2 h-2 rounded-full bg-indigo-500 relative" />
                </div>
                <span className="text-indigo-300 text-sm font-medium">执行中</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-xs">
                  步骤 {currentStep} / {maxSteps}
                </span>
                <Button
                  type="primary"
                  danger
                  size="small"
                  icon={<StopOutlined />}
                  onClick={stopTask}
                >
                  停止
                </Button>
              </div>
            </div>
            <Progress
              percent={Math.round((currentStep / maxSteps) * 100)}
              size="small"
              strokeColor={{
                '0%': '#6366f1',
                '100%': '#8b5cf6',
              }}
              trailColor="rgba(255,255,255,0.1)"
              showInfo={false}
            />
          </GlassCard>
        )}
      </div>

      {/* 右侧 - 控制面板 */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* 任务输入 */}
        <GlassCard
          title="任务指令"
          icon={<ThunderboltOutlined />}
          glow={status === 'running'}
          extra={status === 'running' ? getWsStatusBadge() : null}
        >
          <div className="flex gap-3 mb-3">
            <TextArea
              rows={2}
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
              placeholder="输入任务指令，例如：打开抖音刷视频..."
              className="flex-1 input-glow"
              disabled={status === 'running'}
              style={{ resize: 'none' }}
            />
            <Button
              type="primary"
              icon={status === 'running' ? <SyncOutlined spin /> : <SendOutlined />}
              onClick={handleStart}
              loading={status === 'running'}
              disabled={!selectedDevice || !taskInput || status === 'running'}
              style={{ height: 'auto', padding: '12px 20px' }}
            >
              {status === 'running' ? '执行中' : '执行'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_TASKS.map(task => (
              <div
                key={task.label}
                onClick={() => status !== 'running' && setTaskInput(task.desc)}
                className="task-tag"
                style={{ opacity: status === 'running' ? 0.5 : 1, cursor: status === 'running' ? 'not-allowed' : 'pointer' }}
              >
                <PlayCircleOutlined />
                {task.label}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* 运行日志 */}
        <GlassCard
          title="运行日志"
          icon={<RobotOutlined />}
          className="flex-1 flex flex-col min-h-0"
          bodyClassName="flex-1 overflow-hidden flex flex-col p-0"
        >
          <div
            ref={logContainerRef}
            className="flex-1 overflow-y-auto p-4"
          >
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className={`log-item ${log.type}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold uppercase opacity-70">
                      {log.type === 'thinking' && '💭 思考'}
                      {log.type === 'action' && '🎯 动作'}
                      {log.type === 'error' && '❌ 错误'}
                      {log.type === 'info' && 'ℹ️ 信息'}
                    </span>
                    <span className="text-xs opacity-50">{log.timestamp}</span>
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {log.content}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state h-full">
                <RobotOutlined className="empty-state-icon" />
                <span>暂无日志，启动任务后将显示执行过程</span>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default TaskPage;
