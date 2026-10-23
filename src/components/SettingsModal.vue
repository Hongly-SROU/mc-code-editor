<script setup lang="ts">
import { ref } from 'vue';
import type { EditorSettings } from '../types/editor';
import { X, Sliders, Info, ShieldCheck } from 'lucide-vue-next';

defineProps<{
  show: boolean;
  settings: EditorSettings;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const activeTab = ref<'editor' | 'prettier' | 'about'>('editor');
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="emit('close')">
    <div class="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="settings-header">
        <div class="header-title">
          <Sliders :size="18" />
          <h2 id="settings-title">Preferences & Settings</h2>
        </div>
        <button class="icon-btn" @click="emit('close')" aria-label="Close settings">
          <X :size="18" />
        </button>
      </div>

      <div class="settings-nav">
        <button
          class="nav-tab"
          :class="{ active: activeTab === 'editor' }"
          @click="activeTab = 'editor'"
        >
          Editor
        </button>
        <button
          class="nav-tab"
          :class="{ active: activeTab === 'prettier' }"
          @click="activeTab = 'prettier'"
        >
          Prettier Formatter
        </button>
        <button
          class="nav-tab"
          :class="{ active: activeTab === 'about' }"
          @click="activeTab = 'about'"
        >
          Browser & Security
        </button>
      </div>

      <div class="settings-content">
        <!-- Editor Tab -->
        <div v-if="activeTab === 'editor'" class="settings-section">
          <div class="setting-item">
            <div class="setting-label">
              <label for="font-size">Font Size (px)</label>
              <span class="setting-desc">Controls the font size of the editor in pixels.</span>
            </div>
            <input
              id="font-size"
              type="number"
              min="10"
              max="32"
              class="input-number"
              v-model.number="settings.fontSize"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <label for="tab-size">Tab Size</label>
              <span class="setting-desc">The number of spaces a tab is equal to.</span>
            </div>
            <select id="tab-size" class="input-select" v-model.number="settings.tabSize">
              <option :value="2">2 spaces</option>
              <option :value="4">4 spaces</option>
              <option :value="8">8 spaces</option>
            </select>
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <label for="insert-spaces">Insert Spaces</label>
              <span class="setting-desc">Insert spaces when pressing Tab.</span>
            </div>
            <input
              id="insert-spaces"
              type="checkbox"
              class="input-checkbox"
              v-model="settings.insertSpaces"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <label for="word-wrap">Word Wrap</label>
              <span class="setting-desc">Wrap lines that exceed the editor viewport width.</span>
            </div>
            <select id="word-wrap" class="input-select" v-model="settings.wordWrap">
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <label for="minimap">Minimap</label>
              <span class="setting-desc">Display an overview minimap on the right of the editor.</span>
            </div>
            <input
              id="minimap"
              type="checkbox"
              class="input-checkbox"
              v-model="settings.minimap"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <label for="line-numbers">Line Numbers</label>
              <span class="setting-desc">Controls the display of line numbers.</span>
            </div>
            <select id="line-numbers" class="input-select" v-model="settings.lineNumbers">
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </div>
        </div>

        <!-- Prettier Tab -->
        <div v-else-if="activeTab === 'prettier'" class="settings-section">
          <div class="setting-item">
            <div class="setting-label">
              <label for="prettier-semi">Semicolons</label>
              <span class="setting-desc">Print semicolons at the ends of statements.</span>
            </div>
            <input
              id="prettier-semi"
              type="checkbox"
              class="input-checkbox"
              v-model="settings.semi"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <label for="prettier-single-quote">Single Quotes</label>
              <span class="setting-desc">Use single quotes instead of double quotes where applicable.</span>
            </div>
            <input
              id="prettier-single-quote"
              type="checkbox"
              class="input-checkbox"
              v-model="settings.singleQuote"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <label for="prettier-bracket-spacing">Bracket Spacing</label>
              <span class="setting-desc">Print spaces between brackets in object literals.</span>
            </div>
            <input
              id="prettier-bracket-spacing"
              type="checkbox"
              class="input-checkbox"
              v-model="settings.bracketSpacing"
            />
          </div>

          <div class="info-callout">
            <Info :size="16" />
            <span>Prettier supports JavaScript, TypeScript, JSON, HTML, CSS, SCSS, and Markdown. Press <strong>Shift + Alt + F</strong> (or <strong>Option + Shift + F</strong>) to format active document.</span>
          </div>
        </div>

        <!-- Browser & Security Tab -->
        <div v-else class="settings-section">
          <div class="security-card">
            <div class="security-card-header">
              <ShieldCheck :size="20" class="security-icon" />
              <h3>Local Browser Architecture & Privacy</h3>
            </div>
            <p>
              This code editor operates 100% inside your browser sandbox. No source code or file data is ever uploaded or transmitted to any server.
            </p>
            <h4>Local File System Access</h4>
            <p>
              When using supported browsers (e.g. Chrome, Edge, Opera), the editor utilizes the native <code>FileSystemAccess API</code> to read and write directly to your local files with your explicit permission.
            </p>
            <p>
              On browsers without native File System Access (or in restrictive iframe sandbox environments), the editor gracefully falls back to HTML5 file input and local Blob downloads.
            </p>
          </div>
        </div>
      </div>

      <div class="settings-footer">
        <button class="btn btn-primary" @click="emit('close')">Done</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.settings-dialog {
  background-color: var(--vscode-editor-bg);
  border: 1px solid var(--vscode-border);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  width: 90%;
  max-width: 580px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-border);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--vscode-fg);
}

.header-title h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--vscode-fg-muted);
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}
.icon-btn:hover {
  color: var(--vscode-fg);
  background-color: rgba(255, 255, 255, 0.08);
}

.settings-nav {
  display: flex;
  border-bottom: 1px solid var(--vscode-border);
  background-color: var(--vscode-sidebar-bg);
  padding: 0 12px;
}

.nav-tab {
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--vscode-fg-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.nav-tab:hover {
  color: var(--vscode-fg);
}

.nav-tab.active {
  color: var(--vscode-accent);
  border-bottom-color: var(--vscode-accent);
}

.settings-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label label {
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-fg);
}

.setting-desc {
  font-size: 11px;
  color: var(--vscode-fg-muted);
}

.input-number,
.input-select {
  background-color: var(--vscode-input-bg);
  color: var(--vscode-fg);
  border: 1px solid var(--vscode-input-border);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
}

.input-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--vscode-accent);
}

.info-callout {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background-color: rgba(0, 122, 204, 0.1);
  border: 1px solid rgba(0, 122, 204, 0.3);
  border-radius: 6px;
  font-size: 12px;
  color: var(--vscode-fg);
  line-height: 1.4;
}

.security-card {
  font-size: 13px;
  line-height: 1.6;
  color: var(--vscode-fg-muted);
}

.security-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--vscode-fg);
  margin-bottom: 10px;
}

.security-icon {
  color: #89d185;
}

.security-card h3 {
  margin: 0;
  font-size: 15px;
}

.security-card h4 {
  color: var(--vscode-fg);
  margin: 14px 0 6px 0;
  font-size: 13px;
}

.settings-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--vscode-border);
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  padding: 6px 18px;
  background-color: var(--vscode-button-bg);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.btn-primary:hover {
  background-color: var(--vscode-button-hover);
}
</style>
