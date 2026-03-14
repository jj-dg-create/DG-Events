import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const B    = { canvas: '#1D1B1C', surface: '#262323', surface2: '#2E2B2B', border: '#333131', cream: '#FEFCF5', muted: '#C4C4C4', chartreuse: '#DEE548' }
const font = "'GT Pressura', Arial, Helvetica, sans-serif"
const lbl  = (c = B.muted) => ({ fontFamily: font, fontWeight: 400, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: c })

function NewEventModal({ onSave, onClose }) {
  const [name, setName]         = useState('')
  const [date, setDate]         = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving]     = useState(false)
  const [focus, setFocus]       = useState(null)

  const inp = (f) => ({
    width: '100%', background: B.surface, border: `1px solid ${focus === f ? B.chartreuse : B.border}`,
    borderRadius: '10px', padding: '14px 16px', color: B.cream,
    fontSize: '15px', fontFamily: font, fontWeight: 400, outline: 'none',
    transition: 'border-color 0.15s',
  })

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const { data } = await supabase.from('events').insert({
      name: name.trim(), event_date: date || null, location: location.trim() || null,
    }).select().single()
    if (data) {
      await supabase.rpc('seed_default_badge_types', { p_event_id: data.id })
      onSave(data)
    }
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(29,27,28,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: B.surface, borderRadius: '16px', width: '100%', maxWidth: '420px', padding: '24px', border: `1px solid ${B.border}` }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={lbl(B.cream)}>New Event</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: B.muted, fontSize: '22px', cursor: 'pointer', fontFamily: font }}>×</button>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ ...lbl(), marginBottom: '6px' }}>Event Name *</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SLL Los Angeles"
            style={inp('name')} onFocus={() => setFocus('name')} onBlur={() => setFocus(null)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div>
            <div style={{ ...lbl(), marginBottom: '6px' }}>Date</div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ ...inp('date'), colorScheme: 'dark' }} onFocus={() => setFocus('date')} onBlur={() => setFocus(null)} />
          </div>
          <div>
            <div style={{ ...lbl(), marginBottom: '6px' }}>Location</div>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Los Angeles, CA"
              style={inp('loc')} onFocus={() => setFocus('loc')} onBlur={() => setFocus(null)} />
          </div>
        </div>
        <p style={{ ...lbl(), color: 'rgba(254,252,245,0.25)', marginBottom: '16px', lineHeight: 1.5 }}>
          VIP Row 1, VIP Rows 2–5, and General Admission badge types will be added automatically.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: `1px solid ${B.border}`, borderRadius: '10px', padding: '14px', color: B.muted, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} style={{ flex: 2, background: B.chartreuse, border: 'none', borderRadius: '10px', padding: '14px', color: B.canvas, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: (!name.trim() || saving) ? 0.4 : 1 }}>
            {saving ? 'Creating…' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EventList() {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [managerPin, setManagerPin] = useState('')
  const [pinSaved, setPinSaved]     = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('events').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setEvents(data) })
      .catch(err => console.error('Failed to load events:', err))
      .finally(() => setLoading(false))
    supabase.from('settings').select('value').eq('key', 'manager_pin').single()
      .then(({ data }) => { if (data) setManagerPin(data.value) })
      .catch(err => console.error('Failed to load manager pin:', err))
  }, [])

  async function savePin() {
    await supabase.from('settings').upsert({ key: 'manager_pin', value: managerPin })
    setPinSaved(true)
    setTimeout(() => setPinSaved(false), 2000)
  }

  function handleCreated(event) {
    setEvents(prev => [event, ...prev])
    setShowNew(false)
    navigate(`/admin/events/${event.id}`)
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>
      {showNew && <NewEventModal onSave={handleCreated} onClose={() => setShowNew(false)} />}

      {/* Events header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ fontFamily: font, fontWeight: 400, fontSize: '28px', color: B.cream, letterSpacing: '-0.01em' }}>Events</div>
        <button onClick={() => setShowNew(true)} style={{
          background: B.chartreuse, border: 'none', borderRadius: '10px',
          padding: '12px 20px', color: B.canvas, fontFamily: font, fontSize: '13px',
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
        }}>+ New Event</button>
      </div>

      {/* Events list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(254,252,245,0.2)', fontFamily: font, fontSize: '14px' }}>Loading…</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: '16px' }}>
          <div style={{ fontFamily: font, color: 'rgba(254,252,245,0.5)', fontSize: '18px', marginBottom: '8px' }}>No events yet</div>
          <div style={lbl()}>Create your first event to get started</div>
          <button onClick={() => setShowNew(true)} style={{ marginTop: '20px', background: B.chartreuse, border: 'none', borderRadius: '10px', padding: '14px 24px', color: B.canvas, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Create First Event
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '48px' }}>
          {events.map(ev => (
            <button key={ev.id} onClick={() => navigate(`/admin/events/${ev.id}`)} style={{
              width: '100%', background: B.surface, border: `1px solid ${B.border}`,
              borderRadius: '12px', padding: '20px 20px', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
              textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(222,229,72,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = B.border}
            >
              <div>
                <div style={{ fontFamily: font, fontWeight: 400, fontSize: '18px', color: B.cream }}>{ev.name}</div>
                <div style={{ ...lbl(), marginTop: '4px' }}>
                  {[ev.location, ev.event_date && new Date(ev.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span style={{ color: 'rgba(254,252,245,0.15)', fontSize: '18px' }}>→</span>
            </button>
          ))}
        </div>
      )}

      {/* Manager PIN settings */}
      <div style={{ borderTop: `1px solid ${B.border}`, paddingTop: '32px' }}>
        <div style={{ ...lbl(B.chartreuse), marginBottom: '8px' }}>Manager PIN</div>
        <div style={{ fontFamily: font, color: B.cream, fontSize: '14px', marginBottom: '16px', lineHeight: 1.5, opacity: 0.6 }}>
          This PIN is required on iPads to access the on-device manager panel for editing attendees.
        </div>
        <div style={{ display: 'flex', gap: '10px', maxWidth: '300px' }}>
          <input
            value={managerPin}
            onChange={e => setManagerPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="e.g. 1234"
            maxLength={8}
            type="password"
            style={{
              flex: 1, background: B.surface, border: `1px solid ${B.border}`,
              borderRadius: '10px', padding: '12px 16px', color: B.cream,
              fontSize: '20px', fontFamily: font, letterSpacing: '0.2em', outline: 'none',
            }}
          />
          <button onClick={savePin} disabled={!managerPin} style={{
            background: pinSaved ? 'rgba(222,229,72,0.15)' : B.surface,
            border: `1px solid ${pinSaved ? B.chartreuse : B.border}`,
            borderRadius: '10px', padding: '12px 20px',
            color: pinSaved ? B.chartreuse : B.muted,
            fontFamily: font, fontSize: '13px', letterSpacing: '0.08em',
            textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {pinSaved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
