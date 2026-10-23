<script setup lang="ts">
import { useToast } from '../composables/useToast';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-vue-next';

const { toasts, removeToast } = useToast();
</script>

<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-item"
        :class="'toast-' + toast.type"
      >
        <span class="toast-icon">
          <CheckCircle v-if="toast.type === 'success'" :size="16" />
          <AlertCircle v-else-if="toast.type === 'error'" :size="16" />
          <AlertTriangle v-else-if="toast.type === 'warning'" :size="16" />
          <Info v-else :size="16" />
        </span>
        <span class="toast-message">{{ toast.message }}</span>
        <button
          class="toast-close"
          @click="removeToast(toast.id)"
          aria-label="Close notification"
        >
          <X :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 28px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
  pointer-events: none;
  max-width: 400px;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
  border: 1px solid var(--vscode-border);
  background-color: var(--vscode-toast-bg);
  color: var(--vscode-toast-fg);
}

.toast-success {
  border-left: 4px solid #89d185;
}
.toast-error {
  border-left: 4px solid #f48771;
}
.toast-warning {
  border-left: 4px solid #cca700;
}
.toast-info {
  border-left: 4px solid #007acc;
}

.toast-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.toast-success .toast-icon {
  color: #89d185;
}
.toast-error .toast-icon {
  color: #f48771;
}
.toast-warning .toast-icon {
  color: #cca700;
}
.toast-info .toast-icon {
  color: #75beff;
}

.toast-message {
  flex: 1;
  line-height: 1.4;
  word-break: break-word;
}

.toast-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--vscode-fg-muted);
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 3px;
}
.toast-close:hover {
  color: var(--vscode-fg);
  background-color: rgba(255, 255, 255, 0.1);
}

/* Animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>

