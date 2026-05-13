import { useEffect, useState } from 'react'
import {
  getAllChallenges, upsertChallenge, deleteChallenge,
  getAllTeams, getAllCompletions, validateCompletion,
  getRaceConfig, updateRaceConfig, sendMessage, getLeaderboard
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
    await sendMessage('Orga 🏁', '#888780', '🚀 La course est officiellement lancée ! Bonne chance à toutes les équipes !', 'announcement')
    setConfig(prev => ({ ...prev, status: 'active' }))
  }

  async function handleStopRace() {
    if (!confirm('Terminer la course ?')) return
    await updateRaceConfig({ status: 'finished' })
    await sendMessage('Orga 🏁', '#888780', '🏁 La course est terminée ! Merci à tous les participants !', 'announcement')
    setConfig(prev => ({ ...prev, status: 'finished' }))
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
    await sendMessage('Orga 📢', '#888780', announcement.trim(), 'announcement')
    setAnnouncement('')
    alert('Annonce envoyée !')
  }

  if (!config) return <div style={{ padding: 20, color: '#888' }}>Chargement...</div>

  return (
    <>
      <div className="hdr">
        <div>
          <div className="hdr-title">⚙️ Panel Admin</div>
          <div className="hdr-sub" style={{ color: config.status === 'active' ? '#16a34a' : config.status === 'finished' ? '#dc2626' : '#888' }}>
            Course : {config.status === 'waiting' ? '⏳ En attente' : config.status === 'active' ? '🟢 En cours' : '🏁 Terminée'}
          </div>
        </div>
        <button className="btn-outline" onClick={onLogout} style={{ fontSize: 12 }}>Déconnexion</button>
      </div>

      <div className="tab-bar">
        {[['course','Course'],['defis','Défis'],['validation','Validation'],['equipes','Équipes'],['annonce','Annonce']].map(([k,l]) => (
          <button key={k} className={`tab-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}
            style={{ fontSize: 12, padding: '10px 10px' }}>
            {l}{k === 'validation' && pending.length > 0 && <span style={{ marginLeft: 4, background: '#EF9F27', color: '#fff', borderRadius: 99, padding: '1px 5px', fontSize: 10 }}>{pending.length}</span>}
          </button>
        ))}
      </div>

      <div className="scroll-content">

        {/* COURSE CONFIG */}
        {tab === 'course' && config && (
          <>
            <div className="card-white">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Statut de la course</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {config.status === 'waiting' && (
                  <button className="btn-primary" onClick={handleStartRace} style={{ background: '#16a34a' }}>
                    🚀 Lancer la course
                  </button>
                )}
                {config.status === 'active' && (
                  <button className="btn-primary" onClick={handleStopRace} style={{ background: '#dc2626' }}>
                    🏁 Terminer la course
                  </button>
                )}
                {config.status === 'finished' && (
                  <div style={{ padding: '10px 14px', background: '#d1fae5', borderRadius: 10, fontSize: 14, color: '#065f46', fontWeight: 500, width: '100%', textAlign: 'center' }}>
                    Course terminée !
                  </div>
                )}
              </div>
            </div>

            <div className="card-white">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Point de départ</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={config.start_location_name} onChange={e => setConfig(p => ({ ...p, start_location_name: e.target.value }))} placeholder="Nom du départ" />
                <div className="grid-2">
                  <input type="number" value={config.start_lat} step="0.0001" onChange={e => setConfig(p => ({ ...p, start_lat: parseFloat(e.target.value) }))} placeholder="Latitude" />
                  <input type="number" value={config.start_lng} step="0.0001" onChange={e => setConfig(p => ({ ...p, start_lng: parseFloat(e.target.value) }))} placeholder="Longitude" />
                </div>
              </div>
            </div>

            <div className="card-white">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Point d'arrivée</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={config.end_location_name} onChange={e => setConfig(p => ({ ...p, end_location_name: e.target.value }))} placeholder="Nom de l'arrivée" />
                <div className="grid-2">
                  <input type="number" value={config.end_lat} step="0.0001" onChange={e => setConfig(p => ({ ...p, end_lat: parseFloat(e.target.value) }))} placeholder="Latitude" />
                  <input type="number" value={config.end_lng} step="0.0001" onChange={e => setConfig(p => ({ ...p, end_lng: parseFloat(e.target.value) }))} placeholder="Longitude" />
                </div>
              </div>
            </div>

            <div className="card-white">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Mot de passe admin</div>
              <input value={config.admin_password} onChange={e => setConfig(p => ({ ...p, admin_password: e.target.value }))} type="text" placeholder="Mot de passe admin" />
            </div>

            <button className="btn-primary" onClick={handleSaveConfig} disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
            </button>
          </>
        )}

        {/* DÉFIS */}
        {tab === 'defis' && (
          <>
            <button className="btn-primary"
              onClick={() => setEditingChallenge({ title: '', description: '', points: 50, category: 'fun', proof_type: 'photo', validation_type: 'auto', active: true, sort_order: challenges.length })}>
              + Nouveau défi
            </button>

            {editingChallenge && (
              <div className="card-white">
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{editingChallenge.id ? 'Modifier' : 'Nouveau défi'}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={editingChallenge.title} onChange={e => setEditingChallenge(p => ({ ...p, title: e.target.value }))} placeholder="Titre du défi *" />
                  <input value={editingChallenge.description} onChange={e => setEditingChallenge(p => ({ ...p, description: e.target.value }))} placeholder="Description / règle" />
                  <div className="grid-2">
                    <input type="number" value={editingChallenge.points} onChange={e => setEditingChallenge(p => ({ ...p, points: parseInt(e.target.value) }))} placeholder="Points" />
                    <select value={editingChallenge.category} onChange={e => setEditingChallenge(p => ({ ...p, category: e.target.value }))}>
                      <option value="photo">Photo</option>
                      <option value="vehicule">Véhicule</option>
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
                      <option value="video">Vidéo</option>
                      <option value="both">Photo ou vidéo</option>
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
              <div key={ch.id} className="card-white">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: ch.active ? '#1a1a1a' : '#aaa', textDecoration: ch.active ? 'none' : 'line-through' }}>{ch.title}</p>
                      <span className="pill pill-amber">{ch.points} pts</span>
                    </div>
                    {ch.description && <p style={{ fontSize: 12, color: '#888' }}>{ch.description}</p>}
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 99, background: '#f3f4f6', color: '#6b7280' }}>{ch.category}</span>
                      <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 99, background: ch.validation_type === 'auto' ? '#d1fae5' : '#fef3e2', color: ch.validation_type === 'auto' ? '#065f46' : '#92400e' }}>{ch.validation_type}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn-outline" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => setEditingChallenge(ch)}>Éditer</button>
                    <button className="btn-outline" style={{ fontSize: 12, padding: '6px 10px', color: ch.active ? '#888' : '#16a34a' }} onClick={() => handleToggleChallenge(ch)}>
                      {ch.active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button className="btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleDeleteChallenge(ch.id)}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* VALIDATION */}
        {tab === 'validation' && (
          <>
            {pending.length === 0 && (
              <div style={{ textAlign: 'center', color: '#bbb', padding: 40, fontSize: 14 }}>
                Aucune validation en attente ✓
              </div>
            )}
            {pending.map(comp => (
              <div key={comp.id} className="card-white">
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{comp.challenges?.title}</p>
                  <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {comp.teams?.name} · {new Date(comp.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {comp.proof_url && (
                  <div style={{ marginBottom: 10 }}>
                    {comp.proof_type === 'video'
                      ? <video src={comp.proof_url} controls style={{ width: '100%', borderRadius: 8, maxHeight: 200 }} />
                      : <img src={comp.proof_url} alt="Preuve" style={{ width: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'cover' }} />
                    }
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" onClick={() => handleValidate(comp.id, true)} style={{ background: '#16a34a' }}>✓ Valider</button>
                  <button className="btn-primary" onClick={() => handleValidate(comp.id, false)} style={{ background: '#dc2626' }}>✗ Refuser</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ÉQUIPES */}
        {tab === 'equipes' && (
          <>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{teams.length}</div>
              <div style={{ fontSize: 13, color: '#888' }}>équipes inscrites</div>
            </div>
            {teams.map(t => (
              <div key={t.id} className="card-white" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="team-avatar" style={{ background: t.color }}>{t.name[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: '#888' }}>
                    {t.car_count} voitures
                    {t.departure_time && ` · Départ ${new Date(t.departure_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                    {t.arrival_time && <span style={{ color: '#16a34a', fontWeight: 600 }}> · Arrivée {new Date(t.arrival_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ANNONCES */}
        {tab === 'annonce' && (
          <div className="card-white">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>📢 Envoyer une annonce à tous</div>
            <textarea
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              placeholder="Ex: Checkpoint 2 actif ! Rendez-vous à Mâcon..."
              rows={4}
              style={{ resize: 'vertical', marginBottom: 10 }}
            />
            <button className="btn-primary" onClick={handleSendAnnouncement}>
              Envoyer l'annonce 📢
            </button>
          </div>
        )}

      </div>
    </>
  )
}
