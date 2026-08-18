import clsx from 'clsx';
import { Check } from 'lucide-react';

function formatBundleDisplay(bundle) {
    const capacityNum = parseFloat(bundle.capacityString || bundle.capacity);
    if (capacityNum < 1) {
        const mb = Math.round(capacityNum * 1000);
        return `${mb}MB`;
    }
    return `${capacityNum}GB`;
}

function formatPrice(price) {
    return `₵${parseFloat(price || 0).toFixed(2)}`;
}

export default function BundleGrid({ bundles, selectedBundle, onSelect, loading, error }) {
    if (loading) {
        return (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-11 bg-card-hover border border-border rounded-2xl animate-pulse flex items-center justify-center"
                    />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-400 text-sm">{error}</p>
            </div>
        );
    }

    if (!bundles || bundles.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-secondary">No bundles available for this network.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {bundles.map((bundle) => {
                const isSelected = selectedBundle?.capacity === bundle.capacity;
                const label = formatBundleDisplay(bundle);
                return (
                    <button
                        key={bundle.capacity}
                        type="button"
                        onClick={() => onSelect(bundle)}
                        className={clsx(
                            'h-11 flex items-center justify-center rounded-2xl border text-center transition-all duration-200 relative',
                            isSelected
                                ? 'border-brokeflex bg-brokeflex-subtle text-brokeflex font-semibold'
                                : 'border-border bg-card-hover/50 text-text-secondary hover:border-border-hover hover:bg-card-hover'
                        )}
                    >
                        <span className="text-xs sm:text-sm font-medium leading-tight">
                            {label}
                        </span>
                        {isSelected && (
                            <Check className="absolute w-3 h-3 text-brokeflex -translate-y-1/2 translate-x-1/2 top-0 right-0" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export { formatBundleDisplay, formatPrice };
