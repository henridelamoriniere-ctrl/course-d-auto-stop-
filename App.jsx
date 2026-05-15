import { useState } from 'react'
import { getRaceConfig } from './supabase'
import LoginScreen from './LoginScreen'
import MapScreen from './MapScreen'
import ChallengesScreen from './ChallengesScreen'
import LeaderboardScreen from './LeaderboardScreen'
import ChatScreen from './ChatScreen'
import AdminScreen from './AdminScreen'
import BottomNav from './BottomNav'

const STORAGE_KEY = 'hitchrace_team'
const ADMIN_STORAGE_KEY = 'hitchrace_admin'

export default function App() {
  const [team, setTeam] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
  })
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(ADMIN_STORAGE_KEY) === 'true')
  const [screen, setScreen] = useState('map')
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminInput, setAdminInput] = useState('')
  const [adminError, setAdminError] = useState('')

  function handleLogin(teamData) {
    setTeam(teamData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teamData))
  }

  function handleOpenAdmin() {
    if (isAdmin) {
      setScreen('admin')
    } else {
      setShowAdminLogin(true)
    }
  }

  function handleAdminLogin() {
    getRaceConfig().then(config => {
      if (adminInput === config?.admin_password) {
        setIsAdmin(true)
        setShowAdminLogin(false)
        setAdminError('')
        setAdminInput('')
        localStorage.setItem(ADMIN_STORAGE_KEY, 'true')
        setScreen('admin')
      } else {
        setAdminError('Mot de passe incorrect !')
      }
    })
  }

  function handleAdminLogout() {
    setIsAdmin(false)
    localStorage.removeItem(ADMIN_STORAGE_KEY)
    setScreen('map')
  }

  if (!team) {
    return (
      <div className="app">
        <LoginScreen onLogin={handleLogin} />
      </div>
    )
  }

  return (
    <div className="app">
      {isAdmin && screen === 'admin' ? (
        <AdminScreen onLogout={handleAdminLogout} />
      ) : (
        <>
          <div className={`screen ${screen === 'map' ? 'active' : ''}`}>
            <MapScreen team={team} onOpenAdmin={handleOpenAdmin} />
          </div>
          <div className={`screen ${screen === 'challenges' ? 'active' : ''}`}>
            <ChallengesScreen team={team} />
          </div>
          <div className={`screen ${screen === 'leaderboard' ? 'active' : ''}`}>
            <LeaderboardScreen team={team} />
          </div>
          <div className={`screen ${screen === 'chat' ? 'active' : ''}`}>
            <ChatScreen team={team} />
          </div>
        </>
      )}

      <BottomNav current={screen} onChange={setScreen} isAdmin={isAdmin} />

      {showAdminLogin && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, zIndex: 9999
        }}>
          <div style={{
            background: '#FFFDF8', borderRadius: 20, padding: 24,
            width: '100%', maxWidth: 340, border: '3px solid #F4A435'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, color: '#2D5016' }}>⚙️ Accès organisateur</h3>
            <p style={{ fontSize: 13, color: '#8B7355', fontWeight: 600, marginBottom: 16 }}>Entre le mot de passe pour accéder au panel admin.</p>
            <input
              type="password" value={adminInput}
              onChange={e => setAdminInput(e.target.value)}
              placeholder="Mot de passe"
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
              autoFocus style={{ marginBottom: 10 }}
            />
            {adminError && <p style={{ color: '#D85A30', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{adminError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={handleAdminLogin}>Connexion</button>
              <button className="btn-outline" onClick={() => { setShowAdminLogin(false); setAdminInput(''); setAdminError('') }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

