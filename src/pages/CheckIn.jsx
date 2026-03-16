import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Fuse from 'fuse.js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Brand tokens ────────────────────────────────────────────────────────────
const B = {
  canvas:      '#1D1B1C',
  surface:     '#262323',
  surface2:    '#2E2B2B',
  border:      '#333131',
  cream:       '#FEFCF5',
  cream2:      '#EEECE7',
  muted:       '#C4C4C4',
  chartreuse:  '#DEE548',
}

const font = "'GT Pressura', Arial, Helvetica, sans-serif"
const druk = "'Druk Wide', 'GT Pressura', Arial, sans-serif"

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getTextColor(hex) {
  if (!hex || hex.length < 7) return '#FEFCF5'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1D1B1C' : '#FEFCF5'
}

function fmt(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Style helpers ────────────────────────────────────────────────────────────
const label = (color = B.muted) => ({
  fontFamily: font, fontWeight: 400, fontSize: '11px',
  letterSpacing: '0.12em', textTransform: 'uppercase', color,
})

const FUSE_OPTIONS = {
  keys: [
    { name: 'first_name', weight: 0.4 },
    { name: 'last_name', weight: 0.4 },
    { name: 'email', weight: 0.2 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
}

const inputStyle = (focused = false) => ({
  width: '100%', background: B.surface,
  border: `1px solid ${focused ? B.chartreuse : B.border}`,
  borderRadius: '10px', padding: '14px 16px',
  color: B.cream, fontSize: '16px',
  fontFamily: font, fontWeight: 400, outline: 'none',
  transition: 'border-color 0.15s',
})

// ─── Flash Screen ─────────────────────────────────────────────────────────────
function FlashScreen({ flash, onDismiss, onUndo }) {
  const [count, setCount] = useState(5)

  useEffect(() => {
    setCount(5)
    const t = setInterval(() => setCount(p => {
      if (p <= 1) { clearInterval(t); onDismiss(); return 0 }
      return p - 1
    }), 1000)
    return () => clearInterval(t)
  }, [flash])

  if (!flash) return null
  const { attendee, badgeType, status, ticketCount } = flash

  // ── Duplicate / already checked in ────────────────────────────────────────
  if (status === 'duplicate') {
    return (
      <div className="flash-screen" style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: '#8B1A1A',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }} onClick={onDismiss}>
        <div style={{ textAlign: 'center', padding: '0 40px', userSelect: 'none' }}>
          {/* Warning marker */}
          <div style={{ ...label(B.cream), opacity: 0.5, marginBottom: '24px' }}>
            Already checked in
          </div>

          {/* 3px brand divider */}
          <div style={{ height: '3px', background: B.cream, width: '40px', margin: '0 auto 32px' }} />

          <div style={{
            fontFamily: font, fontWeight: 400,
            fontSize: 'clamp(2.5rem, 9vw, 5rem)',
            color: B.cream, lineHeight: 1.05, marginBottom: '24px',
          }}>
            {attendee.first_name}<br />{attendee.last_name}
          </div>

          {badgeType && (
            <div style={{
              display: 'inline-block',
              background: badgeType.color,
              color: getTextColor(badgeType.color),
              fontFamily: font, fontSize: '13px',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '8px 20px', borderRadius: '100px',
              marginBottom: '16px',
            }}>
              {badgeType.display_name}
            </div>
          )}

          <div style={{ ...label('rgba(254,252,245,0.5)'), marginBottom: '32px' }}>
            Checked in at {fmt(attendee.checked_in_at)}
          </div>

          <button onClick={e => { e.stopPropagation(); onUndo(attendee) }} style={{
            background: 'rgba(254,252,245,0.1)',
            border: '1px solid rgba(254,252,245,0.2)',
            borderRadius: '10px', padding: '12px 24px',
            color: B.cream, fontFamily: font, fontSize: '13px',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: 'pointer', marginBottom: '40px',
          }}>
            Undo Check-In
          </button>

          <div style={{ ...label('rgba(254,252,245,0.25)') }}>
            Tap to dismiss — {count}s
          </div>
        </div>
      </div>
    )
  }

  // ── Success — full-screen wristband color ─────────────────────────────────
  const bg    = badgeType?.color || '#22C55E'
  const color = getTextColor(bg)

  return (
    <div className="flash-screen" style={{
      position: 'fixed', inset: 0, zIndex: 60, background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }} onClick={onDismiss}>
      <div style={{ textAlign: 'center', padding: '0 40px', userSelect: 'none' }}>
        {/* Badge type — Druk Wide hero, per design system */}
        <div style={{
          fontFamily: druk,
          fontWeight: 500,
          fontSize: 'clamp(2.8rem, 9vw, 5.5rem)',
          letterSpacing: '-0.03em',
          lineHeight: 0.88,
          textTransform: 'uppercase',
          color,
          marginBottom: '28px',
        }}>
          {badgeType?.display_name || 'Attendee'}
        </div>

        {/* Divider — uses text color for contrast */}
        <div style={{ height: '3px', background: color, width: '40px', margin: '0 auto 28px', opacity: 0.35 }} />

        {/* Name — GT Pressura, large but secondary to badge type */}
        <div style={{
          fontFamily: font, fontWeight: 400,
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          color, lineHeight: 1.05, marginBottom: '12px',
          opacity: 0.9,
        }}>
          {attendee.first_name}<br />{attendee.last_name}
        </div>

        {/* Multi-ticket indicator */}
        {ticketCount && ticketCount > 1 && (
          <div style={{
            fontFamily: font, fontSize: '18px',
            color, opacity: 0.7, marginBottom: '16px',
            letterSpacing: '0.06em',
          }}>
            {ticketCount} tickets
          </div>
        )}

        {/* Wristband pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          border: `2px solid ${color}44`,
          borderRadius: '100px', padding: '10px 24px',
          marginBottom: '48px',
        }}>
          <div style={{
            width: '12px', height: '12px', borderRadius: '50%',
            background: bg, border: `2px solid ${color}66`,
          }} />
          <span style={{
            fontFamily: font, fontSize: '13px',
            letterSpacing: '0.1em', textTransform: 'uppercase', color,
          }}>
            {badgeType?.display_name || 'Wristband'}
          </span>
        </div>

        {attendee.is_walkup && (
          <div style={{ ...label(color), opacity: 0.4, marginBottom: '12px' }}>Walk-Up</div>
        )}

        <div style={{ ...label(color), opacity: 0.3 }}>
          Tap to dismiss — {count}s
        </div>
      </div>
    </div>
  )
}

// ─── Ticket Selector (multi-ticket, different badge types) ───────────────────
function TicketSelector({ attendeeName, tickets, badgeTypes, onSelect, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 55,
      background: B.canvas,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <div style={{ textAlign: 'center', width: '100%', maxWidth: '480px' }}>
        {/* Label */}
        <div style={{ ...label(B.chartreuse), marginBottom: '24px' }}>
          Multiple tickets found
        </div>

        {/* Divider */}
        <div style={{ height: '3px', background: B.chartreuse, width: '40px', margin: '0 auto 32px' }} />

        {/* Attendee name — large, Druk Wide */}
        <div style={{
          fontFamily: druk, fontWeight: 500,
          fontSize: 'clamp(2rem, 7vw, 3.5rem)',
          color: B.cream, lineHeight: 0.95,
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          marginBottom: '40px',
        }}>
          {attendeeName}
        </div>

        {/* Ticket cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
          {tickets.map(ticket => {
            const bt = badgeTypes.find(b => b.id === ticket.badge_type_id)
            const isCheckedIn = ticket.checked_in
            return (
              <button
                key={ticket.id}
                onClick={() => !isCheckedIn && onSelect(ticket)}
                disabled={isCheckedIn}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: '16px', background: B.surface,
                  border: `1px solid ${isCheckedIn ? B.border : B.chartreuse + '44'}`,
                  borderRadius: '14px', padding: '20px 24px',
                  cursor: isCheckedIn ? 'default' : 'pointer',
                  textAlign: 'left',
                  opacity: isCheckedIn ? 0.4 : 1,
                  transition: 'border-color 0.15s, transform 0.1s',
                }}
              >
                {/* Color swatch */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: bt?.color || B.muted, flexShrink: 0,
                }} />
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: font, color: B.cream, fontSize: '18px', lineHeight: 1.2 }}>
                    {bt?.display_name || 'No badge type'}
                  </div>
                  {isCheckedIn && (
                    <div style={{ ...label(B.chartreuse), marginTop: '4px' }}>
                      ✓ Already checked in at {fmt(ticket.checked_in_at)}
                    </div>
                  )}
                </div>
                {/* Arrow */}
                {!isCheckedIn && (
                  <span style={{ color: B.chartreuse, fontSize: '22px', flexShrink: 0 }}>→</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Cancel */}
        <button onClick={onCancel} style={{
          background: 'none', border: `1px solid ${B.border}`,
          borderRadius: '10px', padding: '14px 32px',
          color: B.muted, fontFamily: font, fontSize: '13px',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── PIN Keypad ───────────────────────────────────────────────────────────────
function PinPad({ onSuccess, onClose, correctPin }) {
  const [entered, setEntered] = useState('')
  const [shake, setShake]     = useState(false)
  const MAX = correctPin.length || 4

  function press(digit) {
    if (entered.length >= MAX) return
    const next = entered + digit
    setEntered(next)
    if (next.length === MAX) {
      if (next === correctPin) {
        setTimeout(onSuccess, 120)
      } else {
        setShake(true)
        setTimeout(() => { setShake(false); setEntered('') }, 600)
      }
    }
  }

  function del() { setEntered(p => p.slice(0, -1)) }

  useEffect(() => {
    function onKey(e) {
      if (e.key >= '0' && e.key <= '9') press(e.key)
      else if (e.key === 'Backspace') del()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(29,27,28,0.92)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        className="slide-up"
        style={{
          background: B.surface, borderRadius: '24px 24px 0 0',
          padding: '28px 24px 40px', width: '100%', maxWidth: '360px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div style={label(B.chartreuse)}>Manager Mode</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: B.muted,
            fontFamily: font, fontSize: '20px', cursor: 'pointer', padding: '4px',
          }}>×</button>
        </div>

        {/* PIN dots */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '32px',
          ...(shake ? { animation: 'shake 0.4s ease' } : {}),
        }}>
          {Array.from({ length: MAX }).map((_, i) => (
            <div key={i} style={{
              width: '14px', height: '14px', borderRadius: '50%',
              background: i < entered.length ? B.chartreuse : B.border,
              transition: 'background 0.1s',
            }} />
          ))}
        </div>

        {/* Keypad grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {keys.map((k, i) => (
            k === '' ? <div key={i} /> :
            <button
              key={i}
              onClick={() => k === '⌫' ? del() : press(k)}
              style={{
                background: k === '⌫' ? 'transparent' : B.surface2,
                border: k === '⌫' ? `1px solid ${B.border}` : 'none',
                borderRadius: '12px', padding: '18px 0',
                color: k === '⌫' ? B.muted : B.cream,
                fontFamily: font, fontWeight: 400,
                fontSize: k === '⌫' ? '20px' : '24px',
                cursor: 'pointer', touchAction: 'manipulation',
              }}
            >{k}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Manager Panel (inline iPad panel, unlocked by PIN) ────────────────────────
function ManagerPanel({ badgeTypes, eventId, attendees, onClose, onRefresh }) {
  const [mode, setMode]   = useState('home') // home | search | add | edit
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [editing, setEditing] = useState(null)
  const fuseRef = useRef(new Fuse(attendees, FUSE_OPTIONS))
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    badge_type_id: badgeTypes[0]?.id || '', notes: '', checked_in: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fuseRef.current = new Fuse(attendees, FUSE_OPTIONS)
  }, [attendees])

  useEffect(() => {
    if (!query) { setResults([]); return }
    setResults(fuseRef.current.search(query, { limit: 6 }).map(r => r.item))
  }, [query])

  function openEdit(a) {
    setEditing(a)
    setForm({
      first_name:    a.first_name,
      last_name:     a.last_name,
      email:         a.email    || '',
      phone:         a.phone    || '',
      badge_type_id: a.badge_type_id || badgeTypes[0]?.id || '',
      notes:         a.notes   || '',
      checked_in:    a.checked_in || false,
    })
    setMode('edit')
  }

  function openAdd() {
    setEditing(null)
    setForm({ first_name: '', last_name: '', email: '', phone: '', badge_type_id: badgeTypes[0]?.id || '', notes: '', checked_in: false })
    setMode('add')
  }

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) return
    setSaving(true)
    if (editing) {
      await supabase.from('attendees').update({
        first_name:    form.first_name.trim(),
        last_name:     form.last_name.trim(),
        email:         form.email || null,
        phone:         form.phone || null,
        badge_type_id: form.badge_type_id || null,
        notes:         form.notes || null,
        checked_in:    form.checked_in,
        checked_in_at: form.checked_in ? (editing.checked_in_at || new Date().toISOString()) : null,
      }).eq('id', editing.id)
    } else {
      await supabase.from('attendees').insert({
        event_id:      eventId,
        first_name:    form.first_name.trim(),
        last_name:     form.last_name.trim(),
        email:         form.email || null,
        phone:         form.phone || null,
        badge_type_id: form.badge_type_id || null,
        notes:         form.notes || null,
        checked_in:    form.checked_in,
        checked_in_at: form.checked_in ? new Date().toISOString() : null,
        is_walkup:     true,
      })
    }
    onRefresh()
    setSaving(false)
    setMode('home')
  }

  // Shared input style for panel
  const pInput = (focused = false) => ({
    ...inputStyle(focused), padding: '12px 14px', fontSize: '15px',
  })

  const tab = (active) => ({
    flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
    fontFamily: font, fontSize: '12px', letterSpacing: '0.1em',
    textTransform: 'uppercase', background: 'none',
    borderBottom: `2px solid ${active ? B.chartreuse : 'transparent'}`,
    color: active ? B.chartreuse : B.muted, transition: 'all 0.15s',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(29,27,28,0.88)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        className="slide-up"
        style={{
          background: B.canvas, borderTop: `3px solid ${B.chartreuse}`,
          borderRadius: '16px', width: '100%', maxWidth: '600px',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Panel header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 0',
        }}>
          <div style={label(B.chartreuse)}>Manager Mode</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: B.muted,
            fontSize: '22px', cursor: 'pointer', fontFamily: font, padding: '0',
          }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '12px 20px 0', borderBottom: `1px solid ${B.border}`, gap: '4px' }}>
          <button style={tab(mode === 'home' || mode === 'search')} onClick={() => setMode('search')}>Find & Edit</button>
          <button style={tab(mode === 'add')} onClick={openAdd}>Add Attendee</button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* ── Search mode ── */}
          {(mode === 'home' || mode === 'search') && (
            <div>
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search name to edit…"
                style={pInput()}
              />
              <div style={{ marginTop: '10px' }}>
                {results.map(a => {
                  const bt = badgeTypes.find(b => b.id === a.badge_type_id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => openEdit(a)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', background: B.surface,
                        border: `1px solid ${B.border}`, borderRadius: '10px',
                        padding: '14px 16px', marginBottom: '8px', cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: font, color: B.cream, fontSize: '16px' }}>
                          {a.first_name} {a.last_name}
                        </div>
                        {a.email && <div style={{ ...label(), marginTop: '2px' }}>{a.email}</div>}
                        {a.checked_in && <div style={{ ...label(B.chartreuse), marginTop: '2px' }}>✓ Checked in {fmt(a.checked_in_at)}</div>}
                      </div>
                      {bt && (
                        <div style={{
                          background: bt.color, color: getTextColor(bt.color),
                          padding: '4px 12px', borderRadius: '100px',
                          fontFamily: font, fontSize: '11px', letterSpacing: '0.08em',
                          textTransform: 'uppercase', whiteSpace: 'nowrap',
                        }}>{bt.display_name}</div>
                      )}
                    </button>
                  )
                })}
                {!query && (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: B.muted, fontFamily: font, fontSize: '14px' }}>
                    Type a name to find an attendee
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Edit / Add form ── */}
          {(mode === 'edit' || mode === 'add') && (
            <div className="panel-in">
              {mode === 'edit' && (
                <button onClick={() => setMode('search')} style={{
                  background: 'none', border: 'none', color: B.muted, fontFamily: font,
                  fontSize: '13px', cursor: 'pointer', marginBottom: '16px', padding: 0,
                  letterSpacing: '0.05em',
                }}>← Back to search</button>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <div style={{ ...label(), marginBottom: '6px' }}>First Name *</div>
                  <input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                    style={pInput()} placeholder="First" />
                </div>
                <div>
                  <div style={{ ...label(), marginBottom: '6px' }}>Last Name *</div>
                  <input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                    style={pInput()} placeholder="Last" />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <div style={{ ...label(), marginBottom: '6px' }}>Badge / Wristband Type</div>
                <select value={form.badge_type_id} onChange={e => setForm(p => ({ ...p, badge_type_id: e.target.value }))}
                  style={{ ...pInput(), cursor: 'pointer' }}>
                  <option value="">— No badge type —</option>
                  {badgeTypes.map(bt => <option key={bt.id} value={bt.id}>{bt.display_name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <div style={{ ...label(), marginBottom: '6px' }}>Email</div>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  style={pInput()} placeholder="email@example.com" />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <div style={{ ...label(), marginBottom: '6px' }}>Notes</div>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  style={pInput()} placeholder="e.g. Comp'd, transferred ticket" />
              </div>

              {/* Checked-in toggle */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', cursor: 'pointer' }}
                onClick={() => setForm(p => ({ ...p, checked_in: !p.checked_in }))}
              >
                <div style={{
                  width: '44px', height: '24px', borderRadius: '100px',
                  background: form.checked_in ? B.chartreuse : B.border,
                  position: 'relative', transition: 'background 0.15s', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: '2px',
                    left: form.checked_in ? '22px' : '2px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: form.checked_in ? B.canvas : B.muted,
                    transition: 'left 0.15s',
                  }} />
                </div>
                <span style={{ fontFamily: font, fontSize: '14px', color: B.cream }}>Mark as checked in</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setMode(mode === 'edit' ? 'search' : 'home')} style={{
                  flex: 1, background: B.surface, border: `1px solid ${B.border}`,
                  borderRadius: '10px', padding: '14px', color: B.muted,
                  fontFamily: font, fontSize: '13px', letterSpacing: '0.08em',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}>Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={!form.first_name.trim() || !form.last_name.trim() || saving}
                  style={{
                    flex: 2, background: B.chartreuse, border: 'none',
                    borderRadius: '10px', padding: '14px',
                    color: B.canvas, fontFamily: font, fontSize: '13px',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    cursor: 'pointer', opacity: (!form.first_name.trim() || saving) ? 0.4 : 1,
                  }}
                >
                  {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Add & Check In'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Event Selector ────────────────────────────────────────────────────────────
function EventSelector({ events, current, onSelect, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      background: 'rgba(29,27,28,0.88)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }} onClick={onClose}>
      <div className="panel-in" style={{
        background: B.surface, borderRadius: '16px',
        width: '100%', maxWidth: '380px', padding: '20px',
        border: `1px solid ${B.border}`,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ ...label(B.chartreuse), marginBottom: '16px' }}>Select Event</div>
        <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map(ev => (
            <button key={ev.id} onClick={() => onSelect(ev)} style={{
              width: '100%', textAlign: 'left', background: current?.id === ev.id ? 'rgba(222,229,72,0.08)' : B.surface2,
              border: `1px solid ${current?.id === ev.id ? B.chartreuse : B.border}`,
              borderRadius: '10px', padding: '14px 16px', cursor: 'pointer',
            }}>
              <div style={{ fontFamily: font, color: current?.id === ev.id ? B.chartreuse : B.cream, fontSize: '16px' }}>
                {ev.name}
              </div>
              {(ev.location || ev.event_date) && (
                <div style={{ ...label(), marginTop: '3px' }}>
                  {[ev.location, ev.event_date && new Date(ev.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })].filter(Boolean).join(' · ')}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Walk-Up Modal ─────────────────────────────────────────────────────────────
function WalkUpModal({ badgeTypes, onSave, onClose }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', badgeId: badgeTypes[0]?.id || '', email: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [focus, setFocus]   = useState(null)

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) return
    setSaving(true)
    await onSave({ ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim() })
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      background: 'rgba(29,27,28,0.88)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div className="slide-up" style={{
        background: B.canvas, borderTop: `1px solid ${B.border}`,
        borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '520px',
        padding: '24px 24px 40px',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={label(B.cream)}>Add Walk-Up</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: B.muted, fontSize: '22px', cursor: 'pointer', fontFamily: font }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <div style={{ ...label(), marginBottom: '6px' }}>First Name *</div>
            <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
              placeholder="First" style={inputStyle(focus === 'fn')}
              onFocus={() => setFocus('fn')} onBlur={() => setFocus(null)} />
          </div>
          <div>
            <div style={{ ...label(), marginBottom: '6px' }}>Last Name *</div>
            <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
              placeholder="Last" style={inputStyle(focus === 'ln')}
              onFocus={() => setFocus('ln')} onBlur={() => setFocus(null)} />
          </div>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ ...label(), marginBottom: '6px' }}>Badge Type *</div>
          <select value={form.badgeId} onChange={e => setForm(p => ({ ...p, badgeId: e.target.value }))}
            style={{ ...inputStyle(), cursor: 'pointer' }}>
            {badgeTypes.map(bt => <option key={bt.id} value={bt.id}>{bt.display_name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ ...label(), marginBottom: '6px' }}>Email (optional)</div>
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            placeholder="email@example.com" style={inputStyle(focus === 'em')}
            onFocus={() => setFocus('em')} onBlur={() => setFocus(null)} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{
            flex: 1, background: B.surface, border: `1px solid ${B.border}`,
            borderRadius: '10px', padding: '16px', color: B.muted,
            fontFamily: font, fontSize: '13px', letterSpacing: '0.08em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={!form.firstName || !form.lastName || saving} style={{
            flex: 2, background: B.chartreuse, border: 'none', borderRadius: '10px',
            padding: '16px', color: B.canvas, fontFamily: font, fontSize: '13px',
            letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            opacity: (!form.firstName || saving) ? 0.4 : 1,
          }}>
            {saving ? 'Saving…' : 'Check In'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Kiosk Exit PIN Prompt ───────────────────────────────────────────────────
function KioskExitPin({ correctPin, onSuccess, onClose }) {
  const [entered, setEntered] = useState('')
  const [shake, setShake]     = useState(false)
  const MAX = correctPin.length || 4

  function press(digit) {
    if (entered.length >= MAX) return
    const next = entered + digit
    setEntered(next)
    if (next.length === MAX) {
      if (next === correctPin) {
        setTimeout(onSuccess, 120)
      } else {
        setShake(true)
        setTimeout(() => { setShake(false); setEntered('') }, 600)
      }
    }
  }

  function del() { setEntered(p => p.slice(0, -1)) }

  useEffect(() => {
    function onKey(e) {
      if (e.key >= '0' && e.key <= '9') press(e.key)
      else if (e.key === 'Backspace') del()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70,
      background: 'rgba(29,27,28,0.95)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: B.surface, borderRadius: '20px',
        padding: '28px 24px 32px', width: '100%', maxWidth: '320px',
        border: `1px solid ${B.border}`,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ ...label(B.chartreuse), marginBottom: '8px', textAlign: 'center' }}>Exit Kiosk Mode</div>
        <div style={{ fontFamily: font, color: B.muted, fontSize: '13px', textAlign: 'center', marginBottom: '24px' }}>
          Enter manager PIN to exit
        </div>

        {/* PIN dots */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '28px',
          ...(shake ? { animation: 'shake 0.4s ease' } : {}),
        }}>
          {Array.from({ length: MAX }).map((_, i) => (
            <div key={i} style={{
              width: '14px', height: '14px', borderRadius: '50%',
              background: i < entered.length ? B.chartreuse : B.border,
              transition: 'background 0.1s',
            }} />
          ))}
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {keys.map((k, i) => (
            k === '' ? <div key={i} /> :
            <button
              key={i}
              onClick={() => k === '⌫' ? del() : press(k)}
              style={{
                background: k === '⌫' ? 'transparent' : B.surface2,
                border: k === '⌫' ? `1px solid ${B.border}` : 'none',
                borderRadius: '10px', padding: '16px 0',
                color: k === '⌫' ? B.muted : B.cream,
                fontFamily: font, fontWeight: 400,
                fontSize: k === '⌫' ? '18px' : '22px',
                cursor: 'pointer', touchAction: 'manipulation',
              }}
            >{k}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main CheckIn Page ────────────────────────────────────────────────────────
export default function CheckIn() {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()

  const [events, setEvents]             = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [attendees, setAttendees]       = useState([])
  const [badgeTypes, setBadgeTypes]     = useState([])
  const fuseRef = useRef(null)

  const [query, setQuery]               = useState('')
  const [results, setResults]           = useState([])
  const [flash, setFlash]               = useState(null)
  const [ticketSelector, setTicketSelector] = useState(null) // { name, tickets }
  const [showWalkup, setShowWalkup]     = useState(false)
  const [showEvents, setShowEvents]     = useState(false)
  const [showPin, setShowPin]           = useState(false)
  const [showManager, setShowManager]   = useState(false)
  const [managerPin, setManagerPin]     = useState('1234') // fetched from settings
  const [loadingEvent, setLoadingEvent] = useState(false)

  // Email visibility toggle (staff only, never in kiosk)
  const [showEmails, setShowEmails] = useState(() => localStorage.getItem('dg_show_emails') === 'true')
  function toggleEmails() {
    setShowEmails(p => { const v = !p; localStorage.setItem('dg_show_emails', String(v)); return v })
  }

  // Kiosk mode state
  const [kioskMode, setKioskMode]       = useState(() => localStorage.getItem('dg_kiosk_mode') === 'true')
  const [showKioskExit, setShowKioskExit] = useState(false)

  const inputRef = useRef(null)

  // ── Session timeout (30 min inactivity lock — check-in screen only) ──────
  const lastActivity = useRef(Date.now())
  const [showLock, setShowLock] = useState(false)
  const [showLockPin, setShowLockPin] = useState(false)
  const INACTIVITY_MS = 30 * 60 * 1000 // 30 minutes

  // Reset activity timer on user interactions
  useEffect(() => {
    function resetActivity() { lastActivity.current = Date.now() }
    const events = ['pointerdown', 'keydown']
    events.forEach(e => window.addEventListener(e, resetActivity))
    const checker = setInterval(() => {
      if (Date.now() - lastActivity.current > INACTIVITY_MS && !showLock) {
        setShowLock(true)
      }
    }, 10000) // check every 10s
    return () => {
      events.forEach(e => window.removeEventListener(e, resetActivity))
      clearInterval(checker)
    }
  }, [showLock])

  function handleLockTap() {
    setShowLockPin(true)
  }

  function handleUnlock() {
    setShowLock(false)
    setShowLockPin(false)
    lastActivity.current = Date.now()
  }

  // ── Kiosk fullscreen management ─────────────────────────────────────────
  useEffect(() => {
    if (kioskMode) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    }
  }, [kioskMode])

  // Listen for fullscreen exit (e.g. Escape key) — try to re-enter once
  const fsRetrying = useRef(false)
  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement && kioskMode && !fsRetrying.current) {
        fsRetrying.current = true
        document.documentElement.requestFullscreen?.()
          .catch(() => {})
          .finally(() => { fsRetrying.current = false })
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [kioskMode])

  function enterKiosk() {
    setKioskMode(true)
    localStorage.setItem('dg_kiosk_mode', 'true')
  }

  function exitKiosk() {
    setKioskMode(false)
    setShowKioskExit(false)
    localStorage.removeItem('dg_kiosk_mode')
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  // ── Fetch events + manager PIN ─────────────────────────────────────────────
  useEffect(() => {
    supabase.from('events').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        setEvents(data)
        const lastId = localStorage.getItem('dg_last_event_id')
        setSelectedEvent(data.find(e => e.id === lastId) || data[0] || null)
      })

    // Fetch manager PIN from settings table (gracefully falls back to default)
    supabase.from('settings').select('value').eq('key', 'manager_pin').single()
      .then(({ data }) => { if (data?.value) setManagerPin(data.value) })
  }, [])

  // ── Load attendees + badge types ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedEvent) return
    setLoadingEvent(true)
    setAttendees([]); setResults([]); setQuery('')

    Promise.all([
      supabase.from('badge_types').select('*').eq('event_id', selectedEvent.id).order('sort_order'),
      supabase.from('attendees').select('*').eq('event_id', selectedEvent.id),
    ]).then(([btRes, atRes]) => {
      if (btRes.data) setBadgeTypes(btRes.data)
      if (atRes.data) {
        setAttendees(atRes.data)
        fuseRef.current = new Fuse(atRes.data, FUSE_OPTIONS)
      }
      setLoadingEvent(false)
    })
    localStorage.setItem('dg_last_event_id', selectedEvent.id)
  }, [selectedEvent?.id])

  // ── Real-time sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedEvent) return
    const ch = supabase.channel(`att-${selectedEvent.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees', filter: `event_id=eq.${selectedEvent.id}` }, (p) => {
        setAttendees(prev => {
          if (p.eventType === 'INSERT') return [...prev, p.new]
          if (p.eventType === 'UPDATE') return prev.map(a => a.id === p.new.id ? p.new : a)
          if (p.eventType === 'DELETE') return prev.filter(a => a.id !== p.old.id)
          return prev
        })
        // Fuse index rebuild handled by the dedicated attendees useEffect
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [selectedEvent?.id])

  // ── Rebuild Fuse index whenever attendees change (check-in, undo, real-time)
  useEffect(() => {
    if (attendees.length > 0) {
      fuseRef.current = new Fuse(attendees, FUSE_OPTIONS)
    }
  }, [attendees])

  // ── Fuzzy search (Fuse index kept current by dedicated attendees useEffect)
  useEffect(() => {
    if (!query.trim() || !fuseRef.current) { setResults([]); return }
    setResults(fuseRef.current.search(query.trim(), { limit: 6 }).map(r => r.item))
  }, [query])

  // ── Smart multi-ticket check-in ────────────────────────────────────────────
  const handleSelect = useCallback(async (attendee) => {
    setQuery(''); setResults([]); inputRef.current?.blur()

    // Find all attendees with the same first+last name in this event
    const fullName = `${attendee.first_name.toLowerCase()} ${attendee.last_name.toLowerCase()}`
    const sameNameRecords = attendees.filter(a =>
      `${a.first_name.toLowerCase()} ${a.last_name.toLowerCase()}` === fullName
    )

    // Single ticket — original behavior
    if (sameNameRecords.length <= 1) {
      return checkInSingle(attendee)
    }

    // Multiple tickets — check if all are already checked in (Scenario C)
    const allCheckedIn = sameNameRecords.every(a => a.checked_in)
    if (allCheckedIn) {
      const badgeType = badgeTypes.find(bt => bt.id === attendee.badge_type_id) || null
      setFlash({ attendee, badgeType, status: 'duplicate' })
      return
    }

    // Multiple tickets — check badge type diversity
    const uncheckedRecords = sameNameRecords.filter(a => !a.checked_in)
    const uniqueBadgeTypes = new Set(uncheckedRecords.map(a => a.badge_type_id))

    if (uniqueBadgeTypes.size <= 1) {
      // Scenario A — same badge type: auto check-in one, show count
      const toCheckIn = uncheckedRecords[0]
      const badgeType = badgeTypes.find(bt => bt.id === toCheckIn.badge_type_id) || null
      const ticketCount = sameNameRecords.filter(a => a.badge_type_id === toCheckIn.badge_type_id).length

      const at = new Date().toISOString()
      setAttendees(prev => prev.map(a => a.id === toCheckIn.id ? { ...a, checked_in: true, checked_in_at: at } : a))
      setFlash({
        attendee: { ...toCheckIn, checked_in: true, checked_in_at: at },
        badgeType,
        status: 'success',
        ticketCount,
      })

      const { error } = await supabase.from('attendees').update({ checked_in: true, checked_in_at: at }).eq('id', toCheckIn.id)
      if (error) {
        setAttendees(prev => prev.map(a => a.id === toCheckIn.id ? { ...a, checked_in: false, checked_in_at: null } : a))
        setFlash(null); alert('Check-in failed — please try again.')
      }
    } else {
      // Scenario B — different badge types: show ticket selector
      setTicketSelector({
        name: `${attendee.first_name} ${attendee.last_name}`,
        tickets: sameNameRecords,
      })
    }
  }, [badgeTypes, attendees])

  // Check in a single attendee record
  const checkInSingle = useCallback(async (attendee) => {
    const badgeType = badgeTypes.find(bt => bt.id === attendee.badge_type_id) || null

    if (attendee.checked_in) {
      setFlash({ attendee, badgeType, status: 'duplicate' }); return
    }

    const at = new Date().toISOString()
    setAttendees(prev => prev.map(a => a.id === attendee.id ? { ...a, checked_in: true, checked_in_at: at } : a))
    setFlash({ attendee: { ...attendee, checked_in: true, checked_in_at: at }, badgeType, status: 'success' })

    const { error } = await supabase.from('attendees').update({ checked_in: true, checked_in_at: at }).eq('id', attendee.id)
    if (error) {
      setAttendees(prev => prev.map(a => a.id === attendee.id ? { ...a, checked_in: false, checked_in_at: null } : a))
      setFlash(null); alert('Check-in failed — please try again.')
    }
  }, [badgeTypes])

  // Handle ticket selector choice (Scenario B)
  const handleTicketSelect = useCallback(async (ticket) => {
    setTicketSelector(null)
    await checkInSingle(ticket)
  }, [checkInSingle])

  // ── Undo check-in ──────────────────────────────────────────────────────────
  const handleUndo = useCallback(async (attendee) => {
    setFlash(null)
    setAttendees(prev => prev.map(a => a.id === attendee.id ? { ...a, checked_in: false, checked_in_at: null } : a))
    await supabase.from('attendees').update({ checked_in: false, checked_in_at: null }).eq('id', attendee.id)
  }, [])

  // ── Walk-up ────────────────────────────────────────────────────────────────
  const handleWalkup = useCallback(async ({ firstName, lastName, badgeId, email }) => {
    if (!selectedEvent) return
    const at = new Date().toISOString()
    const bt = badgeTypes.find(b => b.id === badgeId) || null
    const { data } = await supabase.from('attendees').insert({
      event_id: selectedEvent.id, first_name: firstName, last_name: lastName,
      email: email?.trim() || null, badge_type_id: badgeId || null,
      checked_in: true, checked_in_at: at, is_walkup: true,
    }).select().single()
    if (data) { setShowWalkup(false); setFlash({ attendee: data, badgeType: bt, status: 'success' }) }
  }, [selectedEvent, badgeTypes])

  // ── Refresh attendees (after manager edit) ─────────────────────────────────
  const handleRefresh = useCallback(() => {
    if (!selectedEvent) return
    supabase.from('attendees').select('*').eq('event_id', selectedEvent.id).then(({ data }) => {
      if (data) {
        setAttendees(data)
        fuseRef.current = new Fuse(data, FUSE_OPTIONS)
      }
    })
  }, [selectedEvent?.id])

  // ── Flash dismiss (memoized to avoid stale closure in FlashScreen timer) ──
  const handleFlashDismiss = useCallback(() => {
    setFlash(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total: attendees.length,
    in:    attendees.filter(a => a.checked_in).length,
    types: badgeTypes.map(bt => ({
      ...bt,
      total: attendees.filter(a => a.badge_type_id === bt.id).length,
      in:    attendees.filter(a => a.badge_type_id === bt.id && a.checked_in).length,
    }))
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: B.canvas, overflow: 'hidden',
    }}>
      {/* Overlays */}
      {flash      && <FlashScreen flash={flash} onDismiss={handleFlashDismiss} onUndo={handleUndo} />}
      {ticketSelector && (
        <TicketSelector
          attendeeName={ticketSelector.name}
          tickets={ticketSelector.tickets}
          badgeTypes={badgeTypes}
          onSelect={handleTicketSelect}
          onCancel={() => setTicketSelector(null)}
        />
      )}
      {showWalkup && <WalkUpModal badgeTypes={badgeTypes} onSave={handleWalkup} onClose={() => setShowWalkup(false)} />}
      {showEvents && !kioskMode && <EventSelector events={events} current={selectedEvent} onSelect={ev => { setSelectedEvent(ev); setShowEvents(false) }} onClose={() => setShowEvents(false)} />}
      {showPin    && !kioskMode && <PinPad correctPin={managerPin} onSuccess={() => { setShowPin(false); setShowManager(true) }} onClose={() => setShowPin(false)} />}
      {showManager && !kioskMode && <ManagerPanel badgeTypes={badgeTypes} eventId={selectedEvent?.id} attendees={attendees} onClose={() => setShowManager(false)} onRefresh={handleRefresh} />}
      {showKioskExit && <KioskExitPin correctPin={managerPin} onSuccess={exitKiosk} onClose={() => setShowKioskExit(false)} />}

      {/* ── Session Lock Overlay ── */}
      {showLock && !showLockPin && (
        <div onClick={handleLockTap} style={{
          position: 'fixed', inset: 0, zIndex: 65,
          background: B.canvas, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <img
            src="https://assets.cdn.filesafe.space/a8SvpD1b3VlpgBtRabDn/media/69a0cf1e13b8426d4dc4a879.png"
            alt="David Ghiyam"
            style={{ width: '64px', height: 'auto', marginBottom: '24px', opacity: 0.8 }}
          />
          <div style={{ fontFamily: font, color: B.cream, fontSize: '18px', letterSpacing: '0.06em', opacity: 0.6 }}>
            Tap to continue
          </div>
        </div>
      )}
      {showLock && showLockPin && (
        <PinPad correctPin={managerPin} onSuccess={handleUnlock} onClose={() => setShowLockPin(false)} />
      )}

      {/* ── Kiosk Mode Layout ── */}
      {kioskMode ? (
        <>
          {/* Kiosk header — logo + event name */}
          <div style={{
            padding: '28px 24px 20px', flexShrink: 0, textAlign: 'center',
            borderBottom: `1px solid ${B.border}`,
          }}>
            <img
              src="https://assets.cdn.filesafe.space/a8SvpD1b3VlpgBtRabDn/media/69a0cf1e13b8426d4dc4a879.png"
              alt="David Ghiyam"
              style={{ width: '48px', height: 'auto', marginBottom: '14px', opacity: 0.9 }}
            />
            <div style={{
              fontFamily: druk, fontWeight: 500,
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
              color: B.cream, letterSpacing: '-0.02em',
              textTransform: 'uppercase', lineHeight: 1,
            }}>
              {selectedEvent?.name || 'Event Check-In'}
            </div>
            <div style={{ height: '3px', background: B.chartreuse, width: '48px', margin: '12px auto 0' }} />
          </div>

          {/* Kiosk search — large and prominent */}
          <div style={{ padding: '24px 24px 12px', flexShrink: 0 }}>
            <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto' }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type your name to check in"
                disabled={!selectedEvent || loadingEvent}
                autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false}
                style={{
                  width: '100%', background: B.surface,
                  border: `2px solid ${query ? B.chartreuse : B.border}`,
                  borderRadius: '16px',
                  padding: '24px 60px 24px 24px',
                  color: B.cream, fontSize: 'clamp(20px, 3vw, 28px)',
                  fontFamily: font, fontWeight: 400,
                  outline: 'none', transition: 'border-color 0.15s',
                  opacity: (!selectedEvent || loadingEvent) ? 0.4 : 1,
                }}
              />
              {query && (
                <button onClick={() => { setQuery(''); inputRef.current?.focus() }} style={{
                  position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: B.muted, fontSize: '28px',
                  cursor: 'pointer', fontFamily: font, width: '40px', height: '40px',
                }}>×</button>
              )}
            </div>
          </div>

          {/* Kiosk results */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 24px 8px' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
              {results.length > 0 && query && results.map(a => {
                const bt = badgeTypes.find(b => b.id === a.badge_type_id)
                return (
                  <button
                    key={a.id}
                    onClick={() => handleSelect(a)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: B.surface, border: `1px solid ${B.border}`,
                      borderRadius: '14px', padding: '22px 24px', marginBottom: '10px',
                      cursor: 'pointer', textAlign: 'left',
                      opacity: a.checked_in ? 0.45 : 1,
                      transition: 'border-color 0.1s',
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: font, fontWeight: 400, fontSize: '24px', color: B.cream, lineHeight: 1.2 }}>
                        {a.first_name} {a.last_name}
                      </div>
                      {a.checked_in && (
                        <div style={{ ...label(B.chartreuse), marginTop: '4px' }}>
                          ✓ Checked in
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '16px' }}>
                      {bt && (
                        <div style={{
                          background: bt.color, color: getTextColor(bt.color),
                          padding: '8px 18px', borderRadius: '100px',
                          fontFamily: font, fontSize: '12px', letterSpacing: '0.1em',
                          textTransform: 'uppercase', whiteSpace: 'nowrap',
                        }}>{bt.display_name}</div>
                      )}
                      {!a.checked_in && (
                        <span style={{ color: 'rgba(254,252,245,0.15)', fontSize: '24px' }}>→</span>
                      )}
                    </div>
                  </button>
                )
              })}

              {/* Kiosk empty state */}
              {!query && !loadingEvent && selectedEvent && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
                  <div style={{
                    fontFamily: druk, fontWeight: 500,
                    color: 'rgba(222, 229, 72, 0.55)',
                    fontSize: 'clamp(3rem, 8vw, 5rem)',
                    letterSpacing: '-0.02em',
                    textTransform: 'uppercase',
                    lineHeight: 0.9,
                    marginBottom: '20px',
                  }}>Check In</div>
                  <div style={{ fontFamily: font, color: B.muted, fontSize: '18px' }}>
                    Type your name above
                  </div>
                </div>
              )}

              {query && results.length === 0 && !loadingEvent && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', textAlign: 'center' }}>
                  <div style={{ fontFamily: font, color: B.cream, fontSize: '20px', marginBottom: '8px' }}>
                    No match for "{query}"
                  </div>
                  <div style={{ ...label(B.muted), marginBottom: '4px' }}>Please check your spelling or ask staff for help</div>
                </div>
              )}
            </div>
          </div>

          {/* Kiosk bottom — hidden exit button only, no stats */}
          <div style={{
            flexShrink: 0, padding: '8px 24px 16px',
          }}>
            <button
              onClick={() => setShowKioskExit(true)}
              style={{
                background: 'none', border: 'none',
                color: B.cream,
                fontFamily: font, fontSize: '11px',
                cursor: 'pointer', padding: '8px 12px',
                letterSpacing: '0.06em',
              }}
            >
              EXIT
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ── Normal Header ── */}
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 20px 12px', flexShrink: 0,
            borderBottom: `1px solid ${B.border}`,
          }}>
            {/* Brand */}
            <div>
              <div style={{ fontFamily: font, fontWeight: 400, fontSize: '18px', color: B.cream, letterSpacing: '-0.01em', lineHeight: 1 }}>
                David Ghiyam
              </div>
              <div style={{ ...label(B.chartreuse), marginTop: '3px' }}>Event Check-In</div>
            </div>

            {/* Event selector */}
            <button onClick={() => setShowEvents(true)} style={{
              background: B.surface, border: `1px solid ${B.border}`,
              borderRadius: '10px', padding: '10px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '200px',
            }}>
              <span style={{ fontFamily: font, color: B.cream, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedEvent?.name || 'Select Event'}
              </span>
              <span style={{ color: B.muted, fontSize: '12px', flexShrink: 0 }}>▾</span>
            </button>

            {/* Right controls */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={toggleEmails}
                title="Toggle email visibility in search results"
                style={{
                  background: showEmails ? 'rgba(222,229,72,0.1)' : B.surface,
                  border: `1px solid ${showEmails ? B.chartreuse + '44' : B.border}`,
                  borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
                  fontFamily: font, color: showEmails ? B.chartreuse : B.muted, fontSize: '11px',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}
              >
                Emails
              </button>
              <button
                onClick={() => setShowPin(true)}
                title="Manager Mode"
                style={{
                  background: B.surface, border: `1px solid ${B.border}`,
                  borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
                  fontFamily: font, color: B.chartreuse, fontSize: '13px',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}
              >
                Mgr
              </button>
              {role === 'admin' && (
                <>
                  <button onClick={enterKiosk} title="Enter Kiosk Mode" style={{
                    background: B.surface, border: `1px solid ${B.border}`,
                    borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
                    fontFamily: font, color: B.chartreuse, fontSize: '13px',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>Kiosk</button>
                  <button onClick={() => navigate('/admin')} style={{
                    background: B.surface, border: `1px solid ${B.border}`,
                    borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
                    fontFamily: font, color: B.muted, fontSize: '13px',
                  }}>Admin</button>
                </>
              )}
              <button onClick={signOut} style={{
                background: 'none', border: `1px solid ${B.border}`,
                borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
                fontFamily: font, color: B.muted, fontSize: '13px',
              }}>Out</button>
            </div>
          </header>

          {/* ── Search input ── */}
          <div style={{ padding: '16px 20px 8px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', opacity: 0.3, pointerEvents: 'none' }}>
                ⌕
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={
                  loadingEvent ? 'Loading attendees…' :
                  selectedEvent ? `Search ${attendees.length} attendees…` : 'Select an event first'
                }
                disabled={!selectedEvent || loadingEvent}
                autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false}
                style={{
                  width: '100%', background: B.surface,
                  border: `2px solid ${query ? B.chartreuse : B.border}`,
                  borderRadius: '12px',
                  padding: '18px 48px 18px 48px',
                  color: B.cream, fontSize: '20px',
                  fontFamily: font, fontWeight: 400,
                  outline: 'none', transition: 'border-color 0.15s',
                  opacity: (!selectedEvent || loadingEvent) ? 0.4 : 1,
                }}
              />
              {query && (
                <button onClick={() => { setQuery(''); inputRef.current?.focus() }} style={{
                  position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: B.muted, fontSize: '22px',
                  cursor: 'pointer', fontFamily: font, width: '32px', height: '32px',
                }}>×</button>
              )}
            </div>
          </div>

          {/* ── Results ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 8px' }}>
            {results.length > 0 && query && results.map(a => {
              const bt = badgeTypes.find(b => b.id === a.badge_type_id)
              return (
                <button
                  key={a.id}
                  onClick={() => handleSelect(a)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: B.surface, border: `1px solid ${B.border}`,
                    borderRadius: '12px', padding: '18px 20px', marginBottom: '8px',
                    cursor: 'pointer', textAlign: 'left',
                    opacity: a.checked_in ? 0.45 : 1,
                    transition: 'border-color 0.1s',
                  }}
                  onMouseEnter={e => !a.checked_in && (e.currentTarget.style.borderColor = 'rgba(222,229,72,0.3)')}
                  onMouseLeave={e => e.currentTarget.style.borderColor = B.border}
                >
                  <div>
                    <div style={{ fontFamily: font, fontWeight: 400, fontSize: '20px', color: B.cream, lineHeight: 1.2 }}>
                      {a.first_name} {a.last_name}
                    </div>
                    {showEmails && !kioskMode && a.email && <div style={{ fontFamily: font, fontSize: '12px', color: B.muted, marginTop: '3px' }}>{a.email}</div>}
                    {a.checked_in && (
                      <div style={{ ...label(B.chartreuse), marginTop: '3px' }}>
                        ✓ Checked in at {fmt(a.checked_in_at)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '16px' }}>
                    {bt && (
                      <div style={{
                        background: bt.color, color: getTextColor(bt.color),
                        padding: '6px 14px', borderRadius: '100px',
                        fontFamily: font, fontSize: '11px', letterSpacing: '0.1em',
                        textTransform: 'uppercase', whiteSpace: 'nowrap',
                      }}>{bt.display_name}</div>
                    )}
                    {!a.checked_in && (
                      <span style={{ color: 'rgba(254,252,245,0.15)', fontSize: '20px' }}>→</span>
                    )}
                  </div>
                </button>
              )
            })}

            {/* Empty states */}
            {!query && !loadingEvent && selectedEvent && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', textAlign: 'center' }}>
                <div style={{ fontFamily: font, color: 'rgba(254,252,245,0.15)', fontSize: '48px', marginBottom: '12px' }}>⌨</div>
                <div style={{ fontFamily: druk, fontWeight: 500, color: 'rgba(254,252,245,0.12)', fontSize: 'clamp(2rem, 6vw, 3.2rem)', letterSpacing: '-0.02em', textTransform: 'uppercase', lineHeight: 0.9, marginBottom: '14px' }}>Check In</div>
                <div style={{ fontFamily: font, color: B.muted, fontSize: '16px' }}>Type a name to search</div>
                <div style={{ ...label(), marginTop: '4px' }}>{attendees.length} attendees loaded</div>
              </div>
            )}

            {query && results.length === 0 && !loadingEvent && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}>
                <div style={{ fontFamily: font, color: B.muted, fontSize: '36px', marginBottom: '12px' }}>?</div>
                <div style={{ fontFamily: font, color: B.cream, fontSize: '17px', marginBottom: '4px' }}>
                  No match for "{query}"
                </div>
                <div style={{ ...label(B.muted), marginBottom: '20px' }}>Name may not be in the system</div>
                <button onClick={() => setShowWalkup(true)} style={{
                  background: B.chartreuse, color: B.canvas, border: 'none',
                  borderRadius: '10px', padding: '14px 24px',
                  fontFamily: font, fontSize: '13px', letterSpacing: '0.1em',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}>
                  + Add as Walk-Up
                </button>
              </div>
            )}
          </div>

          {/* ── Bottom bar ── */}
          <div style={{
            flexShrink: 0, padding: '12px 20px 20px',
            borderTop: `1px solid ${B.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {/* Live stats */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {/* Total */}
              <div>
                <div style={{ fontFamily: font, color: B.cream, fontSize: '22px', lineHeight: 1 }}>
                  {stats.in}
                  <span style={{ color: B.muted, fontSize: '14px' }}>/{stats.total}</span>
                </div>
                <div style={label(B.muted)}>Total</div>
              </div>
              {/* Divider */}
              <div style={{ width: '1px', height: '32px', background: B.border }} />
              {/* By type */}
              {stats.types.map((bt) => (
                <div key={bt.id}>
                  <div style={{ fontFamily: font, fontSize: '20px', lineHeight: 1, color: B.cream }}>
                    {bt.in}
                    <span style={{ color: B.muted, fontSize: '13px' }}>/{bt.total}</span>
                  </div>
                  <div style={label(B.muted)}>{bt.display_name}</div>
                </div>
              ))}
            </div>

            {/* Walk-up */}
            <button onClick={() => setShowWalkup(true)} disabled={!selectedEvent} style={{
              background: 'none', border: `1px solid ${B.border}`,
              borderRadius: '10px', padding: '12px 18px', cursor: 'pointer',
              fontFamily: font, color: B.chartreuse, fontSize: '13px',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              opacity: !selectedEvent ? 0.3 : 1, whiteSpace: 'nowrap',
            }}>
              + Walk-Up
            </button>
          </div>
        </>
      )}
    </div>
  )
}
