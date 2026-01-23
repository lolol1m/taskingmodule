import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from './components/AuthGuard.jsx'
import MainPage from './pages/MainPage'
import './App.css'
import {LicenseInfo} from "@mui/x-license"

function App() {
  LicenseInfo.setLicenseKey(import.meta.env.VITE_MUI_X_LICENSE_KEY)
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AuthGuard>
            <MainPage />
          </AuthGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
