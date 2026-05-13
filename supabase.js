import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// --- ÉQUIPES ---
export async function getOrCreateTeam(name, color) {
  const { data: existing } = await supabase
    .from('teams').select('*').eq('name', name).single()
  if (existing) return existing

  const { data, error } = await supabase
    .from('teams').insert({ name, color }).select().single()
  if (error) throw error
  return data
}

export async function updateCarCount(teamId, count) {
  return supabase.from('teams').update({ car_count: count }).eq('id', teamId)
}

export async function setDepartureTime(teamId) {
  return supabase.from('teams')
    .update({ departure_time: new Date().toISOString() }).eq('id', teamId)
}

export async function setArrivalTime(teamId) {
  return supabase.from('teams')
    .update({ arrival_time: new Date().toISOString() }).eq('id', teamId)
}

export async function getAllTeams() {
  const { data } = await supabase.from('teams').select('*')
  return data || []
}

// --- GPS ---
export async function upsertLocation(teamId, lat, lng) {
  return supabase.from('team_locations').upsert(
    { team_id: teamId, lat, lng, updated_at: new Date().toISOString() },
    { onConflict: 'team_id' }
  )
}

export async function getAllLocations() {
  const { data } = await supabase.from('team_locations').select('*')
  return data || []
}

// --- DÉFIS ---
export async function getChallenges() {
  const { data } = await supabase
    .from('challenges').select('*').eq('active', true).order('sort_order')
  return data || []
}

export async function getAllChallenges() {
  const { data } = await supabase.from('challenges').select('*').order('sort_order')
  return data || []
}

export async function upsertChallenge(challenge) {
  if (challenge.id) {
    return supabase.from('challenges').update(challenge).eq('id', challenge.id)
  }
  return supabase.from('challenges').insert(challenge)
}

export async function deleteChallenge(id) {
  return supabase.from('challenges').delete().eq('id', id)
}

// --- COMPLETIONS ---
export async function getTeamCompletions(teamId) {
  const { data } = await supabase
    .from('challenge_completions').select('*').eq('team_id', teamId)
  return data || []
}

export async function getAllCompletions() {
  const { data } = await supabase
    .from('challenge_completions').select('*, teams(name,color), challenges(title,points)')
  return data || []
}

export async function submitChallenge(teamId, challengeId, file) {
  let proofUrl = null
  const proofType = file.type.startsWith('video') ? 'video' : 'photo'

  if (file) {
    const ext = file.name.split('.').pop()
    const path = `${teamId}/${challengeId}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('proofs').upload(path, file, { upsert: true })
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(path)
      proofUrl = urlData.publicUrl
    }
  }

  return supabase.from('challenge_completions').upsert({
    team_id: teamId,
    challenge_id: challengeId,
    status: 'pending',
    proof_url: proofUrl,
    proof_type: proofType,
    submitted_at: new Date().toISOString()
  }, { onConflict: 'team_id,challenge_id' })
}

export async function validateCompletion(completionId, approved) {
  return supabase.from('challenge_completions')
    .update({
      status: approved ? 'approved' : 'rejected',
      validated_at: new Date().toISOString()
    })
    .eq('id', completionId)
}

// --- MESSAGES ---
export async function getMessages(type = 'general') {
  const { data } = await supabase
    .from('messages').select('*').eq('type', type)
    .order('created_at', { ascending: true }).limit(100)
  return data || []
}

export async function sendMessage(teamName, teamColor, content, type = 'general') {
  return supabase.from('messages').insert({ team_name: teamName, team_color: teamColor, content, type })
}

// --- CONFIG ---
export async function getRaceConfig() {
  const { data } = await supabase.from('race_config').select('*').eq('id', 1).single()
  return data
}

export async function updateRaceConfig(updates) {
  return supabase.from('race_config').update(updates).eq('id', 1)
}

// --- CLASSEMENT ---
export async function getLeaderboard() {
  const teams = await getAllTeams()
  const completions = await getAllCompletions()
  const challenges = await getAllChallenges()

  const challengeMap = {}
  challenges.forEach(c => { challengeMap[c.id] = c })

  return teams.map(team => {
    const teamCompletions = completions.filter(
      c => c.team_id === team.id && c.status === 'approved'
    )
    const points = teamCompletions.reduce((sum, c) => {
      return sum + (challengeMap[c.challenge_id]?.points || 0)
    }, 0)
    return { ...team, points, completedChallenges: teamCompletions.length }
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (a.arrival_time && b.arrival_time) return new Date(a.arrival_time) - new Date(b.arrival_time)
    if (a.arrival_time) return -1
    if (b.arrival_time) return 1
    return 0
  })
}
