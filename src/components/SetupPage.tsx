import { useState } from 'react';
import { Wifi, ArrowRight, Loader2, KeyRound, Lock } from 'lucide-react';
import useStore from '../store/useStore';
import socketService from '../services/socketService';
import { useTranslation } from '../i18n';

export default function SetupPage() {
    const { connection, role, setConnection, setView, addToast } = useStore();
    const { t } = useTranslation();
    const [serverUrl, setServerUrl] = useState(connection.serverUrl);
    const [partnerId, setPartnerId] = useState('');
    const [partnerPwd, setPartnerPwd] = useState('');

    const formatIdInput = (val: string) => {
        const digits = val.replace(/\D/g, '').slice(0, 9);
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    };

    const handleConnect = async () => {
        if (!serverUrl.trim()) {
            addToast('error', t('setup.serverRequired'));
            return;
        }

        // Client role requires partner ID + password
        if (role === 'client') {
            const cleanId = partnerId.replace(/\D/g, '');
            if (cleanId.length !== 9) {
                addToast('error', t('setup.idRequired'));
                return;
            }
            if (partnerPwd.length !== 4) {
                addToast('error', t('setup.passwordRequired'));
                return;
            }
        }

        setConnection({ serverUrl: serverUrl.trim() });
        const cleanId = partnerId.replace(/\D/g, '');
        const success = await socketService.connect(
            serverUrl.trim(),
            role || 'client',
            role === 'client' ? cleanId : undefined,
            role === 'client' ? partnerPwd : undefined
        );

        if (success) {
            setView('remote');
        } else {
            addToast('error', t('setup.connectFailed'));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleConnect();
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo setup">
                        <img src="/logo.png" alt="ZaloHub" />
                    </div>
                    <h1>{t('setup.title')}</h1>
                    <p className="login-description">
                        {t('setup.description')}
                    </p>
                </div>

                <div className="login-form">
                    <div className="form-group">
                        <label>{t('setup.serverAddress')}</label>
                        <div className="input-with-icon">
                            <Wifi size={18} />
                            <input
                                type="text"
                                placeholder="ws://192.168.1.100:3000"
                                value={serverUrl}
                                onChange={(e) => setServerUrl(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                        </div>
                    </div>

                    {role === 'client' && (
                        <>
                            <div className="form-group">
                                <label>{t('setup.partnerId')}</label>
                                <div className="input-with-icon">
                                    <KeyRound size={18} />
                                    <input
                                        type="text"
                                        placeholder="123 456 789"
                                        value={partnerId}
                                        onChange={(e) => setPartnerId(formatIdInput(e.target.value))}
                                        onKeyDown={handleKeyDown}
                                        maxLength={11}
                                        className="code-input"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('setup.partnerPassword')}</label>
                                <div className="input-with-icon">
                                    <Lock size={18} />
                                    <input
                                        type="password"
                                        placeholder="••••"
                                        value={partnerPwd}
                                        onChange={(e) => setPartnerPwd(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        onKeyDown={handleKeyDown}
                                        maxLength={4}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="setup-hint">
                        <p>{t('setup.hint')}</p>
                    </div>

                    <button
                        className="login-btn primary"
                        onClick={handleConnect}
                        disabled={connection.connecting}
                    >
                        {connection.connecting ? (
                            <>
                                <Loader2 size={18} className="spin" />
                                <span>{t('setup.connecting')}</span>
                            </>
                        ) : (
                            <>
                                <span>{t('setup.connect')}</span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
