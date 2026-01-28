import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from './components/AuthGuard.jsx'
import MainPage from './pages/MainPage'
import './App.css'
import 'react-toastify/dist/ReactToastify.css'
import { LicenseInfo } from '@mui/x-license'
import { ToastContainer, toast } from 'react-toastify'

function App() {
  LicenseInfo.setLicenseKey(import.meta.env.VITE_MUI_X_LICENSE_KEY)
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AuthGuard>
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick={false}
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
            />
            <MainPage />
          </AuthGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
