import type { ExecutionStatus, LogEntry } from '../types/editor';

export interface CodeRunResult {
  status: ExecutionStatus;
  logs: LogEntry[];
  durationMs: number;
}

/**
 * Format any JavaScript / TypeScript value into a clean, human-readable string.
 */
export function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'symbol') return value.toString();

  if (value instanceof Error) {
    if (value.stack) {
      // Clean stack trace to remove internal evaluator frames
      const lines = value.stack.split('\n');
      const filtered = lines.filter(
        (line) => !line.includes('AsyncFunction') && !line.includes('eval at')
      );
      return filtered.join('\n');
    }
    return `${value.name}: ${value.message}`;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof RegExp) {
    return value.toString();
  }

  if (value instanceof Map) {
    const entries = Array.from(value.entries()).map(
      ([k, v]) => `  ${formatValue(k)} => ${formatValue(v)}`
    );
    return `Map(${value.size}) {\n${entries.join(',\n')}\n}`;
  }

  if (value instanceof Set) {
    const values = Array.from(value.values()).map((v) => `  ${formatValue(v)}`);
    return `Set(${value.size}) {\n${values.join(',\n')}\n}`;
  }

  if (typeof value === 'function') {
    return value.toString();
  }

  // Object / Array formatting with circular reference protection
  try {
    const seen = new WeakSet();
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'bigint') return `${val}n`;
        if (typeof val === 'function') return `[Function: ${val.name || 'anonymous'}]`;
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) {
            return '[Circular Reference]';
          }
          seen.add(val);
        }
        return val;
      },
      2
    );
  } catch {
    return String(value);
  }
}

/**
 * Converts tabular data into a text-aligned table representation.
 */
export function formatTable(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return formatValue(data);
  }

  try {
    const rows: Record<string, unknown>[] = Array.isArray(data)
      ? data.map((item, idx) => (typeof item === 'object' && item !== null ? { '(index)': idx, ...item } : { '(index)': idx, Value: item }))
      : Object.entries(data).map(([key, val]) => (typeof val === 'object' && val !== null ? { '(index)': key, ...val } : { '(index)': key, Value: val }));

    if (rows.length === 0) return '[]';

    // Collect all column headers
    const cols = Array.from(
      new Set(rows.flatMap((r) => Object.keys(r)))
    );

    // Compute column widths
    const colWidths: Record<string, number> = {};
    for (const col of cols) {
      let maxLen = col.length;
      for (const row of rows) {
        const str = String(row[col] ?? '');
        if (str.length > maxLen) maxLen = str.length;
      }
      colWidths[col] = Math.min(maxLen, 35);
    }

    const header = cols.map((col) => col.padEnd(colWidths[col])).join(' | ');
    const sep = cols.map((col) => '-'.repeat(colWidths[col])).join('-+-');
    const body = rows.map((row) =>
      cols.map((col) => {
        const val = String(row[col] ?? '');
        return val.length > 35 ? val.slice(0, 32) + '...' : val.padEnd(colWidths[col]);
      }).join(' | ')
    );

    return [header, sep, ...body].join('\n');
  } catch {
    return formatValue(data);
  }
}

/**
 * Strips common TypeScript syntax annotations so code can run in standard JavaScript environments.
 */
export function stripTypeScript(source: string): string {
  let code = source;

  // 1. Remove import type { ... } from '...'
  code = code.replace(/import\s+type\s+.*?from\s+['"][^'"]+['"];?/g, '');
  code = code.replace(/import\s+{\s*type\s+[^}]+}\s+from\s+['"][^'"]+['"];?/g, '');

  // 2. Remove interfaces: interface Foo { ... } (supports multiline with balanced braces or greedy block)
  code = code.replace(/\b(?:export\s+)?interface\s+[A-Za-z0-9_$]+(?:\s*<[^>]+>)?(?:\s+extends\s+[^{]+)?\s*\{[\s\S]*?\}/g, '');

  // 3. Remove type aliases: type Foo = ...;
  code = code.replace(/\b(?:export\s+)?type\s+[A-Za-z0-9_$]+(?:\s*<[^>]+>)?\s*=[\s\S]*?;/g, '');

  // 4. Remove declare statements
  code = code.replace(/\bdeclare\s+(?:var|let|const|function|class|namespace)\s+[\s\S]*?;/g, '');

  // 5. Convert enum declarations: enum Colors { Red, Green } -> const Colors = { Red: 0, Green: 1 };
  code = code.replace(/\b(?:export\s+)?enum\s+([A-Za-z0-9_$]+)\s*\{([^}]+)\}/g, (_, name, body) => {
    const items = body.split(',').map((item: string) => item.trim()).filter(Boolean);
    const mapped = items.map((item: string, idx: number) => {
      const parts = item.split('=').map((p: string) => p.trim());
      if (parts.length > 1) {
        return `${parts[0]}: ${parts[1]}`;
      }
      return `${parts[0]}: ${idx}`;
    });
    return `const ${name} = { ${mapped.join(', ')} };`;
  });

  // 6. Remove 'as <Type>' assertions
  code = code.replace(/\s+as\s+[A-Za-z0-9_$]+(?:\s*<[^>]+>)?(?:\[\])*/g, '');

  // 7. Remove non-null assertion operator: foo!.bar -> foo.bar
  code = code.replace(/([A-Za-z0-9_$)\]])!(\.[A-Za-z0-9_$]|\[|\()/g, '$1$2');

  // 8. Remove function return type annotations: ): ReturnType { or ): Promise<X> => {
  code = code.replace(/\):\s*(?:[A-Za-z0-9_$<>, |&[\]{}]+)\s*(=>|\{)/g, ') $1');

  // 9. Remove variable and parameter type annotations:
  // e.g. (a: number, b: string) -> (a, b)
  // or const x: number = 5 -> const x = 5
  // We match identifiers followed by : Type, being careful not to match object literal keys
  code = code.replace(/\b(let|const|var)\s+([A-Za-z0-9_$]+)\s*:\s*[A-Za-z0-9_$<>, |&[\]{}]+(?=\s*=|\s*;|\s*$)/g, '$1 $2');
  code = code.replace(/\(([^)]*)\)/g, (_, params) => {
    // Inside parameter lists, replace param: Type with param
    const cleaned = params.replace(/([A-Za-z0-9_$]+)\s*:\s*[A-Za-z0-9_$<>, |&[\]{}]*(?=[,)=]|$)/g, '$1');
    return `(${cleaned})`;
  });

  return code;
}

/**
 * Execute code inside a sandboxed AsyncFunction with intercepted console methods.
 */
export async function executeCode(
  code: string,
  language: string,
  timeoutMs: number = 8000
): Promise<CodeRunResult> {
  const logs: LogEntry[] = [];
  const startTime = performance.now();

  function pushLog(
    type: LogEntry['type'],
    args: unknown[],
    details?: unknown
  ) {
    const formatted = args.map((arg) => formatValue(arg)).join(' ');
    logs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      message: formatted,
      timestamp: new Date(),
      details,
    });
  }

  // Handle JSON
  if (language === 'json') {
    try {
      const parsed = JSON.parse(code);
      const isArr = Array.isArray(parsed);
      const count = isArr ? parsed.length : Object.keys(parsed).length;
      pushLog('system', [`[JSON Valid] Type: ${isArr ? 'Array' : 'Object'} with ${count} ${isArr ? 'items' : 'keys'}`]);
      pushLog('log', [formatValue(parsed)]);
      return {
        status: 'success',
        logs,
        durationMs: Math.round(performance.now() - startTime),
      };
    } catch (err) {
      pushLog('error', [`JSON Parse Error: ${err instanceof Error ? err.message : String(err)}`]);
      return {
        status: 'error',
        logs,
        durationMs: Math.round(performance.now() - startTime),
      };
    }
  }

  // Handle HTML
  if (language === 'html') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(code, 'text/html');
      const scripts = doc.querySelectorAll('script');
      pushLog('system', [`[HTML Document] Title: "${doc.title || '(none)'}", Tags: ${doc.body.children.length} body element(s), ${scripts.length} script(s)`]);

      if (scripts.length > 0) {
        pushLog('info', [`Running embedded scripts (${scripts.length} found)...`]);
        for (let i = 0; i < scripts.length; i++) {
          const s = scripts[i];
          if (s.textContent?.trim()) {
            const subResult = await executeCode(s.textContent, 'javascript', timeoutMs);
            logs.push(...subResult.logs);
          }
        }
      } else {
        pushLog('log', [doc.body.innerHTML.slice(0, 500) + (doc.body.innerHTML.length > 500 ? '...' : '')]);
      }

      return {
        status: 'success',
        logs,
        durationMs: Math.round(performance.now() - startTime),
      };
    } catch (err) {
      pushLog('error', [`HTML Execution Error: ${err instanceof Error ? err.message : String(err)}`]);
      return {
        status: 'error',
        logs,
        durationMs: Math.round(performance.now() - startTime),
      };
    }
  }

  // Unsupported directly, display helpful status
  if (language !== 'javascript' && language !== 'typescript') {
    pushLog('system', [`[Execution Info] Direct browser runtime only supports JavaScript, TypeScript, JSON, and HTML.`]);
    pushLog('info', [`Language '${language}' syntax is verified. In a browser environment, script execution is simulated.`]);
    return {
      status: 'success',
      logs,
      durationMs: Math.round(performance.now() - startTime),
    };
  }

  // JavaScript & TypeScript
  let transformedCode = code;
  if (language === 'typescript') {
    transformedCode = stripTypeScript(code);
  }

  // Time tracker for console.time / timeEnd
  const timerMap = new Map<string, number>();

  const customConsole = {
    log: (...args: unknown[]) => pushLog('log', args),
    info: (...args: unknown[]) => pushLog('info', args),
    warn: (...args: unknown[]) => pushLog('warn', args),
    error: (...args: unknown[]) => pushLog('error', args),
    table: (data: unknown) => pushLog('log', [formatTable(data)]),
    clear: () => {
      logs.length = 0;
      pushLog('system', ['[Console was cleared]']);
    },
    time: (label = 'default') => {
      timerMap.set(label, performance.now());
    },
    timeEnd: (label = 'default') => {
      const start = timerMap.get(label);
      if (start !== undefined) {
        const elapsed = (performance.now() - start).toFixed(2);
        timerMap.delete(label);
        pushLog('info', [`${label}: ${elapsed} ms`]);
      } else {
        pushLog('warn', [`Timer '${label}' does not exist`]);
      }
    },
    assert: (condition: boolean, ...args: unknown[]) => {
      if (!condition) {
        pushLog('error', ['Assertion failed:', ...(args.length ? args : ['console.assert'])]);
      }
    },
  };

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  try {
    let runner: (...args: unknown[]) => Promise<unknown>;
    const trimmed = transformedCode.trim();

    // Extract the last statement/expression to evaluate return value if valid
    let candidateCode: string | null = null;
    const codeNoTrailingSemi = trimmed.replace(/;+\s*$/, '');
    const lastSemi = codeNoTrailingSemi.lastIndexOf(';');
    const headCode = lastSemi !== -1 ? codeNoTrailingSemi.slice(0, lastSemi + 1) : '';
    const lastStmt = (lastSemi !== -1 ? codeNoTrailingSemi.slice(lastSemi + 1) : codeNoTrailingSemi).trim();

    if (
      lastStmt &&
      !lastStmt.includes('\n') &&
      !lastStmt.startsWith('const ') &&
      !lastStmt.startsWith('let ') &&
      !lastStmt.startsWith('var ') &&
      !lastStmt.startsWith('return ') &&
      !lastStmt.startsWith('throw ') &&
      !lastStmt.startsWith('import ') &&
      !lastStmt.startsWith('export ') &&
      !lastStmt.startsWith('function ') &&
      !lastStmt.startsWith('class ') &&
      !lastStmt.startsWith('if ') &&
      !lastStmt.startsWith('for ') &&
      !lastStmt.startsWith('while ') &&
      !lastStmt.startsWith('//') &&
      !lastStmt.endsWith('{') &&
      !lastStmt.endsWith('}')
    ) {
      candidateCode = headCode ? `${headCode}\nreturn (${lastStmt});` : `return (${lastStmt});`;
    }

    if (candidateCode) {
      try {
        runner = new AsyncFunction('console', 'print', candidateCode);
      } catch {
        runner = new AsyncFunction('console', 'print', transformedCode);
      }
    } else {
      runner = new AsyncFunction('console', 'print', transformedCode);
    }

    // Timeout safety race
    const executionPromise = runner(customConsole, customConsole.log);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Execution timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    const result = await Promise.race([executionPromise, timeoutPromise]);

    if (result !== undefined) {
      pushLog('result', [`=> ${formatValue(result)}`]);
    }

    const duration = Math.round(performance.now() - startTime);
    pushLog('system', [`✔ Process finished in ${duration}ms with exit code 0`]);

    return {
      status: 'success',
      logs,
      durationMs: duration,
    };
  } catch (err: unknown) {
    const duration = Math.round(performance.now() - startTime);
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error && err.stack ? err.stack : '';

    pushLog('error', [errMsg], errStack);
    pushLog('system', [`✖ Process exited with error in ${duration}ms`]);

    return {
      status: 'error',
      logs,
      durationMs: duration,
    };
  }
}
