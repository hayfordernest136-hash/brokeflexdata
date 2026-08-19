import { Component } from 'react';

export default class AdminErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-admin-bg flex items-center justify-center p-4">
                    <div className="bg-admin-card border border-admin-border rounded-xl p-6 max-w-md w-full">
                        <h2 className="text-xl font-semibold text-red-400 mb-4">Something went wrong</h2>
                        <p className="text-admin-text-secondary text-sm mb-4 break-words">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-2 bg-brokeflex text-admin-bg font-semibold rounded-lg hover:opacity-90"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
