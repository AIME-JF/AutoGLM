import React from 'react';
import {
  RocketOutlined,
  MobileOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import ConfigPage from './pages/ConfigPage';
import DevicePage from './pages/DevicePage';
import TaskPage from './pages/TaskPage';
import TaskHistoryPage from './pages/TaskHistoryPage';
import SchedulePage from './pages/SchedulePage';
import StatsPage from './pages/StatsPage';
import StatusIndicator from './components/StatusIndicator';

const menuItems = [
  { key: '/tasks', icon: <RocketOutlined />, label: '任务控制台' },
  { key: '/history', icon: <HistoryOutlined />, label: '任务历史' },
  { key: '/schedule', icon: <ClockCircleOutlined />, label: '定时任务' },
  { key: '/stats', icon: <DashboardOutlined />, label: '统计面板' },
  { key: '/devices', icon: <MobileOutlined />, label: '设备管理' },
  { key: '/config', icon: <SettingOutlined />, label: '模型配置' },
];

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      {/* 动态背景 */}
      <div className="animated-bg" />

      {/* 侧边栏 */}
      <aside className="sidebar w-60 flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-5 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            }}
          >
            <ThunderboltOutlined />
          </div>
          <div>
            <div className="text-base font-bold text-slate-100">AutoGLM</div>
            <div className="text-xs text-slate-500">Phone Agent</div>
          </div>
        </div>

        {/* 分割线 */}
        <div className="mx-4 h-px bg-white/5" />

        {/* 导航菜单 */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => (
            <div
              key={item.key}
              onClick={() => navigate(item.key)}
              className={`sidebar-item ${location.pathname === item.key ? 'active' : ''}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </nav>

        {/* 底部状态 */}
        <div className="p-4 mx-3 mb-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">系统状态</span>
            <StatusIndicator status="online" size="sm" />
          </div>
          <div className="text-xs text-slate-400">
            v2.0.0 · 开发模式
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 顶部栏 */}
        <header
          className="h-14 px-6 flex items-center justify-between shrink-0"
          style={{
            background: 'rgba(10, 10, 15, 0.8)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-100 m-0">
              {menuItems.find(i => i.key === location.pathname)?.label || 'AutoGLM'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <StatusIndicator status="running" text="模型就绪" size="sm" />
          </div>
        </header>

        {/* 页面内容 */}
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/tasks" replace />} />
            <Route path="/tasks" element={<TaskPage />} />
            <Route path="/history" element={<TaskHistoryPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/devices" element={<DevicePage />} />
            <Route path="/config" element={<ConfigPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
