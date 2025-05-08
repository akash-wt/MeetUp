import { Component } from 'react';
import type { ReactNode } from 'react';
interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: unknown) {
        console.error("ErrorBoundary caught an error:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 text-red-500 font-semibold">
                    Something went wrong. Please reload or check logs.
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
