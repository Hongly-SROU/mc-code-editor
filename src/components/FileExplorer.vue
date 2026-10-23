<script setup lang="ts">
import type { EditorFile } from '../types/editor';
import {
  FileCode,
  FileText,
  FilePlus,
  FolderOpen,
  X,
  ChevronDown,
} from 'lucide-vue-next';

defineProps<{
  files: EditorFile[];
  activeFileId: string | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-file', fileId: string): void;
  (e: 'close-file', fileId: string): void;
  (e: 'new-file'): void;
  (e: 'open-file'): void;
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
    case 'py':
    case 'rs':
    case 'go':
    case 'sql':
      return FileCode;
    default:
      return FileText;
  }
}
</script>

<template>
  <aside v-if="isOpen" class="file-explorer">
    <div class="explorer-header">
      <span class="explorer-title">EXPLORER</span>
      <div class="explorer-actions">
        <button class="action-btn" title="New File" @click="emit('new-file')">
          <FilePlus :size="15" />
        </button>
        <button class="action-btn" title="Open Local Files" @click="emit('open-file')">
          <FolderOpen :size="15" />
        </button>
      </div>
    </div>

    <!-- Open Editors Section -->
    <div class="explorer-section">
      <div class="section-title">
        <ChevronDown :size="14" />
        <span>OPEN FILES ({{ files.length }})</span>
      </div>

      <div class="file-list">
        <div
          v-for="file in files"
          :key="file.id"
          class="file-item"
          :class="{ active: file.id === activeFileId }"
          @click="emit('select-file', file.id)"
        >
          <component
            :is="getFileIcon(file.name)"
            :size="15"
            class="file-icon"
            :class="'ext-' + file.name.split('.').pop()"
          />
          <span class="file-name" :title="file.name">{{ file.name }}</span>

          <span v-if="file.isDirty" class="file-dirty" title="Unsaved changes">●</span>

          <button
            class="close-btn"
            title="Close File"
            @click.stop="emit('close-file', file.id)"
          >
            <X :size="13" />
          </button>
        </div>

        <div v-if="files.length === 0" class="empty-files">
          <span>No open files.</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.file-explorer {
  width: 230px;
  background-color: var(--vscode-sidebar-bg);
  border-right: 1px solid var(--vscode-border);
  display: flex;
  flex-direction: column;
  user-select: none;
  font-size: 12px;
  flex-shrink: 0;
  overflow: hidden;
}

.explorer-header {
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.8px;
  color: var(--vscode-fg-muted);
  border-bottom: 1px solid var(--vscode-border);
}

.explorer-actions {
  display: flex;
  gap: 2px;
}

.action-btn {
  background: none;
  border: none;
  color: var(--vscode-fg-muted);
  cursor: pointer;
  padding: 3px;
  border-radius: 3px;
  display: flex;
  align-items: center;
}
.action-btn:hover {
  color: var(--vscode-fg);
  background-color: var(--vscode-toolbar-hover);
}

.explorer-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--vscode-fg-muted);
  letter-spacing: 0.5px;
}

.file-list {
  display: flex;
  flex-direction: column;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  cursor: pointer;
  color: var(--vscode-fg);
  position: relative;
  transition: background-color 0.1s ease;
}

.file-item:hover {
  background-color: var(--vscode-list-hover);
}

.file-item.active {
  background-color: var(--vscode-list-active);
  color: var(--vscode-fg);
  font-weight: 500;
}

.file-icon {
  flex-shrink: 0;
  color: #75beff;
}

.file-icon.ext-ts,
.file-icon.ext-tsx {
  color: #3178c6;
}
.file-icon.ext-js,
.file-icon.ext-jsx {
  color: #f7df1e;
}
.file-icon.ext-json {
  color: #cbcb41;
}
.file-icon.ext-css,
.file-icon.ext-scss {
  color: #42a5f5;
}
.file-icon.ext-html {
  color: #e44d26;
}
.file-icon.ext-md {
  color: #42b983;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-dirty {
  font-size: 9px;
  color: #cca700;
  margin-right: 4px;
}

.close-btn {
  background: none;
  border: none;
  color: var(--vscode-fg-muted);
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  display: none;
  align-items: center;
}

.file-item:hover .close-btn,
.file-item.active .close-btn {
  display: flex;
}

.close-btn:hover {
  color: var(--vscode-fg);
  background-color: rgba(255, 255, 255, 0.15);
}

.empty-files {
  padding: 16px 12px;
  color: var(--vscode-fg-muted);
  font-style: italic;
  font-size: 11px;
}
</style>
