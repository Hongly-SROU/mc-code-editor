export interface SyntaxIssue {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning';
  rule?: string;
}

export interface SyntaxReviewResult {
  fileName: string;
  language: string;
  isValid: boolean;
  issues: SyntaxIssue[];
}

/**
 * Checks matching pairs of parentheses, brackets, and braces while ignoring comments and strings.
 */
function checkBracketAndStringBalance(code: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];
  const lines = code.split('\n');

  interface OpenBracket {
    char: string;
    line: number;
    col: number;
  }

  const stack: OpenBracket[] = [];
  let inBlockComment = false;
  let blockCommentStart = { line: 1, col: 1 };

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    let inString: string | null = null;
    let stringStartCol = 1;

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      const next = line[c + 1];

      // Handle block comments
      if (inBlockComment) {
        if (char === '*' && next === '/') {
          inBlockComment = false;
          c++;
        }
        continue;
      }

      // Handle strings
      if (inString) {
        if (char === '\\') {
          c++; // skip escaped char
        } else if (char === inString) {
          inString = null;
        }
        continue;
      }

      // Start of block comment
      if (char === '/' && next === '*') {
        inBlockComment = true;
        blockCommentStart = { line: l + 1, col: c + 1 };
        c++;
        continue;
      }

      // Line comment
      if (char === '/' && next === '/') {
        break; // rest of line is comment
      }

      // Start of string
      if (char === '"' || char === "'" || char === '`') {
        inString = char;
        stringStartCol = c + 1;
        continue;
      }

      // Brackets
      if (char === '{' || char === '(' || char === '[') {
        stack.push({ char, line: l + 1, col: c + 1 });
      } else if (char === '}' || char === ')' || char === ']') {
        const expected = char === '}' ? '{' : char === ')' ? '(' : '[';
        if (stack.length === 0) {
          issues.push({
            line: l + 1,
            column: c + 1,
            endColumn: c + 2,
            message: `Unmatched closing bracket '${char}' without corresponding opening '${expected}'`,
            severity: 'error',
            rule: 'bracket-match',
          });
        } else {
          const last = stack.pop()!;
          if (last.char !== expected) {
            issues.push({
              line: l + 1,
              column: c + 1,
              endColumn: c + 2,
              message: `Mismatched bracket: found '${char}' but expected closing for '${last.char}' from line ${last.line}`,
              severity: 'error',
              rule: 'bracket-mismatch',
            });
          }
        }
      }
    }

    if (inString && inString !== '`') {
      issues.push({
        line: l + 1,
        column: stringStartCol,
        endColumn: line.length + 1,
        message: `Unclosed string literal starting with ${inString}`,
        severity: 'error',
        rule: 'unclosed-string',
      });
    }
  }

  if (inBlockComment) {
    issues.push({
      line: blockCommentStart.line,
      column: blockCommentStart.col,
      message: 'Unterminated block comment /* ... */',
      severity: 'error',
      rule: 'unclosed-comment',
    });
  }

  while (stack.length > 0) {
    const unclosed = stack.pop()!;
    const closeChar = unclosed.char === '{' ? '}' : unclosed.char === '(' ? ')' : ']';
    issues.push({
      line: unclosed.line,
      column: unclosed.col,
      endColumn: unclosed.col + 1,
      message: `Unclosed bracket '${unclosed.char}'. Missing '${closeChar}'`,
      severity: 'error',
      rule: 'unclosed-bracket',
    });
  }

  return issues;
}

/**
 * Reviews JavaScript & TypeScript syntax using parsing and heuristic analysis.
 */
function reviewJsTsSyntax(code: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];

  // Check brackets & strings first
  issues.push(...checkBracketAndStringBalance(code));

  // Syntactic verification through AsyncFunction parse test
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    // Strip type assertions/annotations for parse test if TS
    const cleaned = code
      .replace(/import\s+type\s+.*?from\s+['"][^'"]+['"];?/g, '')
      .replace(/\b(?:export\s+)?interface\s+[A-Za-z0-9_$]+(?:\s*<[^>]+>)?\s*\{[\s\S]*?\}/g, '')
      .replace(/\b(?:export\s+)?type\s+[A-Za-z0-9_$]+(?:\s*<[^>]+>)?\s*=[\s\S]*?;/g, '')
      .replace(/\s+as\s+[A-Za-z0-9_$]+(?:\s*<[^>]+>)*/g, '')
      .replace(/\b(let|const|var)\s+([A-Za-z0-9_$]+)\s*:\s*[A-Za-z0-9_$<>, |&[\]{}]+(?=\s*=|\s*;|\s*$)/g, '$1 $2');

    new AsyncFunction(cleaned);
  } catch (err: unknown) {
    if (err instanceof SyntaxError) {
      const msg = err.message;
      let line = 1;
      let col = 1;

      // Extract line number if provided by JS runtime error string (e.g. line 4 or :4:12)
      const lineMatch = err.stack?.match(/<anonymous>:(\d+):(\d+)/) || msg.match(/line (\d+)/i) || msg.match(/:(\d+):(\d+)/);
      if (lineMatch) {
        line = parseInt(lineMatch[1], 10) || 1;
        col = parseInt(lineMatch[2], 10) || 1;
      }

      // Avoid duplicate reports if bracket checker already caught it
      if (!issues.some((i) => i.line === line && i.message.includes('bracket'))) {
        issues.push({
          line,
          column: col,
          message: `JavaScript/TypeScript SyntaxError: ${msg}`,
          severity: 'error',
          rule: 'syntax-error',
        });
      }
    }
  }

  return issues;
}

/**
 * Reviews JSON syntax with precise line & column detection.
 */
function reviewJsonSyntax(code: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];
  const trimmed = code.trim();
  if (!trimmed) {
    issues.push({
      line: 1,
      column: 1,
      message: 'JSON document is empty. Expected an object {} or array [].',
      severity: 'error',
      rule: 'json-empty',
    });
    return issues;
  }

  try {
    JSON.parse(code);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    let line = 1;
    let col = 1;

    // Node / V8 position extraction: "at position 42 (line 3 column 5)"
    const posMatch = msg.match(/at position (\d+)/i);
    const lineColMatch = msg.match(/line (\d+) column (\d+)/i);

    if (lineColMatch) {
      line = parseInt(lineColMatch[1], 10);
      col = parseInt(lineColMatch[2], 10);
    } else if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      let currentPos = 0;
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const lineLen = lines[i].length + 1; // + newline
        if (currentPos + lineLen > pos) {
          line = i + 1;
          col = Math.max(1, pos - currentPos + 1);
          break;
        }
        currentPos += lineLen;
      }
    }

    issues.push({
      line,
      column: col,
      message: `JSON Syntax Error: ${msg}`,
      severity: 'error',
      rule: 'json-parse',
    });
  }

  return issues;
}

/**
 * Reviews Golang syntax rules.
 */
function reviewGolangSyntax(code: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];
  const lines = code.split('\n');

  // Check brackets and quotes
  issues.push(...checkBracketAndStringBalance(code));

  let hasPackage = false;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l].trim();
    if (!line || line.startsWith('//') || line.startsWith('/*')) continue;

    // Check package statement
    if (!hasPackage) {
      if (line.startsWith('package ')) {
        hasPackage = true;
        const pkgName = line.replace('package ', '').trim();
        if (!/^[a-zA-Z_]\w*$/.test(pkgName)) {
          issues.push({
            line: l + 1,
            column: 9,
            message: `Invalid package name '${pkgName}' in Go`,
            severity: 'error',
            rule: 'go-package-name',
          });
        }
      } else {
        issues.push({
          line: l + 1,
          column: 1,
          message: 'Go files must begin with a "package <name>" declaration',
          severity: 'error',
          rule: 'go-missing-package',
        });
        hasPackage = true; // prevent repeated triggers
      }
      continue;
    }

    // Unnecessary semicolons warning in Go
    if (line.endsWith(';') && !line.includes('for ') && !line.includes('//')) {
      issues.push({
        line: l + 1,
        column: line.length,
        message: 'Unnecessary semicolon in Go code (idiomatic Go avoids semicolons)',
        severity: 'warning',
        rule: 'go-semicolon',
      });
    }

    // Func signature syntax
    if (line.startsWith('func ') && !line.endsWith('{') && !line.endsWith('}') && !lines[l + 1]?.trim().startsWith('{')) {
      if (!line.includes('(') || !line.includes(')')) {
        issues.push({
          line: l + 1,
          column: 1,
          message: 'Malformed Go function declaration: missing parameter list ()',
          severity: 'error',
          rule: 'go-func-syntax',
        });
      }
    }
  }

  if (!hasPackage && lines.some((l) => l.trim().length > 0)) {
    issues.push({
      line: 1,
      column: 1,
      message: 'Go source file must begin with a package clause (e.g. "package main")',
      severity: 'error',
      rule: 'go-package-clause',
    });
  }

  return issues;
}

/**
 * Reviews Dart syntax rules.
 */
function reviewDartSyntax(code: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];
  const lines = code.split('\n');

  issues.push(...checkBracketAndStringBalance(code));

  for (let l = 0; l < lines.length; l++) {
    const rawLine = lines[l];
    const line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

    // Check for missing semicolons on statements (import, var, return, print, etc.)
    const requiresSemicolon =
      line.startsWith('import ') ||
      line.startsWith('export ') ||
      line.startsWith('return ') ||
      line.startsWith('final ') ||
      line.startsWith('const ') ||
      line.startsWith('var ') ||
      line.startsWith('print(') ||
      line.startsWith('throw ') ||
      (line.endsWith(')') && !line.includes('class ') && !line.includes('if ') && !line.includes('for ') && !line.includes('while ') && !line.includes('void ') && !line.includes('{') && !line.endsWith('=>'));

    if (requiresSemicolon && !line.endsWith(';') && !line.endsWith('{') && !line.endsWith(',') && !line.endsWith('=>')) {
      // Check if next line continues the statement
      const nextLine = lines[l + 1]?.trim() || '';
      if (!nextLine.startsWith('.') && !nextLine.startsWith('+') && !nextLine.startsWith(';') && !nextLine.startsWith('?')) {
        issues.push({
          line: l + 1,
          column: rawLine.length,
          message: "Dart statement missing closing semicolon ';'",
          severity: 'error',
          rule: 'dart-missing-semicolon',
        });
      }
    }
  }

  return issues;
}

/**
 * Reviews Java syntax rules.
 */
function reviewJavaSyntax(code: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];
  const lines = code.split('\n');

  issues.push(...checkBracketAndStringBalance(code));

  for (let l = 0; l < lines.length; l++) {
    const rawLine = lines[l];
    const line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

    // Check package/import statement semicolons
    if ((line.startsWith('package ') || line.startsWith('import ')) && !line.endsWith(';')) {
      issues.push({
        line: l + 1,
        column: rawLine.length,
        message: "Java package and import statements must end with a semicolon ';'",
        severity: 'error',
        rule: 'java-semicolon',
      });
    }

    // Check statement semicolons
    const statementPatterns = [
      /^return\b/,
      /^throw\b/,
      /^System\.out\.println\(/,
      /^System\.out\.print\(/,
      /^[A-Za-z0-9_<>]+(?:\s+[A-Za-z0-9_]+)+\s*=\s*[^;{]+$/,
    ];

    for (const pat of statementPatterns) {
      if (pat.test(line) && !line.endsWith(';') && !line.endsWith('{') && !line.endsWith(',')) {
        const nextLine = lines[l + 1]?.trim() || '';
        if (!nextLine.startsWith('.') && !nextLine.startsWith('+') && !nextLine.startsWith('?')) {
          issues.push({
            line: l + 1,
            column: rawLine.length,
            message: "Missing semicolon ';' at the end of Java statement",
            severity: 'error',
            rule: 'java-missing-semicolon',
          });
        }
      }
    }

    // Check class declaration without class name
    if (line.startsWith('public class {') || line.startsWith('class {')) {
      issues.push({
        line: l + 1,
        column: line.indexOf('{'),
        message: "Missing class identifier in class declaration: 'class <Name> {'",
        severity: 'error',
        rule: 'java-class-name',
      });
    }
  }

  return issues;
}

/**
 * Reviews C / C++ syntax rules.
 */
function reviewCppSyntax(code: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];
  const lines = code.split('\n');

  issues.push(...checkBracketAndStringBalance(code));

  const structBlockStack: boolean[] = [];
  let pendingStruct = false;

  for (let l = 0; l < lines.length; l++) {
    const rawLine = lines[l];
    const line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

    if (/\b(struct|class)\s+[A-Za-z0-9_]+/.test(line) && !line.endsWith(';')) {
      pendingStruct = true;
    }

    if (line.includes('{')) {
      structBlockStack.push(pendingStruct);
      pendingStruct = false;
    }

    if (line.includes('}')) {
      const isStruct = structBlockStack.pop();
      if (isStruct && !line.endsWith(';') && !line.endsWith(',')) {
        issues.push({
          line: l + 1,
          column: rawLine.length,
          message: "C++ class/struct declaration closing brace must end with a semicolon ';'",
          severity: 'error',
          rule: 'cpp-struct-semicolon',
        });
      }
    }

    // Invalid #include syntax
    if (line.startsWith('#include')) {
      const target = line.replace('#include', '').trim();
      if (!target.startsWith('<') && !target.startsWith('"')) {
        issues.push({
          line: l + 1,
          column: 9,
          message: 'Malformed #include directive: header name must be enclosed in <...> or "..."',
          severity: 'error',
          rule: 'cpp-include-syntax',
        });
      }
    }

    // Missing semicolon on return or std::cout
    if ((line.startsWith('return ') || line.startsWith('std::cout') || line.startsWith('std::cin')) && !line.endsWith(';') && !line.endsWith('<<')) {
      const nextLine = lines[l + 1]?.trim() || '';
      if (!nextLine.startsWith('<<') && !nextLine.startsWith('>>') && !nextLine.startsWith('.')) {
        issues.push({
          line: l + 1,
          column: rawLine.length,
          message: "Missing semicolon ';' at end of C++ statement",
          severity: 'error',
          rule: 'cpp-missing-semicolon',
        });
      }
    }
  }

  return issues;
}

/**
 * Reviews Python syntax rules (colons, indentation, brackets).
 */
function reviewPythonSyntax(code: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];
  const lines = code.split('\n');

  issues.push(...checkBracketAndStringBalance(code));

  const colonBlockStarters = [
    /^\s*def\s+[a-zA-Z_]\w*\s*\(.*\)\s*$/,
    /^\s*class\s+[a-zA-Z_]\w*(?:\(.*\))?\s*$/,
    /^\s*if\s+.+$/,
    /^\s*elif\s+.+$/,
    /^\s*else\s*$/,
    /^\s*for\s+.+\s+in\s+.+$/,
    /^\s*while\s+.+$/,
    /^\s*try\s*$/,
    /^\s*except(?:\s+.*)?$/,
    /^\s*finally\s*$/,
    /^\s*with\s+.+$/,
  ];

  let expectIndentationOnNextLine = false;
  let previousIndentLevel = 0;

  for (let l = 0; l < lines.length; l++) {
    const rawLine = lines[l];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    const currentIndent = rawLine.search(/\S/);

    if (expectIndentationOnNextLine) {
      if (currentIndent <= previousIndentLevel) {
        issues.push({
          line: l + 1,
          column: 1,
          message: 'IndentationError: expected an indented block after statement with colon',
          severity: 'error',
          rule: 'python-indentation',
        });
      }
      expectIndentationOnNextLine = false;
    }

    // Check for missing colon
    for (const pat of colonBlockStarters) {
      if (pat.test(trimmed)) {
        if (!trimmed.endsWith(':')) {
          issues.push({
            line: l + 1,
            column: rawLine.length,
            message: `SyntaxError: expected ':' at the end of '${trimmed.split(' ')[0]}' statement`,
            severity: 'error',
            rule: 'python-missing-colon',
          });
        } else {
          expectIndentationOnNextLine = true;
          previousIndentLevel = currentIndent;
        }
        break;
      }
    }
  }

  return issues;
}

/**
 * Reviews HTML syntax rules.
 */
function reviewHtmlSyntax(code: string): SyntaxIssue[] {
  const issues: SyntaxIssue[] = [];
  if (typeof DOMParser === 'undefined') return issues;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(code, 'text/html');
    const parserError = doc.querySelector('parsererror');

    if (parserError) {
      issues.push({
        line: 1,
        column: 1,
        message: `HTML Parser Warning: ${parserError.textContent?.slice(0, 100) || 'Malformed HTML markup'}`,
        severity: 'warning',
        rule: 'html-parse',
      });
    }
  } catch {
    // DOMParser fallback
  }

  // Bracket check
  issues.push(...checkBracketAndStringBalance(code));
  return issues;
}

/**
 * Universal code syntax reviewer for any supported programming language.
 */
export function reviewCodeSyntax(
  code: string,
  language: string,
  fileName = 'code'
): SyntaxReviewResult {
  let issues: SyntaxIssue[] = [];

  switch (language) {
    case 'typescript':
    case 'javascript':
      issues = reviewJsTsSyntax(code);
      break;
    case 'json':
      issues = reviewJsonSyntax(code);
      break;
    case 'go':
      issues = reviewGolangSyntax(code);
      break;
    case 'dart':
      issues = reviewDartSyntax(code);
      break;
    case 'java':
      issues = reviewJavaSyntax(code);
      break;
    case 'cpp':
    case 'c':
      issues = reviewCppSyntax(code);
      break;
    case 'python':
      issues = reviewPythonSyntax(code);
      break;
    case 'html':
      issues = reviewHtmlSyntax(code);
      break;
    default:
      // Heuristic bracket check for all other languages
      issues = checkBracketAndStringBalance(code);
      break;
  }

  return {
    fileName,
    language,
    isValid: !issues.some((i) => i.severity === 'error'),
    issues,
  };
}
