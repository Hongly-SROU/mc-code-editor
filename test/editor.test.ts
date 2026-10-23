import {
  detectLanguage,
  SUPPORTED_LANGUAGES,
  normalizeFileName,
  LANGUAGE_TO_EXTENSION,
} from '../src/services/languages.ts';
import { formatCode, isLanguageFormattable } from '../src/services/formatter.ts';
import type { EditorSettings } from '../src/types/editor.ts';

const mockSettings: EditorSettings = {
  theme: 'vs-dark',
  fontSize: 14,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: 'on',
  minimap: true,
  lineNumbers: 'on',
  semi: true,
  singleQuote: true,
  bracketSpacing: true,
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log('--- Testing Language Detection ---');
  assert(detectLanguage('index.ts') === 'typescript', 'detect .ts as typescript');
  assert(detectLanguage('main.js') === 'javascript', 'detect .js as javascript');
  assert(detectLanguage('app.vue') === 'html', 'detect .vue as html/template');
  assert(detectLanguage('data.json') === 'json', 'detect .json as json');
  assert(detectLanguage('style.css') === 'css', 'detect .css as css');
  assert(detectLanguage('theme.scss') === 'scss', 'detect .scss as scss');
  assert(detectLanguage('README.md') === 'markdown', 'detect .md as markdown');
  assert(detectLanguage('server.py') === 'python', 'detect .py as python');
  assert(detectLanguage('main.rs') === 'rust', 'detect .rs as rust');
  assert(detectLanguage('script.sh') === 'shell', 'detect .sh as shell');
  assert(detectLanguage('Dockerfile') === 'dockerfile', 'detect Dockerfile as dockerfile');
  assert(detectLanguage('unknown.xyz') === 'plaintext', 'detect unknown as plaintext');
  assert(SUPPORTED_LANGUAGES.length >= 10, 'SUPPORTED_LANGUAGES has sufficient modes');

  console.log('\n--- Testing File Extension Normalization & Custom Extensions ---');
  assert(normalizeFileName('index') === 'index.ts', 'default extension is .ts when none provided');
  assert(normalizeFileName('my-script') === 'my-script.ts', 'defaults to .ts');
  assert(normalizeFileName('app.vue') === 'app.vue', 'preserves .vue extension');
  assert(normalizeFileName('style.css') === 'style.css', 'preserves .css extension');
  assert(normalizeFileName('server.py') === 'server.py', 'preserves .py extension');
  assert(normalizeFileName('data.json') === 'data.json', 'preserves .json extension');
  assert(normalizeFileName('doc.md') === 'doc.md', 'preserves .md extension');
  assert(normalizeFileName('custom.myext') === 'custom.myext', 'allows any custom extension');
  assert(detectLanguage('custom.myext') === 'plaintext', 'custom unknown extension is handled safely');
  assert(LANGUAGE_TO_EXTENSION['python'] === 'py', 'language mapping for python');
  assert(LANGUAGE_TO_EXTENSION['typescript'] === 'ts', 'language mapping for typescript');
  assert(LANGUAGE_TO_EXTENSION['javascript'] === 'js', 'language mapping for javascript');

  console.log('\n--- Testing Prettier Formatter ---');
  // TypeScript format
  const tsInput = 'const   greet=( name:string ):string=>{return   `hello ${name}` }';
  const tsRes = await formatCode(tsInput, 'typescript', mockSettings);
  assert(tsRes.success === true, 'TypeScript formats successfully');
  assert(
    tsRes.formatted?.includes("const greet = (name: string): string => {\n  return `hello ${name}`;\n};"),
    'TypeScript formatted output adheres to Prettier config'
  );

  // JavaScript format
  const jsInput = 'function  add(a,b){return   a+b}';
  const jsRes = await formatCode(jsInput, 'javascript', mockSettings);
  assert(jsRes.success === true, 'JavaScript formats successfully');
  assert(
    jsRes.formatted?.includes('function add(a, b) {\n  return a + b;\n}'),
    'JavaScript formatted output has correct semicolons and indentation'
  );

  // JSON format
  const jsonInput = '{"a":1, "b": [2,3] }';
  const jsonRes = await formatCode(jsonInput, 'json', mockSettings);
  assert(jsonRes.success === true, 'JSON formats successfully');
  assert(
    jsonRes.formatted?.includes('"a": 1') && jsonRes.formatted?.includes('"b": [2, 3]'),
    'JSON formatted output matches pretty JSON'
  );

  // CSS format
  const cssInput = 'body{color:red;   margin:0;}';
  const cssRes = await formatCode(cssInput, 'css', mockSettings);
  assert(cssRes.success === true, 'CSS formats successfully');
  assert(
    cssRes.formatted?.includes('body {\n  color: red;\n  margin: 0;\n}'),
    'CSS formatted output has clean rules'
  );

  // Markdown format
  const mdInput = '#   Title\nsome    text';
  const mdRes = await formatCode(mdInput, 'markdown', mockSettings);
  assert(mdRes.success === true, 'Markdown formats successfully');
  assert(
    mdRes.formatted?.includes('# Title\n\nsome text'),
    'Markdown formatted output is canonical'
  );

  // Unsupported language format handling
  assert(!isLanguageFormattable('python'), 'Python correctly reported as unformattable by Prettier standalone');
  const unsuppRes = await formatCode('print("hello")', 'python', mockSettings);
  assert(unsuppRes.success === false, 'Formatting unsupported language returns success=false');
  assert(
    unsuppRes.error?.includes('not supported'),
    'Formatting unsupported language returns friendly message'
  );

  // Broken syntax error handling
  const brokenTs = 'const x = {;';
  const brokenRes = await formatCode(brokenTs, 'typescript', mockSettings);
  assert(brokenRes.success === false, 'Syntax error returns success=false');
  assert(
    brokenRes.error?.includes('Format failed'),
    'Syntax error returns error description without crashing'
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test run failed with error:', e);
  process.exit(1);
});
