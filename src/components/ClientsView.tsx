import { Monitor, Clock, Wifi, RefreshCw } from 'lucide-react';
import useStore from '../store/useStore';
import socketService from '../services/socketService';
import { useTranslation } from '../i18n';

export default function ClientsView() {
    const { clients, queueStatus, connection } = useStore();
    const { t } = useTranslation();

    return (
        <div className="settings-view">
            <div className="settings-header">
                <h2>{t('clients.title')}</h2>
                <button
                    className="icon-btn"
                    onClick={() => socketService.requestFrame()}
                    title={t('remote.refresh')}
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            <div className="settings-content">
                {/* Connection Status */}
                <div className="settings-section">
                    <h3>{t('clients.connectionStatus')}</h3>
                    <div className="settings-card">
                        <div className="setting-row">
                            <span className="setting-label">
                                <Wifi size={16} /> Server
                            </span>
                            <span className={`setting-value ${connection.connected ? 'text-green' : 'text-red'}`}>
                                {connection.connected ? t('clients.connected') : t('clients.disconnected')}
                            </span>
                        </div>
                        <div className="setting-row">
                            <span className="setting-label">{t('clients.totalDevices')}</span>
                            <span className="setting-value">{clients.length}</span>
                        </div>
                    </div>
                </div>

                {/* Queue */}
                <div className="settings-section">
                    <h3>{t('clients.queue')}</h3>
                    <div className="settings-card">
                        <div className="setting-row">
                            <span className="setting-label">{t('clients.queueStatus')}</span>
                            <span className={`setting-value ${queueStatus.processing ? 'text-yellow' : 'text-green'}`}>
                                {queueStatus.processing ? t('clients.processing') : t('clients.ready')}
                            </span>
                        </div>
                        {queueStatus.processing && queueStatus.currentAction && (
                            <div className="setting-row">
                                <span className="setting-label">{t('clients.currentCommand')}</span>
                                <span className="setting-value">
                                    {queueStatus.currentAction.clientName}: {queueStatus.currentAction.type}
                                </span>
                            </div>
                        )}
                        <div className="setting-row">
                            <span className="setting-label">{t('clients.pending')}</span>
                            <span className="setting-value">{queueStatus.length} {t('clients.commands')}</span>
                        </div>
                    </div>
                </div>

                {/* Client List */}
                <div className="settings-section">
                    <h3>{t('clients.deviceList')} ({clients.length})</h3>
                    {clients.length === 0 ? (
                        <div className="settings-card">
                            <div className="empty-list">{t('clients.noDevices')}</div>
                        </div>
                    ) : (
                        clients.map(client => (
                            <div key={client.id} className="settings-card client-card">
                                <div className="client-card-header">
                                    <Monitor size={20} />
                                    <div className="client-online-dot" />
                                    <span className="client-card-name">{client.name}</span>
                                    <span className="client-card-platform">{client.platform}</span>
                                </div>
                                <div className="setting-row">
                                    <span className="setting-label"><Wifi size={14} /> IP</span>
                                    <span className="setting-value">{client.ip}</span>
                                </div>
                                <div className="setting-row">
                                    <span className="setting-label"><Clock size={14} /> {t('clients.connectedAt')}</span>
                                    <span className="setting-value">
                                        {new Date(client.connectedAt).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
