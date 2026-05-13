import { useEffect, useRef, useState } from 'react'
import { supabase, upsertLocation, getAllTeams, updateCarCount, setArrivalTime, getRaceConfig } from '../lib/supabase'

export default function MapScreen({ team, onCarCountChange }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const watchIdRef = useRef(null)
  const wakeLockRef = useRef(null)
  const [carCount, setCarCount] = useState(team.car_count || 0)
  const [elapsed, setElapsed] = useState('00:00')
  const [config, setConfig] = useState(null)
  const [myPos, setMyPos] = useState(null)
  const [arrived, setArrived] = useState(!!team.arrival_time)

  // Keep screen awake
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {}
    }
    requestWakeLock()
    return () => { if (wakeLockRef.current) wakeLockRef.current.release() }
  }, [])

  // Load config
  useEffect(() => {
    getRaceConfig().then(setConfig)
  }, [])

  // Init map after config loaded
  useEffect(() => {
    if (!config || mapInstanceRef.current) return
    import('leaflet').then(L => {
      const map = L.default.map(mapRef.current, { zoomControl: true }).setView(
        [config.start_lat, config.start_lng], 9
      )
      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

      // Start marker
      const startIcon = L.default.divIcon({
        html: `<div style="background:#065f46;color:white;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.2)">🚩 ${config.start_location_name}</div>`,
        className: '', iconAnchor: [0, 0]
      })
      L.default.marker([config.start_lat, config.start_lng], { icon: startIcon }).addTo(map)

      // End marker
      const endIcon = L.default.divIcon({
        html: `<div style="background:#9a3412;color:white;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.2)">🏁 ${config.end_location_name}</div>`,
        className: '', iconAnchor: [0, 0]
      })
      L.default.marker([config.end_lat, config.end_lng], { icon: endIcon }).addTo(map)

      mapInstanceRef.current = map
      loadTeamMarkers(L.default, map)
    })
  }, [config])

  async function loadTeamMarkers(L, map) {
    const teams = await getAllTeams()
    const { data: locs } = await supabase.from('team_locations').select('*')
    const locMap = {}
    if (locs) locs.forEach(l => { locMap[l.team_id] = l })

    teams.forEach(t => {
      const loc = locMap[t.id]
      if (!loc) return
      const isMe = t.id === team.id
      const icon = L.divIcon({
        html: `<div style="width:${isMe?34:28}px;height:${isMe?34:28}px;background:${t.color};border:${isMe?'3px':'2px'} solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${isMe?13:11}px;box-shadow:0 2px 6px rgba(0,0,0,.3)">${t.name[0].toUpperCase()}</div>`,
        className: '', iconSize: [isMe?34:28, isMe?34:28], iconAnchor: [isMe?17:14, isMe?17:14]
      })
      const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map)
      marker.bindPopup(`<b>${t.name}</b><br>${t.car_count} voitures`)
      markersRef.current[t.id] = marker
    })
  }

  // GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) return
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setMyPos({ lat, lng })
        await upsertLocation(team.id, lat, lng)
        if (mapInstanceRef.current && markersRef.current[team.id]) {
          import('leaflet').then(L => {
            markersRef.current[team.id].setLatLng([lat, lng])
          })
        }
      },
      (err) => console.warn('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current) }
  }, [team.id])

  // Realtime other teams
  useEffect(() => {
    const channel = supabase.channel('locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_locations' },
        async (payload) => {
          if (!mapInstanceRef.current) return
          const loc = payload.new
          if (loc.team_id === team.id) return
          import('leaflet').then(L => {
            if (markersRef.current[loc.team_id]) {
              markersRef.current[loc.team_id].setLatLng([loc.lat, loc.lng])
            } else {
              loadTeamMarkers(L.default, mapInstanceRef.current)
            }
          })
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [team.id])

  // Elapsed timer
  useEffect(() => {
    if (!team.departure_time) return
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(team.departure_time).getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setElapsed(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    }, 10000)
    return () => clearInterval(interval)
  }, [team.departure_time])

  async function handleCarChange(delta) {
    const newCount = Math.max(0, carCount + delta)
    setCarCount(newCount)
    await updateCarCount(team.id, newCount)
    onCarCountChange?.(newCount)
  }

  async function handleArrival() {
    if (arrived) return
    await setArrivalTime(team.id)
    setArrived(true)
  }

  return (
    <>
      <div className="hdr">
        <div>
          <div className="hdr-sub">Position en direct</div>
          <div className="hdr-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: team.color, flexShrink: 0 }} />
            {team.name}
          </div>
        </div>
        <span className="live-dot">En direct</span>
      </div>

      <div id="map" ref={mapRef} style={{ height: 280 }} />

      <div className="scroll-content">
        {/* Car counter */}
        <div className="card">
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Voitures empruntées</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 48, fontWeight: 700, lineHeight: 1 }}>{carCount}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleCarChange(-1)} className="btn-outline"
                style={{ width: 40, height: 40, padding: 0, fontSize: 20, borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
              <button onClick={() => handleCarChange(1)}
                style={{ width: 40, height: 40, padding: 0, fontSize: 20, borderRadius: '50%', background: '#EF9F27', color: '#fff', border: 'none', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 22 }}>+</button>
            </div>
          </div>
        </div>

        {/* Times */}
        <div className="grid-2">
          <div className="card">
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Départ</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {team.departure_time
                ? new Date(team.departure_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Temps écoulé</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{elapsed}</div>
          </div>
        </div>

        {/* Arrival */}
        {!arrived ? (
          <button className="btn-primary" onClick={handleArrival}
            style={{ background: '#065f46' }}>
            🏁 Je suis arrivé(e) !
          </button>
        ) : (
          <div className="card" style={{ textAlign: 'center', background: '#d1fae5' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#065f46' }}>
              🏁 Arrivée enregistrée à {new Date(team.arrival_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        {/* GPS status */}
        {myPos && (
          <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center' }}>
            📍 GPS actif · {myPos.lat.toFixed(4)}, {myPos.lng.toFixed(4)}
          </p>
        )}
      </div>
    </>
  )
}
