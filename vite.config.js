import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  define: {
    __APP_BUILD_TIME__: JSON.stringify(Date.now()),
  },
})

