import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from './components/AuthGuard.jsx'
import MainPage from './pages/MainPage.jsx'
import './App.css'

function App() {
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
