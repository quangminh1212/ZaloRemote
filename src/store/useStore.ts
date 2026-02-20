import { create } from 'zustand';

// ============================================
// Types
// ============================================

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

export interface RemoteClient {
    id: string;
    name: string;
    platform: string;
    ip: string;
    connectedAt: number;
}

export interface QueueStatus {
    length: number;
    processing: boolean;
    currentAction?: {
        type: string;
        clientName: string;
    };
}

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
}

export type AppView = 'login' | 'setup' | 'remote';
export type NavTab = 'remote' | 'clients' | 'settings';
export type AppRole = 'server' | 'client';

export interface ServerStatus {
    zaloReady: boolean;
    browserRunning: boolean;
    message: string;
    viewport?: { width: number; height: number };
}

export interface ConnectionConfig {
    serverUrl: string;
    connected: boolean;
    connecting: boolean;
}

// ============================================
// Store Interface
// ============================================
interface AppState {
    // Auth
    user: User | null;
    isAuthenticated: boolean;

    // Navigation
    view: AppView;
    activeTab: NavTab;
    role: AppRole | null;

    // Connection
    connection: ConnectionConfig;

    // Server status
    serverStatus: ServerStatus;

    // Remote frame
    currentFrame: string | null; // blob URL from binary frame
    frameTimestamp: number;

    // Clients
    clients: RemoteClient[];

    // Queue
    queueStatus: QueueStatus;

    // UI
    toasts: Toast[];
    showClientPanel: boolean;
    accessCode: string | null;
    accessPassword: string | null;
    partnerId: string | null;
    partnerPassword: string | null;
    tunnelUrl: string | null;

    // Actions
    setUser: (user: User) => void;
    setView: (view: AppView) => void;
    setActiveTab: (tab: NavTab) => void;
    setRole: (role: AppRole) => void;
    setAccessCode: (code: string | null) => void;
    setAccessPassword: (password: string | null) => void;
    setPartnerCredentials: (partnerId: string, password: string) => void;
    setConnection: (config: Partial<ConnectionConfig>) => void;
    setServerStatus: (status: Partial<ServerStatus>) => void;
    setFrame: (frame: string | null, timestamp: number) => void;
    setClients: (clients: RemoteClient[]) => void;
    setQueueStatus: (status: QueueStatus) => void;
    toggleClientPanel: () => void;
    addToast: (type: Toast['type'], message: string) => void;
    removeToast: (id: string) => void;
    setTunnelUrl: (url: string | null) => void;
    logout: () => void;
}

// ============================================
// Session persistence helpers
// ============================================
const SESSION_KEY = 'zalohub_session';

interface SessionData {
    user: User | null;
    role: AppRole | null;
    view: AppView;
    serverUrl: string;
    partnerId?: string;
    partnerPassword?: string;
}

function saveSession(data: Partial<SessionData>) {
    try {
        const existing = loadSession();
        const merged = { ...existing, ...data };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
    } catch { /* ignore */ }
}

function loadSession(): SessionData | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

// ============================================
// Utilities
// ============================================
function genId(): string {
    return Math.random().toString(36).slice(2, 10);
}

// ============================================
// Store
// ============================================
const restored = loadSession();

const useStore = create<AppState>()((set) => ({
    // Initial state — restore from session if available
    user: restored?.user ?? null,
    isAuthenticated: !!restored?.user,
    view: restored?.user ? (restored.view === 'login' ? 'remote' : restored.view) : 'login',
    activeTab: 'remote',
    role: restored?.role ?? null,

    connection: {
        serverUrl: restored?.serverUrl ?? 'ws://localhost:3000',
        connected: false,
        connecting: false,
    },

    serverStatus: {
        zaloReady: false,
        browserRunning: false,
        message: '',
    },

    currentFrame: null,
    frameTimestamp: 0,

    clients: [],

    queueStatus: {
        length: 0,
        processing: false,
    },

    toasts: [],
    showClientPanel: false,
    accessCode: null,
    accessPassword: null,
    partnerId: restored?.partnerId ?? null,
    partnerPassword: restored?.partnerPassword ?? null,
    tunnelUrl: null,

    // Actions
    setUser: (user) => {
        saveSession({ user });
        set({ user, isAuthenticated: true });
    },

    setView: (view) => {
        saveSession({ view });
        set({ view });
    },

    setActiveTab: (tab) => set({ activeTab: tab }),

    setRole: (role) => {
        saveSession({ role });
        set({ role });
    },

    setAccessCode: (code) => set({ accessCode: code }),

    setAccessPassword: (password) => set({ accessPassword: password }),

    setPartnerCredentials: (partnerId, password) => {
        saveSession({ partnerId, partnerPassword: password });
        set({ partnerId, partnerPassword: password });
    },

    setConnection: (config) =>
        set((state) => {
            if (config.serverUrl) saveSession({ serverUrl: config.serverUrl });
            return { connection: { ...state.connection, ...config } };
        }),

    setServerStatus: (status) =>
        set((state) => ({
            serverStatus: { ...state.serverStatus, ...status },
        })),

    setFrame: (frame, timestamp) =>
        set({ currentFrame: frame, frameTimestamp: timestamp }),

    setClients: (clients) => set({ clients }),

    setQueueStatus: (status) => set({ queueStatus: status }),

    toggleClientPanel: () =>
        set((state) => ({ showClientPanel: !state.showClientPanel })),

    addToast: (type, message) => {
        const id = genId();
        set((state) => ({
            toasts: [...state.toasts, { id, type, message }],
        }));
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id),
            }));
        }, 4000);
    },

    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),

    setTunnelUrl: (url) => set({ tunnelUrl: url }),

    logout: () => {
        clearSession();
        set({
            user: null,
            isAuthenticated: false,
            view: 'login',
            activeTab: 'remote',
            role: null,
            accessCode: null,
            accessPassword: null,
            partnerId: null,
            partnerPassword: null,
            currentFrame: null,
            frameTimestamp: 0,
            clients: [],
            connection: {
                serverUrl: 'ws://localhost:3000',
                connected: false,
                connecting: false,
            },
            serverStatus: {
                zaloReady: false,
                browserRunning: false,
                message: '',
            },
            tunnelUrl: null,
        });
    },
}));

export default useStore;
