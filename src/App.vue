<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useSettings } from './composables/useSettings';
import { useToast } from './composables/useToast';
import { useEditorFiles } from './composables/useEditorFiles';
import { useEditorGroups } from './composables/useEditorGroups';
import { formatCode } from './services/formatter';
import { LANGUAGE_TO_EXTENSION } from './services/languages';
import type { CursorPosition, EditorFile } from './types/editor';

import EditorToolbar from './components/EditorToolbar.vue';
import EditorTabs from './components/EditorTabs.vue';
import EditorPane from './components/EditorPane.vue';
import StatusBar from './components/StatusBar.vue';
import SettingsModal from './components/SettingsModal.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import LanguageModal from './components/LanguageModal.vue';
import ToastContainer from './components/ToastContainer.vue';

// Composables
const { settings, toggleTheme, toggleMinimap, toggleWordWrap } = useSettings();
const { success, warning, info } = useToast();
const {
  files,
  getFileById,
  createFile,
  openFiles,
  saveFile,
  updateContent,
  setLanguage,
  renameFile,
  requestCloseFile,
  pendingCloseFile,
  confirmCloseSave,
  confirmCloseDiscard,
  cancelClose,
} = useEditorFiles();

// Initialize groups with initial files
const {
  splitDirection,
  splitRatio,
  activeGroupId,
  group1,
  group2,
  isSplit,
  setActiveGroup,
  splitEditor,
  splitWithDraggedFile,
  moveTab,
  closeSplit,
  openFileInGroup,
  closeTabInGroup,
  moveTabToOtherGroup,
  removeFileFromAllGroups,
  updateSplitRatio,
} = useEditorGroups(files.value.map((f) => f.id));

// UI states
const showSettings = ref(false);
const showLanguageModal = ref(false);
const currentCursor = ref<CursorPosition>({ lineNumber: 1, column: 1 });

// Helper to resolve files open in each group
const group1Files = computed(() => {
  return group1.value.fileIds
    .map((id) => getFileById(id))
    .filter((f): f is EditorFile => f !== undefined);
});

const group2Files = computed(() => {
  return group2.value.fileIds
    .map((id) => getFileById(id))
    .filter((f): f is EditorFile => f !== undefined);
});

// Currently active file in each group
const activeFile1 = computed(() => {
  return group1.value.activeFileId
    ? getFileById(group1.value.activeFileId) || null
    : null;
});

const activeFile2 = computed(() => {
  return group2.value.activeFileId
    ? getFileById(group2.value.activeFileId) || null
    : null;
});

// Currently focused editor group file
const currentFocusedFile = computed(() => {
  if (activeGroupId.value === 'group-2' && isSplit.value) {
    return activeFile2.value;
  }
  return activeFile1.value;
});

// Resizing split panes logic
const editorAreaRef = ref<HTMLDivElement | null>(null);
const isDraggingDivider = ref(false);

function startDividerDrag(e: MouseEvent) {
  e.preventDefault();
  isDraggingDivider.value = true;
  window.addEventListener('mousemove', onDividerMouseMove);
  window.addEventListener('mouseup', stopDividerDrag);
}

function onDividerMouseMove(e: MouseEvent) {
  if (!isDraggingDivider.value || !editorAreaRef.value) return;

  const rect = editorAreaRef.value.getBoundingClientRect();
  if (splitDirection.value === 'vertical') {
    const offset = e.clientX - rect.left;
    const ratio = (offset / rect.width) * 100;
    updateSplitRatio(ratio);
  } else if (splitDirection.value === 'horizontal') {
    const offset = e.clientY - rect.top;
    const ratio = (offset / rect.height) * 100;
    updateSplitRatio(ratio);
  }
}

function stopDividerDrag() {
  isDraggingDivider.value = false;
  window.removeEventListener('mousemove', onDividerMouseMove);
  window.removeEventListener('mouseup', stopDividerDrag);
}

// User Actions
function handleNewFile(targetGroupId?: string) {
  const newFile = createFile();
  const destGroup = targetGroupId || activeGroupId.value;
  openFileInGroup(newFile.id, destGroup);
  info(`Created ${newFile.name}`);
}

function handleSplit(direction: 'vertical' | 'horizontal') {
  if (isSplit.value) {
    splitDirection.value = direction;
    return;
  }

  // If group 1 has multiple files, move one to group 2
  if (group1.value.fileIds.length > 1) {
    const fileToMove = group1.value.fileIds[group1.value.fileIds.length - 1];
    splitWithDraggedFile(fileToMove, 'group-1', direction, 'right');
  } else {
    // Only 1 file exists: create a fresh independent file for group 2 so they do not overwrite!
    const newFile = createFile();
    splitEditor(direction, newFile.id);
  }
}

function handleSplitDrop(
  fileId: string,
  fromGroupId: string,
  direction: 'vertical' | 'horizontal',
  target: 'right' | 'bottom' | 'left' | 'top'
) {
  splitWithDraggedFile(fileId, fromGroupId, direction, target);

  // If source group has no files remaining, provide a new file so it is not empty
  const sourceGroup = fromGroupId === 'group-1' ? group1.value : group2.value;
  if (sourceGroup.fileIds.length === 0) {
    const newFile = createFile();
    openFileInGroup(newFile.id, fromGroupId);
  }

  const fileName = getFileById(fileId)?.name || 'file';
  success(`Split editor with ${fileName}`);
}

function handleMoveTabDrop(
  fileId: string,
  fromGroupId: string,
  toGroupId: string
) {
  moveTab(fileId, fromGroupId, toGroupId);
}

async function handleOpenFile() {
  const opened = await openFiles();
  if (opened.length > 0) {
    // Open the first newly loaded file in active group
    openFileInGroup(opened[0].id, activeGroupId.value);
  }
}

async function handleSaveFile(forceSaveAs = false) {
  const file = currentFocusedFile.value;
  if (!file) return;
  await saveFile(file.id, forceSaveAs);
}

async function handleFormatCode() {
  const file = currentFocusedFile.value;
  if (!file) return;

  const result = await formatCode(file.content, file.language, settings.value);
  if (result.success && result.formatted !== undefined) {
    updateContent(file.id, result.formatted);
    success(`Formatted ${file.name}`);
  } else {
    warning(result.error || 'Formatting not supported for this file type');
  }
}

async function handleCloseTab(fileId: string, groupId: string) {
  // Check if file is open in another group as well
  const otherGroup = groupId === 'group-1' ? group2.value : group1.value;
  const isOpenInOther = isSplit.value && otherGroup.fileIds.includes(fileId);

  if (isOpenInOther) {
    // Just close this tab in this group, file remains open in other group
    closeTabInGroup(fileId, groupId);
  } else {
    // Last view of this file: request close with dirty check
    const closed = await requestCloseFile(fileId);
    if (closed) {
      removeFileFromAllGroups(fileId);
    }
  }
}

function handleSelectTab(fileId: string, groupId: string) {
  setActiveGroup(groupId);
  openFileInGroup(fileId, groupId);
}

function handleMoveTab(fileId: string, fromGroupId: string) {
  moveTabToOtherGroup(fileId, fromGroupId);
}

function handleCloseGroup(groupId: string) {
  if (groupId === 'group-2') {
    closeSplit();
  } else {
    // If closing group 1, move remaining files to group 1 then close split
    group1.value.fileIds = [...group2.value.fileIds];
    group1.value.activeFileId = group2.value.activeFileId;
    closeSplit();
  }
}

function handleRenameFile(fileId: string, newName: string) {
  renameFile(fileId, newName);
}

function handleLanguageChange(languageId: string) {
  const file = currentFocusedFile.value;
  if (!file) return;
  setLanguage(file.id, languageId);
  const newExt = LANGUAGE_TO_EXTENSION[languageId];
  if (newExt) {
    const dotIdx = file.name.lastIndexOf('.');
    const base = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
    file.name = `${base}.${newExt}`;
  }
  success(`Changed language to ${languageId}`);
}

function handlePaneFocus(groupId: string) {
  setActiveGroup(groupId);
}

function handleCursorChange(pos: CursorPosition) {
  currentCursor.value = pos;
}

// Global Keyboard Shortcuts
function handleGlobalKeydown(e: KeyboardEvent) {
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const mod = isMac ? e.metaKey : e.ctrlKey;

  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault();
    handleSaveFile(e.shiftKey);
  } else if (mod && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    handleNewFile();
  } else if (mod && e.key.toLowerCase() === 'o') {
    e.preventDefault();
    handleOpenFile();
  } else if (mod && e.key.toLowerCase() === 'w') {
    e.preventDefault();
    const activeId = activeGroupId.value === 'group-2' ? group2.value.activeFileId : group1.value.activeFileId;
    if (activeId) {
      handleCloseTab(activeId, activeGroupId.value);
    }
  } else if (mod && e.key === '\\') {
    e.preventDefault();
    if (isSplit.value) {
      closeSplit();
    } else {
      handleSplit('vertical');
    }
  } else if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    handleFormatCode();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  stopDividerDrag();
});
</script>

<template>
  <div class="app-layout" :class="{ 'dragging-resizer': isDraggingDivider }">
    <!-- Top Toolbar -->
    <EditorToolbar
      :active-file="currentFocusedFile"
      :split-direction="splitDirection"
      :word-wrap="settings.wordWrap"
      :minimap="settings.minimap"
      :theme="settings.theme"
      @new-file="() => handleNewFile(activeGroupId)"
      @open-file="handleOpenFile"
      @save-file="handleSaveFile"
      @format-code="handleFormatCode"
      @split="handleSplit"
      @close-split="closeSplit"
      @toggle-theme="toggleTheme"
      @toggle-wordwrap="toggleWordWrap"
      @toggle-minimap="toggleMinimap"
      @open-settings="showSettings = true"
      @rename-file="handleRenameFile"
    />

    <!-- Main Workspace -->
    <main class="workspace">
      <!-- Editor Canvas: Single or Split Panes -->
      <div
        ref="editorAreaRef"
        class="editor-area"
        :class="[
          'split-' + splitDirection,
          { 'is-split': isSplit },
        ]"
      >
        <!-- Editor Pane 1 -->
        <div
          class="editor-group-wrapper pane-1"
          :class="{ 'group-active': activeGroupId === 'group-1' }"
          :style="
            isSplit
              ? splitDirection === 'vertical'
                ? { width: `${splitRatio}%` }
                : { height: `${splitRatio}%` }
              : { width: '100%', height: '100%' }
          "
        >
          <EditorTabs
            :group-id="'group-1'"
            :files="group1Files"
            :active-file-id="group1.activeFileId"
            :is-split="isSplit"
            @select-tab="(id) => handleSelectTab(id, 'group-1')"
            @close-tab="(id) => handleCloseTab(id, 'group-1')"
            @move-tab="(id) => handleMoveTab(id, 'group-1')"
            @move-tab-drop="handleMoveTabDrop"
            @rename-file="handleRenameFile"
            @new-file="() => handleNewFile('group-1')"
            @close-group="handleCloseGroup"
          />

          <div class="pane-editor-body">
            <EditorPane
              :group-id="'group-1'"
              :file="activeFile1"
              :settings="settings"
              :is-active-group="activeGroupId === 'group-1'"
              :is-split="isSplit"
              @update:content="updateContent"
              @focus="handlePaneFocus"
              @cursor-change="handleCursorChange"
              @new-file="() => handleNewFile('group-1')"
              @open-file="handleOpenFile"
              @save-file="handleSaveFile(false)"
              @format-file="handleFormatCode"
              @split-drop="handleSplitDrop"
              @move-tab-drop="handleMoveTabDrop"
            />
          </div>
        </div>

        <!-- Draggable Resizer Divider (when split) -->
        <div
          v-if="isSplit"
          class="split-divider"
          :class="'divider-' + splitDirection"
          @mousedown="startDividerDrag"
        >
          <div class="divider-handle"></div>
        </div>

        <!-- Editor Pane 2 (when split) -->
        <div
          v-if="isSplit"
          class="editor-group-wrapper pane-2"
          :class="{ 'group-active': activeGroupId === 'group-2' }"
          :style="
            splitDirection === 'vertical'
              ? { width: `calc(${100 - splitRatio}% - 4px)` }
              : { height: `calc(${100 - splitRatio}% - 4px)` }
          "
        >
          <EditorTabs
            :group-id="'group-2'"
            :files="group2Files"
            :active-file-id="group2.activeFileId"
            :is-split="isSplit"
            @select-tab="(id) => handleSelectTab(id, 'group-2')"
            @close-tab="(id) => handleCloseTab(id, 'group-2')"
            @move-tab="(id) => handleMoveTab(id, 'group-2')"
            @move-tab-drop="handleMoveTabDrop"
            @rename-file="handleRenameFile"
            @new-file="() => handleNewFile('group-2')"
            @close-group="handleCloseGroup"
          />

          <div class="pane-editor-body">
            <EditorPane
              :group-id="'group-2'"
              :file="activeFile2"
              :settings="settings"
              :is-active-group="activeGroupId === 'group-2'"
              :is-split="isSplit"
              @update:content="updateContent"
              @focus="handlePaneFocus"
              @cursor-change="handleCursorChange"
              @new-file="() => handleNewFile('group-2')"
              @open-file="handleOpenFile"
              @save-file="handleSaveFile(false)"
              @format-file="handleFormatCode"
              @split-drop="handleSplitDrop"
              @move-tab-drop="handleMoveTabDrop"
            />
          </div>
        </div>
      </div>
    </main>

    <!-- Bottom Status Bar -->
    <StatusBar
      :active-file="currentFocusedFile"
      :cursor="currentCursor"
      :settings="settings"
      @open-language-modal="showLanguageModal = true"
      @toggle-theme="toggleTheme"
      @open-settings="showSettings = true"
    />

    <!-- Modals & Overlays -->
    <SettingsModal
      :show="showSettings"
      :settings="settings"
      @close="showSettings = false"
    />

    <ConfirmModal
      :show="pendingCloseFile !== null"
      :file-name="pendingCloseFile ? pendingCloseFile.name : ''"
      @save="confirmCloseSave"
      @discard="confirmCloseDiscard"
      @cancel="cancelClose"
    />

    <LanguageModal
      :show="showLanguageModal"
      :current-language="currentFocusedFile ? currentFocusedFile.language : 'plaintext'"
      @select="handleLanguageChange"
      @close="showLanguageModal = false"
    />

    <ToastContainer />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--vscode-bg);
}

.dragging-resizer {
  user-select: none;
  cursor: col-resize;
}

.workspace {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.editor-area {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.editor-area.split-vertical {
  flex-direction: row;
}

.editor-area.split-horizontal {
  flex-direction: column;
}

.editor-group-wrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  border-right: 1px solid var(--vscode-border);
}

.editor-group-wrapper:last-child {
  border-right: none;
}

.pane-editor-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Split Divider Styling */
.split-divider {
  position: relative;
  background-color: var(--vscode-border);
  z-index: 10;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.divider-vertical {
  width: 4px;
  height: 100%;
  cursor: col-resize;
}

.divider-horizontal {
  height: 4px;
  width: 100%;
  cursor: row-resize;
}

.split-divider:hover,
.dragging-resizer .split-divider {
  background-color: var(--vscode-accent);
}

.divider-handle {
  position: absolute;
  inset: -2px;
}
</style>
