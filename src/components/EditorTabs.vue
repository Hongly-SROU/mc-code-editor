<script setup lang="ts">
import type { EditorFile } from '../types/editor';
import {
  FileCode,
  FileText,
  X,
  Plus,
  ArrowRightLeft,
  XCircle,
} from 'lucide-vue-next';

defineProps<{
  groupId: string;
  files: EditorFile[];
  activeFileId: string | null;
  isSplit: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-tab', fileId: string): void;
  (e: 'close-tab', fileId: string): void;
  (e: 'move-tab', fileId: string): void;
  (e: 'new-file'): void;
  (e: 'close-group', groupId: string): void;
}>();

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'vue':
    case 'html':
    case 'css':
    case 'scss':
    case 'json':
      return FileCode;
    default:
      return FileText;
  }
}
</script>

<template>
  <div class="tabs-header">
    <div class="tabs-scroll-area">
      <div
        v-for="file in files"
        :key="file.id"
        class="tab-item"
        :class="{ active: file.id === activeFileId }"
        @click="emit('select-tab', file.id)"
      >
        <component
          :is="getFileIcon(file.name)"
          :size="14"
          class="tab-icon"
          :class="'ext-' + file.name.split('.').pop()"
        />
        <span class="tab-title" :title="file.name">{{ file.name }}</span>

        <!-- Dirty Indicator or Close Button -->
        <span
          v-if="file.isDirty"
          class="tab-dirty"
          title="Unsaved changes"
          @click.stop="emit('close-tab', file.id)"
        >
          ●
        </span>

        <button
          class="tab-close-btn"
          :title="`Close ${file.name}`"
          @click.stop="emit('close-tab', file.id)"
        >
          <X :size="13" />
        </button>

        <!-- Move to other group button if split is active -->
        <button
          v-if="isSplit"
          class="tab-move-btn"
          title="Move tab to other group"
          @click.stop="emit('move-tab', file.id)"
        >
          <ArrowRightLeft :size="11" />
        </button>
      </div>

      <button
        class="tab-add-btn"
        title="New Untitled File"
        @click="emit('new-file')"
      >
        <Plus :size="14" />
      </button>
    </div>

    <!-- Right Controls: Close Split Group -->
    <div class="tabs-actions">
      <button
        v-if="isSplit"
        class="group-action-btn"
        title="Close this editor group"
        @click="emit('close-group', groupId)"
      >
        <XCircle :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.tabs-header {
  height: 35px;
  background-color: var(--vscode-tabs-bg);
  border-bottom: 1px solid var(--vscode-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  overflow: hidden;
}

.tabs-scroll-area {
  display: flex;
  align-items: center;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  flex: 1;
}

.tabs-scroll-area::-webkit-scrollbar {
  display: none;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  padding: 0 12px;
  background-color: var(--vscode-tab-inactive-bg);
  color: var(--vscode-tab-inactive-fg);
  border-right: 1px solid var(--vscode-border);
  cursor: pointer;
  font-size: 12px;
  position: relative;
  max-width: 180px;
  min-width: 90px;
  transition: background-color 0.1s ease;
}

.tab-item:hover {
  background-color: var(--vscode-tab-hover-bg);
  color: var(--vscode-fg);
}

.tab-item.active {
  background-color: var(--vscode-editor-bg);
  color: var(--vscode-fg);
  border-top: 2px solid var(--vscode-accent);
}

.tab-icon {
  flex-shrink: 0;
  color: #75beff;
}
.tab-icon.ext-ts,
.tab-icon.ext-tsx {
  color: #3178c6;
}
.tab-icon.ext-js,
.tab-icon.ext-jsx {
  color: #f7df1e;
}
.tab-icon.ext-json {
  color: #cbcb41;
}
.tab-icon.ext-css,
.tab-icon.ext-scss {
  color: #42a5f5;
}
.tab-icon.ext-html {
  color: #e44d26;
}
.tab-icon.ext-md {
  color: #42b983;
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-dirty {
  font-size: 9px;
  color: #cca700;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
}

.tab-close-btn,
.tab-move-btn {
  background: none;
  border: none;
  color: var(--vscode-fg-muted);
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  display: none;
  align-items: center;
}

.tab-item:hover .tab-close-btn,
.tab-item.active .tab-close-btn,
.tab-item:hover .tab-move-btn,
.tab-item.active .tab-move-btn {
  display: flex;
}

.tab-item:hover .tab-dirty {
  display: none; /* Hide dot when hovering so close button takes its place */
}

.tab-close-btn:hover,
.tab-move-btn:hover {
  color: var(--vscode-fg);
  background-color: rgba(255, 255, 255, 0.15);
}

.tab-add-btn {
  background: none;
  border: none;
  color: var(--vscode-fg-muted);
  cursor: pointer;
  padding: 6px 10px;
  height: 100%;
  display: flex;
  align-items: center;
}

.tab-add-btn:hover {
  color: var(--vscode-fg);
  background-color: var(--vscode-toolbar-hover);
}

.tabs-actions {
  display: flex;
  align-items: center;
  padding: 0 8px;
}

.group-action-btn {
  background: none;
  border: none;
  color: var(--vscode-fg-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 3px;
  display: flex;
  align-items: center;
}

.group-action-btn:hover {
  color: var(--vscode-fg);
  background-color: var(--vscode-toolbar-hover);
}
</style>
