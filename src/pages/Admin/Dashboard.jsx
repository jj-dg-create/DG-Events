import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '../../lib/supabase'

const B = { canvas: '#1D1B1C', surface: '#262323', surface2: '#2E2B2B', border: '#333131', cream: '#FEFCF5', muted: '#C4C4C4', chartreuse: '#DEE548' }
const font = "'GT Pressura', Arial, Helvetica, sans-serif"
const druk = "'Druk Wide', 'GT Pressura', Arial, sans-serif"
const lbl = (c = B.muted) => ({ fontFamily: font, fontWeight: 400, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: c })

function getTextColor(hex) {
  if (!hex || hex.length < 7) return B.cream
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1D1B1C' : '#FEFCF5'
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Group check-ins into 15-minute windows
function buildTimeline(attendees) {
  const checkedIn = attendees.filter(a => a.checked_in && a.checked_in_at)
  if (checkedIn.length === 0) return []

  const buckets = {}
  checkedIn.forEach(a => {
    const d = new Date(a.checked_in_at)
    const mins = d.getHours() * 60 + d.getMinutes()
    const bucket = Math.floor(mins / 15) * 15
    const key = `${String(Math.floor(bucket / 60)).padStart(2, '0')}:${String(bucket % 60).padStart(2, '0')}`
    buckets[key] = (buckets[key] || 0) + 1
  })

  const keys = Object.keys(buckets).sort()
  if (keys.length === 0) return []

  // Fill gaps between first and last bucket
  const first = keys[0].split(':').map(Number)
  const last = keys[keys.length - 1].split(':').map(Number)
  const firstMins = first[0] * 60 + first[1]
  const lastMins = last[0] * 60 + last[1]

  const timeline = []
  for (let m = firstMins; m <= lastMins; m += 15) {
    const key = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    const h = Math.floor(m / 60)
    const mm = m % 60
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    const display = `${h12}:${String(mm).padStart(2, '0')} ${ampm}`
    timeline.push({ time: display, count: buckets[key] || 0, key })
  }

  return timeline
}

// Custom tooltip for the chart
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { time, count } = payload[0].payload
  return (
    <div style={{
      background: B.surface, border: `1px solid ${B.border}`, borderRadius: '8px',
      padding: '10px 14px', fontFamily: font,
    }}>
      <div style={{ color: B.cream, fontSize: '16px', fontWeight: 400 }}>{count} check-in{count !== 1 ? 's' : ''}</div>
      <div style={{ ...lbl(), marginTop: '4px' }}>{time}</div>
    </div>
  )
}

export default function Dashboard() {
  const [searchParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get('event') || null)
  const [attendees, setAttendees] = useState([])
  const [badgeTypes, setBadgeTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [recentCheckins, setRecentCheckins] = useState([])

  // Load events
  useEffect(() => {
    supabase.from('events').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setEvents(data)
          if (!selectedEventId && data.length > 0) setSelectedEventId(data[0].id)
        }
      })
  }, [])

  // Load attendees + badge types for selected event
  useEffect(() => {
    if (!selectedEventId) { setLoading(false); return }
    setLoading(true)
    Promise.all([
      supabase.from('attendees').select('*').eq('event_id', selectedEventId),
      supabase.from('badge_types').select('*').eq('event_id', selectedEventId).order('sort_order'),
    ]).then(([atRes, btRes]) => {
      if (atRes.data) setAttendees(atRes.data)
      if (btRes.data) setBadgeTypes(btRes.data)
    }).catch(err => console.error('Dashboard load failed:', err))
      .finally(() => setLoading(false))
  }, [selectedEventId])

  // Real-time subscription
  useEffect(() => {
    if (!selectedEventId) return
    const ch = supabase.channel(`dash-${selectedEventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees', filter: `event_id=eq.${selectedEventId}` }, (p) => {
        setAttendees(prev => {
          if (p.eventType === 'INSERT') return [...prev, p.new]
          if (p.eventType === 'UPDATE') return prev.map(a => a.id === p.new.id ? p.new : a)
          if (p.eventType === 'DELETE') return prev.filter(a => a.id !== p.old.id)
          return prev
        })
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [selectedEventId])

  // Computed data
  const totalRegistered = attendees.length
  const checkedIn = attendees.filter(a => a.checked_in)
  const totalCheckedIn = checkedIn.length
  const checkInRate = totalRegistered > 0 ? Math.round(totalCheckedIn / totalRegistered * 100) : 0
  const walkUps = attendees.filter(a => a.is_walkup).length

  const timeline = useMemo(() => buildTimeline(attendees), [attendees])
  const peakBucket = useMemo(() => {
    if (timeline.length === 0) return null
    return timeline.reduce((max, b) => b.count > max.count ? b : max, timeline[0])
  }, [timeline])

  // Recent check-ins (sorted by checked_in_at desc, top 20)
  const recentFeed = useMemo(() => {
    return attendees
      .filter(a => a.checked_in && a.checked_in_at)
      .sort((a, b) => new Date(b.checked_in_at) - new Date(a.checked_in_at))
      .slice(0, 20)
  }, [attendees])

  // Badge type breakdown
  const badgeBreakdown = useMemo(() => {
    return badgeTypes.map(bt => {
      const total = attendees.filter(a => a.badge_type_id === bt.id).length
      const inCount = attendees.filter(a => a.badge_type_id === bt.id && a.checked_in).length
      return { ...bt, total, in: inCount, pct: total > 0 ? Math.round(inCount / total * 100) : 0 }
    })
  }, [attendees, badgeTypes])

  const selectedEvent = events.find(e => e.id === selectedEventId)
  const selStyle = { background: B.surface, border: `1px solid ${B.border}`, borderRadius: '10px', padding: '10px 14px', color: B.cream, fontFamily: font, fontSize: '14px', outline: 'none', cursor: 'pointer', colorScheme: 'dark' }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Title + Event selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div style={{
          fontFamily: druk, fontWeight: 500, fontSize: 'clamp(1.5rem, 3vw, 2rem)',
          color: B.cream, letterSpacing: '-0.02em', textTransform: 'uppercase',
        }}>
          Dashboard
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {walkUps > 0 && (
            <div style={{
              background: 'rgba(222,229,72,0.1)', border: `1px solid ${B.chartreuse}33`,
              borderRadius: '100px', padding: '6px 14px',
              fontFamily: font, fontSize: '12px', color: B.chartreuse,
              letterSpacing: '0.06em',
            }}>
              {walkUps} walk-up{walkUps !== 1 ? 's' : ''}
            </div>
          )}
          <select
            value={selectedEventId || ''}
            onChange={e => setSelectedEventId(e.target.value)}
            style={{ ...selStyle, maxWidth: '280px' }}
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: B.muted, fontFamily: font, fontSize: '14px' }}>Loading…</div>
      ) : !selectedEventId ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: B.muted, fontFamily: font, fontSize: '16px' }}>Select an event to view analytics</div>
      ) : (
        <>
          {/* ── Headline Stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '28px' }}>
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontFamily: font, fontSize: '32px', color: B.cream, lineHeight: 1 }}>{totalRegistered}</div>
              <div style={lbl()}>Registered</div>
            </div>
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontFamily: font, fontSize: '32px', color: B.chartreuse, lineHeight: 1 }}>{totalCheckedIn}</div>
              <div style={lbl()}>Checked In</div>
            </div>
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontFamily: font, fontSize: '32px', color: B.cream, lineHeight: 1 }}>{checkInRate}%</div>
              <div style={lbl()}>Check-In Rate</div>
            </div>
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontFamily: font, fontSize: '32px', color: B.cream, lineHeight: 1 }}>{peakBucket?.time || '—'}</div>
              <div style={lbl()}>Peak Arrival</div>
            </div>
          </div>

          {/* ── Timeline Chart ── */}
          {timeline.length > 0 && (
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
              <div style={{ ...lbl(B.cream), marginBottom: '16px' }}>Check-In Timeline</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={timeline} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <XAxis
                    dataKey="time"
                    tick={{ fill: B.muted, fontFamily: font, fontSize: 10 }}
                    axisLine={{ stroke: B.border }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: B.muted, fontFamily: font, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(254,252,245,0.03)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {timeline.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={peakBucket && entry.key === peakBucket.key ? B.chartreuse : B.surface2}
                        stroke={peakBucket && entry.key === peakBucket.key ? B.chartreuse : B.border}
                        strokeWidth={1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Two-column: Badge Breakdown + Recent Feed ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>

            {/* Badge Type Breakdown */}
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ ...lbl(B.cream), marginBottom: '16px' }}>Badge Type Breakdown</div>
              {badgeBreakdown.length === 0 ? (
                <div style={{ fontFamily: font, color: B.muted, fontSize: '14px', padding: '20px 0', textAlign: 'center' }}>No badge types</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {badgeBreakdown.map(bt => (
                    <div key={bt.id}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: bt.color, flexShrink: 0 }} />
                          <span style={{ fontFamily: font, color: B.cream, fontSize: '14px' }}>{bt.display_name}</span>
                        </div>
                        <span style={{ fontFamily: font, color: B.cream, fontSize: '14px' }}>
                          {bt.in}<span style={{ color: B.muted, fontSize: '12px' }}>/{bt.total}</span>
                          <span style={{ color: B.muted, fontSize: '11px', marginLeft: '6px' }}>{bt.pct}%</span>
                        </span>
                      </div>
                      <div style={{ height: '4px', background: B.border, borderRadius: '100px' }}>
                        <div style={{ height: '100%', background: bt.color, borderRadius: '100px', width: `${bt.pct}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Check-Ins Feed */}
            <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ ...lbl(B.cream), marginBottom: '16px' }}>Recent Check-Ins</div>
              {recentFeed.length === 0 ? (
                <div style={{ fontFamily: font, color: B.muted, fontSize: '14px', padding: '20px 0', textAlign: 'center' }}>No check-ins yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '400px', overflowY: 'auto' }}>
                  {recentFeed.map((a, i) => {
                    const bt = badgeTypes.find(b => b.id === a.badge_type_id)
                    return (
                      <div key={a.id} className={i === 0 ? 'panel-in' : ''} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: '8px',
                        transition: 'background 0.1s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = B.surface2}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div style={{ fontFamily: font, color: B.cream, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {a.first_name} {a.last_name}
                          </div>
                          {bt && (
                            <span style={{
                              background: bt.color, color: getTextColor(bt.color),
                              padding: '2px 8px', borderRadius: '100px',
                              fontFamily: font, fontSize: '9px', letterSpacing: '0.08em',
                              textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
                            }}>{bt.display_name}</span>
                          )}
                        </div>
                        <span style={{ fontFamily: font, color: B.muted, fontSize: '11px', flexShrink: 0, marginLeft: '8px' }}>
                          {timeAgo(a.checked_in_at)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
