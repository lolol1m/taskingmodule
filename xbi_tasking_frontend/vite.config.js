import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

const keyPath  = '/certs/server.key'
const certPath = '/certs/server.crt'
const httpsConfig = (fs.existsSync(keyPath) && fs.existsSync(certPath))
  ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
  : false

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    https: httpsConfig,
    allowedHosts: ['tangy.local', 'localhost', '127.0.0.1'],
  },

  preview: {
    host: true,
    port: 4173,
    https: httpsConfig,
    allowedHosts: ['tangy.local', 'localhost', '127.0.0.1']
  },
})
