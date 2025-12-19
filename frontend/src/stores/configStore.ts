import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CONFIG_API } from '../api';
import { message } from 'antd';

interface ConfigState {
  base_url: string;
  model_name: string;
  api_key: string;
  loading: boolean;
  fetchConfig: () => Promise<void>;
  updateConfig: (data: { base_url: string; model_name: string; api_key: string }) => Promise<void>;
  setConfig: (data: { base_url: string; model_name: string; api_key: string }) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      base_url: 'http://localhost:8000/v1',
      model_name: 'autoglm-phone-9b',
      api_key: 'EMPTY',
      loading: false,
      fetchConfig: async () => {
        set({ loading: true });
        try {
          const res = await CONFIG_API.get();
          set({ ...res.data });
        } catch (error) {
          // 后端未启动时使用本地存储的配置，不报错
          console.log('使用本地配置');
        } finally {
          set({ loading: false });
        }
      },
      updateConfig: async (data) => {
        set({ loading: true });
        try {
          await CONFIG_API.update(data);
          set({ ...data });
          message.success('配置已保存');
        } catch (error) {
          // 后端未启动时仍然保存到本地
          set({ ...data });
          message.success('配置已保存到本地');
        } finally {
          set({ loading: false });
        }
      },
      // 直接设置配置（用于推荐配置的快速应用）
      setConfig: (data) => {
        set({ ...data });
      },
    }),
    {
      name: 'autoglm-config',
      partialize: (state) => ({
        base_url: state.base_url,
        model_name: state.model_name,
        api_key: state.api_key,
      }),
    }
  )
);
