import { useNavigate } from 'react-router-dom';
import NetworkSelector from '../components/NetworkSelector';
import TrustInfo from '../components/TrustInfo';

export default function BuyData() {
    const navigate = useNavigate();

    const handleNetworkSelect = (networkKey) => {
        navigate(`/buy/${networkKey.toLowerCase()}`);
    };

    return (
        <div className="min-h-screen bg-bg py-12">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-card border border-border rounded-xl shadow-xl p-6 sm:p-8">
                    <div className="mb-8">
                        <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-4">
                            SELECT NETWORK
                        </h2>
                        <NetworkSelector
                            selectedNetwork={null}
                            onSelect={handleNetworkSelect}
                        />
                    </div>

                    <div className="mt-6">
                        <TrustInfo />
                    </div>
                </div>
            </div>
        </div>
    );
}
