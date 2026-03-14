import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import { supabase } from '../../lib/supabase'

const B    = { canvas: '#1D1B1C', surface: '#262323', surface2: '#2E2B2B', border: '#333131', cream: '#FEFCF5', cream2: '#EEECE7', muted: '#C4C4C4', chartreuse: '#DEE548' }
const font = "'GT Pressura', Arial, Helvetica, sans-serif"
const lbl  = (c = B.muted) => ({ fontFamily: font, fontWeight: 400, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: c, display: 'block' })

function getTextColor(hex) {
  if (!hex || hex.length < 7) return B.cream
  const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.5 ? '#1D1B1C' : '#FEFCF5'
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function inp(focus = false) {
  return { width: '100%', background: B.surface, border: `1px solid ${focus ? B.chartreuse : B.border}`, borderRadius: '10px', padding: '12px 14px', color: B.cream, fontSize: '15px', fontFamily: font, fontWeight: 400, outline: 'none', transition: 'border-color 0.15s' }
}

// ── Attendee Modal ──────────────────────────────────────────────────────────
function AttendeeModal({ attendee, badgeTypes, eventId, onSave, onClose }) {
  const isNew = !attendee?.id
  const [form, setForm] = useState({
    first_name:    attendee?.first_name    || '',
    last_name:     attendee?.last_name     || '',
    email:         attendee?.email         || '',
    phone:         attendee?.phone         || '',
    badge_type_id: attendee?.badge_type_id || badgeTypes[0]?.id || '',
    notes:         attendee?.notes         || '',
    checked_in:    attendee?.checked_in    || false,
  })
  const [saving, setSaving]   = useState(false)
  const [focus, setFocus]     = useState(null)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) return
    setSaving(true)
    let result
    if (isNew) {
      result = await supabase.from('attendees').insert({ event_id: eventId, first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email || null, phone: form.phone || null, badge_type_id: form.badge_type_id || null, notes: form.notes || null, checked_in: form.checked_in, checked_in_at: form.checked_in ? new Date().toISOString() : null }).select().single()
    } else {
      result = await supabase.from('attendees').update({ first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email || null, phone: form.phone || null, badge_type_id: form.badge_type_id || null, notes: form.notes || null, checked_in: form.checked_in, checked_in_at: form.checked_in ? (attendee.checked_in_at || new Date().toISOString()) : null }).eq('id', attendee.id).select().single()
    }
    if (result.data) onSave(result.data, isNew)
    else alert('Error: ' + result.error?.message)
    setSaving(false)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${attendee.first_name} ${attendee.last_name}?`)) return
    await supabase.from('attendees').delete().eq('id', attendee.id)
    onSave(attendee, false, true)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(29,27,28,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: B.surface, borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', border: `1px solid ${B.border}` }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={lbl(B.cream)}>{isNew ? 'Add Attendee' : 'Edit Attendee'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: B.muted, fontSize: '22px', cursor: 'pointer', fontFamily: font }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <div style={{ ...lbl(), marginBottom: '6px' }}>First Name *</div>
            <input value={form.first_name} onChange={e => set('first_name', e.target.value)} style={inp(focus==='fn')} onFocus={() => setFocus('fn')} onBlur={() => setFocus(null)} />
          </div>
          <div>
            <div style={{ ...lbl(), marginBottom: '6px' }}>Last Name *</div>
            <input value={form.last_name} onChange={e => set('last_name', e.target.value)} style={inp(focus==='ln')} onFocus={() => setFocus('ln')} onBlur={() => setFocus(null)} />
          </div>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ ...lbl(), marginBottom: '6px' }}>Badge / Wristband Type</div>
          <select value={form.badge_type_id} onChange={e => set('badge_type_id', e.target.value)} style={{ ...inp(), cursor: 'pointer', colorScheme: 'dark' }}>
            <option value="">— No badge type —</option>
            {badgeTypes.map(bt => <option key={bt.id} value={bt.id}>{bt.display_name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ ...lbl(), marginBottom: '6px' }}>Email</div>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inp(focus==='em')} onFocus={() => setFocus('em')} onBlur={() => setFocus(null)} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ ...lbl(), marginBottom: '6px' }}>Phone</div>
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} style={inp(focus==='ph')} onFocus={() => setFocus('ph')} onBlur={() => setFocus(null)} />
        </div>
        <div style={{ marginBottom: '14px' }}>
          <div style={{ ...lbl(), marginBottom: '6px' }}>Notes</div>
          <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Comp'd by David" style={inp(focus==='nt')} onFocus={() => setFocus('nt')} onBlur={() => setFocus(null)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', cursor: 'pointer' }} onClick={() => set('checked_in', !form.checked_in)}>
          <div style={{ width: '44px', height: '24px', borderRadius: '100px', background: form.checked_in ? B.chartreuse : B.border, position: 'relative', transition: 'background 0.15s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '2px', left: form.checked_in ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: form.checked_in ? B.canvas : B.muted, transition: 'left 0.15s' }} />
          </div>
          <span style={{ fontFamily: font, fontSize: '14px', color: B.cream }}>Checked in</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isNew && (
            <button onClick={handleDelete} style={{ background: 'rgba(180,40,40,0.1)', border: '1px solid rgba(180,40,40,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#F87171', fontFamily: font, fontSize: '13px', cursor: 'pointer' }}>Delete</button>
          )}
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: `1px solid ${B.border}`, borderRadius: '10px', padding: '14px', color: B.muted, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={!form.first_name.trim() || saving} style={{ flex: 2, background: B.chartreuse, border: 'none', borderRadius: '10px', padding: '14px', color: B.canvas, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: (!form.first_name.trim() || saving) ? 0.4 : 1 }}>
            {saving ? 'Saving…' : isNew ? 'Add Attendee' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CSV Upload ─────────────────────────────────────────────────────────────────
function CSVUpload({ badgeTypes, eventId, onImported, onClose }) {
  const [step, setStep]     = useState('upload')
  const [rows, setRows]     = useState([])
  const [columns, setColumns] = useState([])
  const [mapping, setMapping] = useState({ first_name: '', last_name: '', email: '', phone: '', badge_type: '' })
  const [preview, setPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: ({ data, meta }) => {
      setRows(data); setColumns(meta.fields || [])
      const auto = { ...mapping }
      meta.fields.forEach(col => {
        const lc = col.toLowerCase()
        if (!auto.first_name && (lc.includes('first') || lc === 'fname')) auto.first_name = col
        if (!auto.last_name  && (lc.includes('last')  || lc === 'lname')) auto.last_name  = col
        if (!auto.email      && lc.includes('email'))                      auto.email      = col
        if (!auto.phone      && (lc.includes('phone') || lc.includes('mobile'))) auto.phone = col
        if (!auto.badge_type && (lc.includes('badge') || lc.includes('ticket') || lc.includes('type'))) auto.badge_type = col
      })
      setMapping(auto); setStep('map')
    }})
  }

  function resolveBadge(raw) {
    if (!raw) return null
    const l = raw.toLowerCase().trim()
    return badgeTypes.find(bt => bt.display_name.toLowerCase().includes(l) || l.includes(bt.display_name.toLowerCase())) || null
  }

  async function handleImport() {
    setImporting(true)
    const toInsert = rows.map(r => ({ event_id: eventId, first_name: (r[mapping.first_name]||'').trim(), last_name: (r[mapping.last_name]||'').trim(), email: (r[mapping.email]||'').trim()||null, phone: (r[mapping.phone]||'').trim()||null, badge_type_id: resolveBadge(r[mapping.badge_type])?.id||null, checked_in: false })).filter(r => r.first_name && r.last_name)
    let inserted = 0, errors = 0
    for (let i = 0; i < toInsert.length; i += 100) {
      const { error } = await supabase.from('attendees').insert(toInsert.slice(i, i+100))
      if (error) errors++; else inserted += Math.min(100, toInsert.length - i)
    }
    setResult({ inserted, errors, total: toInsert.length }); setStep('done')
    setImporting(false); onImported()
  }

  const selStyle = { width: '100%', background: B.surface, border: `1px solid ${B.border}`, borderRadius: '10px', padding: '10px 12px', color: B.cream, fontSize: '14px', fontFamily: font, outline: 'none', colorScheme: 'dark' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(29,27,28,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: B.surface, borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px', border: `1px solid ${B.border}` }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={lbl(B.cream)}>Import CSV</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: B.muted, fontSize: '22px', cursor: 'pointer', fontFamily: font }}>×</button>
        </div>

        {step === 'upload' && (
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${B.border}`, borderRadius: '12px', padding: '48px 24px', cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = B.chartreuse}
            onMouseLeave={e => e.currentTarget.style.borderColor = B.border}
          >
            <div style={{ fontFamily: font, color: B.cream, fontSize: '16px', marginBottom: '6px' }}>Select CSV file</div>
            <div style={lbl()}>Attendee export from your checkout platform</div>
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
          </label>
        )}

        {step === 'map' && (
          <div>
            <div style={{ fontFamily: font, color: B.cream, fontSize: '14px', marginBottom: '16px', opacity: 0.6 }}>
              Found <strong style={{ opacity: 1 }}>{rows.length}</strong> rows — map your columns:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {[['first_name','First Name',true],['last_name','Last Name',true],['email','Email',false],['phone','Phone',false],['badge_type','Badge / Ticket Type',false]].map(([k,l,r]) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center' }}>
                  <div style={{ fontFamily: font, fontSize: '14px', color: B.cream }}>
                    {l} {r && <span style={{ color: '#F87171' }}>*</span>}
                  </div>
                  <select value={mapping[k]} onChange={e => setMapping(p => ({ ...p, [k]: e.target.value }))} style={selStyle}>
                    <option value="">— skip —</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep('upload')} style={{ flex: 1, background: 'none', border: `1px solid ${B.border}`, borderRadius: '10px', padding: '12px', color: B.muted, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Back</button>
              <button onClick={() => { setPreview(rows.slice(0,5).map(r => ({ fn: r[mapping.first_name]||'', ln: r[mapping.last_name]||'', bt: r[mapping.badge_type]||'' }))); setStep('preview') }} disabled={!mapping.first_name || !mapping.last_name} style={{ flex: 2, background: B.chartreuse, border: 'none', borderRadius: '10px', padding: '12px', color: B.canvas, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: (!mapping.first_name || !mapping.last_name) ? 0.4 : 1 }}>
                Preview
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div>
            <div style={{ fontFamily: font, color: B.cream, fontSize: '14px', marginBottom: '12px', opacity: 0.6 }}>
              First 5 of <strong style={{ opacity: 1 }}>{rows.length}</strong> rows:
            </div>
            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {preview.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: B.surface2, borderRadius: '8px', padding: '10px 14px' }}>
                  <span style={{ fontFamily: font, color: B.cream, fontSize: '14px' }}>{p.fn} {p.ln}</span>
                  {p.bt && <span style={{ fontFamily: font, color: B.muted, fontSize: '12px', letterSpacing: '0.08em' }}>{p.bt}</span>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep('map')} style={{ flex: 1, background: 'none', border: `1px solid ${B.border}`, borderRadius: '10px', padding: '12px', color: B.muted, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Back</button>
              <button onClick={handleImport} disabled={importing} style={{ flex: 2, background: B.chartreuse, border: 'none', borderRadius: '10px', padding: '12px', color: B.canvas, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: importing ? 0.5 : 1 }}>
                {importing ? 'Importing…' : `Import ${rows.length} Attendees`}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontFamily: font, color: B.chartreuse, fontSize: '40px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontFamily: font, color: B.cream, fontSize: '20px', marginBottom: '6px' }}>Import Complete</div>
            <div style={lbl()}>{result.inserted} attendees added{result.errors > 0 && ` · ${result.errors} errors`}</div>
            <button onClick={onClose} style={{ marginTop: '24px', background: B.chartreuse, border: 'none', borderRadius: '10px', padding: '14px 32px', color: B.canvas, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── EventDetail Page ─────────────────────────────────────────────────────────
export default function EventDetail() {
  const { eventId } = useParams()
  const navigate    = useNavigate()

  const [event, setEvent]         = useState(null)
  const [attendees, setAttendees] = useState([])
  const [badgeTypes, setBadgeTypes] = useState([])
  const [loading, setLoading]     = useState(true)

  const [search, setSearch]       = useState('')
  const [filterBadge, setFilterBadge]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [editingAttendee, setEditingAttendee] = useState(null)
  const [showCSV, setShowCSV]     = useState(false)
  const [focusSearch, setFocusSearch] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [editingBadge, setEditingBadge] = useState(null)
  const [badgeEditColor, setBadgeEditColor] = useState('')
  const [badgeEditName, setBadgeEditName] = useState('')
  const [savingBadge, setSavingBadge] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('badge_types').select('*').eq('event_id', eventId).order('sort_order'),
      supabase.from('attendees').select('*').eq('event_id', eventId).order('last_name'),
    ]).then(([ev, bt, at]) => {
      if (ev.data) setEvent(ev.data)
      if (bt.data) setBadgeTypes(bt.data)
      if (at.data) setAttendees(at.data)
    }).catch(err => {
      console.error('Failed to load event data:', err)
    }).finally(() => {
      setLoading(false)
    })
  }, [eventId])

  function refresh() {
    supabase.from('attendees').select('*').eq('event_id', eventId).order('last_name')
      .then(({ data }) => { if (data) setAttendees(data) })
  }

  function onSaved(saved, isNew, deleted = false) {
    if (deleted) setAttendees(p => p.filter(a => a.id !== saved.id))
    else if (isNew) setAttendees(p => [...p, saved].sort((a, b) => a.last_name.localeCompare(b.last_name)))
    else setAttendees(p => p.map(a => a.id === saved.id ? saved : a))
    setEditingAttendee(null)
  }

  const filtered = attendees.filter(a => {
    const q = search.toLowerCase()
    const nm = !q || `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) || (a.email||'').toLowerCase().includes(q)
    const bm = filterBadge === 'all' || a.badge_type_id === filterBadge
    const sm = filterStatus === 'all' ? true : filterStatus === 'in' ? a.checked_in : !a.checked_in
    return nm && bm && sm
  })

  const stats = {
    total: attendees.length,
    in: attendees.filter(a => a.checked_in).length,
    types: badgeTypes.map(bt => ({
      ...bt,
      total: attendees.filter(a => a.badge_type_id === bt.id).length,
      in:    attendees.filter(a => a.badge_type_id === bt.id && a.checked_in).length,
    }))
  }

  async function handleDeleteEvent() {
    setDeleting(true)
    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (error) {
      alert('Error deleting event: ' + error.message)
      setDeleting(false)
    } else {
      navigate('/admin')
    }
  }

  async function handleSaveBadge() {
    if (!editingBadge) return
    setSavingBadge(true)
    const { data, error } = await supabase.from('badge_types').update({ display_name: badgeEditName.trim(), color: badgeEditColor }).eq('id', editingBadge.id).select().single()
    if (error) {
      alert('Error updating badge type: ' + error.message)
    } else if (data) {
      setBadgeTypes(prev => prev.map(bt => bt.id === data.id ? data : bt))
    }
    setSavingBadge(false)
    setEditingBadge(null)
  }

  function exportCSV() {
    const rows = [['First Name','Last Name','Email','Phone','Badge Type','Checked In','Time','Walk-Up','Notes'], ...attendees.map(a => { const bt = badgeTypes.find(b => b.id === a.badge_type_id); return [a.first_name, a.last_name, a.email||'', a.phone||'', bt?.display_name||'', a.checked_in?'Yes':'No', a.checked_in_at ? new Date(a.checked_in_at).toLocaleString() : '', a.is_walkup?'Yes':'No', a.notes||''] })]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'})); a.download = `${(event?.name||'event').replace(/\s+/g,'_')}_attendees.csv`; a.click()
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: font, color: 'rgba(254,252,245,0.2)', fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading…</div>
  if (!event)  return <div style={{ padding: '40px', fontFamily: font, color: B.muted }}>Event not found</div>

  const pct = stats.total > 0 ? Math.round(stats.in / stats.total * 100) : 0
  const selStyle = { background: B.surface, border: `1px solid ${B.border}`, borderRadius: '10px', padding: '10px 14px', color: B.cream, fontFamily: font, fontSize: '13px', outline: 'none', cursor: 'pointer', colorScheme: 'dark' }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
      {editingAttendee !== null && <AttendeeModal attendee={editingAttendee?.id ? editingAttendee : null} badgeTypes={badgeTypes} eventId={eventId} onSave={onSaved} onClose={() => setEditingAttendee(null)} />}
      {showCSV && <CSVUpload badgeTypes={badgeTypes} eventId={eventId} onImported={() => { refresh(); setShowCSV(false) }} onClose={() => setShowCSV(false)} />}

      {/* Back + title */}
      <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', color: B.muted, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: '16px', padding: 0 }}>← All Events</button>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
        <div>
          <div style={{ fontFamily: font, fontWeight: 400, fontSize: '26px', color: B.cream, letterSpacing: '-0.01em' }}>{event.name}</div>
          <div style={{ ...lbl(), marginTop: '4px' }}>
            {[event.location, event.event_date && new Date(event.event_date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowCSV(true)} style={{ ...selStyle, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '12px' }}>📥 Import CSV</button>
          <button onClick={exportCSV} style={{ ...selStyle, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '12px' }}>📤 Export</button>
          <button onClick={() => setEditingAttendee({})} style={{ background: B.chartreuse, border: 'none', borderRadius: '10px', padding: '10px 18px', color: B.canvas, fontFamily: font, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>+ Add</button>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '28px' }}>
        {/* Main stat */}
        <div style={{ gridColumn: '1 / 3', background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
            <div>
              <div style={{ fontFamily: font, fontWeight: 400, fontSize: '32px', color: B.cream, lineHeight: 1 }}>
                {stats.in}<span style={{ color: 'rgba(254,252,245,0.25)', fontSize: '18px' }}>/{stats.total}</span>
              </div>
              <div style={{ ...lbl(), marginTop: '4px' }}>Checked In — {pct}%</div>
            </div>
          </div>
          <div style={{ height: '3px', background: B.border, borderRadius: '100px' }}>
            <div style={{ height: '100%', background: B.chartreuse, borderRadius: '100px', width: `${pct}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>
        {/* Per badge type */}
        {stats.types.map(bt => {
          const p = bt.total > 0 ? Math.round(bt.in/bt.total*100) : 0
          return (
            <div key={bt.id} style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '16px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <div
                  onClick={() => { setEditingBadge(bt); setBadgeEditColor(bt.color || '#888888'); setBadgeEditName(bt.display_name) }}
                  style={{ width: '12px', height: '12px', borderRadius: '50%', background: bt.color, flexShrink: 0, cursor: 'pointer', border: '2px solid rgba(254,252,245,0.15)', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Edit badge type"
                />
                <div style={{ ...lbl(), fontSize: '10px' }}>{bt.display_name}</div>
              </div>
              <div style={{ fontFamily: font, fontSize: '24px', color: B.cream, lineHeight: 1 }}>
                {bt.in}<span style={{ color: 'rgba(254,252,245,0.25)', fontSize: '14px' }}>/{bt.total}</span>
              </div>
              <div style={{ height: '2px', background: B.border, borderRadius: '100px', marginTop: '8px' }}>
                <div style={{ height: '100%', background: bt.color, borderRadius: '100px', width: `${p}%`, transition: 'width 0.5s ease' }} />
              </div>
              {editingBadge?.id === bt.id && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '0', zIndex: 40, background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '16px', width: '220px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
                  <div style={{ ...lbl(), marginBottom: '10px' }}>Edit Badge Type</div>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ ...lbl(), marginBottom: '4px', fontSize: '9px' }}>Color</div>
                    <input type="color" value={badgeEditColor} onChange={e => setBadgeEditColor(e.target.value)} style={{ width: '100%', height: '36px', border: `1px solid ${B.border}`, borderRadius: '8px', background: B.surface2, cursor: 'pointer', padding: '2px' }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ ...lbl(), marginBottom: '4px', fontSize: '9px' }}>Display Name</div>
                    <input value={badgeEditName} onChange={e => setBadgeEditName(e.target.value)} style={{ ...inp(), padding: '8px 10px', fontSize: '13px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditingBadge(null)} style={{ flex: 1, background: 'none', border: `1px solid ${B.border}`, borderRadius: '8px', padding: '8px', color: B.muted, fontFamily: font, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleSaveBadge} disabled={!badgeEditName.trim() || savingBadge} style={{ flex: 1, background: B.chartreuse, border: 'none', borderRadius: '8px', padding: '8px', color: B.canvas, fontFamily: font, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: (!badgeEditName.trim() || savingBadge) ? 0.4 : 1 }}>{savingBadge ? 'Saving…' : 'Save'}</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
          style={{ flex: 1, minWidth: '180px', background: B.surface, border: `1px solid ${focusSearch ? B.chartreuse : B.border}`, borderRadius: '10px', padding: '10px 14px', color: B.cream, fontSize: '14px', fontFamily: font, outline: 'none', transition: 'border-color 0.15s' }}
          onFocus={() => setFocusSearch(true)} onBlur={() => setFocusSearch(false)}
        />
        <select value={filterBadge} onChange={e => setFilterBadge(e.target.value)} style={selStyle}>
          <option value="all">All Badge Types</option>
          {badgeTypes.map(bt => <option key={bt.id} value={bt.id}>{bt.display_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="all">All Status</option>
          <option value="in">Checked In</option>
          <option value="out">Not Checked In</option>
        </select>
      </div>

      <div style={{ ...lbl(), marginBottom: '8px' }}>{filtered.length} of {attendees.length} attendees</div>

      {/* Table */}
      <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 40px', padding: '12px 16px', borderBottom: `1px solid ${B.border}` }}>
          {['Name', 'Email', 'Badge Type', 'Status', ''].map((h, i) => (
            <div key={i} style={lbl()}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', fontFamily: font, color: 'rgba(254,252,245,0.2)', fontSize: '14px' }}>No attendees match</div>
        ) : (
          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            {filtered.map(a => {
              const bt = badgeTypes.find(b => b.id === a.badge_type_id)
              return (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 40px', padding: '12px 16px', borderBottom: `1px solid ${B.border}`, alignItems: 'center', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = B.surface2}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{ fontFamily: font, color: B.cream, fontSize: '14px' }}>{a.first_name} {a.last_name}</div>
                    {a.is_walkup && <div style={{ ...lbl(B.chartreuse), marginTop: '2px' }}>Walk-up</div>}
                    {a.notes && <div style={{ ...lbl(), marginTop: '2px', fontSize: '10px', opacity: 0.6 }}>{a.notes}</div>}
                  </div>
                  <div style={{ fontFamily: font, color: 'rgba(254,252,245,0.35)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email || '—'}</div>
                  <div>
                    {bt ? (
                      <span style={{ background: bt.color, color: getTextColor(bt.color), padding: '3px 10px', borderRadius: '100px', fontFamily: font, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {bt.display_name}
                      </span>
                    ) : <span style={{ color: 'rgba(254,252,245,0.2)', fontSize: '13px' }}>—</span>}
                  </div>
                  <div>
                    {a.checked_in ? (
                      <div>
                        <div style={{ fontFamily: font, color: B.chartreuse, fontSize: '12px', letterSpacing: '0.06em' }}>✓ In</div>
                        <div style={{ ...lbl(), fontSize: '10px' }}>{fmt(a.checked_in_at)}</div>
                      </div>
                    ) : <span style={{ color: 'rgba(254,252,245,0.2)', fontSize: '13px' }}>—</span>}
                  </div>
                  <button onClick={() => setEditingAttendee(a)} style={{ background: 'none', border: 'none', color: 'rgba(254,252,245,0.25)', cursor: 'pointer', fontFamily: font, fontSize: '16px', padding: '4px 8px', borderRadius: '6px' }}
                    onMouseEnter={e => e.currentTarget.style.color = B.chartreuse}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(254,252,245,0.25)'}
                  >✏</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete Event */}
      <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: `1px solid ${B.border}`, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => { setShowDeleteModal(true); setDeleteConfirmText('') }} style={{ background: 'none', border: `1px solid rgba(180,40,40,0.3)`, borderRadius: '10px', padding: '10px 20px', color: '#F87171', fontFamily: font, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(180,40,40,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >Delete Event</button>
      </div>

      {/* Delete Event Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(29,27,28,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }} onClick={() => setShowDeleteModal(false)}>
          <div style={{ background: B.surface, borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', border: `1px solid ${B.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={lbl('#F87171')}>Delete Event</div>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: 'none', border: 'none', color: B.muted, fontSize: '22px', cursor: 'pointer', fontFamily: font }}>×</button>
            </div>
            <div style={{ fontFamily: font, color: B.cream, fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
              This will permanently delete <strong>{event.name}</strong> and all <strong>{attendees.length}</strong> attendee{attendees.length !== 1 ? 's' : ''}. Type the event name to confirm.
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...lbl(), marginBottom: '6px' }}>Event Name</div>
              <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder={event.name} style={inp(deleteConfirmText === event.name)} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, background: 'none', border: `1px solid ${B.border}`, borderRadius: '10px', padding: '14px', color: B.muted, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDeleteEvent} disabled={deleteConfirmText !== event.name || deleting} style={{ flex: 2, background: deleteConfirmText === event.name ? '#DC2626' : 'rgba(180,40,40,0.2)', border: 'none', borderRadius: '10px', padding: '14px', color: deleteConfirmText === event.name ? '#FEFCF5' : 'rgba(248,113,113,0.4)', fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: deleteConfirmText === event.name ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
                {deleting ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
