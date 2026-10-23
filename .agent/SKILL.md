# Vue.js Code Editor & Server Application Standards

## 1. Tech Stack & Core Architecture
- **Framework:** Vue 3.
- **API Style:** Strictly use the Composition API with `<script setup>`.
- **Language:** TypeScript (strict mode enabled).
- **State Management:** Pinia (for managing open files, active tabs, and server connection state).
- **Code Editor Component:** Use `monaco-editor` (or `@guolao/vue-monaco-editor` wrapper) for the core text editing experience.
- **Server Communication:** Use WebSockets (e.g., `socket.io-client` or native `WebSocket`) for real-time code execution, terminal output, and collaborative editing.

## 2. Component Patterns
- **Reactivity:** Use `ref` for primitives and `reactive` for deeply nested objects.
- **Props:** Use `defineProps<{ ... }>()` with TypeScript interfaces. Prefer reactive props destructuring (Vue 3.5+).
- **Editor Lifecycle:** Initialize the Monaco Editor instance in `onMounted` and ensure it is properly disposed of in `onBeforeUnmount` to prevent memory leaks.
- **Template Refs:** Use `useTemplateRef()` for accessing DOM elements like the editor container.

## 3. Code Editor Specific Guidelines
- **Lazy Loading:** Dynamically import the Monaco Editor and language workers to keep the initial application bundle size small.
- **State Syncing:** Debounce editor input (e.g., via `useDebounceFn` from VueUse) before sending payload updates to the server to prevent network flooding.
- **Window Resizing:** Attach a `ResizeObserver` to the editor container and call `editor.layout()` when the window or panel size changes.

## 4. Server Integration & State
- **File System:** Store the virtual file system tree in a Pinia store.
- **Async Operations:** Wrap API calls to the code server (saving files, triggering builds) in reusable composables (e.g., `useCodeExecution()`).
- **Error Handling:** Gracefully handle WebSocket disconnections with automatic reconnection logic and visual indicators in the UI.

## 5. Styling & Layout
- Use CSS Grid/Flexbox for the IDE layout (Sidebar for file tree, main panel for editor, bottom panel for terminal).
- Ensure the editor container has explicitly defined height/width (or `flex: 1` with `overflow: hidden`) so Monaco can calculate its dimensions correctly.