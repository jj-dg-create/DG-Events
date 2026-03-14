import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const B    = { canvas: '#1D1B1C', surface: '#262323', surface2: '#2E2B2B', border: '#333131', cream: '#FEFCF5', muted: '#C4C4C4', chartreuse: '#DEE548' }
const font = "'GT Pressura', Arial, Helvetica, sans-serif"
const lbl  = (c = B.muted) => ({ fontFamily: font, fontWeight: 400, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: c })

function InviteModal({ onInvited, onClose }) {
  const [email, setEmail]     = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState(null)
  const [focus, setFocus]     = useState(null)

  const inp = (f) => ({
    width: '100%', background: B.surface, border: `1px solid ${focus === f ? B.chartreuse : B.border}`,
    borderRadius: '10px', padding: '14px 16px', color: B.cream,
    fontSize: '15px', fontFamily: font, fontWeight: 400, outline: 'none',
    transition: 'border-color 0.15s',
  })

  async function handleInvite() {
    if (!email.trim()) return
    setSending(true)
    setError(null)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      })
      if (otpError) throw otpError
      onInvited(email.trim())
    } catch (err) {
      setError(err.message || 'Failed to send invite')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(29,27,28,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: B.surface, borderRadius: '16px', width: '100%', maxWidth: '420px', padding: '24px', border: `1px solid ${B.border}` }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={lbl(B.cream)}>Invite Staff</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: B.muted, fontSize: '22px', cursor: 'pointer', fontFamily: font }}>×</button>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ ...lbl(), marginBottom: '6px' }}>Email Address *</div>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="staff@example.com"
            type="email"
            style={inp('email')}
            onFocus={() => setFocus('email')}
            onBlur={() => setFocus(null)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
          />
        </div>
        <p style={{ ...lbl(), color: 'rgba(254,252,245,0.25)', marginBottom: '16px', lineHeight: 1.5 }}>
          A magic link will be sent to this email. Once they sign in, they will appear in the team list with a default staff role.
        </p>
        {error && (
          <div style={{ fontFamily: font, fontSize: '13px', color: '#F87171', marginBottom: '12px' }}>{error}</div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: `1px solid ${B.border}`, borderRadius: '10px', padding: '14px', color: B.muted, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleInvite} disabled={!email.trim() || sending} style={{ flex: 2, background: B.chartreuse, border: 'none', borderRadius: '10px', padding: '14px', color: B.canvas, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: (!email.trim() || sending) ? 0.4 : 1 }}>
            {sending ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Team() {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [invited, setInvited]   = useState(null)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .order('created_at', { ascending: false })
    if (error) console.error('Failed to load team:', error)
    if (data) setUsers(data)
    setLoading(false)
  }

  async function updateRole(userId, newRole) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
    if (error) {
      console.error('Failed to update role:', error)
      return
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  async function removeUser(userId, name) {
    if (!window.confirm(`Remove ${name || 'this user'} from the team? This deletes their profile.`)) return
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
    if (error) {
      console.error('Failed to remove user:', error)
      return
    }
    setUsers(prev => prev.filter(u => u.id !== userId))
  }

  function handleInvited(email) {
    setShowInvite(false)
    setInvited(email)
    setTimeout(() => setInvited(null), 4000)
  }

  const rolePill = (role) => ({
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontFamily: font,
    fontSize: '11px',
    fontWeight: 400,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    background: role === 'admin' ? B.chartreuse : B.muted,
    color: B.canvas,
  })

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>
      {showInvite && <InviteModal onInvited={handleInvited} onClose={() => setShowInvite(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ fontFamily: font, fontWeight: 400, fontSize: '28px', color: B.cream, letterSpacing: '-0.01em' }}>Team</div>
        <button onClick={() => setShowInvite(true)} style={{
          background: B.chartreuse, border: 'none', borderRadius: '10px',
          padding: '12px 20px', color: B.canvas, fontFamily: font, fontSize: '13px',
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
        }}>+ Invite Staff</button>
      </div>

      {/* Invite success banner */}
      {invited && (
        <div style={{
          background: 'rgba(222,229,72,0.1)', border: `1px solid ${B.chartreuse}`,
          borderRadius: '10px', padding: '14px 18px', marginBottom: '16px',
          fontFamily: font, fontSize: '14px', color: B.chartreuse,
        }}>
          Magic link sent to {invited}
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(254,252,245,0.2)', fontFamily: font, fontSize: '14px' }}>Loading…</div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: '16px' }}>
          <div style={{ fontFamily: font, color: 'rgba(254,252,245,0.5)', fontSize: '18px', marginBottom: '8px' }}>No team members yet</div>
          <div style={lbl()}>Invite your first staff member to get started</div>
          <button onClick={() => setShowInvite(true)} style={{ marginTop: '20px', background: B.chartreuse, border: 'none', borderRadius: '10px', padding: '14px 24px', color: B.canvas, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Invite First Member
          </button>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 40px', gap: '12px', padding: '0 20px', marginBottom: '8px' }}>
            <div style={lbl()}>Name</div>
            <div style={lbl()}>Role</div>
            <div />
            <div />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {users.map(user => (
              <div key={user.id} style={{
                background: B.surface, border: `1px solid ${B.border}`,
                borderRadius: '12px', padding: '16px 20px',
                display: 'grid', gridTemplateColumns: '1fr 120px 100px 40px',
                gap: '12px', alignItems: 'center',
              }}>
                {/* Name & email */}
                <div>
                  <div style={{ fontFamily: font, fontWeight: 400, fontSize: '16px', color: B.cream }}>
                    {user.full_name || 'Unnamed'}
                  </div>
                  <div style={{ ...lbl(), marginTop: '2px', fontSize: '10px' }}>
                    {user.email || user.id.slice(0, 8) + '…'}
                  </div>
                </div>

                {/* Role dropdown */}
                <div>
                  <select
                    value={user.role || 'staff'}
                    onChange={e => updateRole(user.id, e.target.value)}
                    style={{
                      appearance: 'none', WebkitAppearance: 'none',
                      background: user.role === 'admin' ? B.chartreuse : B.muted,
                      color: B.canvas, border: 'none', borderRadius: '999px',
                      padding: '5px 12px', fontFamily: font, fontSize: '11px',
                      fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase',
                      cursor: 'pointer', outline: 'none',
                    }}
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Role pill (static display) */}
                <div style={{ textAlign: 'center' }}>
                  <span style={rolePill(user.role || 'staff')}>
                    {user.role || 'staff'}
                  </span>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeUser(user.id, user.full_name)}
                  title="Remove user"
                  style={{
                    background: 'none', border: 'none', color: 'rgba(254,252,245,0.15)',
                    fontSize: '18px', cursor: 'pointer', fontFamily: font,
                    padding: '4px', borderRadius: '6px', transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(254,252,245,0.15)'}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
