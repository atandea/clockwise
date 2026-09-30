export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration: number; // in milliseconds
}

function formatMessage(msg: unknown): string {
    if (typeof msg === 'string') return msg;
    if (msg instanceof Error) return msg.message;
    if (msg && typeof msg === 'object') {
        if ('message' in msg && typeof (msg as any).message === 'string') {
            return (msg as any).message;
        }
        try {
            return JSON.stringify(msg);
        } catch {
            return String(msg);
        }
    }
    return String(msg ?? '');
}

class ToastState {
    toasts = $state<Toast[]>([]);

    add(type: ToastType, rawMessage: unknown, duration = 3000) {
        const message = formatMessage(rawMessage);
        const id = crypto.randomUUID();
        console.log(`Adding toast: [${type}] ${message}`);
        this.toasts.push({ id, type, message, duration });
        console.log('Current toasts length:', this.toasts.length);
        
        setTimeout(() => {
            this.remove(id);
        }, duration);
    }

    remove(id: string) {
        this.toasts = this.toasts.filter(t => t.id !== id);
    }

    success(message: unknown, duration?: number) {
        this.add('success', message, duration);
    }

    error(message: unknown, duration?: number) {
        this.add('error', message, duration);
    }

    info(message: unknown, duration?: number) {
        this.add('info', message, duration);
    }

    warning(message: unknown, duration?: number) {
        this.add('warning', message, duration);
    }
}

export const toast = new ToastState();
