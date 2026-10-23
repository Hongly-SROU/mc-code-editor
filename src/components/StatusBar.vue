<script setup lang="ts">
import type { EditorFile, CursorPosition, EditorSettings } from '../types/editor';
import {
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-vue-next';

defineProps<{
  activeFile: EditorFile | null;
  cursor: CursorPosition;
  settings: EditorSettings;
}>();

const emit = defineEmits<{
  (e: 'open-language-modal'): void;
  (e: 'toggle-theme'): void;
  (e: 'open-settings'): void;
}>();
</script>

<template>
  <footer class="status-bar">
    <!-- Left Section -->
    <div class="status-section left">
      <div class="status-item" title="Local Workspace">
        <GitBranch :size="13" />
        <span>local</span>
      </div>

      <div v-if="activeFile?.isDirty" class="status-item warning" title="Document has unsaved changes">
        <AlertCircle :size="13" />
        <span>Modified</span>
      </div>
      <div v-else-if="activeFile" class="status-item success" title="Document is saved">
        <CheckCircle2 :size="13" />
        <span>Saved</span>
      </div>
    </div>

    <!-- Right Section -->
    <div class="status-section right">
      <div v-if="activeFile" class="status-item clickable" title="Line and Column">
        <span>Ln {{ cursor.lineNumber }}, Col {{ cursor.column }}</span>
      </div>

      <div
        class="status-item clickable"
        title="Tab Size / Indentation"
        @click="emit('open-settings')"
      >
        <span>{{ settings.insertSpaces ? 'Spaces' : 'Tab' }}: {{ settings.tabSize }}</span>
      </div>

      <div class="status-item" title="Encoding">
        <span>UTF-8</span>
      </div>

      <div
        v-if="activeFile"
        class="status-item clickable highlight-lang"
        title="Click to Change Language Mode"
        @click="emit('open-language-modal')"
      >
        <span>{{ activeFile.language }}</span>
      </div>

      <div
        class="status-item clickable"
        title="Code Formatter: Prettier"
        @click="emit('open-settings')"
      >
        <Sparkles :size="12" />
        <span>Prettier</span>
      </div>

      <div
        class="status-item clickable icon-only"
        :title="`Current theme: ${settings.theme === 'vs-dark' ? 'Dark' : 'Light'}`"
        @click="emit('toggle-theme')"
      >
        <Sun v-if="settings.theme === 'vs-dark'" :size="13" />
        <Moon v-else :size="13" />
      </div>
    </div>
  </footer>
</template>

<style scoped>
.status-bar {
  height: 24px;
  background-color: var(--vscode-statusbar-bg);
  color: var(--vscode-statusbar-fg);
  border-top: 1px solid var(--vscode-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  font-size: 11px;
  user-select: none;
  z-index: 100;
}

.status-section {
  display: flex;
  align-items: center;
  height: 100%;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  height: 100%;
  cursor: default;
}

.status-item.clickable {
  cursor: pointer;
}

.status-item.clickable:hover {
  background-color: var(--vscode-statusbar-hover);
}

.status-item.warning {
  color: #cca700;
}

.status-item.success {
  color: #89d185;
}

.highlight-lang {
  font-weight: 500;
}

.icon-only {
  padding: 0 6px;
}
</style>
