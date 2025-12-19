import React, { useEffect } from 'react';
import { Form, Input, Button, Typography, Tooltip, App } from 'antd';
import {
  SettingOutlined,
  ApiOutlined,
  KeyOutlined,
  SaveOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useConfigStore } from '../stores/configStore';
import GlassCard from '../components/GlassCard';

const { Text } = Typography;

// 推荐配置预设
const PRESET_CONFIGS = [
  {
    name: '本地部署 (vLLM/SGLang)',
    desc: '适用于本地运行的模型服务',
    icon: <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 18 }} />,
    iconBg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))',
    iconBorder: 'rgba(34, 197, 94, 0.3)',
    config: {
      base_url: 'http://localhost:8000/v1',
      model_name: 'autoglm-phone-9b',
      api_key: 'EMPTY',
    }
  },
  {
    name: '智谱 AI 云服务',
    desc: '使用智谱 AI 官方 API',
    icon: <ApiOutlined style={{ color: '#6366f1', fontSize: 18 }} />,
    iconBg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.1))',
    iconBorder: 'rgba(99, 102, 241, 0.3)',
    config: {
      base_url: 'https://open.bigmodel.cn/api/paas/v4',
      model_name: 'glm-4v',
      api_key: '',
    }
  }
];

const ConfigPage: React.FC = () => {
  const { base_url, model_name, api_key, loading, fetchConfig, updateConfig, setConfig } = useConfigStore();
  const [form] = Form.useForm();
  const { message } = App.useApp();

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    form.setFieldsValue({ base_url, model_name, api_key });
  }, [base_url, model_name, api_key, form]);

  const onFinish = (values: { base_url: string; model_name: string; api_key: string }) => {
    updateConfig(values);
  };

  // 应用推荐配置
  const applyPreset = (config: { base_url: string; model_name: string; api_key: string }) => {
    form.setFieldsValue(config);
    setConfig(config);
    message.success('配置已应用');
  };

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="max-w-3xl mx-auto">
        {/* 头部说明 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">模型配置</h2>
          <p className="text-slate-400">
            配置 AI 模型的 API 连接信息，支持 OpenAI 兼容格式的接口。
          </p>
        </div>

        {/* 配置表单 */}
        <GlassCard
          title="API 配置"
          icon={<ApiOutlined />}
          className="mb-6"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ base_url, model_name, api_key }}
            requiredMark={false}
          >
            <Form.Item
              label={
                <div className="flex items-center gap-2 text-slate-300">
                  <ApiOutlined />
                  <span>Base URL</span>
                  <Tooltip title="模型服务的 API 地址，如本地部署的 vLLM/SGLang 服务">
                    <QuestionCircleOutlined className="text-slate-500 cursor-help" />
                  </Tooltip>
                </div>
              }
              name="base_url"
              rules={[{ required: true, message: '请输入 Base URL' }]}
            >
              <Input
                placeholder="http://localhost:8000/v1"
                className="input-glow"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label={
                <div className="flex items-center gap-2 text-slate-300">
                  <RobotOutlined />
                  <span>Model Name</span>
                  <Tooltip title="模型名称，需与服务端配置一致">
                    <QuestionCircleOutlined className="text-slate-500 cursor-help" />
                  </Tooltip>
                </div>
              }
              name="model_name"
              rules={[{ required: true, message: '请输入模型名称' }]}
            >
              <Input
                placeholder="autoglm-phone-9b"
                className="input-glow"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label={
                <div className="flex items-center gap-2 text-slate-300">
                  <KeyOutlined />
                  <span>API Key</span>
                  <Tooltip title="API 认证密钥，本地部署可填 'EMPTY'">
                    <QuestionCircleOutlined className="text-slate-500 cursor-help" />
                  </Tooltip>
                </div>
              }
              name="api_key"
              rules={[{ required: true, message: '请输入 API Key' }]}
            >
              <Input.Password
                placeholder="sk-... 或 EMPTY"
                className="input-glow"
                size="large"
              />
            </Form.Item>

            <div className="flex items-center gap-4 pt-4 border-t border-white/5">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<SaveOutlined />}
                size="large"
              >
                保存配置
              </Button>
              <Text type="secondary" className="text-sm">
                配置将保存到本地
              </Text>
            </div>
          </Form>
        </GlassCard>

        {/* 推荐配置 */}
        <GlassCard title="推荐配置" icon={<SettingOutlined />}>
          <div className="space-y-4">
            {PRESET_CONFIGS.map((preset, index) => (
              <div
                key={index}
                className="p-4 rounded-xl cursor-pointer transition-all hover:bg-white/5 active:scale-[0.99]"
                style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                onClick={() => applyPreset(preset.config)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: preset.iconBg, border: `1px solid ${preset.iconBorder}` }}
                    >
                      {preset.icon}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">{preset.name}</div>
                      <div className="text-xs text-slate-500">{preset.desc}</div>
                    </div>
                  </div>
                  <span className="text-xs text-indigo-400 hover:text-indigo-300">点击应用 →</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-white/5">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Base URL</div>
                    <code className="text-xs text-indigo-400 break-all">
                      {preset.config.base_url.replace('http://', '').replace('https://', '')}
                    </code>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Model</div>
                    <code className="text-xs text-indigo-400">{preset.config.model_name}</code>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">API Key</div>
                    <code className="text-xs text-indigo-400">
                      {preset.config.api_key || '需要填写'}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default ConfigPage;
