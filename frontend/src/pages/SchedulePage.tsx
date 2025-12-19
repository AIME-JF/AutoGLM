import React, { useEffect, useState } from 'react';
import { Table, Button, Switch, Modal, Form, Input, Select, InputNumber, Space, message, Popconfirm } from 'antd';
import {
    ClockCircleOutlined,
    PlusOutlined,
    DeleteOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { SCHEDULED_TASKS_API, DEVICES_API } from '../api';
import GlassCard from '../components/GlassCard';

const { Option } = Select;
const { TextArea } = Input;

interface ScheduledTask {
    id: number;
    name: string;
    device_id: string;
    task_content: string;
    schedule_type: string;
    cron_expression: string | null;
    interval_seconds: number | null;
    enabled: number;
    last_run_at: string | null;
    next_run_at: string | null;
    created_at: string;
}

interface Device {
    id: string;
    status: string;
    type: string;
}

// 常用 Cron 预设
const CRON_PRESETS = [
    { label: '每天 9:00', value: '0 9 * * *' },
    { label: '每天 12:00', value: '0 12 * * *' },
    { label: '每天 18:00', value: '0 18 * * *' },
    { label: '每天 22:00', value: '0 22 * * *' },
    { label: '每小时', value: '0 * * * *' },
    { label: '每周一 9:00', value: '0 9 * * 1' },
];

const SchedulePage: React.FC = () => {
    const [tasks, setTasks] = useState<ScheduledTask[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [form] = Form.useForm();

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await SCHEDULED_TASKS_API.list();
            setTasks(res.data.tasks || []);
        } catch (error) {
            console.error('获取定时任务失败', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDevices = async () => {
        try {
            const res = await DEVICES_API.list();
            setDevices(res.data.devices || []);
        } catch (error) {
            console.error('获取设备列表失败', error);
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchDevices();
    }, []);

    const handleCreate = async (values: any) => {
        try {
            await SCHEDULED_TASKS_API.create({
                name: values.name,
                device_id: values.device_id,
                task_content: values.task_content,
                schedule_type: values.schedule_type,
                cron_expression: values.schedule_type === 'cron' ? values.cron_expression : undefined,
                interval_seconds: values.schedule_type === 'interval' ? values.interval_seconds * 60 : undefined,
            });
            message.success('定时任务创建成功');
            setModalVisible(false);
            form.resetFields();
            fetchTasks();
        } catch (error) {
            message.error('创建失败');
        }
    };

    const handleToggle = async (taskId: number, enabled: boolean) => {
        try {
            await SCHEDULED_TASKS_API.update(taskId, enabled);
            message.success(enabled ? '已启用' : '已禁用');
            fetchTasks();
        } catch (error) {
            message.error('操作失败');
        }
    };

    const handleDelete = async (taskId: number) => {
        try {
            await SCHEDULED_TASKS_API.delete(taskId);
            message.success('已删除');
            fetchTasks();
        } catch (error) {
            message.error('删除失败');
        }
    };

    const formatSchedule = (task: ScheduledTask) => {
        if (task.schedule_type === 'cron' && task.cron_expression) {
            const preset = CRON_PRESETS.find(p => p.value === task.cron_expression);
            return preset ? preset.label : task.cron_expression;
        }
        if (task.schedule_type === 'interval' && task.interval_seconds) {
            const mins = Math.round(task.interval_seconds / 60);
            if (mins >= 60) {
                return `每 ${Math.round(mins / 60)} 小时`;
            }
            return `每 ${mins} 分钟`;
        }
        return '-';
    };

    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span className="text-slate-200 font-medium">{text}</span>,
        },
        {
            title: '任务内容',
            dataIndex: 'task_content',
            key: 'task_content',
            ellipsis: true,
            width: 250,
            render: (text: string) => <span className="text-slate-400">{text}</span>,
        },
        {
            title: '设备',
            dataIndex: 'device_id',
            key: 'device_id',
            width: 150,
            render: (text: string) => <span className="text-slate-500 text-sm font-mono">{text}</span>,
        },
        {
            title: '执行周期',
            key: 'schedule',
            width: 120,
            render: (_: any, record: ScheduledTask) => (
                <span className="text-indigo-400">{formatSchedule(record)}</span>
            ),
        },
        {
            title: '上次执行',
            dataIndex: 'last_run_at',
            key: 'last_run_at',
            width: 150,
            render: (text: string) => (
                <span className="text-slate-500 text-sm">
                    {text ? new Date(text).toLocaleString('zh-CN', {
                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                    }) : '-'}
                </span>
            ),
        },
        {
            title: '状态',
            key: 'enabled',
            width: 80,
            render: (_: any, record: ScheduledTask) => (
                <Switch
                    checked={record.enabled === 1}
                    onChange={(checked) => handleToggle(record.id, checked)}
                    size="small"
                />
            ),
        },
        {
            title: '操作',
            key: 'actions',
            width: 80,
            render: (_: any, record: ScheduledTask) => (
                <Popconfirm
                    title="确定删除此定时任务？"
                    onConfirm={() => handleDelete(record.id)}
                    okText="删除"
                    cancelText="取消"
                >
                    <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        danger
                    />
                </Popconfirm>
            ),
        },
    ];

    return (
        <div className="h-full p-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
                {/* 页面标题 */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">定时任务</h2>
                        <p className="text-slate-400">设置自动执行的任务调度</p>
                    </div>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading}>
                            刷新
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
                            新建任务
                        </Button>
                    </Space>
                </div>

                {/* 任务列表 */}
                <GlassCard title="任务列表" icon={<ClockCircleOutlined />}>
                    <Table
                        dataSource={tasks}
                        columns={columns}
                        rowKey="id"
                        loading={loading}
                        pagination={false}
                        size="middle"
                    />
                    {tasks.length === 0 && !loading && (
                        <div className="text-center text-slate-500 py-8">
                            暂无定时任务，点击"新建任务"创建
                        </div>
                    )}
                </GlassCard>
            </div>

            {/* 新建任务弹窗 */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <ClockCircleOutlined />
                        <span>新建定时任务</span>
                    </div>
                }
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={500}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreate}
                    initialValues={{ schedule_type: 'cron' }}
                >
                    <Form.Item
                        name="name"
                        label="任务名称"
                        rules={[{ required: true, message: '请输入任务名称' }]}
                    >
                        <Input placeholder="例如：每日刷抖音" />
                    </Form.Item>

                    <Form.Item
                        name="device_id"
                        label="执行设备"
                        rules={[{ required: true, message: '请选择设备' }]}
                    >
                        <Select placeholder="选择设备">
                            {devices.filter(d => d.status === 'device').map(device => (
                                <Option key={device.id} value={device.id}>
                                    {device.id} ({device.type})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="task_content"
                        label="任务内容"
                        rules={[{ required: true, message: '请输入任务内容' }]}
                    >
                        <TextArea rows={3} placeholder="输入要执行的任务指令" />
                    </Form.Item>

                    <Form.Item
                        name="schedule_type"
                        label="调度类型"
                        rules={[{ required: true }]}
                    >
                        <Select>
                            <Option value="cron">定时执行 (Cron)</Option>
                            <Option value="interval">间隔执行</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.schedule_type !== cur.schedule_type}>
                        {({ getFieldValue }) => (
                            getFieldValue('schedule_type') === 'cron' ? (
                                <Form.Item
                                    name="cron_expression"
                                    label="执行时间"
                                    rules={[{ required: true, message: '请选择执行时间' }]}
                                >
                                    <Select placeholder="选择执行时间">
                                        {CRON_PRESETS.map(preset => (
                                            <Option key={preset.value} value={preset.value}>
                                                {preset.label}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            ) : (
                                <Form.Item
                                    name="interval_seconds"
                                    label="间隔时间（分钟）"
                                    rules={[{ required: true, message: '请输入间隔时间' }]}
                                >
                                    <InputNumber min={1} max={1440} style={{ width: '100%' }} placeholder="输入间隔分钟数" />
                                </Form.Item>
                            )
                        )}
                    </Form.Item>

                    <Form.Item className="mb-0 pt-4">
                        <Space>
                            <Button type="primary" htmlType="submit">
                                创建
                            </Button>
                            <Button onClick={() => setModalVisible(false)}>
                                取消
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SchedulePage;
