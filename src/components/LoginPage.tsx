import { useState, useEffect, useRef } from 'react';
import { Monitor, Smartphone, ArrowRight, Loader2, KeyRound, Lock, Sun, Moon, ChevronDown, Check, Copy, Globe, Download, Link2 } from 'lucide-react';
import useStore from '../store/useStore';
import socketService from '../services/socketService';
import { useTranslation, Locale, LOCALE_META, flagUrl } from '../i18n';

type LoginTab = 'hub' | 'remote';

// Detect Electron environment (hub.bat)
const isElectron = !!(window as any).api;

export default function LoginPage() {
    const { setRole, setUser, setView, setConnection, addToast, setPartnerCredentials } = useStore();
    const { t, locale, setLocale } = useTranslation();
    const allLocales = Object.keys(LOCALE_META) as Locale[];
    const activeTab: LoginTab = isElectron ? 'hub' : 'remote';
    const [isLoading, setIsLoading] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const googleBtnRef = useRef<HTMLDivElement>(null);
    const langRef = useRef<HTMLDivElement>(null);
    const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Fetch tunnel URL periodically (Electron only)
    useEffect(() => {
        if (!isElectron) return;
        const fetchTunnel = () => {
            fetch('/api/tunnel-url')
                .then(r => r.json())
                .then(d => { if (d.url) setTunnelUrl(d.url); })
                .catch(() => { });
        };
        fetchTunnel();
        const id = setInterval(fetchTunnel, 3000);
        return () => clearInterval(id);
    }, []);

    // Theme toggle
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        return (localStorage.getItem('zalohub-theme') as 'dark' | 'light') || 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('zalohub-theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    // Client form state
    const [serverUrl, setServerUrl] = useState(() => {
        // Restore from sessionStorage if available
        const saved = sessionStorage.getItem('zalohub_server_url');
        return saved || '';
    });
    const [partnerId, setPartnerId] = useState('');
    const [partnerPwd, setPartnerPwd] = useState('');
    const [showTos, setShowTos] = useState(false);

    // ---- Server: Google Sign-In (renderButton) ----
    const GOOGLE_CLIENT_ID = '909905227025-qtk1u8jr6qj93qg9hu99qfrh27rtd2np.apps.googleusercontent.com';

    // Initialize Google Sign-In button when Server tab is active
    useEffect(() => {
        if (activeTab !== 'hub' || !googleBtnRef.current) return;

        const handleCredential = async (response: any) => {
            setIsLoading(true);
            try {
                const payload = JSON.parse(atob(response.credential.split('.')[1]));

                setUser({
                    id: payload.sub,
                    name: payload.name || 'Server Admin',
                    email: payload.email || '',
                    avatar: payload.picture || '',
                });
                setRole('server');

                const wsUrl = `ws://${window.location.host}`;
                setConnection({ serverUrl: wsUrl });

                const success = await socketService.connect(wsUrl, 'server');

                setIsLoading(false);
                if (success) {
                    addToast('success', `Xin chào, ${payload.name || 'Admin'}!`);
                    setView('remote');
                } else {
                    addToast('error', t('login.serverStartFailed'));
                    setView('setup');
                }
            } catch (err) {
                setIsLoading(false);
                addToast('error', 'Google đăng nhập thất bại');
            }
        };

        const initGoogleBtn = () => {
            const g = (window as any).google;
            if (!g?.accounts?.id || !googleBtnRef.current) return false;

            g.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredential,
            });

            // Clear previous renders
            googleBtnRef.current.innerHTML = '';

            g.accounts.id.renderButton(googleBtnRef.current, {
                theme: 'filled_blue',
                size: 'large',
                width: Math.min(googleBtnRef.current.offsetWidth || 400, 400),
                text: 'signin_with',
                shape: 'pill',
                logo_alignment: 'left',
            });

            return true;
        };

        // Try immediately, then retry if GIS script not loaded yet
        if (!initGoogleBtn()) {
            const interval = setInterval(() => {
                if (initGoogleBtn()) clearInterval(interval);
            }, 300);
            const timeout = setTimeout(() => clearInterval(interval), 10000);
            return () => { clearInterval(interval); clearTimeout(timeout); };
        }
    }, [activeTab]);

    // ---- Hub (Electron): Direct connect without Google ----
    const handleHubLogin = async () => {
        setIsLoading(true);
        try {
            setUser({
                id: 'hub-admin',
                name: 'Hub Admin',
                email: '',
            });
            setRole('server');

            const wsUrl = `ws://${window.location.host}`;
            setConnection({ serverUrl: wsUrl });

            const success = await socketService.connect(wsUrl, 'server');

            setIsLoading(false);
            if (success) {
                addToast('success', 'Đã kết nối thành công!');
                setView('remote');
            } else {
                addToast('error', t('login.serverStartFailed'));
                setView('setup');
            }
        } catch (err) {
            setIsLoading(false);
            addToast('error', 'Kết nối thất bại');
        }
    };

    // ---- Client: Connect via ID + Password ----
    const handleClientConnect = async () => {
        if (!serverUrl.trim()) {
            addToast('error', t('setup.serverRequired') || 'Vui lòng nhập link chia sẻ từ ZaloHub');
            return;
        }
        // Save server URL for next session
        sessionStorage.setItem('zalohub_server_url', serverUrl.trim());
        const cleanId = partnerId.replace(/[-\s]/g, '');
        if (!cleanId) {
            addToast('error', t('setup.idRequired'));
            return;
        }
        if (!partnerPwd.trim()) {
            addToast('error', t('setup.passwordRequired'));
            return;
        }

        setIsLoading(true);

        setUser({
            id: Math.random().toString(36).slice(2, 10),
            name: `Client-${cleanId.slice(-4)}`,
            email: '',
        });
        setRole('client');
        // Normalize URL: ensure ws:// or wss:// prefix
        let wsUrl = serverUrl.trim();
        if (wsUrl.startsWith('https://')) wsUrl = wsUrl.replace('https://', 'wss://');
        else if (wsUrl.startsWith('http://')) wsUrl = wsUrl.replace('http://', 'ws://');
        else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) wsUrl = `wss://${wsUrl}`;
        setConnection({ serverUrl: wsUrl });

        const success = await socketService.connect(
            wsUrl,
            'client',
            cleanId,
            partnerPwd.trim()
        );

        setIsLoading(false);
        if (success) {
            setPartnerCredentials(cleanId, partnerPwd.trim());
            setView('remote');
        } else {
            addToast('error', t('setup.connectFailed'));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleClientConnect();
    };

    const formatIdInput = (val: string) => {
        const digits = val.replace(/\D/g, '').slice(0, 9);
        if (digits.length > 6) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
        if (digits.length > 3) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
        return digits;
    };

    // Close language dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(e.target as Node)) {
                setLangOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Shared: Terms of Service modal
    const tosModal = showTos && (
        <div className="tos-overlay" onClick={() => setShowTos(false)}>
            <div className="tos-modal" onClick={(e) => e.stopPropagation()}>
                <div className="tos-header"><h2>{t('login.tos')}</h2><button className="tos-close" onClick={() => setShowTos(false)}>&times;</button></div>
                <div className="tos-body">
                    <h3>1. Acceptance of Terms</h3><p>By accessing and using ZaloHub, you accept and agree to be bound by the terms and provisions of this agreement.</p>
                    <h3>2. Description of Service</h3><p>ZaloHub provides a remote control platform for Zalo application, allowing users to access and control Zalo from multiple devices simultaneously.</p>
                    <h3>3. User Responsibilities</h3><p>You are responsible for maintaining the confidentiality of your Partner ID and Password. You agree to use the service only for lawful purposes.</p>
                    <h3>4. Privacy & Data</h3><p>We respect your privacy. Screen data is transmitted in real-time and is not stored on our servers.</p>
                    <h3>5. Disclaimer</h3><p>ZaloHub is provided "as is" without warranty of any kind.</p>
                    <h3>6. Modifications</h3><p>We reserve the right to modify these terms at any time.</p>
                </div>
            </div>
        </div>
    );

    // Shared: Language + Theme toolbar
    const toolbarGroup = (
        <div className="login-toolbar-group">
            <div className="login-lang-dropdown" ref={langRef}>
                <button className="login-lang-btn" onClick={() => setLangOpen(!langOpen)} title="Language">
                    <img src={flagUrl(locale)} alt="" className="login-lang-emoji" />
                    <ChevronDown size={12} className={langOpen ? 'rotate-180' : ''} />
                </button>
                {langOpen && (
                    <div className="login-lang-menu">
                        {allLocales.map((loc) => (
                            <button key={loc} className={`login-lang-item ${locale === loc ? 'active' : ''}`} onClick={() => { setLocale(loc); setLangOpen(false); }}>
                                <img src={flagUrl(loc)} alt="" className="login-lang-emoji" />
                                <span>{LOCALE_META[loc].label}</span>
                                {locale === loc && <Check size={14} className="login-lang-check" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
        </div>
    );

    // ==========================================
    // Browser Remote: full-screen split layout
    // ==========================================
    if (!isElectron) {
        return (
            <div className="login-page login-split">
                <div className="login-top-actions">
                    <a href="https://github.com/quangminh1212/release/releases/tag/zalohub-v1.0.2" target="_blank" rel="noopener noreferrer" className="top-download-btn" title={t('login.downloadBtn')}>
                        <Download size={14} /><span>{t('login.downloadBtn')}</span>
                    </a>
                    {toolbarGroup}
                </div>

                {/* Left Panel: Branding + Guide */}
                <div className="split-left">
                    <div className="split-left-content">
                        <div className="split-brand">
                            <div className="login-logo"><img src="/logo.png" alt="Zalo Remote" /></div>
                            <h1>Zalo Remote</h1>
                            <p className="login-subtitle">{t('login.subtitle')}</p>
                        </div>
                        <p className="login-description">{t('login.description')}</p>

                        <div className="guide-content">
                            <div className="guide-step"><div className="step-number">1</div><div className="step-text"><strong>Tải &amp; chạy ZaloHub</strong><p>Tải <a href="https://github.com/quangminh1212/release/releases/tag/zalohub-v1.0.2" target="_blank" rel="noopener noreferrer">ZaloHub</a> về PC, chạy và đăng nhập Zalo</p></div></div>
                            <div className="guide-step"><div className="step-number">2</div><div className="step-text"><strong>Lấy thông tin kết nối</strong><p>Nhấn <strong>Chia sẻ</strong> trên ZaloHub để lấy <strong>Link</strong>, <strong>ID</strong> và <strong>mật khẩu</strong></p></div></div>
                            <div className="guide-step"><div className="step-number">3</div><div className="step-text"><strong>Kết nối</strong><p>Dán link, nhập ID và mật khẩu vào form bên phải, nhấn <strong>Kết nối</strong></p></div></div>
                        </div>

                        <div className="login-features split-features">
                            <div className="feature-item"><Monitor size={20} /><span>{t('login.feature.remote')}</span></div>
                            <div className="feature-item"><Smartphone size={20} /><span>{t('login.feature.multiDevice')}</span></div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Login Form */}
                <div className="split-right">
                    <div className="split-right-content">
                        <h2 className="split-form-title">{t('setup.connect')}</h2>
                        <p className="split-form-subtitle">{t('login.clientRoleDesc')}</p>
                        <div className="login-form">
                            <div className="form-group">
                                <label>{t('setup.shareLink')}</label>
                                <div className="input-with-icon">
                                    <Link2 size={18} />
                                    <input type="text" placeholder="https://xxx.trycloudflare.com" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} onKeyDown={handleKeyDown} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('setup.partnerId')}</label>
                                <div className="input-with-icon">
                                    <KeyRound size={18} />
                                    <input type="text" placeholder="123 456 789" value={partnerId} onChange={(e) => setPartnerId(formatIdInput(e.target.value))} onKeyDown={handleKeyDown} maxLength={11} className="code-input" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('setup.partnerPassword')}</label>
                                <div className="input-with-icon">
                                    <Lock size={18} />
                                    <input type="password" placeholder="••••" value={partnerPwd} onChange={(e) => setPartnerPwd(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={handleKeyDown} maxLength={4} className="code-input" />
                                </div>
                            </div>
                            <button className="login-btn primary" onClick={handleClientConnect} disabled={isLoading}>
                                {isLoading ? (<><Loader2 size={18} className="spin" /><span>{t('setup.connecting')}</span></>) : (<><span>{t('setup.connect')}</span><ArrowRight size={18} /></>)}
                            </button>
                        </div>
                        <p className="login-tos">{t('login.tosAgree')} <a href="#tos" className="tos-link" onClick={(e) => { e.preventDefault(); setShowTos(true); }}>{t('login.tos')}</a></p>
                    </div>
                </div>

                {tosModal}
            </div>
        );
    }

    // ==========================================
    // Electron: centered card layout
    // ==========================================
    return (
        <div className="login-page">
            <div className="login-top-actions">
                {toolbarGroup}
            </div>
            <div className="login-container login-container-wide">
                <div className="login-header">
                    <div className="login-logo"><img src="/logo.png" alt="ZaloHub" /></div>
                    <h1>ZaloHub</h1>
                    <p className="login-subtitle">{t('login.subtitle')}</p>
                    <p className="login-description">{t('login.description')}</p>
                </div>

                {activeTab === 'hub' && (
                    <div className="login-tab-content">
                        <p className="hub-status-desc">{t('login.serverDesc')}</p>
                        <div className="hub-info-card">
                            {tunnelUrl && (
                                <div className="hub-info-row">
                                    <Globe size={15} className="hub-info-icon" />
                                    <span className="hub-info-value">{tunnelUrl}</span>
                                    <button className={`hub-copy-btn ${copied ? 'copied' : ''}`} onClick={() => { navigator.clipboard.writeText(tunnelUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                                        {copied ? <Check size={13} /> : <Copy size={13} />}
                                    </button>
                                </div>
                            )}
                            <div className="hub-info-row">
                                <KeyRound size={15} className="hub-info-icon" />
                                <span className="hub-info-value mono">{'------'}</span>
                            </div>
                        </div>
                        <button className="login-btn primary" onClick={handleHubLogin} disabled={isLoading}>
                            {isLoading ? (<><Loader2 size={18} className="spin" /><span>{t('setup.connecting')}</span></>) : (<><span>{t('setup.connect')}</span><ArrowRight size={18} /></>)}
                        </button>
                    </div>
                )}

                <p className="login-tos">{t('login.tosAgree')} <a href="#tos" className="tos-link" onClick={(e) => { e.preventDefault(); setShowTos(true); }}>{t('login.tos')}</a></p>
                <div className="login-features">
                    <div className="feature-item"><Monitor size={20} /><span>{t('login.feature.remote')}</span></div>
                    <div className="feature-item"><Smartphone size={20} /><span>{t('login.feature.multiDevice')}</span></div>
                </div>

                {tosModal}
            </div>
        </div>
    );
}
