import { useState } from 'react'
import { getOrCreateTeam, setDepartureTime } from '../lib/supabase'

const COLORS = ['#EF9F27','#7F77DD','#1D9E75','#D85A30','#D4537E','#378ADD','#E24B4A','#639922']

export default function LoginScreen({ onLogin }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!name.trim()) { setError('Entre le nom de ton équipe !'); return }
    setLoading(true)
    setError('')
    try {
      const team = await getOrCreateTeam(name.trim(), color)
      await setDepartureTime(team.id)
      onLogin(team)
    } catch (e) {
      setError('Erreur de connexion, réessaie.')
    }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-logo">
        <div className="icon">🚗</div>
        <h1>HitchRace</h1>
        <p>Course d'auto-stop · Édition 2025</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 6 }}>
            Nom de l'équipe
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex : Les Vagabonds"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div>
          <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 8 }}>
            Couleur de l'équipe
          </label>
          <div className="color-picker">
            {COLORS.map(c => (
              <div
                key={c}
                className={`color-dot ${color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        {error && (
          <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center' }}>{error}</p>
        )}

        <button className="btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'Connexion...' : 'Rejoindre la course →'}
        </button>

        <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center' }}>
          Si ton équipe existe déjà, tu récupères automatiquement ton profil
        </p>
      </div>
    </div>
  )
}
