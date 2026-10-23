<script setup lang="ts">
import { computed } from 'vue';
import type { EditorFile, SplitDirection } from '../types/editor';
import {
  FilePlus,
  FolderOpen,
  Save,
  Download,
  Sparkles,
  Columns,
  Rows,
  Maximize2,
  PanelLeft,
  Sun,
  Moon,
  Settings,
  Code2,
  WrapText,
  MapPin,
} from 'lucide-vue-next';

defineProps<{
  activeFile: EditorFile | null;
  splitDirection: SplitDirection;
  sidebarOpen: boolean;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  theme: 'vs-dark' | 'vs-light';
}>();

const emit = defineEmits<{
  (e: 'new-file'): void;
  (e: 'open-file'): void;
  (e: 'save-file', forceSaveAs?: boolean): void;
  (e: 'format-code'): void;
  (e: 'split', direction: 'vertical' | 'horizontal'): void;
  (e: 'close-split'): void;
  (e: 'toggle-sidebar'): void;
  (e: 'toggle-theme'): void;
  (e: 'toggle-wordwrap'): void;
  (e: 'toggle-minimap'): void;
  (e: 'open-settings'): void;
}>();

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const modKey = computed(() => (isMac ? '⌘' : 'Ctrl'));
const altKey = computed(() => (isMac ? '⌥' : 'Alt'));
</script>

<template>
  <header class="toolbar">
    <!-- Left Section: App Brand & Sidebar Toggle -->
    <div class="toolbar-section left">
      <button
        class="tool-btn icon-only"
        :class="{ active: sidebarOpen }"
        :title="`${sidebarOpen ? 'Hide' : 'Show'} Explorer (${modKey}+B)`"
        @click="emit('toggle-sidebar')"
      >
        <PanelLeft :size="16" />
      </button>

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
    </div>

    <!-- Center Section: Current File Info -->
    <div class="toolbar-section center">
      <div v-if="activeFile" class="active-file-indicator">
        <span class="file-name">{{ activeFile.name }}</span>
        <span v-if="activeFile.isDirty" class="file-dirty-dot" title="Modified">●</span>
        <span class="file-lang-pill">{{ activeFile.language }}</span>
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
