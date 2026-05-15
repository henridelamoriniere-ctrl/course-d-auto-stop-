import { useEffect, useRef, useState } from 'react'
import { supabase, getMessages, sendMessage } from './supabase'

export default function ChatScreen({ team }) {
  const [tab, setTab] = useState('general')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    loadMessages()
    const channel = supabase.channel('chat-' + tab)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `type=eq.${tab}` },
        payload => setMessages(prev => [...prev, payload.new]))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [tab])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const data = await getMessages(tab)
    setMessages(data)
  }

  async function handleSend() {
    if (!input.trim() || sending) return
    setSending(true)
    await sendMessage(team.name, team.color, input.trim(), 'general')
    setInput('')
    setSending(false)
  }

  const tabs = [
    { id: 'general', label: '💬 Général' },
    { id: 'photos', label: '📸 Défis' },
    { id: 'announcement', label: '📢 Annonces' },
  ]

  return (
    <>
      <div className="hdr hdr-dark" style={{ flexDirection: 'column', alignItems: 'stretch', paddingBottom: 0 }}>
        <div className="hdr-title" style={{ marginBottom: 10 }}>Messages</div>
        <div className="tab-bar" style={{ margin: '0 -16px', background: 'transparent', borderBottom: 'none' }}>
          {tabs.map(t => (
            <button key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              style={{ color: tab === t.id ? '#F4A435' : 'rgba(255,255,255,0.6)', borderBottomColor: tab === t.id ? '#F4A435' : 'transparent' }}
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#B4A090', padding: 40, fontSize: 14, fontWeight: 600 }}>
            {tab === 'announcement' ? '📢 Pas encore d\'annonces' :
             tab === 'photos' ? '📸 Les photos des défis apparaîtront ici !' :
             '💬 Soyez les premiers à écrire !'}
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`chat-msg ${m.type === 'announcement' ? 'announcement' : ''} ${m.type === 'photos' ? 'photo-msg' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.team_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                {m.team_name[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#3D2B1F' }}>{m.team_name}</span>
              <span style={{ fontSize: 11, color: '#B4A090', fontWeight: 600, marginLeft: 'auto' }}>
                {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#3D2B1F', lineHeight: 1.5, fontWeight: 600 }}>{m.content}</p>
            {m.proof_url && (
              <img src={m.proof_url} alt="Photo défi"
                style={{ width: '100%', borderRadius: 12, marginTop: 8, objectFit: 'cover', maxHeight: 220, border: '2px solid #E8D5B0', cursor: 'pointer' }}
                onClick={() => window.open(m.proof_url, '_blank')} />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {tab === 'general' && (
        <div className="chat-input-bar">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message..."
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button className="send-btn" onClick={handleSend} disabled={sending}>➤</button>
        </div>
      )}
      {tab === 'announcement' && (
        <div style={{ padding: '10px 14px', background: '#FFFBF0', borderTop: '2px solid #E8D5B0', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#8B7355', fontWeight: 700 }}>Seuls les organisateurs peuvent envoyer des annonces</p>
        </div>
      )}
      {tab === 'photos' && (
        <div style={{ padding: '10px 14px', background: '#F0F8F0', borderTop: '2px solid #A8D5B5', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#5A7040', fontWeight: 700 }}>📸 Les photos apparaissent automatiquement quand une équipe soumet un défi</p>
        </div>
      )}
    </>
  )
}
