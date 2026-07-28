import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Read the app version from package.json so it can be shown in the UI.
// Vite runs with the project root as cwd, so a relative path resolves correctly.
let appVersion = '0.0.0'
try {
  appVersion = JSON.parse(readFileSync('./package.json', 'utf-8')).version ?? appVersion
} catch {
  // Fall back to the default if package.json can't be read.
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
})
