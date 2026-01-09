import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

// Error Boundary must be a class component - React doesn't have hooks for error boundaries
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
        this.handleRetry = this.handleRetry.bind(this);
        this.handleGoHome = this.handleGoHome.bind(this);
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        this.setState({ errorInfo });
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry(): void {
        this.setState({ hasError: false, error: null, errorInfo: null });
    }

    handleGoHome(): void {
        window.location.href = '/';
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Check if we're in development mode
            const isDev = typeof import.meta !== 'undefined' &&
                (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;

            return (
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        backgroundColor: '#F6F7F9'
                    }}
                >
                    <div
                        style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            borderRadius: '24px',
                            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                            padding: '32px',
                            maxWidth: '400px',
                            width: '100%',
                            textAlign: 'center' as const,
                        }}
                    >
                        {/* Error Icon */}
                        <div
                            style={{
                                margin: '0 auto 24px auto',
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
                            }}
                        >
                            <AlertTriangle size={32} color="white" />
                        </div>

                        {/* Error Title */}
                        <h1
                            style={{
                                fontSize: '24px',
                                fontWeight: 700,
                                marginBottom: '8px',
                                color: '#1a1a1a'
                            }}
                        >
                            Oops! Something went wrong
                        </h1>

                        {/* Error Description */}
                        <p
                            style={{
                                marginBottom: '24px',
                                color: '#666'
                            }}
                        >
                            We're sorry, but something unexpected happened. Don't worry, your data is safe.
                        </p>

                        {/* Error Details (Development Only) */}
                        {isDev && this.state.error && (
                            <details
                                style={{
                                    marginBottom: '24px',
                                    textAlign: 'left' as const,
                                    padding: '16px',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    background: 'rgba(0, 0, 0, 0.04)',
                                    color: '#666',
                                }}
                            >
                                <summary style={{ cursor: 'pointer', fontWeight: 500, marginBottom: '8px' }}>
                                    Technical Details
                                </summary>
                                <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', fontSize: '12px', margin: 0 }}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleRetry}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    fontWeight: 600,
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                }}
                            >
                                <RefreshCw size={18} />
                                Try Again
                            </button>

                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: 'rgba(0, 0, 0, 0.06)',
                                    color: '#1a1a1a',
                                }}
                            >
                                <Home size={18} />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
