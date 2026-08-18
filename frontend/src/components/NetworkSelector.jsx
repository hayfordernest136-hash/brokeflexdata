import clsx from 'clsx';
import { Check } from 'lucide-react';

export const NETWORK_CONFIG = {
    MTN: {
        label: 'MTN',
        code: 'YELLO',
        description: 'MTN Ghana',
        colorClass: 'network-mtn',
        bgClass: 'bg-mtn-subtle',
        borderClass: 'border-mtn',
        image: '/networks/mtn.png',
    },
    Telecel: {
        label: 'Telecel',
        code: 'TELECEL',
        description: 'Telecel Ghana',
        colorClass: 'network-telecel',
        bgClass: 'bg-telecel-subtle',
        borderClass: 'border-telecel',
        image: '/networks/telecel.png',
    },
    AirtelTigo: {
        label: 'AirtelTigo',
        code: 'AT_PREMIUM',
        description: 'AirtelTigo Ghana',
        colorClass: 'network-airtel',
        bgClass: 'bg-airtel-subtle',
        borderClass: 'border-airtel',
        image: '/networks/airteltigo.svg',
    },
};

export default function NetworkSelector({ selectedNetwork, onSelect, error }) {
    return (
            <div className="space-y-3">
            {Object.entries(NETWORK_CONFIG).map(([key, config]) => {
                const isSelected = selectedNetwork === key;
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onSelect(key)}
                        className={clsx(
                            'w-full flex items-center p-4 rounded-xl border-2 transition-all duration-200 text-left',
                            isSelected
                                ? clsx(config.borderClass, 'ring-2 ring-brokeflex bg-card-hover')
                                : 'border-border hover:border-hover hover:bg-card-hover'
                        )}
                    >
                        <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center bg-card border border-border">
                            <img
                                src={config.image}
                                alt={config.label}
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                        <div className="ml-4 flex-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="font-semibold text-lg text-text-primary">
                                        {config.label}
                                    </span>
                                    <p className="text-sm text-secondary">
                                        {config.description}
                                    </p>
                                </div>
                                {isSelected && (
                                    <Check className="w-5 h-5 text-brokeflex" />
                                )}
                            </div>
                        </div>
                    </button>
                );
            })}

            {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
        </div>
    );
}
