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

  function handleAdminLogin(inputPassword) {
    getRaceConfig().then(config => {
      if (inputPassword === config?.admin_password) {
        setIsAdmin(true)
        setShowAdminLogin(false)
        setAdminError('')
        localStorage.setItem(ADMIN_STORAGE_KEY, 'true')
        setScreen('admin')
      } else {
        setAdminError('Mot de passe incorrect')
      }
    })
  }

  function handleAdminLogout() {
    setIsAdmin(false)
    localStorage.removeItem(ADMIN_STORAGE_KEY)
    setScreen('map')
  }

  const [titleTaps, setTitleTaps] = useState(0)
  function handleTitleTap() {
    const next = titleTaps + 1
    setTitleTaps(next)
    if (next >= 5) { setShowAdminLogin(true); setTitleTaps(0) }
    setTimeout(() => setTitleTaps(0), 3000)
  }

  if (!team) {
    return (
      <div className="app">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0ede8', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚗</span>
          <span style={{ fontSize: 17, fontWeight: 700 }} onClick={handleTitleTap}>HitchRace</span>
        </div>
        <LoginScreen onLogin={handleLogin} />
        {showAdminLogin && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 320 }}>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>⚙️ Accès organisateur</p>
              <input type="password" value={adminInput} onChange={e => setAdminInput(e.target.value)} placeholder="Mot de passe admin" style={{ marginBottom: 8 }} onKeyDown={e => e.key === 'Enter' && handleAdminLogin(adminInput)} autoFocus />
              {adminError && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{adminError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={() => handleAdminLogin(adminInput)}>Connexion</button>
                <button className="btn-outline" onClick={() => { setShowAdminLogin(false); setAdminInput(''); setAdminError('') }}>Annuler</button>
              </div>
            </div>
          </div>
        )}
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
            <MapScreen team={team} />
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
      <BottomNav current={screen} onChange={setScreen} />
      {isAdmin && screen !== 'admin' && (
        <button onClick={() => setScreen('admin')}
          style={{ position: 'absolute', top: 14, right: 16, background: '#fef3e2', color: '#b45309', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600, zIndex: 50 }}>
          ⚙️ Admin
        </button>
      )}
    </div>
  )
}
