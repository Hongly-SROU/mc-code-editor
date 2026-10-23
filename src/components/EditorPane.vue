<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import type { EditorFile, EditorSettings, CursorPosition } from '../types/editor';
import { monaco, getOrCreateMonacoModel } from '../services/monaco';
import { FilePlus, FolderOpen, Code2 } from 'lucide-vue-next';

const props = defineProps<{
  file: EditorFile | null;
  settings: EditorSettings;
  isActiveGroup: boolean;
  groupId: string;
}>();

const emit = defineEmits<{
  (e: 'update:content', fileId: string, content: string): void;
  (e: 'focus', groupId: string): void;
  (e: 'cursor-change', pos: CursorPosition): void;
  (e: 'new-file'): void;
  (e: 'open-file'): void;
  (e: 'save-file'): void;
  (e: 'format-file'): void;
}>();

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
  contentChangeDisposable = model.onDidChangeContent(() => {
    if (props.file && model) {
      const val = model.getValue();
      emit('update:content', props.file.id, val);
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
  >
    <!-- Monaco Editor Mount Target -->
    <div
      ref="editorContainer"
      class="monaco-host"
      :class="{ hidden: !file }"
    ></div>

    <!-- Empty State when no file is active in this pane -->
    <div v-if="!file" class="empty-pane-placeholder">
      <div class="empty-pane-content">
        <Code2 :size="48" class="empty-icon" />
        <h3>No Open File</h3>
        <p>Select a file from the explorer, open a file from disk, or create a new file.</p>
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

.monaco-host {
  width: 100%;
  height: 100%;
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
