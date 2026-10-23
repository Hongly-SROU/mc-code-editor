# MC Code Editor

A fast, lightweight, browser-based code editor built with **Vue 3**, **TypeScript**, **Vite**, and **Monaco Editor**, styled with a clean VS Code aesthetic.

## Features

- **Monaco Editor Integration**: Full syntax highlighting (TypeScript, JavaScript, HTML, CSS, SCSS, JSON, Markdown, Python, Rust, Go, C++, SQL, Shell, etc.), code folding, bracket matching, minimap toggle, word wrap toggle, line numbers toggle, and smooth font rendering with ligatures.
- **Prettier Code Formatting**: Format documents on demand via toolbar button or keyboard shortcuts (`Shift + Alt + F` / `Option + Shift + F`). Supports TypeScript, JavaScript, JSON, HTML, CSS, SCSS, and Markdown without backend dependencies.
- **Split Editor Panes**:
  - Split vertically (left/right) or horizontally (top/bottom).
  - Resizable panes with a draggable divider.
  - Multi-tab management per pane with independent active files.
  - Move tabs between panes.
  - Content synchronization: single Monaco `ITextModel` per file prevents model duplicates and seamlessly syncs edits when viewing the same file in both panes.
- **Local File Access**:
  - Open and save files directly to local disk using native browser `FileSystemAccess API` (`window.showOpenFilePicker`, `window.showSaveFilePicker`).
  - Fallback to HTML5 file input and local Blob downloads on unsupported browsers or sandbox environments.
  - 100% client-side: zero telemetry, zero uploads, zero databases or backend servers.
- **File Management & Safety**:
  - Multiple open files with tab switching.
  - Unsaved change indicators (tabs and status bar).
  - Confirmation modal warning before discarding unsaved edits.
  - Collapsible file explorer sidebar (`Ctrl + B` / `Cmd + B`).
- **Theming & Preferences**:
  - Dark (`vs-dark`) and Light (`vs-light`) themes with custom VS Code-inspired color palettes.
  - Preferences modal for font size, tab width, space vs tab indentation, word wrap, minimap, semicolons, single quotes, and bracket spacing.
  - Persistent settings stored in `localStorage`.

## Keyboard Shortcuts

| Action | Windows / Linux | macOS |
|---|---|---|
| New File | `Ctrl + N` | `Cmd + N` |
| Open Local File | `Ctrl + O` | `Cmd + O` |
| Save File | `Ctrl + S` | `Cmd + S` |
| Save File As | `Ctrl + Shift + S` | `Cmd + Shift + S` |
| Format Document | `Shift + Alt + F` | `Option + Shift + F` |
| Close Active Tab | `Ctrl + W` | `Cmd + W` |
| Toggle Explorer Sidebar | `Ctrl + B` | `Cmd + B` |
| Toggle Split View | `Ctrl + \` | `Cmd + \` |

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── ConfirmModal.vue     # Dialog for discarding/saving unsaved changes
│   │   ├── EditorPane.vue       # Monaco editor instance wrapper with empty state
│   │   ├── EditorTabs.vue       # Tabs component per editor group
│   │   ├── EditorToolbar.vue    # Top actions toolbar
│   │   ├── FileExplorer.vue     # Collapsible sidebar with open files
│   │   ├── LanguageModal.vue    # Searchable language mode switcher
│   │   ├── SettingsModal.vue    # Configuration for editor & Prettier
│   │   ├── StatusBar.vue        # VS Code-like bottom status bar
│   │   └── ToastContainer.vue   # Feedback notifications
│   ├── composables/
│   │   ├── useEditorFiles.ts    # File collection, active state, dirty tracking, save/open
│   │   ├── useEditorGroups.ts   # Split panes state, tab groups, layout
│   │   ├── useSettings.ts       # Editor & Prettier settings with localStorage
│   │   └── useToast.ts          # Toast alert notifications
│   ├── services/
│   │   ├── fileSystem.ts        # FileSystemAccess API + fallback download/input
│   │   ├── formatter.ts         # Prettier standalone formatting
│   │   ├── languages.ts         # Language detection and supported grammars
│   │   └── monaco.ts            # Monaco model registry and theme configurations
│   ├── types/
│   │   └── editor.ts            # TypeScript interfaces and types
│   ├── App.vue                  # Main workspace layout and event coordination
│   ├── main.ts                  # Application entry point
│   ├── monacoWorker.ts          # Web worker environment for Monaco
│   └── style.css                # Global CSS variables for VS Code themes
├── test/
│   └── editor.test.ts           # Automated test suite
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Getting Started

### Development
```bash
npm install
npm run dev
```

### Run Tests
```bash
npm test
```

### Production Build
```bash
npm run build
npm run preview
```

