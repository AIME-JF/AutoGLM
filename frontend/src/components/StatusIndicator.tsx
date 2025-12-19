import React from 'react';

type StatusType = 'online' | 'offline' | 'running' | 'idle' | 'error' | 'success';

interface StatusIndicatorProps {
    status: StatusType;
    text?: string;
    size?: 'sm' | 'md' | 'lg';
    showPulse?: boolean;
}

const statusConfig: Record<StatusType, { color: string; label: string; pulse: boolean }> = {
    online: { color: '#22c55e', label: '在线', pulse: true },
    offline: { color: '#64748b', label: '离线', pulse: false },
    running: { color: '#6366f1', label: '运行中', pulse: true },
    idle: { color: '#94a3b8', label: '空闲', pulse: false },
    error: { color: '#ef4444', label: '错误', pulse: false },
    success: { color: '#22c55e', label: '成功', pulse: false },
};

const sizeConfig = {
    sm: { dot: 6, text: 12, gap: 6 },
    md: { dot: 8, text: 13, gap: 8 },
    lg: { dot: 10, text: 14, gap: 10 },
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    status,
    text,
    size = 'md',
    showPulse = true,
}) => {
    const config = statusConfig[status];
    const sizes = sizeConfig[size];
    const shouldPulse = showPulse && config.pulse;

    return (
        <div
            className="inline-flex items-center"
            style={{ gap: sizes.gap }}
        >
            <div className="relative">
                {/* 脉冲动画 */}
                {shouldPulse && (
                    <div
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{
                            backgroundColor: config.color,
                            opacity: 0.4,
                        }}
                    />
                )}
                {/* 状态点 */}
                <div
                    className="relative rounded-full"
                    style={{
                        width: sizes.dot,
                        height: sizes.dot,
                        backgroundColor: config.color,
                        boxShadow: shouldPulse ? `0 0 10px ${config.color}` : 'none',
                    }}
                />
            </div>
            {/* 文本 */}
            {(text || config.label) && (
                <span
                    style={{
                        fontSize: sizes.text,
                        color: config.color,
                        fontWeight: 500,
                    }}
                >
                    {text || config.label}
                </span>
            )}
        </div>
    );
};

export default StatusIndicator;
