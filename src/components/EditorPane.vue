<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import type { EditorFile, EditorSettings, CursorPosition } from '../types/editor';
import { monaco, getOrCreateMonacoModel } from '../services/monaco';
import { useDragDrop, type DropRegion } from '../composables/useDragDrop';
import { useCodeRunner } from '../composables/useCodeRunner';
import EditorLogPanel from './EditorLogPanel.vue';
import { FilePlus, FolderOpen, Code2, Columns, Rows, ArrowRight } from 'lucide-vue-next';

const props = defineProps<{
  file: EditorFile | null;
  settings: EditorSettings;
  isActiveGroup: boolean;
  groupId: string;
  isSplit?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:content', fileId: string, content: string): void;
  (e: 'focus', groupId: string): void;
  (e: 'cursor-change', pos: CursorPosition): void;
  (e: 'new-file'): void;
  (e: 'open-file'): void;
  (e: 'save-file'): void;
  (e: 'format-file'): void;
  (e: 'execute-file', fileId: string): void;
  (
    e: 'split-drop',
    fileId: string,
    fromGroupId: string,
    direction: 'vertical' | 'horizontal',
    target: 'right' | 'bottom' | 'left' | 'top'
  ): void;
  (
    e: 'move-tab-drop',
    fileId: string,
    fromGroupId: string,
    toGroupId: string
  ): void;
}>();

const { isDraggingTab, draggedFileId, sourceGroupId, endDrag } = useDragDrop();
const currentHoverRegion = ref<DropRegion | null>(null);

// Code Execution & Log State
const {
  getExecutionState,
  setLogOpen,
  toggleLogOpen,
  clearLogs,
  runCode,
} = useCodeRunner();

const fileLogState = computed(() => {
  return props.file ? getExecutionState(props.file.id) : null;
});

function handleExecute() {
  if (props.file) {
    emit('execute-file', props.file.id);
    runCode(props.file);
  }
}


function onPaneDragOver(e: DragEvent) {
  if (!isDraggingTab.value || !editorContainer.value) return;
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }

  const rect = editorContainer.value.getBoundingClientRect();
  const relX = (e.clientX - rect.left) / rect.width;
  const relY = (e.clientY - rect.top) / rect.height;

  if (relX > 0.65) {
    currentHoverRegion.value = 'right';
  } else if (relY > 0.65) {
    currentHoverRegion.value = 'bottom';
  } else if (relX < 0.35 && props.isSplit && props.groupId === 'group-2') {
    currentHoverRegion.value = 'left';
  } else if (relY < 0.35 && props.isSplit && props.groupId === 'group-2') {
    currentHoverRegion.value = 'top';
  } else {
    currentHoverRegion.value = 'center';
  }
}

function onPaneDragLeave(e: DragEvent) {
  const currentTarget = e.currentTarget as HTMLElement;
  const relatedTarget = e.relatedTarget as HTMLElement;
  if (!currentTarget || !relatedTarget || !currentTarget.contains(relatedTarget)) {
    currentHoverRegion.value = null;
  }
}

function onPaneDrop(e: DragEvent) {
  e.preventDefault();
  const fileId = e.dataTransfer?.getData('text/plain') || draggedFileId.value;
  const fromGroup = sourceGroupId.value || props.groupId;
  const targetRegion = currentHoverRegion.value;
  currentHoverRegion.value = null;

  if (!fileId) return;

  if (targetRegion === 'right') {
    emit('split-drop', fileId, fromGroup, 'vertical', 'right');
  } else if (targetRegion === 'bottom') {
    emit('split-drop', fileId, fromGroup, 'horizontal', 'bottom');
  } else if (targetRegion === 'left') {
    emit('split-drop', fileId, fromGroup, 'vertical', 'left');
  } else if (targetRegion === 'top') {
    emit('split-drop', fileId, fromGroup, 'horizontal', 'top');
  } else if (targetRegion === 'center') {
    emit('move-tab-drop', fileId, fromGroup, props.groupId);
  }
  endDrag();
}

const editorContainer = ref<HTMLDivElement | null>(null);
let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null;
let resizeObserver: ResizeObserver | null = null;
let contentChangeDisposable: monaco.IDisposable | null = null;
let cursorChangeDisposable: monaco.IDisposable | null = null;

function initMonaco() {
  if (!editorContainer.value) return;

  editorInstance = monaco.editor.create(editorContainer.value, {
    automaticLayout: false, // We use ResizeObserver for precision
    theme: props.settings.theme === 'vs-dark' ? 'vscode-dark-custom' : 'vscode-light-custom',
    fontSize: props.settings.fontSize,
    tabSize: props.settings.tabSize,
    insertSpaces: props.settings.insertSpaces,
    wordWrap: props.settings.wordWrap,
    minimap: { enabled: props.settings.minimap },
    lineNumbers: props.settings.lineNumbers,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace",
    fontLigatures: true,
    cursorBlinking: 'smooth',
    renderLineHighlight: 'all',
    bracketPairColorization: { enabled: true },
    contextmenu: true,
  });

  // Track editor focus
  editorInstance.onDidFocusEditorText(() => {
    emit('focus', props.groupId);
  });
  editorInstance.onDidFocusEditorWidget(() => {
    emit('focus', props.groupId);
  });

  // Track cursor position
  cursorChangeDisposable = editorInstance.onDidChangeCursorPosition((e) => {
    emit('cursor-change', {
      lineNumber: e.position.lineNumber,
      column: e.position.column,
    });
  });

  // Add custom keybindings directly inside Monaco
  editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    emit('save-file');
  });

  editorInstance.addCommand(
    monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
    () => {
      emit('format-file');
    }
  );

  editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    handleExecute();
  });

  editorInstance.addCommand(monaco.KeyCode.F5, () => {
    handleExecute();
  });

  // ResizeObserver for reliable pane resizing
  resizeObserver = new ResizeObserver(() => {
    editorInstance?.layout();
  });
  resizeObserver.observe(editorContainer.value);

  // Load active file model if available
  updateEditorModel();
}

function updateEditorModel() {
  if (!editorInstance) return;

  // Clean previous content listener
  contentChangeDisposable?.dispose();
  contentChangeDisposable = null;

  if (!props.file) {
    editorInstance.setModel(null);
    return;
  }

  const model = getOrCreateMonacoModel(
    props.file.id,
    props.file.name,
    props.file.content,
    props.file.language
  );

  // If file content differs from model (e.g. from disk reload or format), update model value safely
  if (model.getValue() !== props.file.content) {
    model.setValue(props.file.content);
  }

  editorInstance.setModel(model);

  // Listen to edits in Monaco
  contentChangeDisposable = model.onDidChangeContent((e) => {
    if (e.isFlush) return;
    if (props.file && model) {
      const val = model.getValue();
      if (props.file.content !== val) {
        emit('update:content', props.file.id, val);
      }
    }
  });
}

// Watch active file changes
watch(
  () => props.file?.id,
  () => {
    updateEditorModel();
  }
);

// Watch language changes
watch(
  () => props.file?.language,
  (newLang) => {
    if (editorInstance && props.file && newLang) {
      const model = editorInstance.getModel();
      if (model && model.getLanguageId() !== newLang) {
        monaco.editor.setModelLanguage(model, newLang);
      }
    }
  }
);

// Watch content changes from outside (e.g. Prettier format)
watch(
  () => props.file?.content,
  (newContent) => {
    if (editorInstance && props.file && newContent !== undefined) {
      const model = editorInstance.getModel();
      if (model && model.getValue() !== newContent) {
        // Preserve cursor position during content update
        const state = editorInstance.saveViewState();
        model.setValue(newContent);
        if (state) {
          editorInstance.restoreViewState(state);
        }
      }
    }
  }
);

// Watch Settings changes
watch(
  () => props.settings.theme,
  (newTheme) => {
    monaco.editor.setTheme(
      newTheme === 'vs-dark' ? 'vscode-dark-custom' : 'vscode-light-custom'
    );
  }
);

watch(
  () => props.settings.fontSize,
  (newSize) => {
    editorInstance?.updateOptions({ fontSize: newSize });
  }
);

watch(
  () => props.settings.tabSize,
  (newTab) => {
    editorInstance?.updateOptions({ tabSize: newTab });
  }
);

watch(
  () => props.settings.insertSpaces,
  (newInsert) => {
    editorInstance?.updateOptions({ insertSpaces: newInsert });
  }
);

watch(
  () => props.settings.wordWrap,
  (newWrap) => {
    editorInstance?.updateOptions({ wordWrap: newWrap });
  }
);

watch(
  () => props.settings.minimap,
  (newMinimap) => {
    editorInstance?.updateOptions({ minimap: { enabled: newMinimap } });
  }
);

watch(
  () => props.settings.lineNumbers,
  (newLineNumbers) => {
    editorInstance?.updateOptions({ lineNumbers: newLineNumbers });
  }
);

onMounted(() => {
  initMonaco();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  contentChangeDisposable?.dispose();
  cursorChangeDisposable?.dispose();
  if (editorInstance) {
    editorInstance.dispose();
    editorInstance = null;
  }
});
</script>

<template>
  <div
    class="editor-pane-container"
    :class="{ 'is-active-pane': isActiveGroup }"
    @click="emit('focus', groupId)"
    @dragover="onPaneDragOver"
    @dragleave="onPaneDragLeave"
    @drop="onPaneDrop"
  >
    <!-- Monaco Editor Mount Target -->
    <div
      ref="editorContainer"
      class="monaco-host"
      :class="{ hidden: !file }"
    ></div>

    <!-- Bottom Execution Log Panel at bottom of file -->
    <EditorLogPanel
      v-if="file && fileLogState"
      :is-open="fileLogState.isOpen"
      :logs="fileLogState.logs"
      :status="fileLogState.status"
      :duration-ms="fileLogState.durationMs"
      :file-name="file.name"
      :file-id="file.id"
      @toggle-open="toggleLogOpen(file.id)"
      @close="setLogOpen(file.id, false)"
      @open="setLogOpen(file.id, true)"
      @clear="clearLogs(file.id)"
      @execute="handleExecute"
    />

    <!-- Drag & Drop Visual Split Indicator Overlay -->
    <div
      v-if="isDraggingTab && currentHoverRegion"
      class="drop-zone-overlay"
      :class="'drop-' + currentHoverRegion"
    >
      <div class="drop-zone-badge">
        <Columns
          v-if="currentHoverRegion === 'right' || currentHoverRegion === 'left'"
          :size="22"
        />
        <Rows
          v-else-if="currentHoverRegion === 'bottom' || currentHoverRegion === 'top'"
          :size="22"
        />
        <ArrowRight v-else :size="22" />
        <span>
          {{
            currentHoverRegion === 'right'
              ? 'Split Right'
              : currentHoverRegion === 'bottom'
              ? 'Split Down'
              : currentHoverRegion === 'left'
              ? 'Split Left'
              : currentHoverRegion === 'top'
              ? 'Split Top'
              : 'Open in this Editor'
          }}
        </span>
      </div>
    </div>

    <!-- Empty State when no file is active in this pane -->
    <div v-if="!file" class="empty-pane-placeholder">
      <div class="empty-pane-content">
        <Code2 :size="48" class="empty-icon" />
        <h3>No Open File</h3>
        <p>Open a file from disk, create a new file, or drag a tab here.</p>
        <div class="empty-actions">
          <button class="empty-btn" @click="emit('new-file')">
            <FilePlus :size="16" />
            <span>New File</span>
          </button>
          <button class="empty-btn secondary" @click="emit('open-file')">
            <FolderOpen :size="16" />
            <span>Open File</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-pane-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: var(--vscode-editor-bg);
}

/* Drag and Drop VS Code Overlay */
.drop-zone-overlay {
  position: absolute;
  z-index: 1000;
  pointer-events: none;
  background-color: rgba(0, 122, 204, 0.22);
  border: 2px dashed var(--vscode-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(1px);
  transition: all 0.15s ease-out;
}

.drop-zone-overlay.drop-right {
  top: 0;
  right: 0;
  width: 50%;
  height: 100%;
}

.drop-zone-overlay.drop-left {
  top: 0;
  left: 0;
  width: 50%;
  height: 100%;
}

.drop-zone-overlay.drop-bottom {
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50%;
}

.drop-zone-overlay.drop-top {
  top: 0;
  left: 0;
  width: 100%;
  height: 50%;
}

.drop-zone-overlay.drop-center {
  inset: 0;
}

.drop-zone-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--vscode-editor-bg);
  color: var(--vscode-fg);
  border: 1px solid var(--vscode-border);
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}

.monaco-host {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.monaco-host.hidden {
  display: none;
}

.empty-pane-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--vscode-editor-bg);
  user-select: none;
}

.empty-pane-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 320px;
  padding: 24px;
}

.empty-icon {
  color: var(--vscode-fg-muted);
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-pane-content h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: var(--vscode-fg);
  font-weight: 500;
}

.empty-pane-content p {
  margin: 0 0 20px 0;
  font-size: 13px;
  color: var(--vscode-fg-muted);
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  gap: 10px;
}

.empty-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--vscode-button-bg);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background-color 0.15s ease;
}

.empty-btn:hover {
  background-color: var(--vscode-button-hover);
}

.empty-btn.secondary {
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--vscode-fg);
}

.empty-btn.secondary:hover {
  background-color: rgba(255, 255, 255, 0.15);
}
</style>
