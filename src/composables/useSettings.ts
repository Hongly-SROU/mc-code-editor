import { ref, watch } from 'vue';
import type { EditorSettings } from '../types/editor';

const STORAGE_KEY = 'mc_editor_settings_v1';

const defaultSettings: EditorSettings = {
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

function loadSettings(): EditorSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Error loading settings from localStorage:', err);
  }
  return { ...defaultSettings };
}

export function useSettings() {
  const settings = ref<EditorSettings>(loadSettings());

  watch(
    settings,
    (val) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
      applyTheme(val.theme);
    },
    { deep: true, immediate: true }
  );

  function applyTheme(theme: 'vs-dark' | 'vs-light') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function toggleTheme() {
    settings.value.theme =
      settings.value.theme === 'vs-dark' ? 'vs-light' : 'vs-dark';
  }

  function toggleMinimap() {
    settings.value.minimap = !settings.value.minimap;
  }

  function toggleWordWrap() {
    settings.value.wordWrap = settings.value.wordWrap === 'on' ? 'off' : 'on';
  }

  return {
    settings,
    toggleTheme,
    toggleMinimap,
    toggleWordWrap,
  };
}

