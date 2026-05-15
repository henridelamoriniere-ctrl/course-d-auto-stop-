import { useEffect, useRef, useState } from 'react'
import { supabase, upsertLocation, getAllTeams, updateCarCount, setArrivalTime, setDepartureTime, getRaceConfig } from './supabase'

export default function MapScreen({ team, onOpenAdmin }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const watchIdRef = useRef(null)
  const wakeLockRef = useRef(null)
  const timerRef = useRef(null)

  const [carCount, setCarCount] = useState(team.car_count || 0)
  const [elapsed, setElapsed] = useState('00:00')
  const [config, setConfig] = useState(null)
  const [myPos, setMyPos] = useState(null)
  const [arrived, setArrived] = useState(!!team.arrival_time)
  const [started, setStarted] = useState(!!team.departure_time)
  const [departureTime, setDepTime] = useState(team.departure_time || null)
  const [showArrivalConfirm, setShowArrivalConfirm] = useState(false)
  const [now, setNow] = useState(new Date())

  // Wake lock
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen')
      } catch {}
    }
    requestWakeLock()
    return () => { if (wakeLockRef.current) wakeLockRef.current.release() }
  }, [])

  // Current time ticker
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  // Elapsed timer
  useEffect(() => {
    if (!departureTime) return
    function tick() {
      const diff = Date.now() - new Date(departureTime).getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      if (h > 0) setElapsed(`${h}h${String(m).padStart(2,'0')}`)
      else setElapsed(`${m} min`)
    }
    tick()
    timerRef.current = setInterval(tick, 60000)
    return () => clearInterval(timerRef.current)
  }, [departureTime])

  // Load config + realtime update when admin changes race status
  useEffect(() => {
    getRaceConfig().then(setConfig)
    const channel = supabase.channel('race-config-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'race_config' },
        payload => setConfig(payload.new))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  // Init map
  useEffect(() => {
    if (mapInstanceRef.current) return
    import('leaflet').then(L => {
      const map = L.default.map(mapRef.current, { zoomControl: true })
        .setView([47.5, 2.0], 7)
      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)
      mapInstanceRef.current = map
      loadAllMarkers(L.default, map)
    })
  }, [])

  async function loadAllMarkers(L, map) {
    const teams = await getAllTeams()
    const { data: locs } = await supabase.from('team_locations').select('*')
    const locMap = {}
    if (locs) locs.forEach(l => { locMap[l.team_id] = l })

    if (config) {
      const startIcon = L.divIcon({
        html: `<div style="background:#2D5016;color:white;padding:4px 8px;border-radius:8px;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.2)">🚩 ${config.start_location_name}</div>`,
        className: '', iconAnchor: [0, 0]
      })
      L.marker([config.start_lat, config.start_lng], { icon: startIcon }).addTo(map)
      const endIcon = L.divIcon({
        html: `<div style="background:#D85A30;color:white;padding:4px 8px;border-radius:8px;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.2)">🏁 ${config.end_location_name}</div>`,
        className: '', iconAnchor: [0, 0]
      })
      L.marker([config.end_lat, config.end_lng], { icon: endIcon }).addTo(map)
    }

    teams.forEach(t => {
      const loc = locMap[t.id]
      if (!loc) return
      const isMe = t.id === team.id
      const icon = L.divIcon({
        html: `<div style="width:${isMe?36:30}px;height:${isMe?36:30}px;background:${t.color};border:${isMe?'3px':'2px'} solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:${isMe?14:12}px;box-shadow:0 2px 8px rgba(0,0,0,.3)">${t.name[0].toUpperCase()}</div>`,
        className: '', iconSize: [isMe?36:30, isMe?36:30], iconAnchor: [isMe?18:15, isMe?18:15]
      })
      const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map)
      marker.bindPopup(`<b style="font-family:Nunito,sans-serif">${t.name}</b><br>${t.car_count} voitures`)
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
        if (mapInstanceRef.current) {
          import('leaflet').then(L => {
            if (markersRef.current[team.id]) {
              markersRef.current[team.id].setLatLng([lat, lng])
            } else {
              loadAllMarkers(L.default, mapInstanceRef.current)
            }
          })
        }
      },
      (err) => console.warn('GPS:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    )
    return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current) }
  }, [team.id])

  // Realtime other teams positions
  useEffect(() => {
    const channel = supabase.channel('map-locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_locations' },
        async (payload) => {
          if (!mapInstanceRef.current) return
          const loc = payload.new
          if (loc.team_id === team.id) return
          import('leaflet').then(L => {
            if (markersRef.current[loc.team_id]) {
              markersRef.current[loc.team_id].setLatLng([loc.lat, loc.lng])
            }
          })
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [team.id])

  async function handleStart() {
    const t = new Date().toISOString()
    await setDepartureTime(team.id)
    setDepTime(t)
    setStarted(true)
  }

  async function handleCarChange(delta) {
    const newCount = Math.max(0, carCount + delta)
    setCarCount(newCount)
    await updateCarCount(team.id, newCount)
  }

  async function handleArrival() {
    await setArrivalTime(team.id)
    setArrived(true)
    setShowArrivalConfirm(false)
  }

  async function handleCancelArrival() {
    await supabase.from('teams').update({ arrival_time: null }).eq('id', team.id)
    setArrived(false)
  }

  const raceActive = config?.status === 'active'
  const raceWaiting = config?.status === 'waiting' || !config?.status
  const raceFinished = config?.status === 'finished'

  const depTimeStr = departureTime
    ? new Date(departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null
  const nowStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <div className="hdr hdr-green">
        <div>
          <div className="hdr-sub">Position en direct</div>
          <div className="hdr-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: team.color, flexShrink: 0, border: '2px solid white' }} />
            {team.name}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="live-badge">En direct</span>
          <button onClick={onOpenAdmin}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, padding: '6px 10px', color: 'white', cursor: 'pointer', fontSize: 18 }}>
            ⚙️
          </button>
        </div>
      </div>

      <div id="map" ref={mapRef} style={{ height: 240 }} />

      <div className="scroll-content">

        {/* STATUT COURSE */}
        {raceWaiting && !started && (
          <div style={{ background: '#FFF3E0', border: '2px solid #F4A435', borderRadius: 16, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#854F0B', marginBottom: 4 }}>En attente du top départ</p>
            <p style={{ fontSize: 13, color: '#B47020', fontWeight: 600 }}>L'organisateur n'a pas encore lancé la course. Restez prêts !</p>
          </div>
        )}

        {raceFinished && (
          <div style={{ background: '#E0F8E0', border: '2px solid #4A7C59', borderRadius: 16, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🏁</div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1A4A1F' }}>La course est terminée !</p>
          </div>
        )}

        {raceActive && !started && (
          <button className="btn-primary" onClick={handleStart} style={{ fontSize: 17 }}>
            🚀 Démarrer ma course !
          </button>
        )}

        {started && (
          <div className="card-green">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: 3 }}>DÉPART</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>{depTimeStr}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: 3 }}>EN ROUTE</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#F4A435' }}>{elapsed}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: 3 }}>MAINTENANT</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>{nowStr}</div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div style={{ fontSize: 11, color: '#8B7355', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🚗 Voitures empruntées
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 52, fontWeight: 800, color: '#2D5016', lineHeight: 1 }}>{carCount}</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleCarChange(-1)}
                style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #E8D5B0', background: '#FFFDF8', cursor: 'pointer', fontSize: 22, fontWeight: 800, color: '#5A7040', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <button onClick={() => handleCarChange(1)}
                style={{ width: 44, height: 44, borderRadius: '50%', background: '#F4A435', border: 'none', cursor: 'pointer', fontSize: 22, fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
        </div>

        {!arrived && started && (
          <button className="btn-dark" onClick={() => setShowArrivalConfirm(true)}>
            🏁 Je suis arrivé(e) !
          </button>
        )}

        {arrived && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="card" style={{ background: '#E0F8E0', borderColor: '#A8D5B5', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1A4A1F' }}>
                🏁 Arrivée à {team.arrival_time ? new Date(team.arrival_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </div>
            </div>
            <button className="btn-outline" onClick={handleCancelArrival} style={{ fontSize: 13 }}>
              ↩ Annuler l'arrivée (erreur ?)
            </button>
          </div>
        )}

        {myPos && (
          <p style={{ fontSize: 11, color: '#B4A090', textAlign: 'center', fontWeight: 600 }}>
            📍 GPS actif · {myPos.lat.toFixed(4)}, {myPos.lng.toFixed(4)}
          </p>
        )}
      </div>

      {showArrivalConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 9999 }}>
          <div style={{ background: '#FFFDF8', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, border: '3px solid #4A7C59' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: '#2D5016' }}>🏁 Tu es bien arrivé(e) ?</h3>
            <p style={{ fontSize: 14, color: '#7A9060', marginBottom: 20, fontWeight: 600, lineHeight: 1.5 }}>
              Confirme ton arrivée ! Cette action sera enregistrée pour le classement final.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={handleArrival}>✅ Confirmer !</button>
              <button className="btn-outline" onClick={() => setShowArrivalConfirm(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
