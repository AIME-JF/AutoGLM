import { create } from 'zustand';
import { TASKS_API } from '../api';
import { message } from 'antd';

interface TaskLog {
  type: 'thinking' | 'action' | 'error' | 'info';
  content: string;
  timestamp: string;
}

// 操作记录（用于轨迹显示）
interface ActionRecord {
  type: string; // tap, swipe, etc.
  params: any;
  timestamp: string;
  screenshot?: string; // base64
}

interface TaskState {
  currentTaskId: string | null;
  logs: TaskLog[];
  screenshot: string | null;
  status: 'idle' | 'running' | 'finished' | 'error';
  // 新增：进度相关
  currentStep: number;
  maxSteps: number;
  // 新增：操作轨迹
  actions: ActionRecord[];
  lastAction: ActionRecord | null;
  // 新增：截图历史（用于回放）
  screenshotHistory: { base64: string; timestamp: string }[];

  // Actions
  startTask: (deviceId: string, task: string, maxSteps?: number) => Promise<void>;
  stopTask: () => Promise<void>;
  addLog: (log: TaskLog) => void;
  setScreenshot: (base64: string) => void;
  setStep: (current: number, max: number) => void;
  addAction: (action: ActionRecord) => void;
  finishTask: () => void;
  reset: () => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  currentTaskId: null,
  logs: [],
  screenshot: null,
  status: 'idle',
  currentStep: 0,
  maxSteps: 100,
  actions: [],
  lastAction: null,
  screenshotHistory: [],

  startTask: async (deviceId, task, maxSteps = 100) => {
    set({
      status: 'running',
      logs: [],
      screenshot: null,
      currentStep: 0,
      maxSteps,
      actions: [],
      lastAction: null,
      screenshotHistory: [],
    });
    try {
      const res = await TASKS_API.start({ device_id: deviceId, task, max_steps: maxSteps });
      set({ currentTaskId: res.data.task_id });
      message.success('任务已启动');
    } catch (error) {
      set({ status: 'error' });
      message.error('启动失败');
    }
  },

  stopTask: async () => {
    const state = useTaskStore.getState();
    if (!state.currentTaskId) {
      // 没有任务ID但状态是running，直接重置
      if (state.status === 'running') {
        set({ status: 'idle', currentTaskId: null });
        message.info('已重置状态');
      }
      return;
    }

    try {
      await TASKS_API.stop(state.currentTaskId);
      message.info('正在停止任务...');
    } catch (error: any) {
      // 即使后端失败也重置前端状态
      console.error('停止任务请求失败:', error);
      message.warning('强制停止任务');
    }

    // 无论成功与否都重置状态
    set({ status: 'finished', currentTaskId: null });
  },

  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),

  setScreenshot: (base64) => set((state) => ({
    screenshot: base64,
    screenshotHistory: [...state.screenshotHistory, { base64, timestamp: new Date().toISOString() }],
  })),

  setStep: (current, max) => set({ currentStep: current, maxSteps: max }),

  addAction: (action) => set((state) => ({
    actions: [...state.actions, action],
    lastAction: action,
  })),

  finishTask: () => set({ status: 'finished', currentTaskId: null }),

  reset: () => set({
    currentTaskId: null,
    logs: [],
    screenshot: null,
    status: 'idle',
    currentStep: 0,
    actions: [],
    lastAction: null,
    screenshotHistory: [],
  }),
}));
