import { ref } from 'vue';
import type { EditorFile, FileExecutionState, SyntaxReviewResult } from '../types/editor';
import { executeCode } from '../services/codeRunner';
import { reviewCodeSyntax } from '../services/syntaxValidator';
import { updateSyntaxMarkers } from '../services/monaco';

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

  function reviewFileSyntax(file: EditorFile): SyntaxReviewResult {
    // 1. Update markers in Monaco
    updateSyntaxMarkers(file.id, file.name, file.content, file.language);

    // 2. Perform detailed syntax review
    const result = reviewCodeSyntax(file.content, file.language, file.name);
    const state = getExecutionState(file.id);

    const now = new Date();
    const timeStr = now.toLocaleTimeString();

    state.logs = [
      {
        id: `syntax-hdr-${Date.now()}`,
        type: 'system',
        message: `🔍 [${timeStr}] Code Syntax Review for "${file.name}" (${file.language})`,
        timestamp: now,
      },
    ];

    if (result.issues.length === 0) {
      state.status = 'success';
      state.logs.push({
        id: `syntax-ok-${Date.now()}`,
        type: 'result',
        message: `✔ All syntax checks passed for "${file.name}". No syntax errors found!`,
        timestamp: now,
      });
    } else {
      state.isOpen = true; // Auto open so the user sees all syntax issues at bottom
      const errorCount = result.issues.filter((i) => i.severity === 'error').length;
      state.status = errorCount > 0 ? 'error' : 'idle';

      for (const issue of result.issues) {
        state.logs.push({
          id: `syntax-issue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: issue.severity === 'error' ? 'error' : 'warn',
          message: `Line ${issue.line}, Col ${issue.column}: ${issue.message}${issue.rule ? ` [${issue.rule}]` : ''}`,
          timestamp: now,
          details: issue,
        });
      }

      state.logs.push({
        id: `syntax-summary-${Date.now()}`,
        type: 'system',
        message: `Found ${result.issues.length} syntax issue(s) (${errorCount} error(s), ${result.issues.length - errorCount} warning(s)).`,
        timestamp: now,
      });
    }

    return result;
  }

  return {
    executionStates,
    isExecutingGlobal,
    getExecutionState,
    setLogOpen,
    toggleLogOpen,
    clearLogs,
    runCode,
    reviewFileSyntax,
  };
}
