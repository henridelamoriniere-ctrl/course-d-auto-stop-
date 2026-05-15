import { useEffect, useState } from 'react'
import { supabase, getLeaderboard } from './supabase'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardScreen({ team }) {
  const [rankings, setRankings] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    loadLeaderboard()
    const channel = supabase.channel('leaderboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_completions' }, loadLeaderboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, loadLeaderboard)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadLeaderboard() {
    const data = await getLeaderboard()
    setRankings(data)
    setLastUpdate(new Date())
  }

  const myRank = rankings.findIndex(r => r.id === team.id) + 1

  return (
    <>
      <div className="hdr hdr-dark">
        <div>
          <div className="hdr-title">Classement 🏆</div>
          <div className="hdr-sub">
            {lastUpdate ? `Mis à jour à ${lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Chargement...'}
          </div>
        </div>
        {myRank > 0 && (
          <span className="pill pill-amber" style={{ fontSize: 14, fontWeight: 800 }}>
            {MEDALS[myRank - 1] || `${myRank}ème`}
          </span>
        )}
      </div>

      <div className="scroll-content">
        {rankings.map((t, i) => {
          const isMe = t.id === team.id
          return (
            <div key={t.id} className={`rank-item ${i === 0 ? 'first' : ''} ${isMe ? 'me' : ''}`}>
              <span style={{ fontSize: i < 3 ? 24 : 15, width: 32, textAlign: 'center', flexShrink: 0, fontWeight: 800, color: '#5A7040' }}>
                {MEDALS[i] || `${i + 1}.`}
              </span>
              <div className="team-avatar" style={{ background: t.color, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                {t.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#3D2B1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.name} {isMe && <span style={{ fontSize: 11, color: '#8B7355', fontWeight: 600 }}>(moi)</span>}
                </p>
                <p style={{ fontSize: 12, color: '#8B7355', fontWeight: 600, marginTop: 2 }}>
                  🚗 {t.car_count} voiture{t.car_count > 1 ? 's' : ''} · 🏆 {t.completedChallenges} défi{t.completedChallenges > 1 ? 's' : ''}
                  {t.arrival_time && <span style={{ color: '#2D5016', fontWeight: 800 }}> · Arrivé 🏁</span>}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#2D5016' }}>{t.points}</div>
                <div style={{ fontSize: 11, color: '#8B7355', fontWeight: 700 }}>pts</div>
              </div>
            </div>
          )
        })}
        {rankings.length === 0 && (
          <div style={{ textAlign: 'center', color: '#B4A090', padding: 40, fontSize: 14, fontWeight: 600 }}>
            Pas encore d'équipes inscrites
          </div>
        )}
      </div>
    </>
  )
}
