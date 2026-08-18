import { Shield, Zap } from 'lucide-react';

export default function TrustInfo() {
    return (
        <div className="flex items-center justify-center gap-6 text-xs text-tertiary">
            <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-brokeflex" />
                <span>Secure checkout</span>
            </div>
            <div className="w-1 h-1 bg-border rounded-full" />
            <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-brokeflex" />
                <span>Instant delivery</span>
            </div>
        </div>
    );
}
