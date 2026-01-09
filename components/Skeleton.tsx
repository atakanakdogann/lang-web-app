import React from 'react';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    borderRadius?: string | number;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Basic skeleton loader component
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = '20px',
    borderRadius = '8px',
    className = '',
    style = {},
}) => {
    return (
        <div
            className={`skeleton ${className}`}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
                borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
                ...style,
            }}
            aria-hidden="true"
        />
    );
};

/**
 * Skeleton for text content
 */
export const SkeletonText: React.FC<{
    lines?: number;
    lastLineWidth?: string;
    gap?: number;
}> = ({ lines = 3, lastLineWidth = '60%', gap = 8 }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height={16}
                    width={i === lines - 1 ? lastLineWidth : '100%'}
                />
            ))}
        </div>
    );
};

/**
 * Skeleton for avatar/profile pictures
 */
export const SkeletonAvatar: React.FC<{ size?: number }> = ({ size = 48 }) => {
    return <Skeleton width={size} height={size} borderRadius="50%" />;
};

/**
 * Skeleton for deck cards on Dashboard
 */
export const SkeletonDeckCard: React.FC = () => {
    return (
        <div
            style={{
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '24px',
                padding: '24px',
                height: '180px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
            }}
        >
            <div>
                <Skeleton height={24} width="70%" style={{ marginBottom: '12px' }} />
                <Skeleton height={14} width="40%" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton height={32} width={80} borderRadius={16} />
                <Skeleton height={40} width={40} borderRadius="50%" />
            </div>
        </div>
    );
};

/**
 * Skeleton for the dashboard grid
 */
export const SkeletonDashboard: React.FC = () => {
    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <Skeleton height={40} width="250px" style={{ marginBottom: '12px' }} />
                <Skeleton height={20} width="180px" />
            </div>

            {/* Section Title */}
            <Skeleton height={28} width="120px" style={{ marginBottom: '16px' }} />

            {/* Deck Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '20px',
                }}
            >
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonDeckCard key={i} />
                ))}
            </div>
        </div>
    );
};

/**
 * Skeleton for community deck cards on Explore page
 */
export const SkeletonCommunityCard: React.FC = () => {
    return (
        <div
            style={{
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '20px',
                padding: '20px',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <SkeletonAvatar size={40} />
                <div style={{ flex: 1 }}>
                    <Skeleton height={16} width="60%" style={{ marginBottom: '6px' }} />
                    <Skeleton height={12} width="40%" />
                </div>
            </div>
            <Skeleton height={20} width="80%" style={{ marginBottom: '8px' }} />
            <Skeleton height={14} width="50%" style={{ marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
                <Skeleton height={14} width={60} />
                <Skeleton height={14} width={80} />
            </div>
        </div>
    );
};

/**
 * Skeleton for Explore page
 */
export const SkeletonExplore: React.FC = () => {
    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <Skeleton height={40} width="200px" style={{ marginBottom: '12px' }} />
                <Skeleton height={20} width="300px" />
            </div>

            {/* Section */}
            <Skeleton height={24} width="180px" style={{ marginBottom: '16px' }} />

            {/* Community Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '20px',
                }}
            >
                {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCommunityCard key={i} />
                ))}
            </div>
        </div>
    );
};

/**
 * Skeleton for Profile page
 */
export const SkeletonProfile: React.FC = () => {
    return (
        <div>
            {/* Profile Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    marginBottom: '32px',
                }}
            >
                <SkeletonAvatar size={100} />
                <div>
                    <Skeleton height={32} width="200px" style={{ marginBottom: '8px' }} />
                    <Skeleton height={16} width="150px" />
                </div>
            </div>

            {/* Stats Row */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px',
                    marginBottom: '32px',
                }}
            >
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            borderRadius: '16px',
                            padding: '20px',
                        }}
                    >
                        <Skeleton height={36} width="50px" style={{ marginBottom: '8px' }} />
                        <Skeleton height={14} width="80px" />
                    </div>
                ))}
            </div>

            {/* Settings Sections */}
            {Array.from({ length: 3 }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        background: 'rgba(255, 255, 255, 0.6)',
                        borderRadius: '20px',
                        padding: '24px',
                        marginBottom: '16px',
                    }}
                >
                    <Skeleton height={24} width="150px" style={{ marginBottom: '16px' }} />
                    <SkeletonText lines={2} />
                </div>
            ))}
        </div>
    );
};

export default Skeleton;
