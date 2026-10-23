import * as prettier from 'prettier/standalone';
import babelPlugin from 'prettier/plugins/babel';
import estreePlugin from 'prettier/plugins/estree';
import tsPlugin from 'prettier/plugins/typescript';
import htmlPlugin from 'prettier/plugins/html';
import postcssPlugin from 'prettier/plugins/postcss';
import markdownPlugin from 'prettier/plugins/markdown';
import type { EditorSettings } from '../types/editor';

export interface FormatResult {
  success: boolean;
  formatted?: string;
  error?: string;
}

export function isLanguageFormattable(language: string): boolean {
  const supported = [
    'javascript',
    'typescript',
    'json',
    'html',
    'css',
    'scss',
    'markdown',
  ];
  return supported.includes(language.toLowerCase());
}

export async function formatCode(
  code: string,
  language: string,
  settings: EditorSettings
): Promise<FormatResult> {
  const lang = language.toLowerCase();

  let parser: string;
  const plugins = [
    babelPlugin,
    estreePlugin,
    tsPlugin,
    htmlPlugin,
    postcssPlugin,
    markdownPlugin,
  ];

  switch (lang) {
    case 'javascript':
      parser = 'babel';
      break;
    case 'typescript':
      parser = 'typescript';
      break;
    case 'json':
      parser = 'json';
      break;
    case 'html':
      parser = 'html';
      break;
    case 'css':
      parser = 'css';
      break;
    case 'scss':
      parser = 'scss';
      break;
    case 'markdown':
      parser = 'markdown';
      break;
    default:
      return {
        success: false,
        error: `Formatting is not supported for language: ${language}`,
      };
  }

  try {
    const formatted = await prettier.format(code, {
      parser,
      plugins,
      tabWidth: settings.tabSize,
      useTabs: !settings.insertSpaces,
      semi: settings.semi,
      singleQuote: settings.singleQuote,
      bracketSpacing: settings.bracketSpacing,
    });

    return {
      success: true,
      formatted,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Format failed: ${errorMessage}`,
    };
  }
}

