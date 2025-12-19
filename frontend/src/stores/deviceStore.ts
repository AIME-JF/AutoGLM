import { create } from 'zustand';
import { DEVICES_API } from '../api';
import { message } from 'antd';

export interface Device {
  id: string;
  status: string;
  type: string;
}

interface DeviceState {
  devices: Device[];
  loading: boolean;
  fetchDevices: () => Promise<void>;
  connectDevice: (address: string) => Promise<void>;
  disconnectDevice: (address: string) => Promise<void>;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  loading: false,
  fetchDevices: async () => {
    set({ loading: true });
    try {
      const res = await DEVICES_API.list();
      set({ devices: res.data.devices });
    } catch (error) {
      console.error(error);
    } finally {
      set({ loading: false });
    }
  },
  connectDevice: async (address) => {
    try {
      await DEVICES_API.connect(address);
      message.success('连接成功');
      get().fetchDevices();
    } catch (error) {
      message.error('连接失败');
    }
  },
  disconnectDevice: async (address) => {
    try {
      await DEVICES_API.disconnect(address);
      message.success('断开成功');
      get().fetchDevices();
    } catch (error) {
      message.error('断开失败');
    }
  },
}));
