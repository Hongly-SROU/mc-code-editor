import { ref } from 'vue';
import type { EditorFile, FileExecutionState } from '../types/editor';
import { executeCode } from '../services/codeRunner';

// Global execution state shared across panes: fileId -> FileExecutionState
const executionStates = ref<Record<string, FileExecutionState>>({});
const isExecutingGlobal = ref(false);

export function useCodeRunner() {
  function getExecutionState(fileId: string): FileExecutionState {
    if (!executionStates.value[fileId]) {
      executionStates.value[fileId] = {
        fileId,
        status: 'idle',
        logs: [],
        durationMs: null,
        isOpen: false,
        lastRunTime: null,
      };
    }
    return executionStates.value[fileId];
  }

  function setLogOpen(fileId: string, open: boolean) {
    const state = getExecutionState(fileId);
    state.isOpen = open;
  }

  function toggleLogOpen(fileId: string) {
    const state = getExecutionState(fileId);
    state.isOpen = !state.isOpen;
  }

  function clearLogs(fileId: string) {
    const state = getExecutionState(fileId);
    state.logs = [];
    state.status = 'idle';
    state.durationMs = null;
  }

  async function runCode(file: EditorFile): Promise<FileExecutionState> {
    const state = getExecutionState(file.id);

    // Automatically open log panel when executing so user sees the output immediately
    state.isOpen = true;
    state.status = 'running';
    isExecutingGlobal.value = true;

    // Optional initial system log
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    state.logs = [
      {
        id: `sys-start-${Date.now()}`,
        type: 'system',
        message: `▶ [${timeStr}] Executing "${file.name}" (${file.language})...`,
        timestamp: now,
      },
    ];

    try {
      const result = await executeCode(file.content, file.language);
      state.logs.push(...result.logs);
      state.status = result.status;
      state.durationMs = result.durationMs;
      state.lastRunTime = new Date();
    } catch (err: unknown) {
      state.status = 'error';
      state.logs.push({
        id: `err-${Date.now()}`,
        type: 'error',
        message: `Runner error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date(),
      });
    } finally {
      isExecutingGlobal.value = false;
    }

    return state;
  }

  return {
    executionStates,
    isExecutingGlobal,
    getExecutionState,
    setLogOpen,
    toggleLogOpen,
    clearLogs,
    runCode,
  };
}
