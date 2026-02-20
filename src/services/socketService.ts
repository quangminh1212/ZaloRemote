import { io, Socket } from 'socket.io-client';
import useStore from '../store/useStore';
import { t } from '../i18n';

class SocketService {
    private socket: Socket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private currentRole: string = 'client';
    private currentAccessCode: string = '';
    private currentPassword: string = '';

    async connect(serverUrl: string, role: string = 'client', partnerId?: string, password?: string): Promise<boolean> {
        this.currentRole = role;
        this.currentAccessCode = partnerId || '';
        this.currentPassword = password || '';

        const store = useStore.getState();
        store.setConnection({ connecting: true });

        // Cleanup existing connection
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
        }

        // Normalize URL: Socket.IO io() accepts http/https URLs
        let connectUrl = serverUrl.replace(/\/$/, '');
        if (connectUrl.startsWith('wss://')) connectUrl = connectUrl.replace('wss://', 'https://');
        else if (connectUrl.startsWith('ws://')) connectUrl = connectUrl.replace('ws://', 'http://');
        console.log('[Socket] Connecting to:', connectUrl);

        // Pre-flight check: verify server is reachable before attempting Socket.IO
        try {
            const healthUrl = `${connectUrl}/api/health`;
            console.log('[Socket] Pre-flight check:', healthUrl);
            const healthRes = await fetch(healthUrl, { signal: AbortSignal.timeout(8000) });
            if (!healthRes.ok) {
                console.error(`[Socket] Server unreachable (HTTP ${healthRes.status})`);
                store.setConnection({ connecting: false });
                store.addToast('error', t('socket.serverUnreachable'));
                return false;
            }
            const health = await healthRes.json();
            console.log('[Socket] Server health:', health);
        } catch (err) {
            console.error('[Socket] Pre-flight failed:', (err as Error).message);
            store.setConnection({ connecting: false });
            store.addToast('error', t('socket.serverUnreachable'));
            return false;
        }

        return new Promise((resolve) => {
            this.socket = io(connectUrl, {
                transports: ['websocket', 'polling'],
                timeout: 20000,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 2000,
            });

            // Connection events
            this.socket.on('connect', () => {
                console.log('[Socket] Connected to server');
                this.reconnectAttempts = 0;
                const s = useStore.getState();
                s.setConnection({ connected: true, connecting: false });
                s.addToast('success', t('socket.connected'));

                // Register with role and access code
                const registration: Record<string, unknown> = {
                    name: this.getDeviceName(),
                    platform: this.getPlatform(),
                    role: this.currentRole,
                };

                // Client role: send partner ID + password
                if (this.currentRole === 'client' && this.currentAccessCode) {
                    registration.accessCode = this.currentAccessCode;
                    registration.partnerId = this.currentAccessCode;
                    registration.password = this.currentPassword;
                }

                // Client validates viewport before sending
                if (this.currentRole === 'client') {
                    const vw = Math.round(window.innerWidth - 64);
                    const vh = Math.round(window.innerHeight - 52);
                    if (vw >= 800 && vw <= 2560 && vh >= 400 && vh <= 2560) {
                        registration.viewportWidth = vw;
                        registration.viewportHeight = vh;
                    }
                }

                this.socket!.emit('client:register', registration);

                resolve(true);
            });

            this.socket.on('connect_error', (err) => {
                console.error(`[Socket] Connection error (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}):`, err.message);
                this.reconnectAttempts++;
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    const s = useStore.getState();
                    s.setConnection({ connected: false, connecting: false });
                    s.addToast('error', t('socket.connectFailed'));
                    resolve(false);
                }
            });

            this.socket.on('disconnect', (reason) => {
                console.log('[Socket] Disconnected:', reason);
                const s = useStore.getState();
                s.setConnection({ connected: false, connecting: false });
                // Don't clear frame during reconnect - only on permanent disconnect
                if (reason === 'io server disconnect' || reason === 'io client disconnect') {
                    s.setFrame(null, 0);
                }
            });

            // Client registration confirmed
            this.socket.on('client:registered', (data) => {
                console.log('[Socket] Registered as:', data.name);
                // Actively request frame after registration is confirmed
                this.socket?.emit('frame:request');
                // Retry if no frame received within 2s (handles screencast restart timing)
                setTimeout(() => {
                    if (!useStore.getState().currentFrame && this.socket?.connected) {
                        console.log('[Socket] No frame received, retrying...');
                        this.socket.emit('frame:request');
                    }
                }, 2000);
                setTimeout(() => {
                    if (!useStore.getState().currentFrame && this.socket?.connected) {
                        console.log('[Socket] Still no frame, final retry...');
                        this.socket.emit('frame:request');
                    }
                }, 5000);
            });

            // Server status
            this.socket.on('server:status', (data) => {
                useStore.getState().setServerStatus(data);
            });

            // Frame streaming - receive base64 string, client creates data URI
            // ALL decoding done by browser's native image decoder (zero JS processing)
            this.socket.on('frame', (base64: string) => {
                useStore.getState().setFrame(`data:image/jpeg;base64,${base64}`, Date.now());
            });

            // Client list updates
            this.socket.on('clients:update', (clientList) => {
                useStore.getState().setClients(clientList);
            });

            // Queue updates
            this.socket.on('queue:update', (status) => {
                useStore.getState().setQueueStatus(status);
            });

            // Action errors
            this.socket.on('action:error', (data) => {
                useStore.getState().addToast('error', `Lỗi: ${data.error}`);
            });

            // Force disconnect - client generates the message (server sends minimal data)
            this.socket.on('force:disconnect', () => {
                const s = useStore.getState();
                s.addToast('error', t('socket.forceDisconnect'));
                s.setConnection({ connected: false, connecting: false });
                s.setFrame(null, 0);
                s.setClients([]);
                s.setView('setup');
                if (this.socket) {
                    this.socket.removeAllListeners();
                    this.socket = null;
                }
            });

            // Auth failed (invalid access code)
            this.socket.on('auth:failed', (data) => {
                const s = useStore.getState();
                s.addToast('error', data.reason === 'invalid_code'
                    ? t('socket.invalidCode')
                    : t('socket.authFailed'));
                s.setConnection({ connected: false, connecting: false });
                s.setView('setup');
                if (this.socket) {
                    this.socket.removeAllListeners();
                    this.socket.disconnect();
                    this.socket = null;
                }
                resolve(false);
            });

            // Access code updates (server role)
            this.socket.on('access-code:updated', (data) => {
                const s = useStore.getState();
                s.setAccessCode(data.id || data.code);
                if (data.password) s.setAccessPassword(data.password);
            });

            // Zalo login status (client role)
            this.socket.on('zalo:login-status', (data) => {
                const s = useStore.getState();
                if (data.status === 'success') {
                    s.addToast('success', data.message);
                } else if (data.status === 'error') {
                    s.addToast('error', data.message);
                } else {
                    s.addToast('info', data.message);
                }
            });

            // Tunnel URL (server role receives this)
            this.socket.on('tunnel:url', (data: { url: string }) => {
                useStore.getState().setTunnelUrl(data.url);
            });

            // Timeout
            setTimeout(() => {
                const s = useStore.getState();
                if (s.connection.connecting) {
                    console.warn('[Socket] Connection timeout after 30s');
                    s.setConnection({ connecting: false });
                    resolve(false);
                }
            }, 30000);
        });
    }

    // Send input action to server queue
    sendAction(action: {
        type: string;
        x?: number;
        y?: number;
        button?: string;
        key?: string;
        text?: string;
        deltaX?: number;
        deltaY?: number;
        width?: number;
        height?: number;
    }) {
        if (!this.socket?.connected) return;
        this.socket.emit('action', action);
    }

    // Send batch text
    sendText(text: string) {
        if (!this.socket?.connected) return;
        this.socket.emit('action:type', { text });
    }

    // Request fresh frame
    requestFrame() {
        if (!this.socket?.connected) return;
        this.socket.emit('frame:request');
    }

    // Request browser restart
    restartBrowser() {
        if (!this.socket?.connected) return;
        this.socket.emit('browser:restart');
        useStore.getState().addToast('info', t('socket.restartingBrowser'));
    }

    // Request new access code (server role only)
    regenerateCode() {
        if (!this.socket?.connected) return;
        this.socket.emit('access-code:regenerate');
    }

    disconnect() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        const s = useStore.getState();
        s.setConnection({ connected: false, connecting: false });
        s.setFrame(null, 0);
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    private getDeviceName(): string {
        try {
            const nav = navigator as any;
            if (nav.userAgentData?.platform) {
                return `${nav.userAgentData.platform}-${Math.random().toString(36).slice(2, 6)}`;
            }
        } catch { /* ignore */ }

        const ua = navigator.userAgent;
        if (ua.includes('Windows')) return `Windows-${Math.random().toString(36).slice(2, 6)}`;
        if (ua.includes('Mac')) return `Mac-${Math.random().toString(36).slice(2, 6)}`;
        if (ua.includes('Linux')) return `Linux-${Math.random().toString(36).slice(2, 6)}`;
        return `Client-${Math.random().toString(36).slice(2, 6)}`;
    }

    private getPlatform(): string {
        const ua = navigator.userAgent;
        if (ua.includes('Windows')) return 'windows';
        if (ua.includes('Mac')) return 'macos';
        if (ua.includes('Linux')) return 'linux';
        return 'unknown';
    }
}

const socketService = new SocketService();
export default socketService;
