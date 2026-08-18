import { Phone } from 'lucide-react';
import clsx from 'clsx';

const GHANA_PREFIXES = [
    '020', '023', '024', '025', '026', '027', '028',
    '050', '053', '054', '055', '056', '057', '059',
];

function validateGhanaPhone(phoneNumber) {
    if (!phoneNumber || phoneNumber.length < 9) return false;

    const cleaned = phoneNumber.replace(/\D/g, '');
    const digits = cleaned.startsWith('233') ? cleaned.slice(3) :
                   cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;

    if (digits.length !== 9) return false;

    const prefix = `0${digits.slice(0, 2)}`;
    return GHANA_PREFIXES.includes(prefix);
}

function formatDisplay(phoneNumber) {
    const cleaned = (phoneNumber || '').replace(/\D/g, '');
    if (cleaned.length === 0) return '';

    let normalized = cleaned;
    if (cleaned.startsWith('233')) {
        normalized = `0${cleaned.slice(3)}`;
    } else if (!cleaned.startsWith('0')) {
        normalized = `0${cleaned}`;
    }

    if (normalized.length <= 4) return normalized;
    if (normalized.length <= 7) return `${normalized.slice(0, 4)} ${normalized.slice(4)}`;
    if (normalized.length <= 9) return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7, 9)}`;
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7, 11)}`;
}

export default function PhoneNumberInput({ value, onChange, error, label = 'Delivery Number', supportingText, showLabel = true }) {
    const handleChange = (e) => {
        const input = e.target.value;
        const digits = input.replace(/\D/g, '');

        let normalized = digits;
        if (digits.startsWith('233')) {
            normalized = `0${digits.slice(3)}`;
        } else if (!digits.startsWith('0') && digits.length > 0) {
            normalized = `0${digits}`;
        }

        onChange(normalized);
    };

    const displayValue = formatDisplay(value);

    return (
        <div className="space-y-2">
            {showLabel && (
                <label className="block text-sm font-medium text-secondary uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Phone className="w-5 h-5 text-text-tertiary" />
                </div>
                <div className="absolute inset-y-0 left-10 flex items-center pointer-events-none">
                    <span className="text-text-tertiary">|</span>
                </div>
                <div className="absolute inset-y-0 left-12 flex items-center pointer-events-none">
                    <span className="text-text-tertiary">0</span>
                </div>
                <input
                    type="tel"
                    inputMode="numeric"
                    value={displayValue}
                    onChange={handleChange}
                    placeholder="24 123 4567"
                    className={clsx(
                        'w-full pl-[7rem] pr-4 py-4 text-lg text-text-primary bg-card border-2 rounded-xl transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-brokeflex/20 focus:border-brokeflex',
                        error ? 'border-red-500/50' : 'border-border',
                        !displayValue && 'placeholder-text-tertiary/50'
                    )}
                />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {supportingText && !error && (
                <p className="text-xs text-tertiary">{supportingText}</p>
            )}
        </div>
    );
}

export { validateGhanaPhone, formatDisplay };
