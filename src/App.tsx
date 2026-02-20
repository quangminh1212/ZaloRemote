import { useEffect } from 'react';
import useStore from './store/useStore';
import LoginPage from './components/LoginPage';
import SetupPage from './components/SetupPage';
import SidebarNav from './components/SidebarNav';
import RemoteViewer from './components/RemoteViewer';
import ClientPanel from './components/ClientPanel';
import ClientsView from './components/ClientsView';
import SettingsView from './components/SettingsView';
import ToastContainer from './components/ToastContainer';
import socketService from './services/socketService';
import './styles/base.css';
import './styles/layout.css';
import './styles/login.css';
import './styles/views.css';
import './styles/responsive.css';

function RemoteLayout() {
  const { activeTab, setActiveTab, connection, role, partnerId, partnerPassword } = useStore();

  // Auto-reconnect on page refresh if session was restored
  useEffect(() => {
    if (!connection.connected && !connection.connecting && role) {
      if (role === 'client' && partnerId) {
        socketService.connect(connection.serverUrl, role, partnerId, partnerPassword || undefined);
      } else {
        socketService.connect(connection.serverUrl, role);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="app-layout">
      <SidebarNav />
      <RemoteViewer />
      <ClientPanel />
      {activeTab === 'clients' && (
        <div className="overlay-panel" onClick={() => setActiveTab('remote')}>
          <div className="overlay-panel-content" onClick={(e) => e.stopPropagation()}>
            <ClientsView />
          </div>
        </div>
      )}
      {activeTab === 'settings' && (
        <div className="overlay-panel" onClick={() => setActiveTab('remote')}>
          <div className="overlay-panel-content" onClick={(e) => e.stopPropagation()}>
            <SettingsView />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { view } = useStore();

  return (
    <>
      {view === 'login' && <LoginPage />}
      {view === 'setup' && <SetupPage />}
      {view === 'remote' && <RemoteLayout />}
      <ToastContainer />
    </>
  );
}
