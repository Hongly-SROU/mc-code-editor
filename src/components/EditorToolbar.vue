<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import type { EditorFile, SplitDirection } from '../types/editor';
import {
  FilePlus,
  FolderOpen,
  Save,
  Download,
  Sparkles,
  Play,
  Terminal,
  CheckCheck,
  Loader2,
  Columns,
  Rows,
  Maximize2,
  Sun,
  Moon,
  Settings,
  Code2,
  WrapText,
  MapPin,
  Pencil,
} from 'lucide-vue-next';

const props = defineProps<{
  activeFile: EditorFile | null;
  splitDirection: SplitDirection;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  theme: 'vs-dark' | 'vs-light';
  isExecuting?: boolean;
  isLogOpen?: boolean;
}>();

const emit = defineEmits<{
  (e: 'new-file'): void;
  (e: 'open-file'): void;
  (e: 'save-file', forceSaveAs?: boolean): void;
  (e: 'format-code'): void;
  (e: 'execute-code'): void;
  (e: 'review-syntax'): void;
  (e: 'toggle-log'): void;
  (e: 'split', direction: 'vertical' | 'horizontal'): void;
  (e: 'close-split'): void;
  (e: 'toggle-theme'): void;
  (e: 'toggle-wordwrap'): void;
  (e: 'toggle-minimap'): void;
  (e: 'open-settings'): void;
  (e: 'rename-file', fileId: string, newName: string): void;
}>();

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const modKey = computed(() => (isMac ? '⌘' : 'Ctrl'));
const altKey = computed(() => (isMac ? '⌥' : 'Alt'));

const isRenaming = ref(false);
const toolbarEditName = ref('');
const toolbarRenameInput = ref<HTMLInputElement | null>(null);

function startToolbarRename() {
  if (!props.activeFile) return;
  toolbarEditName.value = props.activeFile.name;
  isRenaming.value = true;
  nextTick(() => {
    toolbarRenameInput.value?.focus();
    toolbarRenameInput.value?.select();
  });
}

function commitToolbarRename() {
  if (isRenaming.value && props.activeFile) {
    const val = toolbarEditName.value.trim();
    if (val) {
      emit('rename-file', props.activeFile.id, val);
    }
    isRenaming.value = false;
  }
}

function cancelToolbarRename() {
  isRenaming.value = false;
}
</script>

<template>
  <header class="toolbar">
    <!-- Left Section: App Brand & File Actions -->
    <div class="toolbar-section left">
      <div class="brand">
        <Code2 :size="18" class="brand-icon" />
        <span class="brand-name">MC Editor</span>
      </div>

      <div class="divider"></div>

      <!-- File Actions -->
      <button
        class="tool-btn"
        :title="`New File (${modKey}+N)`"
        @click="emit('new-file')"
      >
        <FilePlus :size="15" />
        <span class="btn-label">New</span>
      </button>

      <button
        class="tool-btn"
        :title="`Open File (${modKey}+O)`"
        @click="emit('open-file')"
      >
        <FolderOpen :size="15" />
        <span class="btn-label">Open</span>
      </button>

      <button
        class="tool-btn"
        :disabled="!activeFile"
        :title="`Save File (${modKey}+S)`"
        @click="emit('save-file', false)"
      >
        <Save :size="15" />
        <span class="btn-label">Save</span>
        <span v-if="activeFile?.isDirty" class="dirty-badge" title="Unsaved changes">•</span>
      </button>

      <button
        class="tool-btn"
        :disabled="!activeFile"
        title="Save As... (Download or Save new file)"
        @click="emit('save-file', true)"
      >
        <Download :size="15" />
        <span class="btn-label">Save As</span>
      </button>

      <div class="divider"></div>

      <!-- Code Actions -->
      <button
        class="tool-btn highlight"
        :disabled="!activeFile"
        :title="`Format Document (Shift+${altKey}+F)`"
        @click="emit('format-code')"
      >
        <Sparkles :size="15" />
        <span class="btn-label">Format</span>
      </button>

      <!-- Execute / Run Code Action -->
      <button
        class="tool-btn run-btn"
        :disabled="!activeFile || isExecuting"
        :title="`Execute Code (${modKey}+Enter)`"
        @click="emit('execute-code')"
      >
        <Loader2 v-if="isExecuting" :size="15" class="spin-icon" />
        <Play v-else :size="15" class="run-icon" />
        <span class="btn-label">{{ isExecuting ? 'Running...' : 'Execute' }}</span>
      </button>

      <!-- Review Code Syntax -->
      <button
        class="tool-btn"
        :disabled="!activeFile"
        :title="`Review Code Syntax (${altKey}+S)`"
        @click="emit('review-syntax')"
      >
        <CheckCheck :size="15" />
        <span class="btn-label">Review</span>
      </button>

      <!-- Toggle Log Console -->
      <button
        class="tool-btn"
        :class="{ active: isLogOpen }"
        :disabled="!activeFile"
        :title="isLogOpen ? 'Hide Execution Log' : 'Show Execution Log'"
        @click="emit('toggle-log')"
      >
        <Terminal :size="15" />
        <span class="btn-label">Log</span>
      </button>
    </div>

    <!-- Center Section: Current File Info -->
    <div class="toolbar-section center">
      <div v-if="activeFile" class="active-file-indicator">
        <template v-if="isRenaming">
          <input
            ref="toolbarRenameInput"
            v-model="toolbarEditName"
            class="toolbar-rename-input"
            @keydown.enter.stop="commitToolbarRename"
            @keydown.esc.stop="cancelToolbarRename"
            @blur="commitToolbarRename"
            @click.stop
          />
        </template>
        <template v-else>
          <span
            class="file-name clickable"
            title="Double-click to edit file extension"
            @dblclick="startToolbarRename"
          >
            {{ activeFile.name }}
          </span>
          <button
            class="rename-btn"
            title="Rename file & extension"
            @click="startToolbarRename"
          >
            <Pencil :size="12" />
          </button>
          <span v-if="activeFile.isDirty" class="file-dirty-dot" title="Modified">●</span>
          <span class="file-lang-pill">{{ activeFile.language }}</span>
        </template>
      </div>
      <div v-else class="active-file-indicator muted">
        No file open
      </div>
    </div>

    <!-- Right Section: Split Controls, View Toggles, Theme, Settings -->
    <div class="toolbar-section right">
      <!-- Split Editor Controls -->
      <div class="split-controls">
        <button
          class="tool-btn icon-only"
          :class="{ active: splitDirection === 'vertical' }"
          title="Split Editor Right (Vertical Split)"
          @click="emit('split', 'vertical')"
        >
          <Columns :size="16" />
        </button>
        <button
          class="tool-btn icon-only"
          :class="{ active: splitDirection === 'horizontal' }"
          title="Split Editor Down (Horizontal Split)"
          @click="emit('split', 'horizontal')"
        >
          <Rows :size="16" />
        </button>
        <button
          v-if="splitDirection !== 'none'"
          class="tool-btn icon-only"
          title="Close Split (Single Editor Layout)"
          @click="emit('close-split')"
        >
          <Maximize2 :size="16" />
        </button>
      </div>

      <div class="divider"></div>

      <!-- Word Wrap & Minimap Toggles -->
      <button
        class="tool-btn icon-only"
        :class="{ active: wordWrap === 'on' }"
        :title="`Toggle Word Wrap (${wordWrap === 'on' ? 'On' : 'Off'})`"
        @click="emit('toggle-wordwrap')"
      >
        <WrapText :size="16" />
      </button>

      <button
        class="tool-btn icon-only"
        :class="{ active: minimap }"
        :title="`Toggle Minimap (${minimap ? 'Shown' : 'Hidden'})`"
        @click="emit('toggle-minimap')"
      >
        <MapPin :size="16" />
      </button>

      <div class="divider"></div>

      <!-- Theme Switcher -->
      <button
        class="tool-btn icon-only"
        :title="`Switch to ${theme === 'vs-dark' ? 'Light' : 'Dark'} Theme`"
        @click="emit('toggle-theme')"
      >
        <Sun v-if="theme === 'vs-dark'" :size="16" />
        <Moon v-else :size="16" />
      </button>

      <!-- Settings Dialog -->
      <button
        class="tool-btn icon-only"
        title="Settings & Preferences"
        @click="emit('open-settings')"
      >
        <Settings :size="16" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  height: 38px;
  background-color: var(--vscode-toolbar-bg);
  border-bottom: 1px solid var(--vscode-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  user-select: none;
  font-size: 13px;
  color: var(--vscode-fg);
  z-index: 100;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-section.center {
  flex: 1;
  justify-content: center;
  overflow: hidden;
  padding: 0 10px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  margin-right: 6px;
  margin-left: 2px;
  color: var(--vscode-fg);
}

.brand-icon {
  color: var(--vscode-accent);
}

.divider {
  width: 1px;
  height: 18px;
  background-color: var(--vscode-border);
  margin: 0 4px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--vscode-fg);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tool-btn:hover:not(:disabled) {
  background-color: var(--vscode-toolbar-hover);
}

.tool-btn:active:not(:disabled) {
  background-color: var(--vscode-toolbar-active);
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-btn.icon-only {
  padding: 0 6px;
}

.tool-btn.active {
  background-color: rgba(0, 122, 204, 0.25);
  color: var(--vscode-accent);
  border-color: rgba(0, 122, 204, 0.4);
}

.tool-btn.highlight {
  color: #75beff;
}
.tool-btn.highlight:hover:not(:disabled) {
  background-color: rgba(117, 190, 255, 0.15);
}

.tool-btn.run-btn {
  background-color: rgba(46, 160, 67, 0.16);
  border-color: rgba(46, 160, 67, 0.35);
  color: #4ac26b;
  font-weight: 600;
}

.tool-btn.run-btn:hover:not(:disabled) {
  background-color: rgba(46, 160, 67, 0.28);
  border-color: rgba(46, 160, 67, 0.55);
  color: #63e6be;
}

.run-icon {
  fill: currentColor;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.dirty-badge {
  font-size: 16px;
  color: var(--vscode-accent);
  line-height: 1;
  margin-left: -2px;
}

.active-file-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active-file-indicator.muted {
  color: var(--vscode-fg-muted);
  font-size: 12px;
  font-style: italic;
}

.file-name {
  font-weight: 500;
  font-size: 12px;
  color: var(--vscode-fg);
}

.file-name.clickable {
  cursor: pointer;
}
.file-name.clickable:hover {
  text-decoration: underline;
}

.rename-btn {
  background: none;
  border: none;
  color: var(--vscode-fg-muted);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  display: flex;
  align-items: center;
}
.rename-btn:hover {
  color: var(--vscode-fg);
  background-color: var(--vscode-toolbar-hover);
}

.toolbar-rename-input {
  background-color: var(--vscode-input-bg);
  color: var(--vscode-fg);
  border: 1px solid var(--vscode-accent);
  border-radius: 3px;
  font-size: 12px;
  padding: 2px 6px;
  outline: none;
  width: 140px;
}

.file-dirty-dot {
  color: #cca700;
  font-size: 10px;
}

.file-lang-pill {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--vscode-fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.split-controls {
  display: flex;
  gap: 2px;
}
</style>
