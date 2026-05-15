export default function BottomNav({ current, onChange, isAdmin }) {
  const items = [
    { id: 'map', label: 'Carte', icon: (
      <svg viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13V7m0 13 6 3m-6-3V7m6 16 5.447-2.724A1 1 0 0 0 21 19.382V8.618a1 1 0 0 0-1.447-.894L15 10m0 13V10m0 0L9 7"/></svg>
    )},
    { id: 'challenges', label: 'Défis', icon: (
      <svg viewBox="0 0 24 24"><path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path d="M12 2v1m6.36 1.64-.71.71M22 12h-1M18.36 20.36l-.71-.71M12 23v-1M5.64 20.36l.71-.71M2 12h1M5.64 3.64l.71.71"/></svg>
    )},
    { id: 'leaderboard', label: 'Classement', icon: (
      <svg viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
    )},
    { id: 'chat', label: 'Chat', icon: (
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    )},
  ]

  return (
    <nav className="bnav">
      {items.map(item => (
        <button
          key={item.id}
          className={`bnav-item ${current === item.id ? 'active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  )
}
