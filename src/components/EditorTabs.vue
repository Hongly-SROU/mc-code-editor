<script setup lang="ts">
import { ref, nextTick } from 'vue';
import type { EditorFile } from '../types/editor';
import { useDragDrop } from '../composables/useDragDrop';
import {
  FileCode,
  FileText,
  X,
  Plus,
  ArrowRightLeft,
  XCircle,
  Pencil,
  Play,
} from 'lucide-vue-next';

const props = defineProps<{
  groupId: string;
  files: EditorFile[];
  activeFileId: string | null;
  isSplit: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-tab', fileId: string): void;
  (e: 'close-tab', fileId: string): void;
  (e: 'move-tab', fileId: string): void;
  (e: 'move-tab-drop', fileId: string, fromGroupId: string, toGroupId: string): void;
  (e: 'rename-file', fileId: string, newName: string): void;
  (e: 'new-file', groupId: string): void;
  (e: 'close-group', groupId: string): void;
  (e: 'execute-active-file'): void;
}>();

const { startDrag, endDrag, draggedFileId, sourceGroupId, isDraggingTab } = useDragDrop();
const isDragOverBar = ref(false);

const editingFileId = ref<string | null>(null);
const editingFileName = ref<string>('');
const renameInputRef = ref<HTMLInputElement | null>(null);

function onTabDragStart(e: DragEvent, fileId: string) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', fileId);
    e.dataTransfer.effectAllowed = 'move';
  }
  startDrag(fileId, props.groupId);
}

function onTabDragEnd() {
  endDrag();
  isDragOverBar.value = false;
}

function onBarDragOver(e: DragEvent) {
  if (isDraggingTab.value) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    isDragOverBar.value = true;
  }
}

function onBarDragLeave() {
  isDragOverBar.value = false;
}

function onBarDrop(e: DragEvent) {
  e.preventDefault();
  isDragOverBar.value = false;
  const fileId = e.dataTransfer?.getData('text/plain') || draggedFileId.value;
  const fromGroup = sourceGroupId.value;
  if (fileId && fromGroup && fromGroup !== props.groupId) {
    emit('move-tab-drop', fileId, fromGroup, props.groupId);
  }
  endDrag();
}

function startRename(file: EditorFile) {
  editingFileId.value = file.id;
  editingFileName.value = file.name;
  nextTick(() => {
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
  });
}

function commitRename(fileId: string) {
  if (editingFileId.value === fileId) {
    const val = editingFileName.value.trim();
    if (val) {
      emit('rename-file', fileId, val);
    }
    editingFileId.value = null;
  }
}

function cancelRename() {
  editingFileId.value = null;
}

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
  <div
    class="tabs-header"
    :class="{ 'drag-over-bar': isDragOverBar }"
    @dragover.prevent="onBarDragOver"
    @dragleave="onBarDragLeave"
    @drop="onBarDrop"
  >
    <div class="tabs-scroll-area">
      <div
        v-for="file in files"
        :key="file.id"
        class="tab-item"
        :class="{
          active: file.id === activeFileId,
          'is-dragging': draggedFileId === file.id,
        }"
        :draggable="editingFileId !== file.id"
        @dragstart="onTabDragStart($event, file.id)"
        @dragend="onTabDragEnd"
        @click="emit('select-tab', file.id)"
      >
        <component
          :is="getFileIcon(file.name)"
          :size="14"
          class="tab-icon"
          :class="'ext-' + file.name.split('.').pop()"
        />

        <!-- Inline Rename Input -->
        <template v-if="editingFileId === file.id">
          <input
            ref="renameInputRef"
            v-model="editingFileName"
            class="tab-rename-input"
            @keydown.enter.stop="commitRename(file.id)"
            @keydown.esc.stop="cancelRename"
            @blur="commitRename(file.id)"
            @click.stop
          />
        </template>
        <template v-else>
          <span
            class="tab-title"
            :title="`${file.name} (Double-click to edit file extension)`"
            @dblclick.stop="startRename(file)"
          >
            {{ file.name }}
          </span>
          <button
            class="tab-rename-btn"
            title="Rename file & extension"
            @click.stop="startRename(file)"
          >
            <Pencil :size="11" />
          </button>
        </template>

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
        @click="emit('new-file', groupId)"
      >
        <Plus :size="14" />
      </button>
    </div>

    <!-- Right Controls: Run & Close Split Group -->
    <div class="tabs-actions">
      <button
        v-if="activeFileId"
        class="group-action-btn run-tab-action"
        title="Execute file (Ctrl+Enter)"
        @click="emit('execute-active-file')"
      >
        <Play :size="13" />
      </button>

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
  transition: background-color 0.15s ease;
}

.tabs-header.drag-over-bar {
  background-color: rgba(0, 122, 204, 0.2);
  outline: 1px dashed var(--vscode-accent);
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

.tab-item.is-dragging {
  opacity: 0.4;
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

.tab-rename-input {
  background-color: var(--vscode-input-bg);
  color: var(--vscode-fg);
  border: 1px solid var(--vscode-accent);
  border-radius: 2px;
  font-size: 12px;
  padding: 1px 4px;
  outline: none;
  width: 100px;
  max-width: 130px;
}

.tab-rename-btn,
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

.tab-item:hover .tab-rename-btn,
.tab-item.active .tab-rename-btn,
.tab-item:hover .tab-close-btn,
.tab-item.active .tab-close-btn,
.tab-item:hover .tab-move-btn,
.tab-item.active .tab-move-btn {
  display: flex;
}

.tab-item:hover .tab-dirty {
  display: none; /* Hide dot when hovering so buttons take its place */
}

.tab-rename-btn:hover,
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

.group-action-btn.run-tab-action {
  color: #4ac26b;
  margin-right: 4px;
}

.group-action-btn.run-tab-action:hover {
  color: #63e6be;
  background-color: rgba(46, 160, 67, 0.2);
}
</style>

