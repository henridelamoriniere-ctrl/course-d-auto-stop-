import { useState, useEffect } from 'react'
import { getOrCreateTeam, getAllTeams, setDepartureTime } from './supabase'

const COLORS = ['#F4A435','#4A7C59','#D85A30','#7F77DD','#D4537E','#378ADD','#2D5016','#E24B4A']

export default function LoginScreen({ onLogin }) {
  const [tab, setTab] = useState('create')
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [teams, setTeams] = useState([])
  const [loadingTeams, setLoadingTeams] = useState(false)

  useEffect(() => {
    if (tab === 'join') loadTeams()
  }, [tab])

  async function loadTeams() {
    setLoadingTeams(true)
    const data = await getAllTeams()
    setTeams(data)
    setLoadingTeams(false)
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Entre le nom de ton équipe !'); return }
    setLoading(true); setError('')
    try {
      const team = await getOrCreateTeam(name.trim(), color)
      onLogin(team)
    } catch (e) { setError('Erreur, réessaie !') }
    setLoading(false)
  }

  async function handleJoin(team) {
    setLoading(true)
    try { onLogin(team) } catch (e) { setError('Erreur, réessaie !') }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-logo">
        <div className="icon">🚗</div>
        <h1>HitchRace</h1>
        <p>Course d'auto-stop · Été 2025</p>
      </div>

      <div className="login-tabs">
        <button className={`login-tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>
          Créer une équipe
        </button>
        <button className={`login-tab ${tab === 'join' ? 'active' : ''}`} onClick={() => setTab('join')}>
          Rejoindre
        </button>
      </div>

      {tab === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="field-label">Nom de l'équipe</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex : Les Aventuriers 🌻"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div>
            <label className="field-label">Couleur de l'équipe</label>
            <div className="color-picker">
              {COLORS.map(c => (
                <div key={c} className={`color-dot ${color === c ? 'selected' : ''}`}
                  style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>
          {error && <p style={{ color: '#D85A30', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>{error}</p>}
          <button className="btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Connexion...' : "C'est parti ! 🚀"}
          </button>
          <p style={{ fontSize: 12, color: '#B4A090', textAlign: 'center', fontWeight: 600 }}>
            Si ton équipe existe déjà, utilise "Rejoindre"
          </p>
        </div>
      )}

      {tab === 'join' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, color: '#7A9060', fontWeight: 700, marginBottom: 4 }}>
            Rejoins ton équipe :
          </p>
          {loadingTeams && (
            <p style={{ textAlign: 'center', color: '#B4A090', padding: 20, fontSize: 14 }}>
              Chargement...
            </p>
          )}
          {!loadingTeams && teams.length === 0 && (
            <p style={{ textAlign: 'center', color: '#B4A090', padding: 20, fontSize: 14 }}>
              Pas encore d'équipes créées
            </p>
          )}
          {teams.map(t => (
            <div key={t.id} className="team-list-item" onClick={() => handleJoin(t)}>
              <div className="team-avatar" style={{ background: t.color }}>
                {t.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#3D2B1F' }}>{t.name}</p>
                <p style={{ fontSize: 12, color: '#8B7355', fontWeight: 600, marginTop: 2 }}>
                  {t.car_count} voiture{t.car_count > 1 ? 's' : ''} empruntée{t.car_count > 1 ? 's' : ''}
                  {t.departure_time ? ' · En route 🚗' : ' · Pas encore parti'}
                </p>
              </div>
              <span style={{ fontSize: 20 }}>→</span>
            </div>
          ))}
          {error && <p style={{ color: '#D85A30', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>{error}</p>}
        </div>
      )}
    </div>
  )
}
