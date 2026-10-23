<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next';

defineProps<{
  show: boolean;
  fileName: string;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'discard'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div class="modal-header">
        <AlertCircle class="modal-icon" :size="22" />
        <h3 id="dialog-title" class="modal-title">Unsaved Changes</h3>
      </div>
      <p class="modal-text">
        Do you want to save the changes you made to <strong>{{ fileName }}</strong>?
        <br />
        Your changes will be lost if you don't save them.
      </p>
      <div class="modal-actions">
        <button class="btn btn-primary" @click="emit('save')">
          Save
        </button>
        <button class="btn btn-secondary" @click="emit('discard')">
          Don't Save
        </button>
        <button class="btn btn-tertiary" @click="emit('cancel')">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.modal-box {
  background-color: var(--vscode-editor-bg);
  border: 1px solid var(--vscode-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  border-radius: 8px;
  width: 90%;
  max-width: 440px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-icon {
  color: #cca700;
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-fg);
}

.modal-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vscode-fg-muted);
}

.modal-text strong {
  color: var(--vscode-fg);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.btn {
  padding: 7px 14px;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  font-weight: 500;
  transition: all 0.15s ease;
}

.btn-primary {
  background-color: var(--vscode-button-bg);
  color: #ffffff;
}
.btn-primary:hover {
  background-color: var(--vscode-button-hover);
}

.btn-secondary {
  background-color: transparent;
  border-color: var(--vscode-border);
  color: var(--vscode-fg);
}
.btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.btn-tertiary {
  background-color: transparent;
  color: var(--vscode-fg-muted);
}
.btn-tertiary:hover {
  color: var(--vscode-fg);
  background-color: rgba(255, 255, 255, 0.05);
}
</style>

