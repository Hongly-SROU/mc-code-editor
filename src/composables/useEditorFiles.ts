import { ref } from 'vue';
import type { EditorFile } from '../types/editor';
import { detectLanguage, disposeMonacoModel } from '../services/monaco';
import { normalizeFileName } from '../services/languages';
import { openLocalFiles, saveLocalFile } from '../services/fileSystem';
import { useToast } from './useToast';

let untitledCounter = 1;

function generateId(): string {
  return 'file_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

const initialFiles: EditorFile[] = [
  {
    id: 'file_index',
    name: 'index.ts',
    language: 'typescript',
    isDirty: false,
    content: '// Welcome to MC Code Editor!\n',
  },
];

export function useEditorFiles() {
  const { success, error } = useToast();
  const files = ref<EditorFile[]>([...initialFiles]);

  // Dialog state for confirming unsaved changes
  const pendingCloseFile = ref<EditorFile | null>(null);
  const pendingCloseCallback = ref<((discard: boolean) => void) | null>(null);

  function getFileById(id: string): EditorFile | undefined {
    return files.value.find((f) => f.id === id);
  }

  function createFile(
    name?: string,
    content = '',
    language?: string
  ): EditorFile {
    const finalName = name || `Untitled-${untitledCounter++}.ts`;
    const finalLang = language || detectLanguage(finalName);
    const newFile: EditorFile = {
      id: generateId(),
      name: finalName,
      content,
      language: finalLang,
      isDirty: false,
      fileHandle: null,
      lastModified: Date.now(),
    };
    files.value.push(newFile);
    return newFile;
  }

  async function openFiles(): Promise<EditorFile[]> {
    try {
      const opened = await openLocalFiles();
      if (opened.length === 0) return [];

      const newFiles: EditorFile[] = [];
      for (const item of opened) {
        // Check if file is already open by same handle or name
        const existing = files.value.find(
          (f) =>
            (f.fileHandle && item.fileHandle && f.fileHandle === item.fileHandle) ||
            (!f.fileHandle && f.name === item.name && f.content === item.content)
        );

        if (existing) {
          newFiles.push(existing);
          continue;
        }

        const file: EditorFile = {
          id: generateId(),
          name: item.name,
          content: item.content,
          language: detectLanguage(item.name),
          isDirty: false,
          fileHandle: item.fileHandle,
          lastModified: Date.now(),
        };

        files.value.push(file);
        newFiles.push(file);
      }

      success(`Opened ${opened.length} file${opened.length > 1 ? 's' : ''}`);
      return newFiles;
    } catch (err: unknown) {
      error(`Failed to open file: ${(err as Error).message}`);
      return [];
    }
  }

  async function saveFile(
    fileId: string,
    forceSaveAs = false
  ): Promise<boolean> {
    const file = getFileById(fileId);
    if (!file) return false;

    try {
      const res = await saveLocalFile(file, forceSaveAs);
      if (res.cancelled) {
        return false;
      }
      if (!res.success) {
        error(res.error || 'Failed to save file');
        return false;
      }

      // Update file metadata
      if (res.name) {
        file.name = res.name;
        file.language = detectLanguage(res.name);
      }
      if (res.handle !== undefined) {
        file.fileHandle = res.handle;
      }
      file.isDirty = false;
      file.lastModified = Date.now();

      success(`Saved ${file.name}`);
      return true;
    } catch (err: unknown) {
      error(`Save failed: ${(err as Error).message}`);
      return false;
    }
  }

  function updateContent(fileId: string, newContent: string) {
    const file = getFileById(fileId);
    if (!file) return;

    if (file.content !== newContent) {
      file.content = newContent;
      file.isDirty = true;
    }
  }

  function setLanguage(fileId: string, language: string) {
    const file = getFileById(fileId);
    if (!file) return;
    file.language = language;
  }

  function removeFileDirectly(fileId: string) {
    const idx = files.value.findIndex((f) => f.id === fileId);
    if (idx !== -1) {
      files.value.splice(idx, 1);
      disposeMonacoModel(fileId);
    }
  }

  /**
   * Request close of a file. If dirty, triggers confirmation prompt.
   * Resolves to true if file was closed, false if cancelled.
   */
  function requestCloseFile(fileId: string): Promise<boolean> {
    const file = getFileById(fileId);
    if (!file) return Promise.resolve(true);

    if (!file.isDirty) {
      removeFileDirectly(fileId);
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      pendingCloseFile.value = file;
      pendingCloseCallback.value = (discard: boolean) => {
        if (discard) {
          removeFileDirectly(fileId);
          resolve(true);
        } else {
          resolve(false);
        }
        pendingCloseFile.value = null;
        pendingCloseCallback.value = null;
      };
    });
  }

  function confirmCloseSave() {
    if (pendingCloseFile.value) {
      const fileId = pendingCloseFile.value.id;
      saveFile(fileId).then((saved) => {
        if (saved && pendingCloseCallback.value) {
          pendingCloseCallback.value(true);
        }
      });
    }
  }

  function confirmCloseDiscard() {
    if (pendingCloseCallback.value) {
      pendingCloseCallback.value(true);
    }
  }

  function cancelClose() {
    if (pendingCloseCallback.value) {
      pendingCloseCallback.value(false);
    }
  }

  function renameFile(fileId: string, newName: string): boolean {
    const file = getFileById(fileId);
    if (!file) return false;

    const normalized = normalizeFileName(newName, 'ts');
    if (file.name === normalized) return false;

    file.name = normalized;
    file.language = detectLanguage(normalized);
    success(`Renamed file to ${normalized}`);
    return true;
  }

  return {
    files,
    getFileById,
    createFile,
    openFiles,
    saveFile,
    updateContent,
    setLanguage,
    renameFile,
    requestCloseFile,
    removeFileDirectly,
    pendingCloseFile,
    confirmCloseSave,
    confirmCloseDiscard,
    cancelClose,
  };
}
