import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          colorBgContainer: 'rgba(20, 20, 30, 0.8)',
          colorBgElevated: '#1a1a2e',
          colorBorder: 'rgba(255, 255, 255, 0.08)',
          colorText: '#f1f5f9',
          colorTextSecondary: '#94a3b8',
          borderRadius: 12,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        components: {
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: 'rgba(99, 102, 241, 0.15)',
            itemSelectedColor: '#6366f1',
            itemHoverBg: 'rgba(255, 255, 255, 0.05)',
          },
          Card: {
            colorBgContainer: 'rgba(20, 20, 30, 0.6)',
          },
          Button: {
            primaryShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
          },
          Input: {
            colorBgContainer: '#12121a',
            activeBorderColor: '#6366f1',
            hoverBorderColor: '#6366f1',
          },
          Select: {
            colorBgContainer: '#12121a',
            colorBgElevated: '#1a1a2e',
          },
          Modal: {
            contentBg: '#1a1a2e',
            headerBg: '#1a1a2e',
          },
          Table: {
            colorBgContainer: 'transparent',
            headerBg: 'rgba(255, 255, 255, 0.02)',
          },
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
