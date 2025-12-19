import React, { useEffect, useState } from 'react';
import { Statistic, Row, Col, Progress } from 'antd';
import {
    DashboardOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ThunderboltOutlined,
    PercentageOutlined,
    CalendarOutlined
} from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { TASKS_API } from '../api';
import GlassCard from '../components/GlassCard';

interface TaskStats {
    total: number;
    finished: number;
    failed: number;
    today: number;
    success_rate: number;
}

const StatsPage: React.FC = () => {
    const [stats, setStats] = useState<TaskStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [recentTasks, setRecentTasks] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [statsRes, historyRes] = await Promise.all([
                    TASKS_API.getStats(),
                    TASKS_API.getHistory(50, 0),
                ]);
                setStats(statsRes.data);
                setRecentTasks(historyRes.data.tasks || []);
            } catch (error) {
                console.error('获取统计数据失败', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // 按日期分组统计任务数
    const getDailyStats = () => {
        const dailyMap = new Map<string, { total: number; success: number; failed: number }>();

        recentTasks.forEach(task => {
            const date = task.started_at?.split('T')[0];
            if (!date) return;

            if (!dailyMap.has(date)) {
                dailyMap.set(date, { total: 0, success: 0, failed: 0 });
            }
            const entry = dailyMap.get(date)!;
            entry.total++;
            if (task.status === 'finished') entry.success++;
            if (task.status === 'error') entry.failed++;
        });

        // 转换为图表数据
        const data: { date: string; value: number; type: string }[] = [];
        Array.from(dailyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-7) // 最近7天
            .forEach(([date, counts]) => {
                data.push({ date, value: counts.success, type: '成功' });
                data.push({ date, value: counts.failed, type: '失败' });
            });

        return data;
    };

    const chartConfig = {
        data: getDailyStats(),
        xField: 'date',
        yField: 'value',
        seriesField: 'type',
        color: ['#22c55e', '#ef4444'],
        smooth: true,
        lineStyle: {
            lineWidth: 2,
        },
        point: {
            size: 4,
            shape: 'circle',
        },
        legend: {
            position: 'top-right' as const,
        },
        xAxis: {
            label: {
                formatter: (text: string) => text.slice(5), // 只显示月-日
            },
        },
    };

    return (
        <div className="h-full p-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
                {/* 页面标题 */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-100 mb-2">统计仪表盘</h2>
                    <p className="text-slate-400">查看任务执行统计和趋势分析</p>
                </div>

                {/* 统计卡片 */}
                <Row gutter={[16, 16]} className="mb-6">
                    <Col xs={12} sm={6}>
                        <GlassCard bodyClassName="py-4">
                            <Statistic
                                title={<span className="text-slate-400">总任务数</span>}
                                value={stats?.total || 0}
                                prefix={<ThunderboltOutlined style={{ color: '#6366f1' }} />}
                                valueStyle={{ color: '#f1f5f9' }}
                            />
                        </GlassCard>
                    </Col>
                    <Col xs={12} sm={6}>
                        <GlassCard bodyClassName="py-4">
                            <Statistic
                                title={<span className="text-slate-400">成功任务</span>}
                                value={stats?.finished || 0}
                                prefix={<CheckCircleOutlined style={{ color: '#22c55e' }} />}
                                valueStyle={{ color: '#22c55e' }}
                            />
                        </GlassCard>
                    </Col>
                    <Col xs={12} sm={6}>
                        <GlassCard bodyClassName="py-4">
                            <Statistic
                                title={<span className="text-slate-400">失败任务</span>}
                                value={stats?.failed || 0}
                                prefix={<CloseCircleOutlined style={{ color: '#ef4444' }} />}
                                valueStyle={{ color: '#ef4444' }}
                            />
                        </GlassCard>
                    </Col>
                    <Col xs={12} sm={6}>
                        <GlassCard bodyClassName="py-4">
                            <Statistic
                                title={<span className="text-slate-400">今日任务</span>}
                                value={stats?.today || 0}
                                prefix={<CalendarOutlined style={{ color: '#f59e0b' }} />}
                                valueStyle={{ color: '#f59e0b' }}
                            />
                        </GlassCard>
                    </Col>
                </Row>

                {/* 成功率 */}
                <Row gutter={[16, 16]} className="mb-6">
                    <Col xs={24} md={8}>
                        <GlassCard title="成功率" icon={<PercentageOutlined />}>
                            <div className="flex items-center justify-center py-6">
                                <Progress
                                    type="dashboard"
                                    percent={stats?.success_rate || 0}
                                    strokeColor={{
                                        '0%': '#6366f1',
                                        '100%': '#22c55e',
                                    }}
                                    trailColor="rgba(255,255,255,0.1)"
                                    format={(percent) => (
                                        <span className="text-2xl font-bold text-slate-100">{percent}%</span>
                                    )}
                                    size={180}
                                />
                            </div>
                        </GlassCard>
                    </Col>
                    <Col xs={24} md={16}>
                        <GlassCard title="最近7天任务趋势" icon={<DashboardOutlined />}>
                            <div style={{ height: 250 }}>
                                {getDailyStats().length > 0 ? (
                                    <Line {...chartConfig} />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-500">
                                        暂无数据
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </Col>
                </Row>

                {/* 最近任务概览 */}
                <GlassCard title="最近执行" icon={<ThunderboltOutlined />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentTasks.slice(0, 6).map((task) => (
                            <div
                                key={task.id}
                                className="p-4 rounded-xl transition-all hover:bg-white/5"
                                style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 mr-2">
                                        <div className="text-sm text-slate-200 truncate mb-1">
                                            {task.task_content}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {task.started_at?.split('T')[0]} · {task.device_id}
                                        </div>
                                    </div>
                                    {task.status === 'finished' ? (
                                        <CheckCircleOutlined style={{ color: '#22c55e' }} />
                                    ) : task.status === 'error' ? (
                                        <CloseCircleOutlined style={{ color: '#ef4444' }} />
                                    ) : (
                                        <ThunderboltOutlined style={{ color: '#6366f1' }} />
                                    )}
                                </div>
                                <Progress
                                    percent={Math.round((task.current_step / task.max_steps) * 100)}
                                    size="small"
                                    strokeColor={task.status === 'error' ? '#ef4444' : '#6366f1'}
                                    trailColor="rgba(255,255,255,0.1)"
                                    showInfo={false}
                                />
                            </div>
                        ))}
                    </div>
                    {recentTasks.length === 0 && (
                        <div className="text-center text-slate-500 py-8">暂无任务记录</div>
                    )}
                </GlassCard>
            </div>
        </div>
    );
};

export default StatsPage;
