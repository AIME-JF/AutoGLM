import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Modal, Timeline, Empty, Tooltip, message } from 'antd';
import {
    HistoryOutlined,
    ReloadOutlined,
    PlayCircleOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined
} from '@ant-design/icons';
import { TASKS_API } from '../api';
import GlassCard from '../components/GlassCard';

interface TaskRecord {
    id: string;
    device_id: string;
    task_content: string;
    status: string;
    current_step: number;
    max_steps: number;
    started_at: string;
    finished_at: string | null;
    message: string | null;
}

interface TaskLog {
    id: number;
    task_id: string;
    log_type: string;
    content: string;
    timestamp: string;
}

const TaskHistoryPage: React.FC = () => {
    const [tasks, setTasks] = useState<TaskRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
    const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await TASKS_API.getHistory(pageSize, (page - 1) * pageSize);
            setTasks(res.data.tasks);
            setTotal(res.data.total);
        } catch (error) {
            console.error('获取任务历史失败', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [page, pageSize]);

    const handleViewDetail = async (task: TaskRecord) => {
        setSelectedTask(task);
        setDetailVisible(true);
        setDetailLoading(true);

        try {
            const res = await TASKS_API.getDetail(task.id);
            setTaskLogs(res.data.logs || []);
        } catch (error) {
            console.error('获取任务详情失败', error);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleReplay = async (taskId: string) => {
        try {
            const res = await TASKS_API.replay(taskId);
            message.success(`任务已重新启动，新任务ID: ${res.data.task_id}`);
        } catch (error) {
            message.error('重跑任务失败');
        }
    };

    const getStatusTag = (status: string) => {
        switch (status) {
            case 'finished':
                return <Tag icon={<CheckCircleOutlined />} color="success">完成</Tag>;
            case 'error':
                return <Tag icon={<CloseCircleOutlined />} color="error">失败</Tag>;
            case 'running':
                return <Tag icon={<ClockCircleOutlined />} color="processing">运行中</Tag>;
            default:
                return <Tag>{status}</Tag>;
        }
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return '-';
        const date = new Date(isoString);
        return date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const columns = [
        {
            title: '任务内容',
            dataIndex: 'task_content',
            key: 'task_content',
            ellipsis: true,
            width: 300,
            render: (text: string) => (
                <Tooltip title={text}>
                    <span className="text-slate-200">{text}</span>
                </Tooltip>
            ),
        },
        {
            title: '设备',
            dataIndex: 'device_id',
            key: 'device_id',
            width: 150,
            render: (text: string) => (
                <span className="text-slate-400 text-sm font-mono">{text}</span>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => getStatusTag(status),
        },
        {
            title: '步骤',
            key: 'steps',
            width: 80,
            render: (_: any, record: TaskRecord) => (
                <span className="text-slate-400 text-sm">
                    {record.current_step}/{record.max_steps}
                </span>
            ),
        },
        {
            title: '开始时间',
            dataIndex: 'started_at',
            key: 'started_at',
            width: 150,
            render: (text: string) => (
                <span className="text-slate-400 text-sm">{formatTime(text)}</span>
            ),
        },
        {
            title: '操作',
            key: 'actions',
            width: 150,
            render: (_: any, record: TaskRecord) => (
                <Space>
                    <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(record)}
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        详情
                    </Button>
                    <Button
                        type="text"
                        size="small"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleReplay(record.id)}
                        style={{ color: '#6366f1' }}
                    >
                        重跑
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div className="h-full p-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
                {/* 页面标题 */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">任务历史</h2>
                        <p className="text-slate-400">查看和管理执行过的任务记录</p>
                    </div>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchTasks}
                        loading={loading}
                    >
                        刷新
                    </Button>
                </div>

                {/* 任务列表 */}
                <GlassCard title="历史记录" icon={<HistoryOutlined />}>
                    <Table
                        dataSource={tasks}
                        columns={columns}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            current: page,
                            pageSize: pageSize,
                            total: total,
                            showSizeChanger: true,
                            showTotal: (total) => `共 ${total} 条`,
                            onChange: (p, ps) => {
                                setPage(p);
                                setPageSize(ps);
                            },
                        }}
                        size="middle"
                    />
                </GlassCard>
            </div>

            {/* 任务详情弹窗 */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <HistoryOutlined />
                        <span>任务详情</span>
                    </div>
                }
                open={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={null}
                width={700}
            >
                {selectedTask && (
                    <div className="space-y-4">
                        {/* 任务信息 */}
                        <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">任务内容</div>
                                    <div className="text-sm text-slate-200">{selectedTask.task_content}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">设备</div>
                                    <div className="text-sm text-slate-400 font-mono">{selectedTask.device_id}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">状态</div>
                                    {getStatusTag(selectedTask.status)}
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">步骤</div>
                                    <div className="text-sm text-slate-400">
                                        {selectedTask.current_step} / {selectedTask.max_steps}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 执行日志 */}
                        <div>
                            <div className="text-sm font-medium text-slate-200 mb-3">执行日志</div>
                            <div
                                className="p-4 rounded-lg overflow-y-auto"
                                style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    maxHeight: 400,
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}
                            >
                                {detailLoading ? (
                                    <div className="text-center text-slate-500 py-8">加载中...</div>
                                ) : taskLogs.length > 0 ? (
                                    <Timeline
                                        items={taskLogs.map((log) => ({
                                            color: log.log_type === 'error' ? 'red' :
                                                log.log_type === 'action' ? 'green' :
                                                    log.log_type === 'thinking' ? 'blue' : 'gray',
                                            children: (
                                                <div className="mb-2">
                                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                        <span className="uppercase font-bold">{log.log_type}</span>
                                                        <span>{formatTime(log.timestamp)}</span>
                                                    </div>
                                                    <div className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                                                        {log.content}
                                                    </div>
                                                </div>
                                            ),
                                        }))}
                                    />
                                ) : (
                                    <Empty description="暂无日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TaskHistoryPage;
