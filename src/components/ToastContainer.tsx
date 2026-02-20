import { X } from 'lucide-react';
import useStore from '../store/useStore';

export default function ToastContainer() {
    const { toasts, removeToast } = useStore();

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast ${toast.type}`}>
                    <span className="toast-message">{toast.message}</span>
                    <button className="toast-close" onClick={() => removeToast(toast.id)} title="Đóng">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}
