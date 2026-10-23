import type { EditorFile } from '../types/editor';

declare global {
  interface Window {
    showOpenFilePicker?(options?: { multiple?: boolean }): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?(options?: { suggestedName?: string }): Promise<FileSystemFileHandle>;
  }
}

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';
}

export interface OpenedFileInfo {
  name: string;
  content: string;
  fileHandle?: FileSystemFileHandle | null;
}

/**
 * Open local files using File System Access API or fallback file input
 */
export async function openLocalFiles(): Promise<OpenedFileInfo[]> {
  if (supportsFileSystemAccess() && window.showOpenFilePicker) {
    try {
      const handles: FileSystemFileHandle[] = await window.showOpenFilePicker({
        multiple: true,
      });

      const results: OpenedFileInfo[] = [];
      for (const handle of handles) {
        const file = await handle.getFile();
        const content = await file.text();
        results.push({
          name: handle.name,
          content,
          fileHandle: handle,
        });
      }
      return results;
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        // User cancelled file selection
        return [];
      }
      throw err;
    }
  }

  // Fallback using HTML input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.style.display = 'none';

    input.onchange = async () => {
      const files = input.files;
      if (!files || files.length === 0) {
        resolve([]);
        return;
      }

      const results: OpenedFileInfo[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const content = await file.text();
        results.push({
          name: file.name,
          content,
          fileHandle: null,
        });
      }
      document.body.removeChild(input);
      resolve(results);
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve([]);
    };

    document.body.appendChild(input);
    input.click();
  });
}

export interface SaveResult {
  success: boolean;
  cancelled?: boolean;
  name?: string;
  handle?: FileSystemFileHandle | null;
  error?: string;
}

/**
 * Save file to local disk
 */
export async function saveLocalFile(
  file: EditorFile,
  forceSaveAs = false
): Promise<SaveResult> {
  // If we already have a file handle and not forcing Save As, write directly to handle
  if (supportsFileSystemAccess() && file.fileHandle && !forceSaveAs) {
    try {
      const writable = await file.fileHandle.createWritable();
      await writable.write(file.content);
      await writable.close();
      return {
        success: true,
        name: file.name,
        handle: file.fileHandle,
      };
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      // If direct write fails (e.g. permission lost), fall through to Save As
    }
  }

  // If File System Access API is supported, prompt Save As dialog
  if (supportsFileSystemAccess() && window.showSaveFilePicker) {
    try {
      const handle: FileSystemFileHandle = await window.showSaveFilePicker({
        suggestedName: file.name,
      });

      const writable = await handle.createWritable();
      await writable.write(file.content);
      await writable.close();

      return {
        success: true,
        name: handle.name,
        handle,
      };
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      // If error occurred with file picker, fall back to download
    }
  }

  // Fallback: Trigger Blob download
  try {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      name: file.name,
      handle: null,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: (err as Error).message || 'Failed to save file via download fallback',
    };
  }
}
