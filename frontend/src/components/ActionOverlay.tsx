import React, { useEffect, useState } from 'react';

interface ActionPoint {
    x: number; // 相对坐标 0-1
    y: number;
    type: 'tap' | 'swipe_start' | 'swipe_end' | 'long_press';
}

interface ActionOverlayProps {
    action: any | null;
    screenWidth: number;
    screenHeight: number;
    containerWidth: number;
    containerHeight: number;
}

const ActionOverlay: React.FC<ActionOverlayProps> = ({
    action,
    screenWidth,
    screenHeight,
    containerWidth,
    containerHeight,
}) => {
    const [points, setPoints] = useState<ActionPoint[]>([]);
    const [showAnimation, setShowAnimation] = useState(false);

    useEffect(() => {
        if (!action) {
            setPoints([]);
            return;
        }

        const newPoints: ActionPoint[] = [];
        const actionType = Object.keys(action).find(k => !k.startsWith('_'));

        if (actionType === 'tap' && action.tap) {
            newPoints.push({
                x: action.tap.x / screenWidth,
                y: action.tap.y / screenHeight,
                type: 'tap',
            });
        } else if (actionType === 'long_press' && action.long_press) {
            newPoints.push({
                x: action.long_press.x / screenWidth,
                y: action.long_press.y / screenHeight,
                type: 'long_press',
            });
        } else if (actionType === 'swipe' && action.swipe) {
            newPoints.push({
                x: action.swipe.start_x / screenWidth,
                y: action.swipe.start_y / screenHeight,
                type: 'swipe_start',
            });
            newPoints.push({
                x: action.swipe.end_x / screenWidth,
                y: action.swipe.end_y / screenHeight,
                type: 'swipe_end',
            });
        }

        setPoints(newPoints);
        setShowAnimation(true);

        // 动画后淡出
        const timer = setTimeout(() => {
            setShowAnimation(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, [action, screenWidth, screenHeight]);

    if (points.length === 0) return null;

    // 计算缩放比例
    const scaleX = containerWidth / screenWidth;
    const scaleY = containerHeight / screenHeight;
    const scale = Math.min(scaleX, scaleY);

    // 计算居中偏移
    const offsetX = (containerWidth - screenWidth * scale) / 2;
    const offsetY = (containerHeight - screenHeight * scale) / 2;

    const toContainerCoords = (x: number, y: number) => ({
        cx: offsetX + x * screenWidth * scale,
        cy: offsetY + y * screenHeight * scale,
    });

    return (
        <svg
            className="absolute inset-0 pointer-events-none z-10"
            style={{ width: containerWidth, height: containerHeight }}
        >
            <defs>
                {/* 发光效果 */}
                <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                {/* 箭头标记 */}
                <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                </marker>
            </defs>

            {/* 滑动轨迹 */}
            {points.length === 2 && points[0].type === 'swipe_start' && (
                <>
                    {/* 轨迹线 */}
                    <line
                        x1={toContainerCoords(points[0].x, points[0].y).cx}
                        y1={toContainerCoords(points[0].x, points[0].y).cy}
                        x2={toContainerCoords(points[1].x, points[1].y).cx}
                        y2={toContainerCoords(points[1].x, points[1].y).cy}
                        stroke="#22c55e"
                        strokeWidth="3"
                        strokeDasharray="8,4"
                        markerEnd="url(#arrowhead)"
                        filter="url(#glow)"
                        className={showAnimation ? 'animate-draw-line' : ''}
                        style={{ opacity: showAnimation ? 1 : 0.3 }}
                    />
                    {/* 起点 */}
                    <circle
                        cx={toContainerCoords(points[0].x, points[0].y).cx}
                        cy={toContainerCoords(points[0].x, points[0].y).cy}
                        r="8"
                        fill="#22c55e"
                        filter="url(#glow)"
                        style={{ opacity: showAnimation ? 1 : 0.3 }}
                    />
                </>
            )}

            {/* 点击/长按 */}
            {points.map((point, index) => {
                if (point.type === 'swipe_start' || point.type === 'swipe_end') return null;

                const { cx, cy } = toContainerCoords(point.x, point.y);
                const color = point.type === 'long_press' ? '#f59e0b' : '#6366f1';

                return (
                    <g key={index}>
                        {/* 脉冲动画 */}
                        {showAnimation && (
                            <circle
                                cx={cx}
                                cy={cy}
                                r="20"
                                fill="none"
                                stroke={color}
                                strokeWidth="2"
                                className="animate-ping-slow"
                                style={{ transformOrigin: `${cx}px ${cy}px` }}
                            />
                        )}
                        {/* 主圆点 */}
                        <circle
                            cx={cx}
                            cy={cy}
                            r="12"
                            fill={color}
                            filter="url(#glow)"
                            style={{ opacity: showAnimation ? 1 : 0.5 }}
                        />
                        {/* 内圈 */}
                        <circle
                            cx={cx}
                            cy={cy}
                            r="6"
                            fill="white"
                            style={{ opacity: showAnimation ? 0.8 : 0.3 }}
                        />
                    </g>
                );
            })}
        </svg>
    );
};

export default ActionOverlay;
