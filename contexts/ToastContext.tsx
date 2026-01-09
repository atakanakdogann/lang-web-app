import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// Toast Types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    dismiss: (id: string) => void;
    dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast Provider Component
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const dismissAll = useCallback(() => {
        setToasts([]);
    }, []);

    const showToast = useCallback((
        type: ToastType,
        title: string,
        message?: string,
        duration: number = 4000
    ) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newToast: Toast = {
            id,
            type,
            title,
            message,
            duration,
        };

        setToasts(prev => [...prev, newToast]);

        // Auto dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                dismiss(id);
            }, duration);
        }
    }, [dismiss]);

    const success = useCallback((title: string, message?: string) => {
        showToast('success', title, message);
    }, [showToast]);

    const error = useCallback((title: string, message?: string) => {
        showToast('error', title, message, 6000); // Errors stay longer
    }, [showToast]);

    const warning = useCallback((title: string, message?: string) => {
        showToast('warning', title, message, 5000);
    }, [showToast]);

    const info = useCallback((title: string, message?: string) => {
        showToast('info', title, message);
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ toasts, showToast, success, error, warning, info, dismiss, dismissAll }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
};

// Hook to use toast
export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

// Toast Container Component
const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({
    toasts,
    onDismiss
}) => {
    return (
        <div
            aria-live="polite"
            aria-label="Notifications"
            style={{
                position: 'fixed',
                top: '24px',
                right: '24px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxWidth: '400px',
                width: '100%',
                pointerEvents: 'none',
            }}
        >
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
                ))}
            </AnimatePresence>
        </div>
    );
};

// Individual Toast Component
const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({
    toast,
    onDismiss
}) => {
    const config = getToastConfig(toast.type);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            role="alert"
            style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '16px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            }}
        >
            {/* Icon */}
            <div
                style={{
                    flexShrink: 0,
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: config.bgColor,
                }}
            >
                <config.icon size={20} color={config.iconColor} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    margin: 0,
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#1a1a1a',
                }}>
                    {toast.title}
                </p>
                {toast.message && (
                    <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '13px',
                        color: '#666',
                        lineHeight: 1.4,
                    }}>
                        {toast.message}
                    </p>
                )}
            </div>

            {/* Dismiss Button */}
            <button
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                style={{
                    flexShrink: 0,
                    padding: '4px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#999',
                    transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
                    e.currentTarget.style.color = '#666';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#999';
                }}
            >
                <X size={18} />
            </button>
        </motion.div>
    );
};

// Toast config helper
const getToastConfig = (type: ToastType) => {
    switch (type) {
        case 'success':
            return {
                icon: CheckCircle,
                iconColor: '#10b981',
                bgColor: 'rgba(16, 185, 129, 0.1)',
            };
        case 'error':
            return {
                icon: XCircle,
                iconColor: '#ef4444',
                bgColor: 'rgba(239, 68, 68, 0.1)',
            };
        case 'warning':
            return {
                icon: AlertCircle,
                iconColor: '#f59e0b',
                bgColor: 'rgba(245, 158, 11, 0.1)',
            };
        case 'info':
        default:
            return {
                icon: Info,
                iconColor: '#3b82f6',
                bgColor: 'rgba(59, 130, 246, 0.1)',
            };
    }
};

export default ToastProvider;
