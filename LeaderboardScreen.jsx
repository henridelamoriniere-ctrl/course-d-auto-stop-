import { useEffect, useState } from 'react'
import { supabase, getLeaderboard } from './supabase'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardScreen({ team }) {
  const [rankings, setRankings] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    loadLeaderboard()
    const channel = supabase.channel('leaderboard')
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
      <div className="hdr">
        <div>
          <div className="hdr-title">Classement</div>
          <div className="hdr-sub">
            {lastUpdate ? `Mis à jour à ${lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Chargement...'}
          </div>
        </div>
        {myRank > 0 && (
          <span className="pill pill-amber">
            {MEDALS[myRank - 1] || `${myRank}ème`}
          </span>
        )}
      </div>

      <div className="scroll-content">
        {rankings.map((t, i) => {
          const isMe = t.id === team.id
          return (
            <div key={t.id} className={`rank-item ${i === 0 ? 'first' : ''}`}
              style={{ border: isMe ? `2px solid ${t.color}` : undefined }}>
              <span style={{ fontSize: i < 3 ? 22 : 15, width: 30, textAlign: 'center', flexShrink: 0, fontWeight: 600, color: '#888' }}>
                {MEDALS[i] || `${i + 1}.`}
              </span>
              <div className="team-avatar" style={{ background: t.color }}>
                {t.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name}
                    {isMe && <span style={{ fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 4 }}>(moi)</span>}
                  </p>
                </div>
                <p style={{ fontSize: 12, color: '#888', marginTop: 1 }}>
                  {t.car_count} voiture{t.car_count > 1 ? 's' : ''} · {t.completedChallenges} défi{t.completedChallenges > 1 ? 's' : ''}
                  {t.arrival_time && (
                    <span style={{ color: '#065f46', fontWeight: 600, marginLeft: 4 }}>
                      · Arrivé 🏁
                    </span>
                  )}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{t.points}</div>
                <div style={{ fontSize: 11, color: '#888' }}>pts</div>
              </div>
            </div>
          )
        })}

        {rankings.length === 0 && (
          <div style={{ textAlign: 'center', color: '#bbb', padding: 40, fontSize: 14 }}>
            Pas encore d'équipes inscrites
          </div>
        )}
      </div>
    </>
  )
}
