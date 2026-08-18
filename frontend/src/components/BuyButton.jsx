import { ArrowRight } from 'lucide-react';

export default function BuyButton({ onClick, disabled, loading, children, amount }) {
    const label = children || (amount !== undefined && amount !== null
        ? `Buy Data for ₵${typeof amount === 'number' ? amount.toFixed(2) : amount}`
        : 'Buy Data');

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
            className="w-full py-4 px-6 bg-brokeflex hover:bg-brokeflex-hover disabled:opacity-50 disabled:cursor-not-allowed text-text-primary font-semibold rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
        >
            {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
                <ArrowRight className="w-5 h-5" />
            )}
            <span>{loading ? 'Processing...' : label}</span>
        </button>
    );
}
