import React, { useEffect, useState } from 'react';
import { Button, Modal, Input, Typography } from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  DisconnectOutlined,
  UsbOutlined,
  WifiOutlined,
  MobileOutlined,
  LinkOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useDeviceStore } from '../stores/deviceStore';
import GlassCard from '../components/GlassCard';
import StatusIndicator from '../components/StatusIndicator';

const { Text } = Typography;

const DevicePage: React.FC = () => {
  const { devices, loading, fetchDevices, connectDevice, disconnectDevice } = useDeviceStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [address, setAddress] = useState('');

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const total = devices.length;
  const online = devices.filter(d => d.status === 'device').length;
  const usbCount = devices.filter(d => d.type === 'usb').length;
  const wifiCount = devices.filter(d => d.type !== 'usb').length;

  const handleConnect = async () => {
    if (!address) return;
    await connectDevice(address);
    setIsModalOpen(false);
    setAddress('');
  };

  return (
    <div className="h-full p-6 overflow-auto">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stats-card">
          <div className="value">{total}</div>
          <div className="label">总设备数</div>
        </div>
        <div className="stats-card">
          <div className="value" style={{ color: '#22c55e' }}>{online}</div>
          <div className="label">在线设备</div>
        </div>
        <div className="stats-card">
          <div className="value" style={{ color: '#3b82f6' }}>{usbCount}</div>
          <div className="label">USB 连接</div>
        </div>
        <div className="stats-card">
          <div className="value" style={{ color: '#8b5cf6' }}>{wifiCount}</div>
          <div className="label">WiFi 连接</div>
        </div>
      </div>

      {/* 设备列表 */}
      <GlassCard
        title="已连接设备"
        icon={<MobileOutlined />}
        extra={
          <div className="flex gap-2">
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={() => fetchDevices()}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--color-text-secondary)' }}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
            >
              无线连接
            </Button>
          </div>
        }
        className="mb-6"
      >
        {devices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map(device => (
              <div key={device.id} className="device-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: device.type === 'usb'
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1))'
                          : 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1))',
                        border: `1px solid ${device.type === 'usb' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
                      }}
                    >
                      {device.type === 'usb' ? (
                        <UsbOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
                      ) : (
                        <WifiOutlined style={{ color: '#8b5cf6', fontSize: 18 }} />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        {device.type === 'usb' ? 'USB 设备' : 'WiFi 设备'}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-[150px]">
                        {device.id}
                      </div>
                    </div>
                  </div>
                  <StatusIndicator
                    status={device.status === 'device' ? 'online' : 'offline'}
                    size="sm"
                    showPulse={device.status === 'device'}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        background: device.status === 'device' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                        color: device.status === 'device' ? '#22c55e' : '#64748b',
                      }}
                    >
                      {device.status}
                    </span>
                  </div>
                  {device.type !== 'usb' && (
                    <Button
                      danger
                      size="small"
                      type="text"
                      icon={<DisconnectOutlined />}
                      onClick={() => disconnectDevice(device.id)}
                    >
                      断开
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state py-12">
            <MobileOutlined className="empty-state-icon" />
            <span>暂无已连接设备</span>
            <span className="text-xs">请插入USB或添加无线设备</span>
          </div>
        )}
      </GlassCard>

      {/* 连接教程 */}
      <GlassCard title="连接教程" icon={<InfoCircleOutlined />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(59, 130, 246, 0.15)' }}
              >
                <UsbOutlined style={{ color: '#3b82f6' }} />
              </div>
              <h4 className="text-base font-semibold text-slate-200 m-0">有线连接 (USB)</h4>
            </div>
            <ol className="space-y-3 text-sm text-slate-400 pl-4">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                <span>使用数据线将手机连接到电脑</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                <span>在手机上开启 <Text code>开发者模式</Text> (设置 → 关于手机 → 连续点击版本号)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                <span>在 <Text code>开发者选项</Text> 中开启 <Text code>USB调试</Text></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0 mt-0.5">4</span>
                <span>部分手机需开启 <Text code>USB调试(安全设置)</Text></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0 mt-0.5">5</span>
                <span>手机弹出授权框时点击"允许"</span>
              </li>
            </ol>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(139, 92, 246, 0.15)' }}
              >
                <WifiOutlined style={{ color: '#8b5cf6' }} />
              </div>
              <h4 className="text-base font-semibold text-slate-200 m-0">无线连接 (WiFi)</h4>
            </div>
            <ol className="space-y-3 text-sm text-slate-400 pl-4">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                <span>确保手机和电脑在同一WiFi网络下</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                <span>先通过USB连接手机，运行 <Text code>adb tcpip 5555</Text></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                <span>或在手机开发者选项中开启"无线调试"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0 mt-0.5">4</span>
                <span>点击上方"无线连接"按钮，输入 <Text code>IP:端口</Text></span>
              </li>
            </ol>
          </div>
        </div>
      </GlassCard>

      {/* 连接弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <LinkOutlined style={{ color: '#6366f1' }} />
            <span>连接远程设备</span>
          </div>
        }
        open={isModalOpen}
        onOk={handleConnect}
        onCancel={() => setIsModalOpen(false)}
        okText="连接"
        cancelText="取消"
        centered
      >
        <p className="text-slate-400 mb-4">请输入设备的 IP 地址和端口号</p>
        <Input
          placeholder="例如：192.168.1.5:5555"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onPressEnter={handleConnect}
          prefix={<WifiOutlined style={{ color: 'var(--color-text-muted)' }} />}
          className="input-glow"
        />
      </Modal>
    </div>
  );
};

export default DevicePage;
