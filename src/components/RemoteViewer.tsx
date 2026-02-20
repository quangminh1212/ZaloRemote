import { useRef, useEffect, useCallback, useState } from 'react';
import { Monitor, RefreshCw, Users, Maximize2, Minimize2, KeyRound, RefreshCcw, Share2, RotateCcw, MonitorSmartphone, Globe } from 'lucide-react';
import useStore from '../store/useStore';
import socketService from '../services/socketService';
import { useTranslation } from '../i18n';

// Client-side throttle: reduces events sent to server
function useThrottle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
    const lastCall = useRef(0);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastArgs = useRef<any[] | null>(null);

    return useCallback((...args: any[]) => {
        lastArgs.current = args;
        const now = Date.now();

        if (now - lastCall.current >= ms) {
            lastCall.current = now;
            fn(...args);
        } else if (!timer.current) {
            // Schedule trailing call
            timer.current = setTimeout(() => {
                lastCall.current = Date.now();
                timer.current = null;
                if (lastArgs.current) fn(...lastArgs.current);
            }, ms - (now - lastCall.current));
        }
    }, [fn, ms]) as T;
}

export default function RemoteViewer() {
    const {
        currentFrame, serverStatus, queueStatus,
        clients, showClientPanel, toggleClientPanel,
        role, accessCode, accessPassword, tunnelUrl,
    } = useStore();
    const { t } = useTranslation();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSharePanel, setShowSharePanel] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1500);
    };

    // Draw frame onto canvas - client does all image decoding
    useEffect(() => {
        if (!currentFrame || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            if (canvas.width !== img.width || canvas.height !== img.height) {
                canvas.width = img.width;
                canvas.height = img.height;
            }
            requestAnimationFrame(() => {
                ctx.drawImage(img, 0, 0);
            });
        };
        img.src = currentFrame;
    }, [currentFrame]);

    // Scale calculation
    const recalcScale = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const vw = serverStatus.viewport?.width || 1280;
        const vh = serverStatus.viewport?.height || 800;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        // Never set scale to 0 (happens during mount transitions)
        if (cw > 0 && ch > 0) {
            setScale(Math.min(cw / vw, ch / vh));
        }
    }, [serverStatus.viewport]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Initial calculation
        recalcScale();

        const observer = new ResizeObserver(() => {
            recalcScale();
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [serverStatus.viewport, currentFrame, recalcScale]);

    // Sync CSS custom property when scale changes (zero inline styles)
    useEffect(() => {
        canvasRef.current?.style.setProperty('--scale', String(scale));
    }, [scale]);

    // Request frame when mounted without one (client just connected)
    useEffect(() => {
        if (!currentFrame && socketService.isConnected()) {
            socketService.requestFrame();
        }
    }, [currentFrame]);

    // Coordinate conversion (client-side math)
    const getServerCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        return {
            x: Math.round(Math.max(0, Math.min(x, serverStatus.viewport?.width || 1280))),
            y: Math.round(Math.max(0, Math.min(y, serverStatus.viewport?.height || 800))),
        };
    }, [scale, serverStatus.viewport]);

    // Click - instant, no throttle
    const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const coords = getServerCoords(e);
        if (!coords) return;
        socketService.sendAction({
            type: 'click',
            ...coords,
            button: e.button === 2 ? 'right' : 'left',
        });
    }, [getServerCoords]);

    const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const coords = getServerCoords(e);
        if (!coords) return;
        socketService.sendAction({ type: 'dblclick', ...coords });
    }, [getServerCoords]);

    // Scroll - throttled at 100ms (client does the heavy lifting of debouncing)
    const rawHandleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
        const coords = getServerCoords(e as any);
        if (!coords) return;
        socketService.sendAction({
            type: 'scroll',
            ...coords,
            deltaX: e.deltaX,
            deltaY: e.deltaY,
        });
    }, [getServerCoords]);
    const handleWheel = useThrottle(rawHandleWheel, 100);

    // Keyboard handler - comprehensive key mapping
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
        // Skip IME composition events (handled by composition handler)
        if (e.nativeEvent.isComposing) return;
        e.preventDefault();

        // Ignore modifier-only keys (prevent "Control+Control" etc.)
        const modifierOnly = ['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'NumLock', 'ScrollLock'];
        if (modifierOnly.includes(e.key)) return;

        // Build modifier prefix
        const modifiers: string[] = [];
        if (e.ctrlKey || e.metaKey) modifiers.push('Control');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey && e.key.length > 1) modifiers.push('Shift'); // Only for special keys

        // Puppeteer-compatible key names
        const puppeteerKeyMap: Record<string, string> = {
            'Enter': 'Enter', 'Backspace': 'Backspace', 'Delete': 'Delete',
            'Tab': 'Tab', 'Escape': 'Escape', ' ': 'Space',
            'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown',
            'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight',
            'Home': 'Home', 'End': 'End',
            'PageUp': 'PageUp', 'PageDown': 'PageDown',
            'Insert': 'Insert',
            'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
            'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
            'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
        };

        const mappedKey = puppeteerKeyMap[e.key];

        if (modifiers.length > 0) {
            // Modifier combo: Ctrl+A, Ctrl+C, Alt+F4, etc.
            const baseKey = mappedKey || (e.key.length === 1 ? e.key.toLowerCase() : e.key);
            const combo = [...modifiers, baseKey].join('+');
            socketService.sendAction({ type: 'keydown', key: combo });
        } else if (mappedKey) {
            // Special key without modifier
            socketService.sendAction({ type: 'keydown', key: mappedKey });
        } else if (e.key.length === 1) {
            // Regular character (a-z, 0-9, symbols)
            socketService.sendAction({ type: 'type', text: e.key });
        }
    }, []);

    // Vietnamese IME composition handler
    const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLCanvasElement>) => {
        if (e.data) {
            socketService.sendAction({ type: 'type', text: e.data });
        }
    }, []);

    // Right-click - instant
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const coords = getServerCoords(e as any);
        if (!coords) return;
        socketService.sendAction({ type: 'click', ...coords, button: 'right' });
    }, [getServerCoords]);

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Empty state
    if (!currentFrame) {
        return (
            <div className="remote-viewer">
                <div className="remote-toolbar">
                    <div className="remote-toolbar-left">
                        <Monitor size={18} />
                        <span>{t('remote.title')}</span>
                    </div>
                </div>
                <div className="remote-content" ref={containerRef}>
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Monitor size={48} />
                        </div>
                        <h2>{serverStatus.message || t('setup.connecting')}</h2>
                        <p>
                            {serverStatus.browserRunning
                                ? t('remote.browserRunning')
                                : t('remote.connectToStart')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="remote-viewer">
            {/* Toolbar */}
            <div className="remote-toolbar">
                <div className="remote-toolbar-left">
                    <Monitor size={18} />
                    <span>{t('remote.title')}</span>
                    <div className={`status-dot ${serverStatus.zaloReady ? 'online' : 'offline'}`} />
                    <span className="status-label">
                        {serverStatus.zaloReady ? t('remote.zaloRunning') : t('remote.waitingLogin')}
                    </span>
                </div>
                <div className="remote-toolbar-right">
                    {/* Queue indicator */}
                    {queueStatus.processing && (
                        <div className="queue-indicator">
                            <div className="queue-spinner" />
                            <span>{queueStatus.currentAction?.clientName}: {queueStatus.currentAction?.type}</span>
                        </div>
                    )}
                    {queueStatus.length > 0 && (
                        <span className="queue-badge">{queueStatus.length}</span>
                    )}

                    {/* Share button (server role only) */}
                    {role === 'server' && (
                        <button
                            className={`icon-btn ${showSharePanel ? 'active-highlight' : ''}`}
                            onClick={() => setShowSharePanel(!showSharePanel)}
                            title={t('dashboard.shareLink')}
                        >
                            <Share2 size={18} />
                        </button>
                    )}

                    {/* Connected clients count */}
                    <button
                        className={`icon-btn ${showClientPanel ? 'active-highlight' : ''}`}
                        onClick={toggleClientPanel}
                        title={t('remote.connectedDevices')}
                    >
                        <Users size={18} />
                        <span className="client-count">{clients.length}</span>
                    </button>

                    <button className="icon-btn" onClick={() => socketService.requestFrame()} title={t('remote.refresh')}>
                        <RefreshCw size={18} />
                    </button>

                    <button className="icon-btn" onClick={() => window.location.reload()} title="Reload page">
                        <RotateCcw size={18} />
                    </button>

                    <button className="icon-btn" onClick={() => {
                        socketService.sendAction({ type: 'resize', width: window.innerWidth, height: window.innerHeight });
                    }} title="Fit to screen">
                        <MonitorSmartphone size={18} />
                    </button>

                    <button className="icon-btn" onClick={toggleFullscreen} title={isFullscreen ? t('remote.exitFullscreen') : t('remote.fullscreen')}>
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </div>

            {/* Access Code Share Panel (server role only) */}
            {role === 'server' && showSharePanel && (
                <div className="share-panel">
                    <div className="share-panel-content">
                        <div className="share-code-section">
                            <KeyRound size={18} />
                            <span className="share-label">{t('setup.partnerId')}:</span>
                            <span
                                className={`share-code clickable ${copiedField === 'id' ? 'copied' : ''}`}
                                onClick={() => accessCode && copyToClipboard(accessCode, 'id')}
                                title="Click to copy"
                            >
                                {copiedField === 'id' ? t('dashboard.copied') : (accessCode ? accessCode.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3') : '---------')}
                            </span>
                        </div>
                        <div className="share-code-section">
                            <KeyRound size={18} />
                            <span className="share-label">{t('setup.partnerPassword')}:</span>
                            <span
                                className={`share-code clickable ${copiedField === 'pwd' ? 'copied' : ''}`}
                                onClick={() => accessPassword && copyToClipboard(accessPassword, 'pwd')}
                                title="Click to copy"
                            >
                                {copiedField === 'pwd' ? t('dashboard.copied') : (accessPassword || '----')}
                            </span>
                        </div>
                        <div className="share-code-section">
                            <span className="share-label">{t('dashboard.shareLink')}:</span>
                            <span
                                className={`share-url clickable ${copiedField === 'link' ? 'copied' : ''}`}
                                onClick={() => {
                                    const formattedId = accessCode ? accessCode.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3') : '';
                                    const serverAddr = tunnelUrl || window.location.origin;
                                    const text = `${t('dashboard.shareLink')}: ${serverAddr}\n${t('setup.partnerId')}: ${formattedId}\n${t('setup.partnerPassword')}: ${accessPassword || ''}`;
                                    copyToClipboard(text, 'link');
                                }}
                                title="Click to copy all"
                            >
                                {copiedField === 'link' ? t('dashboard.copied') : (tunnelUrl || window.location.origin)}
                            </span>
                        </div>
                        {tunnelUrl && (
                            <div className="share-code-section tunnel-section">
                                <Globe size={18} />
                                <span className="share-label">Tunnel URL:</span>
                                <span
                                    className={`share-code tunnel-url clickable ${copiedField === 'tunnel' ? 'copied' : ''}`}
                                    onClick={() => copyToClipboard(tunnelUrl, 'tunnel')}
                                    title="Click to copy tunnel URL"
                                >
                                    {copiedField === 'tunnel' ? t('dashboard.copied') : tunnelUrl}
                                </span>
                            </div>
                        )}
                        <div className="share-actions">
                            <button
                                className="share-regenerate-btn"
                                onClick={() => {
                                    if (socketService.isConnected()) {
                                        socketService.regenerateCode();
                                    }
                                }}
                            >
                                <RefreshCcw size={14} />
                                <span>{t('dashboard.regenerate')}</span>
                            </button>
                            <p className="share-hint">{t('dashboard.shareHint')}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Canvas */}
            <div className="remote-content" ref={containerRef}>
                {!currentFrame && (
                    <div className="guide-overlay">
                        <div className="guide-content">
                            <h2>📖 {t('settings.title')} — ZaloHub</h2>

                            <div className="guide-section">
                                <h3>🖥️ Toolbar</h3>
                                <div className="guide-grid">
                                    <div className="guide-item"><Share2 size={16} /> <span>{t('dashboard.shareLink')} — Chia sẻ ID & mật khẩu</span></div>
                                    <div className="guide-item"><Users size={16} /> <span>Thiết bị đang kết nối</span></div>
                                    <div className="guide-item"><RefreshCw size={16} /> <span>Làm mới khung hình</span></div>
                                    <div className="guide-item"><RotateCcw size={16} /> <span>Tải lại trang</span></div>
                                    <div className="guide-item"><MonitorSmartphone size={16} /> <span>Fit theo màn hình</span></div>
                                    <div className="guide-item"><Maximize2 size={16} /> <span>Toàn màn hình</span></div>
                                </div>
                            </div>

                            {role === 'server' ? (
                                <div className="guide-section">
                                    <h3>🟢 Server — Bước làm</h3>
                                    <ol>
                                        <li>Nhấn <strong>Share</strong> để lấy <strong>Partner ID</strong> và <strong>Mật khẩu</strong></li>
                                        <li>Gửi thông tin cho người muốn kết nối</li>
                                        <li>Chờ Zalo Web tải xong, màn hình sẽ hiển thị tự động</li>
                                        <li>Dùng <strong>Fit to screen</strong> để tối ưu kích cỡ</li>
                                    </ol>
                                </div>
                            ) : (
                                <div className="guide-section">
                                    <h3>🔵 Client — Bước làm</h3>
                                    <ol>
                                        <li>Nhập <strong>Partner ID</strong> và <strong>Mật khẩu</strong> từ server</li>
                                        <li>Nhấn <strong>Kết nối</strong> để xem và điều khiển Zalo</li>
                                        <li>Click, gõ phím, cuộn chuột trực tiếp trên màn hình</li>
                                    </ol>
                                </div>
                            )}

                            <p className="guide-footer">Đang chờ khung hình từ server...</p>
                        </div>
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    className="remote-canvas"
                    tabIndex={0}
                    onClick={handleClick}
                    onDoubleClick={handleDoubleClick}
                    onWheel={handleWheel}
                    onKeyDown={handleKeyDown}
                    onCompositionEnd={handleCompositionEnd}
                    onContextMenu={handleContextMenu}
                />
            </div>
        </div>
    );
}
