import { useEffect, useState } from 'react'
import {
  getAllChallenges, upsertChallenge, deleteChallenge,
  getAllTeams, getAllCompletions, validateCompletion,
  getRaceConfig, updateRaceConfig, sendMessage, supabase
} from './supabase'

export default function AdminScreen({ onLogout }) {
  const [tab, setTab] = useState('course')
  const [config, setConfig] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [teams, setTeams] = useState([])
  const [pending, setPending] = useState([])
  const [editingChallenge, setEditingChallenge] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [cfg, chs, tms, comps] = await Promise.all([
      getRaceConfig(), getAllChallenges(), getAllTeams(), getAllCompletions()
    ])
    setConfig(cfg)
    setChallenges(chs)
    setTeams(tms)
    setPending(comps.filter(c => c.status === 'pending'))
  }

  async function handleSaveConfig() {
    setSaving(true)
    await updateRaceConfig(config)
    setSaving(false)
    alert('Configuration sauvegardée !')
  }

  async function handleStartRace() {
    if (!confirm('Lancer la course maintenant ?')) return
    await updateRaceConfig({ status: 'active', started_at: new Date().toISOString() })
    await sendMessage('Orga 🏁', '#4A7C59', '🚀 La course est officiellement lancée ! Bonne chance à toutes les équipes !', 'announcement')
    setConfig(prev => ({ ...prev, status: 'active' }))
  }

  async function handleStopRace() {
    if (!confirm('Terminer la course ?')) return
    await updateRaceConfig({ status: 'finished' })
    await sendMessage('Orga 🏁', '#4A7C59', '🏁 La course est terminée ! Bravo à tous les participants !', 'announcement')
    setConfig(prev => ({ ...prev, status: 'finished' }))
  }

  async function handleResetAll() {
    if (!confirm('⚠️ ATTENTION ! Remettre à zéro TOUTES les données ?\n\nÉquipes, photos, messages, positions GPS...\n\nCette action est IRRÉVERSIBLE !')) return
    if (!confirm('Dernière confirmation : effacer toutes les données de la course ?')) return
    setResetting(true)
    try {
      await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('challenge_completions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('team_locations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await updateRaceConfig({ status: 'waiting', started_at: null })
      setConfig(prev => ({ ...prev, status: 'waiting', started_at: null }))
      setTeams([])
      setPending([])
      alert('✅ App remise à zéro ! Tout est prêt pour une nouvelle course.')
    } catch (e) {
      alert('Erreur lors de la remise à zéro. Réessaie.')
    }
    setResetting(false)
  }

  async function handleValidate(id, approved) {
    await validateCompletion(id, approved)
    await loadAll()
  }

  async function handleSaveChallenge() {
    if (!editingChallenge.title) return
    await upsertChallenge(editingChallenge)
    setEditingChallenge(null)
    await loadAll()
  }

  async function handleToggleChallenge(ch) {
    await upsertChallenge({ ...ch, active: !ch.active })
    await loadAll()
  }

  async function handleDeleteChallenge(id) {
    if (!confirm('Supprimer ce défi ?')) return
    await deleteChallenge(id)
    await loadAll()
  }

  async function handleSendAnnouncement() {
    if (!announcement.trim()) return
    await sendMessage('Orga 📢', '#4A7C59', announcement.trim(), 'announcement')
    setAnnouncement('')
    alert('Annonce envoyée à tous les participants !')
  }

  if (!config) return <div style={{ padding: 20, color: '#8B7355', fontWeight: 700 }}>Chargement...</div>

  const tabs = [
    { id: 'course', label: '⚙️ Course' },
    { id: 'annonce', label: '📢 Annonce' },
    { id: 'validation', label: `✅ Validation${pending.length > 0 ? ` (${pending.length})` : ''}` },
    { id: 'defis', label: '🏆 Défis' },
    { id: 'equipes', label: '👥 Équipes' },
  ]

  return (
    <>
      <div className="hdr hdr-dark">
        <div>
          <div className="hdr-title">⚙️ Panel Admin</div>
          <div className="hdr-sub" style={{ color: config.status === 'active' ? '#7BC67E' : config.status === 'finished' ? '#F5C4B3' : 'rgba(255,255,255,0.6)' }}>
            {config.status === 'waiting' ? '⏳ En attente' : config.status === 'active' ? '🟢 Course en cours' : '🏁 Terminée'}
          </div>
        </div>
        <button className="btn-outline" onClick={onLogout} style={{ fontSize: 12, color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
          Déconnexion
        </button>
      </div>

      <div className="admin-tab-bar">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            style={{ fontSize: 12, padding: '10px 12px', whiteSpace: 'nowrap' }}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="scroll-content">

        {tab === 'course' && config && (
          <>
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2D5016', marginBottom: 12 }}>Statut de la course</div>
              {config.status === 'waiting' && (
                <button className="btn-green" onClick={handleStartRace}>🚀 Lancer la course !</button>
              )}
              {config.status === 'active' && (
                <button style={{ width: '100%', padding: 12, fontSize: 14, background: '#FDECEA', color: '#D85A30', border: '2px solid #F5C4B3', borderRadius: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }} onClick={handleStopRace}>
                  🏁 Terminer la course
                </button>
              )}
              {config.status === 'finished' && (
                <div style={{ padding: 14, background: '#E0F8E0', borderRadius: 12, textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#1A4A1F' }}>
                  Course terminée ! 🎉
                </div>
              )}
            </div>

            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2D5016', marginBottom: 12 }}>🚩 Point de départ</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={config.start_location_name} onChange={e => setConfig(p => ({ ...p, start_location_name: e.target.value }))} placeholder="Nom du départ" />
                <div className="grid-2">
                  <input type="number" value={config.start_lat} step="0.0001" onChange={e => setConfig(p => ({ ...p, start_lat: parseFloat(e.target.value) }))} placeholder="Latitude" />
                  <input type="number" value={config.start_lng} step="0.0001" onChange={e => setConfig(p => ({ ...p, start_lng: parseFloat(e.target.value) }))} placeholder="Longitude" />
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2D5016', marginBottom: 12 }}>🏁 Point d'arrivée</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={config.end_location_name} onChange={e => setConfig(p => ({ ...p, end_location_name: e.target.value }))} placeholder="Nom de l'arrivée" />
                <div className="grid-2">
                  <input type="number" value={config.end_lat} step="0.0001" onChange={e => setConfig(p => ({ ...p, end_lat: parseFloat(e.target.value) }))} placeholder="Latitude" />
                  <input type="number" value={config.end_lng} step="0.0001" onChange={e => setConfig(p => ({ ...p, end_lng: parseFloat(e.target.value) }))} placeholder="Longitude" />
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2D5016', marginBottom: 8 }}>🔐 Mot de passe admin</div>
              <input value={config.admin_password} onChange={e => setConfig(p => ({ ...p, admin_password: e.target.value }))} type="text" />
            </div>

            <button className="btn-primary" onClick={handleSaveConfig} disabled={saving}>
              {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder la configuration'}
            </button>

            <div style={{ marginTop: 8, padding: 16, background: '#FDECEA', border: '2px solid #F5C4B3', borderRadius: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#993C1D', marginBottom: 8 }}>⚠️ Zone dangereuse</div>
              <p style={{ fontSize: 12, color: '#D85A30', fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
                Remet l'app à zéro : supprime toutes les équipes, messages, photos et positions GPS. À utiliser avant le jour J pour repartir de zéro.
              </p>
              <button
                onClick={handleResetAll}
                disabled={resetting}
                style={{ width: '100%', padding: 12, background: '#D85A30', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>
                {resetting ? '⏳ Remise à zéro...' : '🗑️ Remettre l\'app à zéro'}
              </button>
            </div>
          </>
        )}

        {tab === 'annonce' && (
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 800, color: '#2D5016', marginBottom: 12 }}>
              📢 Envoyer une annonce à tous les participants
            </div>
            <p style={{ fontSize: 12, color: '#8B7355', fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
              L'annonce apparaîtra dans le chat "Annonces" de tous les participants en temps réel.
            </p>
            <textarea
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              placeholder="Ex : ⚡ Défi surprise ! Les 3 premières équipes à envoyer une photo avec un élu local gagnent 50 pts bonus !"
              rows={4}
              style={{ resize: 'vertical', marginBottom: 12, lineHeight: 1.5 }}
            />
            <button className="btn-primary" onClick={handleSendAnnouncement} disabled={!announcement.trim()}>
              📢 Envoyer l'annonce à tous !
            </button>
          </div>
        )}

        {tab === 'validation' && (
          <>
            {pending.length === 0 && (
              <div style={{ textAlign: 'center', color: '#B4A090', padding: 40, fontSize: 14, fontWeight: 700 }}>
                ✅ Aucune validation en attente !
              </div>
            )}
            {pending.map(comp => (
              <div key={comp.id} className="card">
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#2D5016' }}>{comp.challenges?.title}</p>
                  <p style={{ fontSize: 12, color: '#8B7355', fontWeight: 600, marginTop: 2 }}>
                    👥 {comp.teams?.name} · {new Date(comp.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {comp.proof_url && (
                  <img src={comp.proof_url} alt="Preuve"
                    style={{ width: '100%', borderRadius: 12, marginBottom: 12, objectFit: 'cover', maxHeight: 250, border: '2px solid #E8D5B0', cursor: 'pointer' }}
                    onClick={() => window.open(comp.proof_url, '_blank')} />
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-green" onClick={() => handleValidate(comp.id, true)} style={{ flex: 1, padding: 12, fontSize: 14 }}>
                    ✅ Valider
                  </button>
                  <button style={{ flex: 1, padding: 12, fontSize: 14, background: '#FDECEA', color: '#D85A30', border: '2px solid #F5C4B3', borderRadius: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }} onClick={() => handleValidate(comp.id, false)}>
                    ❌ Refuser
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'defis' && (
          <>
            <button className="btn-primary" onClick={() => setEditingChallenge({ title: '', description: '', points: 20, category: 'fun', proof_type: 'photo', validation_type: 'manual', active: true, sort_order: challenges.length })}>
              + Nouveau défi
            </button>

            {editingChallenge && (
              <div className="card">
                <div style={{ fontSize: 13, fontWeight: 800, color: '#2D5016', marginBottom: 12 }}>
                  {editingChallenge.id ? 'Modifier le défi' : 'Nouveau défi'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input value={editingChallenge.title} onChange={e => setEditingChallenge(p => ({ ...p, title: e.target.value }))} placeholder="Titre du défi *" />
                  <input value={editingChallenge.description} onChange={e => setEditingChallenge(p => ({ ...p, description: e.target.value }))} placeholder="Description / règle" />
                  <div className="grid-2">
                    <input type="number" value={editingChallenge.points} onChange={e => setEditingChallenge(p => ({ ...p, points: parseInt(e.target.value) }))} placeholder="Points" />
                    <select value={editingChallenge.category} onChange={e => setEditingChallenge(p => ({ ...p, category: e.target.value }))}>
                      <option value="rencontres">Rencontres</option>
                      <option value="vehicules">Véhicules</option>
                      <option value="fun">Fun</option>
                      <option value="bonus">Bonus</option>
                    </select>
                  </div>
                  <div className="grid-2">
                    <select value={editingChallenge.validation_type} onChange={e => setEditingChallenge(p => ({ ...p, validation_type: e.target.value }))}>
                      <option value="auto">Auto-validé</option>
                      <option value="manual">Validation manuelle</option>
                    </select>
                    <select value={editingChallenge.proof_type} onChange={e => setEditingChallenge(p => ({ ...p, proof_type: e.target.value }))}>
                      <option value="photo">Photo</option>
                      <option value="video">Vidéo (WhatsApp)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" onClick={handleSaveChallenge}>Sauvegarder</button>
                    <button className="btn-outline" onClick={() => setEditingChallenge(null)}>Annuler</button>
                  </div>
                </div>
              </div>
            )}

            {challenges.map(ch => (
              <div key={ch.id} className="card" style={{ opacity: ch.active ? 1 : 0.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: ch.active ? '#2D5016' : '#8B7355' }}>{ch.title}</p>
                      <span className="pill pill-amber">{ch.points} pts</span>
                    </div>
                    {ch.description && <p style={{ fontSize: 12, color: '#8B7355', fontWeight: 600 }}>{ch.description}</p>}
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <span className="pill pill-gray" style={{ fontSize: 11 }}>{ch.category}</span>
                      <span className={`pill ${ch.validation_type === 'auto' ? 'pill-green' : 'pill-orange'}`} style={{ fontSize: 11 }}>{ch.validation_type}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn-outline" style={{ fontSize: 11, padding: '5px 8px' }} onClick={() => setEditingChallenge(ch)}>Éditer</button>
                    <button className="btn-outline" style={{ fontSize: 11, padding: '5px 8px', color: ch.active ? '#D85A30' : '#4A7C59', borderColor: ch.active ? '#F5C4B3' : '#A8D5B5' }} onClick={() => handleToggleChallenge(ch)}>
                      {ch.active ? 'OFF' : 'ON'}
                    </button>
                    <button style={{ padding: '5px 8px', fontSize: 11, background: '#FDECEA', color: '#D85A30', border: '2px solid #F5C4B3', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }} onClick={() => handleDeleteChallenge(ch.id)}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'equipes' && (
          <>
            <div className="card-dark" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#F4A435' }}>{teams.length}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>équipes inscrites</div>
            </div>
            {teams.map(t => (
              <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                  {t.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#2D5016' }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: '#8B7355', fontWeight: 600, marginTop: 2 }}>
                    🚗 {t.car_count} voitures
                    {t.departure_time && ` · Départ ${new Date(t.departure_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                    {t.arrival_time && <span style={{ color: '#2D5016', fontWeight: 800 }}> · 🏁 {new Date(t.arrival_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}

      </div>
    </>
  )
}
