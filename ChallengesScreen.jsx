import { useEffect, useRef, useState } from 'react'
import { supabase, getChallenges, getTeamCompletions, submitChallenge } from '../supabase'

const CATEGORY_ICONS = {
  photo: '📸', vehicule: '🚗', fun: '🎯', bonus: '⭐'
}

const STATUS_LABEL = {
  pending: { label: 'En attente de validation', color: '#92400e', bg: '#fef3e2' },
  approved: { label: 'Validé ✓', color: '#065f46', bg: '#d1fae5' },
  rejected: { label: 'Refusé ✗', color: '#991b1b', bg: '#fee2e2' },
}

export default function ChallengesScreen({ team }) {
  const [challenges, setChallenges] = useState([])
  const [completions, setCompletions] = useState({})
  const [uploading, setUploading] = useState(null)
  const fileInputRef = useRef(null)
  const activeChallengeRef = useRef(null)

  useEffect(() => {
    loadData()
    const channel = supabase.channel('completions-' + team.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_completions',
        filter: `team_id=eq.${team.id}` }, loadData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [team.id])

  async function loadData() {
    const [chs, comps] = await Promise.all([getChallenges(), getTeamCompletions(team.id)])
    setChallenges(chs)
    const compMap = {}
    comps.forEach(c => { compMap[c.challenge_id] = c })
    setCompletions(compMap)
  }

  function handleUploadClick(challenge) {
    activeChallengeRef.current = challenge
    fileInputRef.current.accept = challenge.proof_type === 'video' ? 'video/*' : 'image/*,video/*'
    fileInputRef.current.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file || !activeChallengeRef.current) return
    const challenge = activeChallengeRef.current
    setUploading(challenge.id)
    try {
      await submitChallenge(team.id, challenge.id, file)
      await loadData()
    } catch (err) {
      alert('Erreur lors de l\'upload, réessaie.')
    }
    setUploading(null)
    e.target.value = ''
  }

  const approved = Object.values(completions).filter(c => c.status === 'approved').length
  const totalPts = challenges
    .filter(ch => completions[ch.id]?.status === 'approved')
    .reduce((s, ch) => s + ch.points, 0)

  // Group by category
  const grouped = {}
  challenges.forEach(ch => {
    if (!grouped[ch.category]) grouped[ch.category] = []
    grouped[ch.category].push(ch)
  })

  return (
    <>
      <div className="hdr">
        <div>
          <div className="hdr-title">Défis</div>
          <div className="hdr-sub">{approved}/{challenges.length} validés</div>
        </div>
        <span className="pill pill-amber">{totalPts} pts</span>
      </div>

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

      <div className="scroll-content">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {CATEGORY_ICONS[cat] || '🎯'} {cat}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(ch => {
                const comp = completions[ch.id]
                const status = comp?.status
                const isDone = status === 'approved'
                const isPending = status === 'pending'

                return (
                  <div key={ch.id} className={`defi-item ${isDone ? 'done' : ''} ${isPending ? 'pending' : ''}`}>
                    <div className="defi-icon-wrap"
                      style={{ background: isDone ? '#d1fae5' : isPending ? '#fef3e2' : '#f8f7f4' }}>
                      {CATEGORY_ICONS[ch.category] || '🎯'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: isDone ? '#888' : '#1a1a1a', textDecoration: isDone ? 'line-through' : 'none' }}>
                          {ch.title}
                        </p>
                        <span className={`pill ${isDone ? 'pill-teal' : 'pill-amber'}`} style={{ flexShrink: 0 }}>
                          +{ch.points} pts
                        </span>
                      </div>

                      {ch.description && (
                        <p style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{ch.description}</p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 99, background: ch.validation_type === 'auto' ? '#d1fae5' : '#fef3e2', color: ch.validation_type === 'auto' ? '#065f46' : '#92400e' }}>
                          {ch.validation_type === 'auto' ? '⚡ auto' : '👁 orga valide'}
                        </span>
                        <span style={{ fontSize: 11, color: '#bbb' }}>
                          {ch.proof_type === 'video' ? '🎥 vidéo' : '📸 photo/vidéo'}
                        </span>
                      </div>

                      {status && (
                        <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, background: STATUS_LABEL[status]?.bg, color: STATUS_LABEL[status]?.color, fontSize: 12, fontWeight: 500 }}>
                          {STATUS_LABEL[status]?.label}
                          {comp.proof_url && (
                            <a href={comp.proof_url} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: 'inherit', textDecoration: 'underline' }}>
                              Voir la preuve
                            </a>
                          )}
                        </div>
                      )}

                      {!status && (
                        <button
                          onClick={() => handleUploadClick(ch)}
                          disabled={uploading === ch.id}
                          style={{ marginTop: 8, padding: '7px 12px', background: '#f8f7f4', border: '1px solid #e8e5e0', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#444', fontWeight: 500 }}>
                          {uploading === ch.id ? 'Upload en cours...' : '📎 Envoyer la preuve'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
