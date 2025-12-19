import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    title?: React.ReactNode;
    icon?: React.ReactNode;
    glow?: boolean;
    className?: string;
    bodyClassName?: string;
    extra?: React.ReactNode;
}

const GlassCard: React.FC<GlassCardProps> = ({
    children,
    title,
    icon,
    glow = false,
    className = '',
    bodyClassName = '',
    extra,
}) => {
    return (
        <div className={`${glow ? 'glass-card-glow' : 'glass-card'} ${className}`}>
            {(title || extra) && (
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        {icon && (
                            <span className="text-lg text-indigo-400">
                                {icon}
                            </span>
                        )}
                        {title && (
                            <h3 className="text-base font-semibold text-slate-100 m-0">
                                {title}
                            </h3>
                        )}
                    </div>
                    {extra && (
                        <div className="flex items-center gap-2">
                            {extra}
                        </div>
                    )}
                </div>
            )}
            <div className={`p-5 ${bodyClassName}`}>
                {children}
            </div>
        </div>
    );
};

export default GlassCard;
