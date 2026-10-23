import * as monaco from 'monaco-editor';

type CompletionItem = monaco.languages.CompletionItem;
type IRange = monaco.IRange;

/**
 * Extracts identifiers from the document for word-based autocompletion
 */
function getDocumentWordCompletions(
  model: monaco.editor.ITextModel,
  range: IRange,
  currentWord: string
): CompletionItem[] {
  const content = model.getValue();
  const matches = content.match(/\b[a-zA-Z_]\w{2,}\b/g) || [];
  const unique = Array.from(new Set(matches)).filter(
    (w) => w.toLowerCase() !== currentWord.toLowerCase()
  );

  return unique.slice(0, 50).map((word) => ({
    label: word,
    kind: monaco.languages.CompletionItemKind.Variable,
    detail: 'Identifier in document',
    insertText: word,
    range,
    sortText: '99_' + word,
  }));
}

// ==========================================
// 1. GOLANG SUGGESTIONS & SNIPPETS
// ==========================================
const GO_KEYWORDS = [
  'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
  'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface',
  'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var',
];

const GO_TYPES = [
  'string', 'bool', 'int', 'int8', 'int16', 'int32', 'int64',
  'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uintptr',
  'byte', 'rune', 'float32', 'float64', 'complex64', 'complex128',
  'error', 'any', 'nil', 'iota', 'true', 'false',
];

const GO_BUILTINS = [
  { name: 'append', detail: 'append(slice []T, elems ...T) []T', doc: 'Appends elements to the end of a slice.' },
  { name: 'len', detail: 'len(v Type) int', doc: 'Returns the length of v according to its type.' },
  { name: 'cap', detail: 'cap(v Type) int', doc: 'Returns the capacity of v according to its type.' },
  { name: 'make', detail: 'make(t Type, size ...IntegerType) Type', doc: 'Allocates and initializes an object of slice, map, or chan.' },
  { name: 'new', detail: 'new(Type) *Type', doc: 'Allocates memory and returns a pointer zeroed for Type.' },
  { name: 'copy', detail: 'copy(dst, src []Type) int', doc: 'Copies elements from src to dst slice.' },
  { name: 'delete', detail: 'delete(m map[Type]Type1, key Type)', doc: 'Deletes the element with specified key from map.' },
  { name: 'panic', detail: 'panic(v any)', doc: 'Stops normal execution of the current goroutine.' },
  { name: 'recover', detail: 'recover() any', doc: 'Allows a program to manage behavior of a panicking goroutine.' },
  { name: 'close', detail: 'close(c chan<- Type)', doc: 'Closes a channel.' },
  { name: 'print', detail: 'print(args ...any)', doc: 'Prints arguments to standard error.' },
  { name: 'println', detail: 'println(args ...any)', doc: 'Prints arguments with new line to standard error.' },
];

const GO_PACKAGES = [
  { name: 'fmt', doc: 'Package fmt implements formatted I/O similar to C\'s printf and scanf.' },
  { name: 'os', doc: 'Package os provides a platform-independent interface to operating system functionality.' },
  { name: 'io', doc: 'Package io provides basic interfaces to I/O primitives.' },
  { name: 'net/http', doc: 'Package http provides HTTP client and server implementations.' },
  { name: 'strings', doc: 'Package strings implements simple functions to manipulate UTF-8 encoded strings.' },
  { name: 'strconv', doc: 'Package strconv implements conversions to and from string representations of basic data types.' },
  { name: 'time', doc: 'Package time provides functionality for measuring and displaying time.' },
  { name: 'sync', doc: 'Package sync provides basic synchronization primitives such as mutual exclusion locks.' },
  { name: 'context', doc: 'Package context defines the Context type, which carries deadlines, cancellation signals, and request-scoped values.' },
  { name: 'encoding/json', doc: 'Package json implements encoding and decoding of JSON.' },
  { name: 'errors', doc: 'Package errors implements functions to manipulate errors.' },
  { name: 'math', doc: 'Package math provides basic constants and mathematical functions.' },
  { name: 'log', doc: 'Package log implements a simple logging package.' },
];

const GO_FMT_MEMBERS = [
  { name: 'Println', detail: 'Println(a ...any) (n int, err error)', snippet: 'Println(${1:a})' },
  { name: 'Printf', detail: 'Printf(format string, a ...any) (n int, err error)', snippet: 'Printf("${1:%v}\\n", ${2:a})' },
  { name: 'Sprintf', detail: 'Sprintf(format string, a ...any) string', snippet: 'Sprintf("${1:%v}", ${2:a})' },
  { name: 'Errorf', detail: 'Errorf(format string, a ...any) error', snippet: 'Errorf("${1:failed: %w}", ${2:err})' },
  { name: 'Print', detail: 'Print(a ...any) (n int, err error)', snippet: 'Print(${1:a})' },
  { name: 'Scanln', detail: 'Scanln(a ...any) (n int, err error)', snippet: 'Scanln(&${1:a})' },
];

const GO_HTTP_MEMBERS = [
  { name: 'HandleFunc', detail: 'HandleFunc(pattern string, handler func(ResponseWriter, *Request))', snippet: 'HandleFunc("/${1:path}", func(w http.ResponseWriter, r *http.Request) {\n\t$0\n})' },
  { name: 'ListenAndServe', detail: 'ListenAndServe(addr string, handler Handler) error', snippet: 'ListenAndServe(":${1:8080}", ${2:nil})' },
  { name: 'Get', detail: 'Get(url string) (resp *Response, err error)', snippet: 'Get("${1:https://}")' },
  { name: 'Post', detail: 'Post(url, contentType string, body io.Reader) (resp *Response, err error)', snippet: 'Post("${1:url}", "${2:application/json}", ${3:body})' },
  { name: 'StatusOK', detail: 'StatusOK = 200', snippet: 'StatusOK' },
  { name: 'StatusNotFound', detail: 'StatusNotFound = 404', snippet: 'StatusNotFound' },
  { name: 'StatusInternalServerError', detail: 'StatusInternalServerError = 500', snippet: 'StatusInternalServerError' },
];

const GO_STRINGS_MEMBERS = [
  { name: 'Contains', detail: 'Contains(s, substr string) bool', snippet: 'Contains(${1:s}, ${2:substr})' },
  { name: 'Split', detail: 'Split(s, sep string) []string', snippet: 'Split(${1:s}, "${2:,}")' },
  { name: 'Join', detail: 'Join(elems []string, sep string) string', snippet: 'Join(${1:elems}, "${2:, }")' },
  { name: 'ReplaceAll', detail: 'ReplaceAll(s, old, new string) string', snippet: 'ReplaceAll(${1:s}, "${2:old}", "${3:new}")' },
  { name: 'TrimSpace', detail: 'TrimSpace(s string) string', snippet: 'TrimSpace(${1:s})' },
  { name: 'HasPrefix', detail: 'HasPrefix(s, prefix string) bool', snippet: 'HasPrefix(${1:s}, "${2:prefix}")' },
  { name: 'HasSuffix', detail: 'HasSuffix(s, suffix string) bool', snippet: 'HasSuffix(${1:s}, "${2:suffix}")' },
  { name: 'ToLower', detail: 'ToLower(s string) string', snippet: 'ToLower(${1:s})' },
  { name: 'ToUpper', detail: 'ToUpper(s string) string', snippet: 'ToUpper(${1:s})' },
];

function getGoCompletions(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  range: IRange
): CompletionItem[] {
  const lineUntilPos = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });

  const word = model.getWordUntilPosition(position).word;
  const items: CompletionItem[] = [];

  // Member access after dot
  if (lineUntilPos.match(/\bfmt\.\w*$/)) {
    return GO_FMT_MEMBERS.map((m) => ({
      label: m.name,
      kind: monaco.languages.CompletionItemKind.Method,
      detail: m.detail,
      insertText: m.snippet,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }));
  }

  if (lineUntilPos.match(/\bhttp\.\w*$/)) {
    return GO_HTTP_MEMBERS.map((m) => ({
      label: m.name,
      kind: monaco.languages.CompletionItemKind.Method,
      detail: m.detail,
      insertText: m.snippet,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }));
  }

  if (lineUntilPos.match(/\bstrings\.\w*$/)) {
    return GO_STRINGS_MEMBERS.map((m) => ({
      label: m.name,
      kind: monaco.languages.CompletionItemKind.Method,
      detail: m.detail,
      insertText: m.snippet,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }));
  }

  // Keywords
  for (const kw of GO_KEYWORDS) {
    items.push({
      label: kw,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: kw,
      range,
      sortText: '10_' + kw,
    });
  }

  // Types
  for (const t of GO_TYPES) {
    items.push({
      label: t,
      kind: monaco.languages.CompletionItemKind.TypeParameter,
      detail: 'Built-in Go type',
      insertText: t,
      range,
      sortText: '20_' + t,
    });
  }

  // Builtin functions
  for (const b of GO_BUILTINS) {
    items.push({
      label: b.name,
      kind: monaco.languages.CompletionItemKind.Function,
      detail: b.detail,
      documentation: b.doc,
      insertText: `${b.name}($0)`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
      sortText: '30_' + b.name,
    });
  }

  // Common Packages
  for (const p of GO_PACKAGES) {
    items.push({
      label: p.name,
      kind: monaco.languages.CompletionItemKind.Module,
      detail: `package ${p.name}`,
      documentation: p.doc,
      insertText: p.name,
      range,
      sortText: '40_' + p.name,
    });
  }

  // Snippets
  const snippets = [
    {
      label: 'main',
      detail: 'func main() { ... }',
      insertText: 'func main() {\n\t$0\n}',
    },
    {
      label: 'pkgm',
      detail: 'Package main with main func',
      insertText: 'package main\n\nimport (\n\t"fmt"\n)\n\nfunc main() {\n\tfmt.Println("${1:Hello, World!}")\n}',
    },
    {
      label: 'fn',
      detail: 'Function definition',
      insertText: 'func ${1:name}(${2:params}) ${3:error} {\n\t$0\n}',
    },
    {
      label: 'mfn',
      detail: 'Method on struct receiver',
      insertText: 'func (${1:r} *${2:Receiver}) ${3:MethodName}(${4:params}) ${5:error} {\n\t$0\n}',
    },
    {
      label: 'iferr',
      detail: 'if err != nil { return err }',
      insertText: 'if err != nil {\n\treturn ${1:err}\n}',
    },
    {
      label: 'forr',
      detail: 'for key, val := range collection',
      insertText: 'for ${1:k}, ${2:v} := range ${3:items} {\n\t$0\n}',
    },
    {
      label: 'fori',
      detail: 'for i := 0; i < n; i++',
      insertText: 'for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n\t$0\n}',
    },
    {
      label: 'struct',
      detail: 'type Name struct { ... }',
      insertText: 'type ${1:Name} struct {\n\t${2:Field} ${3:string}\n}',
    },
    {
      label: 'interface',
      detail: 'type Name interface { ... }',
      insertText: 'type ${1:Name} interface {\n\t${2:Method}() error\n}',
    },
  ];

  for (const s of snippets) {
    items.push({
      label: s.label,
      kind: monaco.languages.CompletionItemKind.Snippet,
      detail: s.detail,
      insertText: s.insertText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
      sortText: '01_' + s.label,
    });
  }

  // Document words
  items.push(...getDocumentWordCompletions(model, range, word));

  return items;
}

// ==========================================
// 2. DART SUGGESTIONS & SNIPPETS
// ==========================================
const DART_KEYWORDS = [
  'abstract', 'as', 'assert', 'async', 'await', 'break', 'case', 'catch',
  'class', 'const', 'continue', 'covariant', 'default', 'deferred', 'do',
  'dynamic', 'else', 'enum', 'export', 'extends', 'extension', 'external',
  'factory', 'false', 'final', 'finally', 'for', 'Function', 'get', 'hide',
  'if', 'implements', 'import', 'in', 'interface', 'is', 'late', 'library',
  'mixin', 'new', 'null', 'on', 'operator', 'part', 'required', 'rethrow',
  'return', 'set', 'show', 'static', 'super', 'switch', 'sync', 'this',
  'throw', 'true', 'try', 'typedef', 'var', 'void', 'while', 'with', 'yield',
];

const DART_TYPES = [
  'String', 'int', 'double', 'num', 'bool', 'List', 'Map', 'Set',
  'Future', 'Stream', 'Duration', 'DateTime', 'RegExp', 'Uri',
  'Object', 'dynamic', 'void', 'Null', 'Never', 'Iterable',
  'Widget', 'BuildContext', 'State', 'Key', 'Color',
];

const DART_COMMON_METHODS = [
  { name: 'print', detail: 'void print(Object? object)', snippet: 'print(${1:object});' },
  { name: 'toString', detail: 'String toString()', snippet: 'toString()' },
  { name: 'length', detail: 'int length', snippet: 'length' },
  { name: 'isEmpty', detail: 'bool isEmpty', snippet: 'isEmpty' },
  { name: 'isNotEmpty', detail: 'bool isNotEmpty', snippet: 'isNotEmpty' },
  { name: 'contains', detail: 'bool contains(Object? element)', snippet: 'contains(${1:element})' },
  { name: 'substring', detail: 'String substring(int start, [int? end])', snippet: 'substring(${1:start})' },
  { name: 'toLowerCase', detail: 'String toLowerCase()', snippet: 'toLowerCase()' },
  { name: 'toUpperCase', detail: 'String toUpperCase()', snippet: 'toUpperCase()' },
  { name: 'trim', detail: 'String trim()', snippet: 'trim()' },
  { name: 'split', detail: 'List<String> split(Pattern pattern)', snippet: 'split("${1:,}")' },
  { name: 'add', detail: 'void add(E value)', snippet: 'add(${1:value})' },
  { name: 'addAll', detail: 'void addAll(Iterable<E> iterable)', snippet: 'addAll(${1:iterable})' },
  { name: 'remove', detail: 'bool remove(Object? value)', snippet: 'remove(${1:value})' },
  { name: 'map', detail: 'Iterable<T> map<T>(T toElement(E e))', snippet: 'map((${1:e}) => ${2:e})' },
  { name: 'where', detail: 'Iterable<E> where(bool test(E element))', snippet: 'where((${1:e}) => ${2:test})' },
  { name: 'forEach', detail: 'void forEach(void action(E element))', snippet: 'forEach((${1:e}) {\n  $0\n})' },
  { name: 'toList', detail: 'List<E> toList()', snippet: 'toList()' },
];

function getDartCompletions(
  model: monaco.editor.ITextModel,
  _position: monaco.Position,
  range: IRange
): CompletionItem[] {
  const word = model.getWordUntilPosition(_position).word;
  const items: CompletionItem[] = [];

  // Keywords
  for (const kw of DART_KEYWORDS) {
    items.push({
      label: kw,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: kw,
      range,
      sortText: '10_' + kw,
    });
  }

  // Types
  for (const t of DART_TYPES) {
    items.push({
      label: t,
      kind: monaco.languages.CompletionItemKind.Class,
      detail: 'Dart standard type',
      insertText: t,
      range,
      sortText: '20_' + t,
    });
  }

  // Common methods
  for (const m of DART_COMMON_METHODS) {
    items.push({
      label: m.name,
      kind: monaco.languages.CompletionItemKind.Method,
      detail: m.detail,
      insertText: m.snippet,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
      sortText: '30_' + m.name,
    });
  }

  // Snippets
  const snippets = [
    {
      label: 'main',
      detail: 'void main() { ... }',
      insertText: 'void main() {\n  print("${1:Hello, Dart!}");\n}',
    },
    {
      label: 'mainasync',
      detail: 'void main() async { ... }',
      insertText: 'void main() async {\n  $0\n}',
    },
    {
      label: 'class',
      detail: 'Class declaration with constructor',
      insertText: 'class ${1:ClassName} {\n  final String ${2:name};\n\n  ${1:ClassName}({required this.${2:name}});\n}',
    },
    {
      label: 'stl',
      detail: 'Flutter StatelessWidget',
      insertText: 'class ${1:MyWidget} extends StatelessWidget {\n  const ${1:MyWidget}({super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    return ${2:const Placeholder()};\n  }\n}',
    },
    {
      label: 'stf',
      detail: 'Flutter StatefulWidget',
      insertText: 'class ${1:MyWidget} extends StatefulWidget {\n  const ${1:MyWidget}({super.key});\n\n  @override\n  State<${1:MyWidget}> createState() => _${1:MyWidget}State();\n}\n\nclass _${1:MyWidget}State extends State<${1:MyWidget}> {\n  @override\n  Widget build(BuildContext context) {\n    return ${2:const Placeholder()};\n  }\n}',
    },
    {
      label: 'fori',
      detail: 'for (var i = 0; i < n; i++)',
      insertText: 'for (var i = 0; i < ${1:length}; i++) {\n  $0\n}',
    },
    {
      label: 'fore',
      detail: 'for (final item in items)',
      insertText: 'for (final ${1:item} in ${2:items}) {\n  $0\n}',
    },
    {
      label: 'try',
      detail: 'try / catch block',
      insertText: 'try {\n  $1\n} catch (e) {\n  print(e);\n}',
    },
  ];

  for (const s of snippets) {
    items.push({
      label: s.label,
      kind: monaco.languages.CompletionItemKind.Snippet,
      detail: s.detail,
      insertText: s.insertText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
      sortText: '01_' + s.label,
    });
  }

  // Document words
  items.push(...getDocumentWordCompletions(model, range, word));

  return items;
}

// ==========================================
// 3. JAVA SUGGESTIONS & SNIPPETS
// ==========================================
const JAVA_KEYWORDS = [
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
  'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package',
  'private', 'protected', 'public', 'record', 'return', 'short', 'static',
  'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
  'transient', 'try', 'void', 'volatile', 'while', 'true', 'false', 'null',
];

const JAVA_TYPES = [
  'String', 'Object', 'Integer', 'Double', 'Boolean', 'Long', 'Float',
  'Character', 'Byte', 'Short', 'List', 'ArrayList', 'Map', 'HashMap',
  'Set', 'HashSet', 'Queue', 'LinkedList', 'Optional', 'Stream', 'Arrays',
  'Collections', 'Objects', 'Math', 'System', 'Exception', 'RuntimeException',
  'Thread', 'Runnable', 'StringBuilder', 'Scanner',
];

const JAVA_SYSTEM_MEMBERS = [
  { name: 'out.println', detail: 'System.out.println(String x)', snippet: 'out.println(${1:x});' },
  { name: 'out.print', detail: 'System.out.print(String x)', snippet: 'out.print(${1:x});' },
  { name: 'out.printf', detail: 'System.out.printf(String format, Object... args)', snippet: 'out.printf("${1:%s%n}", ${2:args});' },
  { name: 'currentTimeMillis', detail: 'System.currentTimeMillis()', snippet: 'currentTimeMillis()' },
  { name: 'nanoTime', detail: 'System.nanoTime()', snippet: 'nanoTime()' },
  { name: 'gc', detail: 'System.gc()', snippet: 'gc();' },
  { name: 'exit', detail: 'System.exit(int status)', snippet: 'exit(${1:0});' },
];

const JAVA_MATH_MEMBERS = [
  { name: 'max', detail: 'Math.max(a, b)', snippet: 'max(${1:a}, ${2:b})' },
  { name: 'min', detail: 'Math.min(a, b)', snippet: 'min(${1:a}, ${2:b})' },
  { name: 'abs', detail: 'Math.abs(a)', snippet: 'abs(${1:a})' },
  { name: 'sqrt', detail: 'Math.sqrt(a)', snippet: 'sqrt(${1:a})' },
  { name: 'pow', detail: 'Math.pow(a, b)', snippet: 'pow(${1:a}, ${2:b})' },
  { name: 'random', detail: 'Math.random()', snippet: 'random()' },
  { name: 'round', detail: 'Math.round(a)', snippet: 'round(${1:a})' },
  { name: 'PI', detail: 'Math.PI', snippet: 'PI' },
];

function getJavaCompletions(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  range: IRange
): CompletionItem[] {
  const lineUntilPos = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });

  const word = model.getWordUntilPosition(position).word;
  const items: CompletionItem[] = [];

  // Member access after System.
  if (lineUntilPos.match(/\bSystem\.\w*$/)) {
    return JAVA_SYSTEM_MEMBERS.map((m) => ({
      label: m.name,
      kind: monaco.languages.CompletionItemKind.Method,
      detail: m.detail,
      insertText: m.snippet,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }));
  }

  // Member access after Math.
  if (lineUntilPos.match(/\bMath\.\w*$/)) {
    return JAVA_MATH_MEMBERS.map((m) => ({
      label: m.name,
      kind: monaco.languages.CompletionItemKind.Method,
      detail: m.detail,
      insertText: m.snippet,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }));
  }

  // Keywords
  for (const kw of JAVA_KEYWORDS) {
    items.push({
      label: kw,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: kw,
      range,
      sortText: '10_' + kw,
    });
  }

  // Types
  for (const t of JAVA_TYPES) {
    items.push({
      label: t,
      kind: monaco.languages.CompletionItemKind.Class,
      detail: 'Java class',
      insertText: t,
      range,
      sortText: '20_' + t,
    });
  }

  // Snippets
  const snippets = [
    {
      label: 'psvm',
      detail: 'public static void main(String[] args) { ... }',
      insertText: 'public static void main(String[] args) {\n    $0\n}',
    },
    {
      label: 'sout',
      detail: 'System.out.println(...)',
      insertText: 'System.out.println($1);',
    },
    {
      label: 'souf',
      detail: 'System.out.printf(...)',
      insertText: 'System.out.printf("${1:%s%n}", ${2:args});',
    },
    {
      label: 'class',
      detail: 'public class ClassName { ... }',
      insertText: 'public class ${1:ClassName} {\n    $0\n}',
    },
    {
      label: 'fori',
      detail: 'for (int i = 0; i < max; i++)',
      insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:max}; ${1:i}++) {\n    $0\n}',
    },
    {
      label: 'foreach',
      detail: 'for (Type item : collection)',
      insertText: 'for (${1:String} ${2:item} : ${3:collection}) {\n    $0\n}',
    },
    {
      label: 'try',
      detail: 'try / catch block',
      insertText: 'try {\n    $1\n} catch (${2:Exception} e) {\n    e.printStackTrace();\n}',
    },
    {
      label: 'getter',
      detail: 'Getter method',
      insertText: 'public ${1:String} get${2:Field}() {\n    return this.${3:field};\n}',
    },
    {
      label: 'setter',
      detail: 'Setter method',
      insertText: 'public void set${2:Field}(${1:String} ${3:field}) {\n    this.${3:field} = ${3:field};\n}',
    },
  ];

  for (const s of snippets) {
    items.push({
      label: s.label,
      kind: monaco.languages.CompletionItemKind.Snippet,
      detail: s.detail,
      insertText: s.insertText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
      sortText: '01_' + s.label,
    });
  }

  // Document words
  items.push(...getDocumentWordCompletions(model, range, word));

  return items;
}

// ==========================================
// 4. C & C++ SUGGESTIONS & SNIPPETS
// ==========================================
const CPP_KEYWORDS = [
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'auto', 'bitand', 'bitor',
  'bool', 'break', 'case', 'catch', 'char', 'char8_t', 'char16_t', 'char32_t',
  'class', 'compl', 'concept', 'const', 'consteval', 'constexpr', 'constinit',
  'const_cast', 'continue', 'co_await', 'co_return', 'co_yield', 'decltype',
  'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum',
  'explicit', 'export', 'extern', 'false', 'final', 'float', 'for', 'friend',
  'goto', 'if', 'inline', 'int', 'long', 'mutable', 'namespace', 'new',
  'noexcept', 'not', 'not_eq', 'nullptr', 'operator', 'or', 'or_eq',
  'override', 'private', 'protected', 'public', 'register', 'reinterpret_cast',
  'requires', 'return', 'short', 'signed', 'sizeof', 'static', 'static_assert',
  'static_cast', 'struct', 'switch', 'template', 'this', 'thread_local',
  'throw', 'true', 'try', 'typedef', 'typeid', 'typename', 'union', 'unsigned',
  'using', 'virtual', 'void', 'volatile', 'wchar_t', 'while', 'xor', 'xor_eq',
];

const CPP_STD_MEMBERS = [
  { name: 'cout', detail: 'std::cout (standard output stream)', snippet: 'cout << ${1:message} << std::endl;' },
  { name: 'cin', detail: 'std::cin (standard input stream)', snippet: 'cin >> ${1:var};' },
  { name: 'cerr', detail: 'std::cerr (standard error stream)', snippet: 'cerr << ${1:error} << std::endl;' },
  { name: 'endl', detail: 'std::endl (newline and flush)', snippet: 'endl' },
  { name: 'string', detail: 'std::string', snippet: 'string' },
  { name: 'vector', detail: 'std::vector<T>', snippet: 'vector<${1:int}> ${2:vec};' },
  { name: 'map', detail: 'std::map<Key, Val>', snippet: 'map<${1:std::string}, ${2:int}> ${3:m};' },
  { name: 'unordered_map', detail: 'std::unordered_map<Key, Val>', snippet: 'unordered_map<${1:std::string}, ${2:int}> ${3:m};' },
  { name: 'set', detail: 'std::set<T>', snippet: 'set<${1:int}> ${2:s};' },
  { name: 'pair', detail: 'std::pair<T1, T2>', snippet: 'pair<${1:int}, ${2:int}> ${3:p};' },
  { name: 'tuple', detail: 'std::tuple<Types...>', snippet: 'tuple<${1:int}, ${2:std::string}> ${3:t};' },
  { name: 'make_pair', detail: 'std::make_pair(a, b)', snippet: 'make_pair(${1:a}, ${2:b})' },
  { name: 'make_unique', detail: 'std::make_unique<T>(args...)', snippet: 'make_unique<${1:Type}>($2)' },
  { name: 'make_shared', detail: 'std::make_shared<T>(args...)', snippet: 'make_shared<${1:Type}>($2)' },
  { name: 'unique_ptr', detail: 'std::unique_ptr<T>', snippet: 'unique_ptr<${1:Type}>' },
  { name: 'shared_ptr', detail: 'std::shared_ptr<T>', snippet: 'shared_ptr<${1:Type}>' },
  { name: 'optional', detail: 'std::optional<T>', snippet: 'optional<${1:int}>' },
  { name: 'sort', detail: 'std::sort(begin, end)', snippet: 'sort(${1:vec}.begin(), ${1:vec}.end());' },
  { name: 'find', detail: 'std::find(begin, end, value)', snippet: 'find(${1:vec}.begin(), ${1:vec}.end(), ${2:val});' },
  { name: 'move', detail: 'std::move(v)', snippet: 'move(${1:v})' },
  { name: 'min', detail: 'std::min(a, b)', snippet: 'min(${1:a}, ${2:b})' },
  { name: 'max', detail: 'std::max(a, b)', snippet: 'max(${1:a}, ${2:b})' },
  { name: 'to_string', detail: 'std::to_string(val)', snippet: 'to_string(${1:val})' },
];

function getCppCompletions(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  range: IRange
): CompletionItem[] {
  const lineUntilPos = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });

  const word = model.getWordUntilPosition(position).word;
  const items: CompletionItem[] = [];

  // Member access after std::
  if (lineUntilPos.match(/\bstd::\w*$/)) {
    return CPP_STD_MEMBERS.map((m) => ({
      label: m.name,
      kind: monaco.languages.CompletionItemKind.Method,
      detail: m.detail,
      insertText: m.snippet,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    }));
  }

  // Keywords
  for (const kw of CPP_KEYWORDS) {
    items.push({
      label: kw,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: kw,
      range,
      sortText: '10_' + kw,
    });
  }

  // Standard namespaces / headers
  const headers = ['iostream', 'vector', 'string', 'algorithm', 'memory', 'map', 'unordered_map', 'cmath', 'thread', 'chrono'];
  for (const h of headers) {
    items.push({
      label: `#include <${h}>`,
      kind: monaco.languages.CompletionItemKind.Module,
      detail: `C++ Standard Library header <${h}>`,
      insertText: `#include <${h}>`,
      range,
      sortText: '05_' + h,
    });
  }

  // Snippets
  const snippets = [
    {
      label: 'main',
      detail: 'int main(int argc, char* argv[]) { ... }',
      insertText: '#include <iostream>\n\nint main(int argc, char* argv[]) {\n    std::cout << "${1:Hello, World!}" << std::endl;\n    return 0;\n}',
    },
    {
      label: 'cout',
      detail: 'std::cout << ... << std::endl;',
      insertText: 'std::cout << $1 << std::endl;',
    },
    {
      label: 'cin',
      detail: 'std::cin >> ...;',
      insertText: 'std::cin >> $1;',
    },
    {
      label: 'fori',
      detail: 'for (size_t i = 0; i < n; ++i)',
      insertText: 'for (size_t ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n    $0\n}',
    },
    {
      label: 'fore',
      detail: 'for (const auto& item : container)',
      insertText: 'for (const auto& ${1:item} : ${2:container}) {\n    $0\n}',
    },
    {
      label: 'class',
      detail: 'class declaration with constructor and destructor',
      insertText: 'class ${1:ClassName} {\npublic:\n    ${1:ClassName}();\n    ~${1:ClassName}();\n\nprivate:\n    $0\n};',
    },
    {
      label: 'struct',
      detail: 'struct declaration',
      insertText: 'struct ${1:StructName} {\n    $0\n};',
    },
    {
      label: 'templ',
      detail: 'template <typename T>',
      insertText: 'template <typename ${1:T}>\n',
    },
    {
      label: 'guard',
      detail: 'Header include guard',
      insertText: '#ifndef ${1:HEADER_H}\n#define ${1:HEADER_H}\n\n$0\n\n#endif // ${1:HEADER_H}',
    },
  ];

  for (const s of snippets) {
    items.push({
      label: s.label,
      kind: monaco.languages.CompletionItemKind.Snippet,
      detail: s.detail,
      insertText: s.insertText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
      sortText: '01_' + s.label,
    });
  }

  // Document words
  items.push(...getDocumentWordCompletions(model, range, word));

  return items;
}

// Track whether providers are already registered
let registered = false;

/**
 * Registers intelligent code completion providers for Go, Dart, Java, and C/C++.
 */
export function registerLanguageSuggestions(monacoInstance: typeof monaco): void {
  if (registered) return;
  registered = true;

  // 1. Golang Completion Provider
  monacoInstance.languages.registerCompletionItemProvider('go', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: getGoCompletions(model, position, range),
      };
    },
  });

  // 2. Dart Completion Provider
  monacoInstance.languages.registerCompletionItemProvider('dart', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: getDartCompletions(model, position, range),
      };
    },
  });

  // 3. Java Completion Provider
  monacoInstance.languages.registerCompletionItemProvider('java', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: getJavaCompletions(model, position, range),
      };
    },
  });

  // 4. C & C++ Completion Providers (registered for both cpp and c)
  const cppProvider: monaco.languages.CompletionItemProvider = {
    triggerCharacters: ['.', ':', '>', '#'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: getCppCompletions(model, position, range),
      };
    },
  };

  monacoInstance.languages.registerCompletionItemProvider('cpp', cppProvider);
  monacoInstance.languages.registerCompletionItemProvider('c', cppProvider);
}

