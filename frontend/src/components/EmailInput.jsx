import { Mail } from 'lucide-react';
import clsx from 'clsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
    if (!email || !email.trim()) {
        return { valid: false, message: 'Email is required.' };
    }
    if (!EMAIL_REGEX.test(email.trim())) {
        return { valid: false, message: 'Please enter a valid email address.' };
    }
    if (email.trim().length > 254) {
        return { valid: false, message: 'Email address is too long.' };
    }
    return { valid: true, message: '' };
}

export default function EmailInput({ value, onChange, error, label = 'Email Address', supportingText }) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-secondary uppercase tracking-wider">
                {label}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Mail className="w-5 h-5 text-text-tertiary" />
                </div>
                <input
                    type="email"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="you@example.com"
                    className={clsx(
                        'w-full pl-12 pr-4 py-4 text-lg text-text-primary bg-card border-2 rounded-xl transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-brokeflex/20 focus:border-brokeflex',
                        error ? 'border-red-500/50' : 'border-border',
                        !value && 'placeholder-text-tertiary/50'
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

export { validateEmail };
