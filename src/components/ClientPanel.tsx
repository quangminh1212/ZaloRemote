import { Monitor, Clock, Wifi } from 'lucide-react';
import useStore from '../store/useStore';
import { useTranslation } from '../i18n';

export default function ClientPanel() {
    const { clients, showClientPanel, queueStatus } = useStore();
    const { t } = useTranslation();

    if (!showClientPanel) return null;

    return (
        <div className="client-panel">
            <div className="panel-header">
                <h3>{t('panel.title')} ({clients.length})</h3>
            </div>

            {/* Queue Status */}
            <div className="queue-section">
                <h4>{t('panel.queue')}</h4>
                <div className="queue-info">
                    <div className={`queue-status ${queueStatus.processing ? 'active' : 'idle'}`}>
                        {queueStatus.processing ? (
                            <>
                                <div className="queue-spinner" />
                                <span>{t('panel.processingAction')}: {queueStatus.currentAction?.type}</span>
                            </>
                        ) : (
                            <span>{t('clients.ready')}</span>
                        )}
                    </div>
                    {queueStatus.length > 0 && (
                        <div className="queue-pending">
                            {queueStatus.length} {t('clients.commandsPending')}
                        </div>
                    )}
                </div>
            </div>

            {/* Client List */}
            <div className="client-list">
                {clients.length === 0 ? (
                    <div className="empty-list">{t('clients.noDevices')}</div>
                ) : (
                    clients.map(client => (
                        <div key={client.id} className="client-item">
                            <div className="client-icon">
                                <Monitor size={20} />
                                <div className="client-online-dot" />
                            </div>
                            <div className="client-info">
                                <div className="client-name">{client.name}</div>
                                <div className="client-details">
                                    <span><Wifi size={12} /> {client.ip}</span>
                                    <span><Clock size={12} /> {formatTimeSince(client.connectedAt, t)}</span>
                                </div>
                            </div>
                            <div className="client-platform">{client.platform}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function formatTimeSince(timestamp: number, t: (key: string) => string): string {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('time.justNow');
    if (mins < 60) return `${mins} ${t('time.minutesAgo')}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${t('time.hoursAgo')}`;
    return `${Math.floor(hours / 24)} ${t('time.daysAgo')}`;
}
