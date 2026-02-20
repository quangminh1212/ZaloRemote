import { useState } from 'react';
import { RefreshCw, Monitor, Server, Wifi, WifiOff, Globe, ChevronDown, Check } from 'lucide-react';
import useStore from '../store/useStore';
import socketService from '../services/socketService';
import { useTranslation, Locale, LOCALE_META, flagUrl } from '../i18n';



export default function SettingsView() {
    const { connection, serverStatus, user, addToast } = useStore();
    const { t, locale, setLocale } = useTranslation();
    const allLocales = Object.keys(LOCALE_META) as Locale[];
    const [langOpen, setLangOpen] = useState(false);

    const handleRestart = () => {
        socketService.restartBrowser();
    };

    const handleReconnect = async () => {
        addToast('info', t('settings.reconnecting'));
        await socketService.connect(connection.serverUrl);
    };

    const handleLocaleChange = (newLocale: Locale) => {
        setLocale(newLocale);
        setLangOpen(false);
    };

    return (
        <div className="settings-view">
            <div className="settings-header">
                <h2>{t('settings.title')}</h2>
            </div>

            <div className="settings-content">
                {/* Language */}
                <div className="settings-section">
                    <h3><Globe size={16} /> {t('settings.language')}</h3>
                    <div className="settings-card">
                        <div className="lang-dropdown-wrapper">
                            <button
                                className="lang-dropdown-trigger"
                                onClick={() => setLangOpen(!langOpen)}
                            >
                                <img src={flagUrl(locale)} alt="" className="lang-flag" />
                                <span>{LOCALE_META[locale].label}</span>
                                <ChevronDown size={16} className={`lang-chevron ${langOpen ? 'open' : ''}`} />
                            </button>
                            {langOpen && (
                                <div className="lang-dropdown-menu">
                                    {allLocales.map((loc) => (
                                        <button
                                            key={loc}
                                            className={`lang-dropdown-item ${locale === loc ? 'active' : ''}`}
                                            onClick={() => handleLocaleChange(loc)}
                                        >
                                            <img src={flagUrl(loc)} alt="" className="lang-flag" />
                                            <span>{LOCALE_META[loc].label}</span>
                                            {locale === loc && <Check size={14} className="lang-check" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* User info */}
                <div className="settings-section">
                    <h3>{t('settings.userInfo')}</h3>
                    <div className="settings-card">
                        <div className="setting-row">
                            <span className="setting-label">{t('settings.name')}</span>
                            <span className="setting-value">{user?.name || 'N/A'}</span>
                        </div>
                        <div className="setting-row">
                            <span className="setting-label">{t('settings.email')}</span>
                            <span className="setting-value">{user?.email || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Connection */}
                <div className="settings-section">
                    <h3>{t('settings.connection')}</h3>
                    <div className="settings-card">
                        <div className="setting-row">
                            <span className="setting-label">
                                <Server size={16} /> Server URL
                            </span>
                            <span className="setting-value">{connection.serverUrl}</span>
                        </div>
                        <div className="setting-row">
                            <span className="setting-label">
                                {connection.connected ? <Wifi size={16} /> : <WifiOff size={16} />}
                                {t('settings.status')}
                            </span>
                            <span className={`setting-value ${connection.connected ? 'text-green' : 'text-red'}`}>
                                {connection.connected ? t('clients.connected') : t('clients.disconnected')}
                            </span>
                        </div>
                        {!connection.connected && (
                            <button className="settings-btn" onClick={handleReconnect}>
                                <Wifi size={16} />
                                {t('settings.reconnect')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Zalo Status */}
                <div className="settings-section">
                    <h3>{t('settings.zaloRemote')}</h3>
                    <div className="settings-card">
                        <div className="setting-row">
                            <span className="setting-label">
                                <Monitor size={16} /> {t('settings.browser')}
                            </span>
                            <span className={`setting-value ${serverStatus.browserRunning ? 'text-green' : 'text-red'}`}>
                                {serverStatus.browserRunning ? t('settings.browserRunning') : t('settings.browserStopped')}
                            </span>
                        </div>
                        <div className="setting-row">
                            <span className="setting-label">Zalo Web</span>
                            <span className={`setting-value ${serverStatus.zaloReady ? 'text-green' : 'text-yellow'}`}>
                                {serverStatus.zaloReady ? t('settings.zaloActive') : t('settings.zaloNotLoggedIn')}
                            </span>
                        </div>
                        <div className="setting-row">
                            <span className="setting-label">Viewport</span>
                            <span className="setting-value">
                                {serverStatus.viewport
                                    ? `${serverStatus.viewport.width} × ${serverStatus.viewport.height}`
                                    : 'N/A'}
                            </span>
                        </div>
                        <button className="settings-btn warning" onClick={handleRestart}>
                            <RefreshCw size={16} />
                            {t('settings.restartBrowser')}
                        </button>
                    </div>
                </div>

                {/* About */}
                <div className="settings-section">
                    <h3>{t('settings.about')}</h3>
                    <div className="settings-card">
                        <div className="setting-row">
                            <span className="setting-label">{t('settings.version')}</span>
                            <span className="setting-value">{__APP_VERSION__}</span>
                        </div>
                        <div className="setting-row">
                            <span className="setting-label">{t('settings.architecture')}</span>
                            <span className="setting-value">App Remoting (Puppeteer)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
