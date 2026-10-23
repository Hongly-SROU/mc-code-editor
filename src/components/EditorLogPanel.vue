<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { LogEntry, ExecutionStatus, LogLevel } from '../types/editor';
import {
  Terminal,
  Play,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  logs: LogEntry[];
  status: ExecutionStatus;
  durationMs: number | null;
  fileName: string;
  fileId: string;
}>();

const emit = defineEmits<{
  (e: 'toggle-open'): void;
  (e: 'close'): void;
  (e: 'open'): void;
  (e: 'clear'): void;
  (e: 'execute'): void;
}>();

// Panel Height and Resizing
const panelHeight = ref(210);
const isMaximized = ref(false);
const isDraggingResize = ref(false);
const startY = ref(0);
const startHeight = ref(210);

const logListRef = ref<HTMLDivElement | null>(null);
const activeFilter = ref<'all' | 'error' | 'warn' | 'log'>('all');
const copied = ref(false);

// Auto-scroll when logs change
watch(
  () => props.logs.length,
  () => {
    if (props.isOpen) {
      nextTick(() => {
        if (logListRef.value) {
          logListRef.value.scrollTop = logListRef.value.scrollHeight;
        }
      });
    }
  }
);

// Drag to resize log panel
function onResizeStart(e: MouseEvent) {
  e.preventDefault();
  isDraggingResize.value = true;
  startY.value = e.clientY;
  startHeight.value = panelHeight.value;

  window.addEventListener('mousemove', onResizeMove);
  window.addEventListener('mouseup', onResizeEnd);
}

function onResizeMove(e: MouseEvent) {
  if (!isDraggingResize.value) return;
  const delta = startY.value - e.clientY;
  const newHeight = Math.min(Math.max(startHeight.value + delta, 120), 550);
  panelHeight.value = newHeight;
  isMaximized.value = false;
}

function onResizeEnd() {
  isDraggingResize.value = false;
  window.removeEventListener('mousemove', onResizeMove);
  window.removeEventListener('mouseup', onResizeEnd);
}

function toggleMaximize() {
  isMaximized.value = !isMaximized.value;
}

// Filtered logs
const filteredLogs = computed(() => {
  if (activeFilter.value === 'all') return props.logs;
  if (activeFilter.value === 'error') return props.logs.filter((l) => l.type === 'error');
  if (activeFilter.value === 'warn') return props.logs.filter((l) => l.type === 'warn');
  return props.logs.filter((l) => l.type === 'log' || l.type === 'info' || l.type === 'result');
});

const errorCount = computed(() => props.logs.filter((l) => l.type === 'error').length);
const warnCount = computed(() => props.logs.filter((l) => l.type === 'warn').length);

async function copyAllLogs() {
  const text = props.logs
    .map((l) => `[${formatTime(l.timestamp)}] [${l.type.toUpperCase()}] ${l.message}`)
    .join('\n');
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // clipboard fallback
  }
}

function formatTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toTimeString().split(' ')[0] || '';
}

function getLogIcon(type: LogLevel) {
  switch (type) {
    case 'error':
      return AlertCircle;
    case 'warn':
      return AlertTriangle;
    case 'info':
      return Info;
    case 'result':
      return CheckCircle2;
    default:
      return null;
  }
}
</script>

<template>
  <div
    class="log-panel-wrapper"
    :class="{
      'is-open': isOpen,
      'is-maximized': isMaximized && isOpen,
      'is-resizing': isDraggingResize,
    }"
    :style="isOpen ? (isMaximized ? { height: '80%' } : { height: `${panelHeight}px` }) : {}"
  >
    <!-- Collapsed Slim Bar (when closed) -->
    <div
      v-if="!isOpen"
      class="log-collapsed-bar"
      @click="emit('open')"
      title="Click to open execution log"
    >
      <div class="collapsed-left">
        <div class="terminal-badge">
          <Terminal :size="13" />
          <span class="bar-title">Output</span>
        </div>

        <!-- Last Execution Status Indicator -->
        <div v-if="status === 'running'" class="collapsed-status running">
          <Loader2 :size="12" class="spin" />
          <span>Executing {{ fileName }}...</span>
        </div>
        <div v-else-if="status === 'success'" class="collapsed-status success">
          <CheckCircle2 :size="12" />
          <span>Done ({{ durationMs }}ms)</span>
        </div>
        <div v-else-if="status === 'error'" class="collapsed-status error">
          <AlertCircle :size="12" />
          <span>Failed ({{ errorCount }} error{{ errorCount > 1 ? 's' : '' }})</span>
        </div>
        <div v-else class="collapsed-status idle">
          <span>Ready</span>
        </div>

        <!-- Badges if any -->
        <span v-if="errorCount > 0" class="mini-badge error">{{ errorCount }}</span>
        <span v-if="warnCount > 0" class="mini-badge warn">{{ warnCount }}</span>
      </div>

      <div class="collapsed-right" @click.stop>
        <button
          class="bar-btn run-quick-btn"
          title="Execute file (Ctrl+Enter)"
          :disabled="status === 'running'"
          @click="emit('execute')"
        >
          <Play :size="12" />
          <span>Execute</span>
        </button>

        <button
          class="bar-btn toggle-open-btn"
          title="Open Log Panel"
          @click="emit('open')"
        >
          <ChevronUp :size="14" />
          <span>Show Log</span>
        </button>
      </div>
    </div>

    <!-- Expanded Log Console (when open) -->
    <div v-else class="log-expanded-panel">
      <!-- Top Resize Handle -->
      <div
        class="panel-resize-handle"
        title="Drag to resize console height"
        @mousedown="onResizeStart"
      >
        <div class="handle-bar"></div>
      </div>

      <!-- Panel Header Bar -->
      <div class="panel-header">
        <div class="header-left">
          <button
            class="header-icon-btn collapse-btn"
            title="Collapse log panel"
            @click="emit('close')"
          >
            <ChevronDown :size="14" />
          </button>

          <div class="header-title">
            <Terminal :size="14" class="title-icon" />
            <span>Output</span>
            <span class="file-tag">{{ fileName }}</span>
          </div>

          <!-- Status Indicator -->
          <div class="status-chip" :class="status">
            <template v-if="status === 'running'">
              <Loader2 :size="12" class="spin" />
              <span>Running...</span>
            </template>
            <template v-else-if="status === 'success'">
              <Check :size="12" />
              <span>Completed {{ durationMs !== null ? `(${durationMs}ms)` : '' }}</span>
            </template>
            <template v-else-if="status === 'error'">
              <AlertCircle :size="12" />
              <span>Failed {{ durationMs !== null ? `(${durationMs}ms)` : '' }}</span>
            </template>
            <template v-else>
              <span>Idle</span>
            </template>
          </div>

          <!-- Quick Filters -->
          <div class="filter-tabs">
            <button
              class="filter-tab"
              :class="{ active: activeFilter === 'all' }"
              @click="activeFilter = 'all'"
            >
              All ({{ logs.length }})
            </button>
            <button
              v-if="errorCount > 0"
              class="filter-tab error-tab"
              :class="{ active: activeFilter === 'error' }"
              @click="activeFilter = 'error'"
            >
              <AlertCircle :size="11" />
              <span>{{ errorCount }}</span>
            </button>
            <button
              v-if="warnCount > 0"
              class="filter-tab warn-tab"
              :class="{ active: activeFilter === 'warn' }"
              @click="activeFilter = 'warn'"
            >
              <AlertTriangle :size="11" />
              <span>{{ warnCount }}</span>
            </button>
          </div>
        </div>

        <!-- Header Actions -->
        <div class="header-actions">
          <button
            class="header-btn execute-btn"
            :disabled="status === 'running'"
            title="Execute file (Ctrl+Enter)"
            @click="emit('execute')"
          >
            <Play v-if="status !== 'running'" :size="13" />
            <Loader2 v-else :size="13" class="spin" />
            <span>{{ status === 'running' ? 'Running' : 'Run' }}</span>
          </button>

          <button
            class="header-btn"
            :disabled="logs.length === 0"
            :title="copied ? 'Copied!' : 'Copy output'"
            @click="copyAllLogs"
          >
            <Check v-if="copied" :size="13" class="success-icon" />
            <Copy v-else :size="13" />
          </button>

          <button
            class="header-btn"
            :disabled="logs.length === 0"
            title="Clear logs"
            @click="emit('clear')"
          >
            <Trash2 :size="13" />
          </button>

          <button
            class="header-btn"
            :title="isMaximized ? 'Restore height' : 'Maximize panel'"
            @click="toggleMaximize"
          >
            <Minimize2 v-if="isMaximized" :size="13" />
            <Maximize2 v-else :size="13" />
          </button>

          <button
            class="header-btn close-btn"
            title="Close log panel"
            @click="emit('close')"
          >
            <X :size="14" />
          </button>
        </div>
      </div>

      <!-- Log Content List -->
      <div ref="logListRef" class="log-body">
        <template v-if="filteredLogs.length > 0">
          <div
            v-for="log in filteredLogs"
            :key="log.id"
            class="log-row"
            :class="'log-' + log.type"
          >
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>

            <span class="log-level-badge" :class="'badge-' + log.type">
              <component
                :is="getLogIcon(log.type)"
                v-if="getLogIcon(log.type)"
                :size="11"
                class="level-icon"
              />
              {{ log.type.toUpperCase() }}
            </span>

            <div class="log-content">
              <pre class="log-text">{{ log.message }}</pre>
            </div>
          </div>
        </template>

        <!-- Empty State -->
        <div v-else class="log-empty-state">
          <Terminal :size="32" class="empty-icon" />
          <div class="empty-text">
            <span class="primary">No output generated yet</span>
            <span class="secondary">
              Click <strong>Execute</strong> or press <strong>Ctrl+Enter</strong> to run
              <code>{{ fileName }}</code>.
            </span>
          </div>
          <button
            class="empty-run-btn"
            :disabled="status === 'running'"
            @click="emit('execute')"
          >
            <Play :size="13" />
            <span>Execute Now</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.log-panel-wrapper {
  width: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--vscode-editor-bg);
  border-top: 1px solid var(--vscode-border);
  position: relative;
  z-index: 20;
}

.log-panel-wrapper.is-resizing {
  user-select: none;
}

/* Collapsed Bar */
.log-collapsed-bar {
  height: 27px;
  background-color: var(--vscode-toolbar-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  cursor: pointer;
  user-select: none;
  border-top: 1px solid var(--vscode-border);
  transition: background-color 0.15s ease;
}

.log-collapsed-bar:hover {
  background-color: var(--vscode-toolbar-hover);
}

.collapsed-left {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
}

.terminal-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  color: var(--vscode-fg);
}

.collapsed-status {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
}

.collapsed-status.running {
  color: #75beff;
  background-color: rgba(117, 190, 255, 0.12);
}

.collapsed-status.success {
  color: #73c991;
  background-color: rgba(115, 201, 145, 0.12);
}

.collapsed-status.error {
  color: #f14c4c;
  background-color: rgba(241, 76, 76, 0.12);
}

.collapsed-status.idle {
  color: var(--vscode-fg-muted);
}

.mini-badge {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 9px;
  font-weight: 600;
}

.mini-badge.error {
  background-color: rgba(241, 76, 76, 0.2);
  color: #f14c4c;
}

.mini-badge.warn {
  background-color: rgba(204, 167, 0, 0.2);
  color: #cca700;
}

.collapsed-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--vscode-fg-muted);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bar-btn:hover {
  background-color: var(--vscode-toolbar-active);
  color: var(--vscode-fg);
}

.run-quick-btn {
  background-color: rgba(46, 160, 67, 0.15);
  border-color: rgba(46, 160, 67, 0.35);
  color: #4ac26b;
  font-weight: 600;
}

.run-quick-btn:hover {
  background-color: rgba(46, 160, 67, 0.3);
  color: #63e6be;
}

/* Expanded Panel */
.log-expanded-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

/* Resize Handle */
.panel-resize-handle {
  height: 5px;
  width: 100%;
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  background-color: transparent;
  transition: background-color 0.15s;
}

.panel-resize-handle:hover,
.log-panel-wrapper.is-resizing .panel-resize-handle {
  background-color: var(--vscode-accent);
}

.handle-bar {
  width: 32px;
  height: 2px;
  background-color: var(--vscode-border);
  border-radius: 1px;
}

/* Panel Header */
.panel-header {
  height: 32px;
  background-color: var(--vscode-toolbar-bg);
  border-bottom: 1px solid var(--vscode-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  user-select: none;
  flex-shrink: 0;
  margin-top: 2px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.collapse-btn {
  color: var(--vscode-fg-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 2px;
  border-radius: 3px;
}

.collapse-btn:hover {
  color: var(--vscode-fg);
  background-color: var(--vscode-toolbar-hover);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vscode-fg);
}

.title-icon {
  color: #75beff;
}

.file-tag {
  color: var(--vscode-fg-muted);
  font-size: 11px;
  font-weight: normal;
  padding: 0 4px;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}

.status-chip.running {
  background-color: rgba(117, 190, 255, 0.15);
  color: #75beff;
}

.status-chip.success {
  background-color: rgba(115, 201, 145, 0.15);
  color: #73c991;
}

.status-chip.error {
  background-color: rgba(241, 76, 76, 0.15);
  color: #f14c4c;
}

.status-chip.idle {
  color: var(--vscode-fg-muted);
}

.filter-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 6px;
}

.filter-tab {
  background: none;
  border: none;
  color: var(--vscode-fg-muted);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
  transition: all 0.15s;
}

.filter-tab:hover {
  color: var(--vscode-fg);
  background-color: var(--vscode-toolbar-hover);
}

.filter-tab.active {
  background-color: var(--vscode-toolbar-active);
  color: var(--vscode-fg);
  font-weight: 600;
}

.filter-tab.error-tab {
  color: #f14c4c;
}

.filter-tab.warn-tab {
  color: #cca700;
}

/* Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--vscode-fg-muted);
  padding: 4px 6px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.15s ease;
}

.header-btn:hover:not(:disabled) {
  background-color: var(--vscode-toolbar-hover);
  color: var(--vscode-fg);
}

.header-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.execute-btn {
  background-color: rgba(46, 160, 67, 0.18);
  border: 1px solid rgba(46, 160, 67, 0.35);
  color: #4ac26b;
  font-weight: 600;
  padding: 3px 8px;
}

.execute-btn:hover:not(:disabled) {
  background-color: rgba(46, 160, 67, 0.32);
  color: #63e6be;
}

.header-btn.close-btn:hover {
  color: #f14c4c;
}

.success-icon {
  color: #73c991;
}

/* Log Content Body */
.log-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 6px 12px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  background-color: var(--vscode-editor-bg);
}

.log-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 3px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.log-time {
  color: var(--vscode-fg-muted);
  font-size: 11px;
  flex-shrink: 0;
  user-select: none;
}

.log-level-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 2px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 3px;
  user-select: none;
  letter-spacing: 0.5px;
}

.badge-log {
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--vscode-fg);
}

.badge-info {
  background-color: rgba(117, 190, 255, 0.15);
  color: #75beff;
}

.badge-warn {
  background-color: rgba(204, 167, 0, 0.2);
  color: #cca700;
}

.badge-error {
  background-color: rgba(241, 76, 76, 0.25);
  color: #f14c4c;
}

.badge-system {
  background-color: rgba(160, 160, 160, 0.12);
  color: var(--vscode-fg-muted);
}

.badge-result {
  background-color: rgba(115, 201, 145, 0.2);
  color: #73c991;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-text {
  margin: 0;
  font-family: inherit;
  font-size: inherit;
  white-space: pre-wrap;
  word-break: break-word;
}

.log-log .log-text {
  color: var(--vscode-fg);
}

.log-info .log-text {
  color: #9cdcfe;
}

.log-warn .log-text {
  color: #dcdcaa;
}

.log-error .log-text {
  color: #f48771;
}

.log-system .log-text {
  color: var(--vscode-fg-muted);
  font-style: italic;
}

.log-result .log-text {
  color: #4ec9b0;
  font-weight: 600;
}

/* Empty State */
.log-empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--vscode-fg-muted);
  text-align: center;
  padding: 20px 0;
}

.empty-icon {
  opacity: 0.3;
}

.empty-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
}

.empty-text .primary {
  font-weight: 600;
  color: var(--vscode-fg);
}

.empty-text strong {
  color: var(--vscode-fg);
}

.empty-text code {
  color: #75beff;
}

.empty-run-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--vscode-button-bg);
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
  margin-top: 6px;
}

.empty-run-btn:hover {
  background-color: var(--vscode-button-hover);
}

.spin {
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
</style>

