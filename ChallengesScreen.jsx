import { useEffect, useRef, useState } from 'react'
import { supabase, getChallenges, getTeamCompletions, submitChallenge } from './supabase'

const CAT_ICONS = { rencontres: '🤝', vehicules: '🚗', fun: '🎯', bonus: '⭐' }
const CAT_LABELS = { rencontres: 'Rencontres', vehicules: 'Véhicules', fun: 'Défis fun', bonus: 'Bonus' }
const CAT_COLORS = { rencontres: '#4A7C59', vehicules: '#D85A30', fun: '#7F77DD', bonus: '#F4A435' }

const STATUS_INFO = {
  pending: { label: '⏳ En attente de validation...', bg: '#FFFBF0', color: '#854F0B' },
  approved: { label: '✅ Validé !', bg: '#E0F8E0', color: '#1A4A1F' },
  rejected: { label: '❌ Refusé — réessaie !', bg: '#FDECEA', color: '#993C1D' },
}

// Compress image to ~200KB
async function compressImage(file) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      const MAX = 1200
      let { width, height } = img
      if (width > height) {
        if (width > MAX) { height = Math.round(height * MAX / width); width = MAX }
      } else {
        if (height > MAX) { width = Math.round(width * MAX / height); height = MAX }
      }
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.75)
    }
    img.src = URL.createObjectURL(file)
  })
}

export default function ChallengesScreen({ team }) {
  const [challenges, setChallenges] = useState([])
  const [completions, setCompletions] = useState({})
  const [uploading, setUploading] = useState(null)
  const [preview, setPreview] = useState(null)
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
    fileInputRef.current.accept = 'image/*'
    fileInputRef.current.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file || !activeChallengeRef.current) return
    const challenge = activeChallengeRef.current
    setUploading(challenge.id)

    try {
      const compressed = await compressImage(file)
      await submitChallenge(team.id, challenge.id, compressed)

      // Send to photo chat
      const ext = compressed.name.split('.').pop()
      const path = `${team.id}/${challenge.id}.${ext}`
      const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(path)
      await supabase.from('messages').insert({
        team_name: team.name,
        team_color: team.color,
        content: `📸 **${challenge.title}** (+${challenge.points} pts)`,
        type: 'photos',
        proof_url: urlData.publicUrl,
        challenge_title: challenge.title
      })

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

  const grouped = {}
  challenges.forEach(ch => {
    if (!grouped[ch.category]) grouped[ch.category] = []
    grouped[ch.category].push(ch)
  })

  const catOrder = ['rencontres', 'vehicules', 'fun', 'bonus']

  return (
    <>
      <div className="hdr hdr-orange">
        <div>
          <div className="hdr-title">Défis 🏆</div>
          <div className="hdr-sub">{approved}/{challenges.length} validés</div>
        </div>
        <span className="pill pill-amber" style={{ fontSize: 14, fontWeight: 800 }}>{totalPts} pts</span>
      </div>

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="image/*" capture="environment" />

      <div className="scroll-content">
        {catOrder.filter(cat => grouped[cat]).map(cat => (
          <div key={cat}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${CAT_COLORS[cat]}20` }}>
              <span style={{ fontSize: 18 }}>{CAT_ICONS[cat]}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: CAT_COLORS[cat], textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {CAT_LABELS[cat]}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {grouped[cat].map(ch => {
                const comp = completions[ch.id]
                const status = comp?.status
                const isDone = status === 'approved'
                const isPending = status === 'pending'
                const isVideo = ch.proof_type === 'video'

                return (
                  <div key={ch.id} className={`defi-item ${isDone ? 'done' : ''} ${isPending ? 'pending' : ''}`}>
                    <div className="defi-icon-wrap"
                      style={{ background: isDone ? '#E0F8E0' : isPending ? '#FFF3E0' : '#F8F3EE' }}>
                      {isDone ? '✅' : isPending ? '⏳' : CAT_ICONS[ch.category]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: isDone ? '#5A7040' : '#3D2B1F', textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.3 }}>
                          {ch.title}
                        </p>
                        <span className={`pill ${isDone ? 'pill-green' : 'pill-amber'}`} style={{ flexShrink: 0 }}>
                          +{ch.points}
                        </span>
                      </div>

                      {ch.description && (
                        <p style={{ fontSize: 12, color: '#8B7355', fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>{ch.description}</p>
                      )}

                      {status && STATUS_INFO[status] && (
                        <div style={{ padding: '6px 10px', borderRadius: 10, background: STATUS_INFO[status].bg, color: STATUS_INFO[status].color, fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                          {STATUS_INFO[status].label}
                          {comp.proof_url && status === 'pending' && (
                            <span style={{ marginLeft: 6, opacity: 0.7 }}>· photo envoyée</span>
                          )}
                        </div>
                      )}

                      {!status && !isVideo && (
                        <button className="btn-photo" onClick={() => handleUploadClick(ch)} disabled={uploading === ch.id}>
                          {uploading === ch.id ? '⏳ Envoi...' : '📸 Envoyer la photo'}
                        </button>
                      )}

                      {!status && isVideo && (
                        <div>
                          <div style={{ fontSize: 11, color: '#8B7355', fontWeight: 700, marginBottom: 4 }}>
                            🎥 Vidéo requise pour ce défi
                          </div>
                          <button className="btn-whatsapp">
                            📱 Envoyer sur WhatsApp
                          </button>
                        </div>
                      )}

                      {preview === ch.id && comp?.proof_url && (
                        <img src={comp.proof_url} alt="Preuve" className="photo-preview" onClick={() => setPreview(null)} />
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
