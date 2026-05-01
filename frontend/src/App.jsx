import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import PrivateRoute from './components/PrivateRoute'
import HelpButton from './components/ui/HelpButton'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Ranking from './pages/Ranking'

function App() {
  return (
    <>
      <Navbar />
      <main className="container animate-fade-in-up">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/ranking" element={
            <PrivateRoute>
              <Ranking />
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      {/* Botón de ayuda flotante — visible en todas las páginas */}
      <HelpButton />
    </>
  )
}

export default App
