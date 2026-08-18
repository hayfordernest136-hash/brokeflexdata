import { AlertCircle } from 'lucide-react';

export default function ErrorState({ message, onRetry }) {
    return (
        <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-secondary mb-4">{message}</p>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="px-4 py-2 bg-brokeflex hover:bg-brokeflex-hover text-text-primary rounded-lg font-medium transition-colors"
                >
                    Try Again
                </button>
            )}
        </div>
    );
}
