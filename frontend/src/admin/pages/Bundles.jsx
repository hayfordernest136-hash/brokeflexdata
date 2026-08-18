import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';

function NetworkBadge({ network }) {
    const colors = {
        MTN: 'bg-yellow-400/10 text-yellow-400',
        Telecel: 'bg-red-400/10 text-red-400',
        AirtelTigo: 'bg-blue-400/10 text-blue-400',
    };
    const color = colors[network] || 'bg-text-tertiary/10 text-text-tertiary';
    return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>{network}</span>;
}

export default function Bundles() {
    const [bundles, setBundles] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBundles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiRequest('/admin/bundles');
            setBundles(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        setError(null);
        try {
            const response = await apiRequest('/admin/bundles/refresh', { method: 'POST' });
            setBundles(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBundles();
    }, [fetchBundles]);

    function BundleGrid({ network, packages }) {
        if (!packages || packages.length === 0) {
            return <p className="text-admin-text-secondary text-sm">No bundles available for {network}.</p>;
        }
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map((pkg, i) => (
                    <div key={i} className="border border-admin-border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-admin-text">{pkg.name || `${pkg.capacity} GB`}</span>
                            {pkg.price && <span className="text-sm text-admin-text-secondary">₵{pkg.price}</span>}
                        </div>
                        {pkg.capacity && (
                            <p className="text-xs text-admin-text-secondary">Capacity: {pkg.capacity}GB</p>
                        )}
                        {pkg.packageId && (
                            <p className="text-xs text-admin-text-secondary">Package ID: {pkg.packageId}</p>
                        )}
                        {pkg.description && (
                            <p className="text-xs text-admin-text-secondary mt-1">{pkg.description}</p>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-admin-text">Data Bundles</h1>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="px-3 py-1.5 text-sm border border-admin-border rounded-lg hover:bg-admin-input disabled:opacity-50"
                >
                    {refreshing ? 'Refreshing...' : 'Refresh Catalog'}
                </button>
            </div>

            {bundles && (
                <p className="text-xs text-admin-text-secondary">
                    Last updated: {new Date(bundles.lastUpdated).toLocaleString()}
                    {bundles.fromCache && ' (cached)'}
                </p>
            )}

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-admin-text-secondary">Loading bundles...</div>
            ) : bundles ? (
                <div className="space-y-6">
                    {Object.entries(bundles.networks).map(([networkCode, packages]) => (
                        <div key={networkCode} className="bg-admin-card border border-admin-border rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-admin-text mb-4 flex items-center gap-2">
                                <NetworkBadge network={networkCode} />
                                <span>{networkCode} Bundles</span>
                            </h2>
                            <BundleGrid packages={packages} />
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-admin-text-secondary">No bundle data available.</p>
            )}
        </div>
    );
}
