export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration: number; // in milliseconds
}

class ToastState {
    toasts = $state<Toast[]>([]);

    add(type: ToastType, message: string, duration = 3000) {
        const id = crypto.randomUUID();
        this.toasts.push({ id, type, message, duration });
        
        setTimeout(() => {
            this.remove(id);
        }, duration);
    }

    remove(id: string) {
        this.toasts = this.toasts.filter(t => t.id !== id);
    }

    success(message: string, duration?: number) {
        this.add('success', message, duration);
    }

    error(message: string, duration?: number) {
        this.add('error', message, duration);
    }

    info(message: string, duration?: number) {
        this.add('info', message, duration);
    }

    warning(message: string, duration?: number) {
        this.add('warning', message, duration);
    }
}

export const toast = new ToastState();
