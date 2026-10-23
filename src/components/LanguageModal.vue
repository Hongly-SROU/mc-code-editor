<script setup lang="ts">
import { ref, computed } from 'vue';
import { SUPPORTED_LANGUAGES } from '../services/monaco';
import { Search, X, Check } from 'lucide-vue-next';

defineProps<{
  show: boolean;
  currentLanguage: string;
}>();

const emit = defineEmits<{
  (e: 'select', languageId: string): void;
  (e: 'close'): void;
}>();

const searchQuery = ref('');

const filteredLanguages = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return SUPPORTED_LANGUAGES;
  return SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(q) || lang.id.toLowerCase().includes(q)
  );
});

function selectLanguage(id: string) {
  emit('select', id);
  emit('close');
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="emit('close')">
    <div class="palette-dialog" role="dialog" aria-modal="true" aria-label="Select Language Mode">
      <div class="palette-header">
        <Search :size="16" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Select Language Mode..."
          class="palette-input"
          autofocus
          @keydown.esc="emit('close')"
        />
        <button class="close-btn" @click="emit('close')">
          <X :size="16" />
        </button>
      </div>

      <div class="languages-list">
        <div
          v-for="lang in filteredLanguages"
          :key="lang.id"
          class="language-row"
          :class="{ active: lang.id === currentLanguage }"
          @click="selectLanguage(lang.id)"
        >
          <span class="language-name">{{ lang.name }} ({{ lang.id }})</span>
          <Check v-if="lang.id === currentLanguage" :size="14" class="check-icon" />
        </div>
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
  align-items: flex-start;
  justify-content: center;
  padding-top: 60px;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.palette-dialog {
  background-color: var(--vscode-editor-bg);
  border: 1px solid var(--vscode-border);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border-radius: 6px;
  width: 90%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.palette-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--vscode-border);
  background-color: var(--vscode-input-bg);
}

.search-icon {
  color: var(--vscode-fg-muted);
}

.palette-input {
  flex: 1;
  background: none;
  border: none;
  color: var(--vscode-fg);
  font-size: 13px;
  outline: none;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--vscode-fg-muted);
  display: flex;
  align-items: center;
  padding: 4px;
}
.close-btn:hover {
  color: var(--vscode-fg);
}

.languages-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 6px 0;
}

.language-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 16px;
  cursor: pointer;
  font-size: 13px;
  color: var(--vscode-fg);
}

.language-row:hover {
  background-color: var(--vscode-list-hover);
}

.language-row.active {
  background-color: rgba(0, 122, 204, 0.2);
  color: var(--vscode-accent);
}

.check-icon {
  color: var(--vscode-accent);
}
</style>
