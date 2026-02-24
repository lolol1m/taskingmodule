import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
    server: {
      cors: false,
      https: {
        key: fs.readFileSync('./certs/keycloak.key'),
        cert: fs.readFileSync('./certs/keycloak.crt')
      },
    },
})
