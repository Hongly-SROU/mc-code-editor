import { ref } from 'vue';
import type { Toast } from '../types/editor';

const toasts = ref<Toast[]>([]);

export function useToast() {
  function addToast(
    message: string,
    type: Toast['type'] = 'info',
    duration = 3500
  ) {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, type, message, duration };
    toasts.value.push(toast);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }

  function removeToast(id: string) {
    const idx = toasts.value.findIndex((t) => t.id === id);
    if (idx !== -1) {
      toasts.value.splice(idx, 1);
    }
  }

  return {
    toasts,
    addToast,
    removeToast,
    info: (msg: string, d?: number) => addToast(msg, 'info', d),
    success: (msg: string, d?: number) => addToast(msg, 'success', d),
    warning: (msg: string, d?: number) => addToast(msg, 'warning', d),
    error: (msg: string, d?: number) => addToast(msg, 'error', d),
  };
}

