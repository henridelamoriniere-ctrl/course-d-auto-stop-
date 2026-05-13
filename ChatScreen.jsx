import { useEffect, useRef, useState } from 'react'
import { supabase, getMessages, sendMessage } from '../supabase'

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

  const isAnnouncement = tab === 'announcement'

  return (
    <>
      <div className="hdr" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '14px 16px 0' }}>
        <div className="hdr-title" style={{ marginBottom: 10 }}>Messages</div>
        <div className="tab-bar" style={{ padding: 0, margin: '0 -16px' }}>
          <button className={`tab-btn ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}>
            Général
          </button>
          <button className={`tab-btn ${tab === 'announcement' ? 'active' : ''}`} onClick={() => setTab('announcement')}>
            📢 Annonces orga
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#bbb', padding: 40, fontSize: 14 }}>
            {isAnnouncement ? 'Pas encore d\'annonces' : 'Soyez les premiers à écrire !'}
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`chat-msg ${m.type === 'announcement' ? 'announcement' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: m.team_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                {m.team_name[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: m.type === 'announcement' ? '#92400e' : '#1a1a1a' }}>
                {m.team_name}
              </span>
              <span style={{ fontSize: 11, color: '#bbb', marginLeft: 'auto' }}>
                {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.5 }}>{m.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!isAnnouncement && (
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
    </>
  )
}
