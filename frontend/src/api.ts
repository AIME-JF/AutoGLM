import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
});

export const DEVICES_API = {
  list: () => api.get('/devices/list'),
  connect: (address: string) => api.post('/devices/connect', { address }),
  disconnect: (address: string) => api.post('/devices/disconnect', { address }),
  screenshot: (deviceId: string) => api.get(`/devices/screenshot/${deviceId}`),
  scrcpy: (deviceId: string) => api.post(`/devices/scrcpy/${deviceId}`),
};

export const CONFIG_API = {
  get: () => api.get('/config/'),
  update: (data: any) => api.post('/config/', data),
};

export const TASKS_API = {
  start: (data: { device_id: string; task: string; max_steps?: number }) =>
    api.post('/tasks/start', data),
  stop: (taskId: string) => api.post(`/tasks/stop/${taskId}`),
  getHistory: (limit = 20, offset = 0) =>
    api.get(`/tasks/history?limit=${limit}&offset=${offset}`),
  getStats: () => api.get('/tasks/stats'),
  getDetail: (taskId: string) => api.get(`/tasks/${taskId}`),
  replay: (taskId: string) => api.post(`/tasks/${taskId}/replay`),
};

export const SCHEDULED_TASKS_API = {
  list: () => api.get('/scheduled-tasks/'),
  create: (data: {
    name: string;
    device_id: string;
    task_content: string;
    schedule_type: 'cron' | 'interval';
    cron_expression?: string;
    interval_seconds?: number;
  }) => api.post('/scheduled-tasks/', data),
  update: (taskId: number, enabled: boolean) =>
    api.patch(`/scheduled-tasks/${taskId}`, { enabled }),
  delete: (taskId: number) => api.delete(`/scheduled-tasks/${taskId}`),
};
