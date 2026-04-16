import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
//#TODO: remove hardcoded host and cert paths
export default defineConfig({
  plugins: [react()],
    server: {
      host: "tangy.local",
      cors: false,
      hmr: {
        host: "tangy.local",
        protocol: 'wss',
      },
      https: {
        key: fs.readFileSync('./certs/keycloak.key'),
        cert: fs.readFileSync('./certs/keycloak.crt')
      },
    },
})
