import React from 'react';

interface PhoneFrameProps {
    children: React.ReactNode;
    width?: number;
    className?: string;
}

const PhoneFrame: React.FC<PhoneFrameProps> = ({
    children,
    width = 280,
    className = ''
}) => {
    const height = Math.round(width * 2.1); // 标准手机比例
    const screenRadius = 32;

    return (
        <div
            className={`phone-frame ${className}`}
            style={{
                width: width + 24,
                height: height + 24,
            }}
        >
            {/* 手机边框装饰 - 左侧按钮 */}
            <div
                className="absolute left-0 top-24 w-[3px] h-8 rounded-l-sm"
                style={{ background: 'rgba(255,255,255,0.1)' }}
            />
            <div
                className="absolute left-0 top-36 w-[3px] h-12 rounded-l-sm"
                style={{ background: 'rgba(255,255,255,0.1)' }}
            />
            <div
                className="absolute left-0 top-52 w-[3px] h-12 rounded-l-sm"
                style={{ background: 'rgba(255,255,255,0.1)' }}
            />

            {/* 手机边框装饰 - 右侧电源键 */}
            <div
                className="absolute right-0 top-32 w-[3px] h-16 rounded-r-sm"
                style={{ background: 'rgba(255,255,255,0.1)' }}
            />

            {/* 屏幕 */}
            <div
                className="phone-screen relative"
                style={{
                    width,
                    height,
                    borderRadius: screenRadius,
                }}
            >
                {/* 刘海 */}
                <div className="phone-notch">
                    <div
                        className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                        style={{ background: '#2a2a3e' }}
                    />
                </div>

                {/* 屏幕内容 */}
                <div className="w-full h-full overflow-hidden">
                    {children}
                </div>

                {/* 底部指示条 */}
                <div className="phone-home-indicator" />
            </div>
        </div>
    );
};

export default PhoneFrame;
