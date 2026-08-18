import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

function SettingItem({ label, value, hint, muted = false }) {
    return (
        <div className="py-3 border-b border-admin-border last:border-0">
            <div className="flex justify-between items-start">
                <div>
                    <label className="text-sm font-medium text-admin-text">{label}</label>
                    {hint && <p className="text-xs text-admin-text-secondary mt-0.5">{hint}</p>}
                </div>
                <div className={`text-sm ${muted ? 'text-admin-text-secondary' : 'text-admin-text'}`}>{value}</div>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const config = status === 'connected'
        ? 'bg-green-400/10 text-green-400'
        : 'bg-red-400/10 text-red-400';
    return (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config}`}>
            {status}
        </span>
    );
}

export default function Settings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSettings = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiRequest('/admin/settings');
            setSettings(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    if (loading) {
        return <div className="text-admin-text-secondary">Loading settings...</div>;
    }

    if (error) {
        return <div className="text-red-400">Error: {error}</div>;
    }

    if (!settings) return null;

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold text-admin-text">System Settings</h1>

            <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-admin-text mb-4">Business</h2>
                <SettingItem label="Site Name" value={settings.siteName} />
                <SettingItem label="Support Email" value={settings.supportEmail} />
                <SettingItem label="Admin Email" value={settings.adminEmail} />
            </div>

            <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-admin-text mb-4">DataMart</h2>
                <div className="py-3 border-b border-admin-border last:border-0">
                    <div className="flex justify-between items-start">
                        <label className="text-sm font-medium text-admin-text">Status</label>
                        <StatusBadge status={settings.datamart.status.connected ? 'connected' : 'disconnected'} />
                    </div>
                </div>
                <SettingItem label="API Key" value={settings.datamart.apiKey} hint="Secret — masked" muted />
                <SettingItem label="Base URL" value={settings.datamart.baseUrl} hint="API endpoint" muted />
                <SettingItem
                    label="Last Check"
                    value={settings.datamart.status.lastCheck
                        ? new Date(settings.datamart.status.lastCheck).toLocaleString()
                        : 'Never'}
                    hint="Last successful API check"
                    muted
                />
                {settings.datamart.status.message && (
                    <SettingItem label="Status Message" value={settings.datamart.status.message} muted />
                )}
                {settings.datamart.status.balance && (
                    <SettingItem label="Balance" value={`₵${settings.datamart.status.balance}`} muted />
                )}
            </div>

            <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-admin-text mb-4">Paystack</h2>
                <SettingItem label="Secret Key" value={settings.paystack.secretKey} hint="Secret — masked" muted />
                <SettingItem label="Public Key" value={settings.paystack.publicKey} hint="Public" muted />
                <SettingItem label="Base URL" value={settings.paystack.baseUrl} muted />
            </div>

            <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-admin-text mb-4">Resend</h2>
                <SettingItem label="API Key" value={settings.resend.apiKey} hint="Secret — masked" muted />
                <SettingItem label="Sender Email" value={settings.resend.emailFrom} />
                <SettingItem label="Admin Email" value={settings.resend.adminEmail} hint="Where admin notifications are sent" />
                <SettingItem
                    label="Status"
                    value={
                        <span className={settings.resend.configured ? 'text-green-400' : 'text-red-400'}>
                            {settings.resend.configured ? 'Configured' : 'Not Configured'}
                        </span>
                    }
                />
            </div>
        </div>
    );
}
