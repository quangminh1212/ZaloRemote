import { Monitor, Users, Settings, LogOut } from 'lucide-react';
import useStore from '../store/useStore';
import socketService from '../services/socketService';
import { useTranslation } from '../i18n';

export default function SidebarNav() {
    const { activeTab, setActiveTab, connection, logout } = useStore();
    const { t } = useTranslation();

    const tabs = [
        { id: 'remote' as const, icon: Monitor, label: t('nav.remote') },
        { id: 'clients' as const, icon: Users, label: t('nav.clients') },
        { id: 'settings' as const, icon: Settings, label: t('nav.settings') },
    ];

    const handleLogout = () => {
        socketService.disconnect();
        logout();
    };

    return (
        <nav className="sidebar-nav">
            <div className="sidebar-nav-top">
                <div className="sidebar-logo" title="ZaloHub"><img src="/logo.png" alt="ZaloHub" /></div>
            </div>
            <div className="sidebar-nav-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.label}
                    >
                        <tab.icon size={22} />
                    </button>
                ))}
            </div>
            <div className="sidebar-nav-bottom">
                <div className={`connection-dot ${connection.connected ? 'connected' : 'disconnected'}`} />
                <button className="nav-tab" onClick={handleLogout} title={t('nav.logout')}>
                    <LogOut size={22} />
                </button>
            </div>
        </nav>
    );
}
