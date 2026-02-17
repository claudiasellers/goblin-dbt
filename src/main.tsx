import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { UserProfileProvider } from './contexts/UserProfileContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <UserProfileProvider>
          <App />
        </UserProfileProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
