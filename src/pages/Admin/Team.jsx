import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const B    = { canvas: '#1D1B1C', surface: '#262323', surface2: '#2E2B2B', border: '#333131', cream: '#FEFCF5', muted: '#C4C4C4', chartreuse: '#DEE548' }
const font = "'GT Pressura', Arial, Helvetica, sans-serif"
const lbl  = (c = B.muted) => ({ fontFamily: font, fontWeight: 400, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: c })

// Magic link redirect URL — must match Supabase Auth → URL Configuration → Redirect URLs
// In Supabase dashboard: Authentication → URL Configuration:
//   Site URL: https://dg-events-g8ru.vercel.app
//   Redirect URLs: https://dg-events-g8ru.vercel.app/**
//
// Required table (run in Supabase SQL editor):
//   CREATE TABLE IF NOT EXISTS public.pending_invites (
//     email text primary key,
//     role text check (role in ('admin', 'staff')) not null default 'staff',
//     created_at timestamptz default now()
//   );
//   ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "pending_invites_read" ON public.pending_invites FOR SELECT USING (auth.role() = 'authenticated');
//   CREATE POLICY "pending_invites_write" ON public.pending_invites FOR ALL USING (public.is_admin());
const REDIRECT_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/checkin`
  : 'https://dg-events-g8ru.vercel.app/checkin'

function InviteModal({ onInvited, onClose }) {
  const [email, setEmail]       = useState('')
  const [inviteRole, setInviteRole] = useState('staff')
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState(null)
  const [focus, setFocus]       = useState(null)

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
      // Store the intended role in pending_invites before sending the magic link
      const { error: upsertError } = await supabase
        .from('pending_invites')
        .upsert({ email: email.trim().toLowerCase(), role: inviteRole }, { onConflict: 'email' })
      if (upsertError) throw upsertError

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: REDIRECT_URL,
        },
      })
      if (otpError) throw otpError
      onInvited(email.trim(), inviteRole)
    } catch (err) {
      setError(err.message || 'Failed to send invite.')
    } finally {
      setSending(false)
    }
  }

  const roleDesc = inviteRole === 'admin'
    ? 'Full access including admin panel, team management, and all events'
    : 'Check-in screen access only'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(29,27,28,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: B.surface, borderRadius: '16px', width: '100%', maxWidth: '420px', padding: '24px', border: `1px solid ${B.border}` }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={lbl(B.cream)}>Invite Team Member</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: B.muted, fontSize: '22px', cursor: 'pointer', fontFamily: font }}>×</button>
        </div>

        {/* Email */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ ...lbl(), marginBottom: '6px' }}>Email Address *</div>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@example.com"
            type="email"
            style={inp('email')}
            onFocus={() => setFocus('email')}
            onBlur={() => setFocus(null)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
          />
        </div>

        {/* Role selector */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ ...lbl(), marginBottom: '8px' }}>Role</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['staff', 'admin'].map(r => (
              <button
                key={r}
                onClick={() => setInviteRole(r)}
                style={{
                  flex: 1, padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                  fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: inviteRole === r ? (r === 'admin' ? B.chartreuse : B.muted) : B.surface2,
                  color: inviteRole === r ? B.canvas : B.muted,
                  border: `1px solid ${inviteRole === r ? 'transparent' : B.border}`,
                  transition: 'all 0.15s',
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: font, fontSize: '12px', color: B.muted, marginTop: '8px', lineHeight: 1.4 }}>
            {roleDesc}
          </div>
        </div>

        {error && (
          <div style={{ fontFamily: font, fontSize: '13px', color: '#F87171', marginBottom: '12px', background: 'rgba(180,40,40,0.1)', border: '1px solid rgba(180,40,40,0.3)', borderRadius: '8px', padding: '10px 14px' }}>{error}</div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: `1px solid ${B.border}`, borderRadius: '10px', padding: '14px', color: B.muted, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', minHeight: '56px' }}>Cancel</button>
          <button onClick={handleInvite} disabled={!email.trim() || sending} style={{ flex: 2, background: B.chartreuse, border: 'none', borderRadius: '10px', padding: '14px', color: B.canvas, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: (!email.trim() || sending) ? 0.4 : 1, minHeight: '56px' }}>
            {sending ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Team() {
  const { user } = useAuth()
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [banner, setBanner]     = useState(null) // { type: 'success' | 'error', message }
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  // Auto-dismiss banner
  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 6000)
    return () => clearTimeout(t)
  }, [banner])

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, role, email')
        .order('created_at', { ascending: false })
      if (fetchError) throw fetchError
      setUsers(data || [])
    } catch (err) {
      console.error('Failed to load team:', err)
      setError('Failed to load team members. You may not have permission to view profiles.')
    } finally {
      setLoading(false)
    }
  }

  async function updateRole(userId, newRole) {
    // Prevent self-demotion
    if (userId === user?.id && newRole !== 'admin') {
      setBanner({ type: 'error', message: 'You cannot change your own role.' })
      return
    }
    const prev = users.find(u => u.id === userId)?.role
    // Optimistic update
    setUsers(p => p.map(u => u.id === userId ? { ...u, role: newRole } : u))
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
    if (error) {
      console.error('Failed to update role:', error)
      setUsers(p => p.map(u => u.id === userId ? { ...u, role: prev } : u))
      setBanner({ type: 'error', message: 'Failed to update role: ' + error.message })
    } else {
      const name = users.find(u => u.id === userId)?.full_name || 'User'
      setBanner({ type: 'success', message: `${name} is now ${newRole}` })
    }
  }

  async function removeUser(userId, name) {
    if (userId === user?.id) {
      setBanner({ type: 'error', message: 'You cannot remove yourself.' })
      return
    }
    if (!window.confirm(`Remove ${name || 'this user'} from the team? This deletes their profile but not their auth account.`)) return
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
    if (error) {
      console.error('Failed to remove user:', error)
      setBanner({ type: 'error', message: 'Failed to remove user: ' + error.message })
      return
    }
    setUsers(prev => prev.filter(u => u.id !== userId))
    setBanner({ type: 'success', message: `${name || 'User'} removed from team` })
  }

  function handleInvited(email, role) {
    setShowInvite(false)
    setBanner({ type: 'success', message: `Magic link sent to ${email} (as ${role})` })
  }

  const pillStyle = (role) => ({
    display: 'inline-block', padding: '4px 12px', borderRadius: '999px',
    fontFamily: font, fontSize: '10px', fontWeight: 400,
    letterSpacing: '0.12em', textTransform: 'uppercase',
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
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', minHeight: '56px',
        }}>+ Invite</button>
      </div>

      {/* Banner */}
      {banner && (
        <div style={{
          background: banner.type === 'success' ? 'rgba(222,229,72,0.1)' : 'rgba(180,40,40,0.1)',
          border: `1px solid ${banner.type === 'success' ? B.chartreuse : 'rgba(180,40,40,0.3)'}`,
          borderRadius: '10px', padding: '14px 18px', marginBottom: '16px',
          fontFamily: font, fontSize: '14px',
          color: banner.type === 'success' ? B.chartreuse : '#F87171',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{banner.message}</span>
          <button onClick={() => setBanner(null)} style={{ background: 'none', border: 'none', color: 'inherit', fontFamily: font, fontSize: '18px', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{
          background: 'rgba(180,40,40,0.1)', border: '1px solid rgba(180,40,40,0.3)',
          borderRadius: '10px', padding: '14px 18px', marginBottom: '16px',
          fontFamily: font, fontSize: '14px', color: '#F87171',
        }}>
          {error}
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: B.muted, fontFamily: font, fontSize: '14px' }}>Loading…</div>
      ) : users.length === 0 && !error ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: '16px' }}>
          <div style={{ fontFamily: font, color: B.muted, fontSize: '18px', marginBottom: '8px' }}>No team members yet</div>
          <div style={lbl()}>Invite your first team member to get started</div>
          <button onClick={() => setShowInvite(true)} style={{ marginTop: '20px', background: B.chartreuse, border: 'none', borderRadius: '10px', padding: '14px 24px', color: B.canvas, fontFamily: font, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', minHeight: '56px' }}>
            Invite First Member
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {users.map(u => (
            <div key={u.id} style={{
              background: B.surface, border: `1px solid ${B.border}`,
              borderRadius: '12px', padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              {/* Name & email */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontFamily: font, fontWeight: 400, fontSize: '16px', color: B.cream }}>
                    {u.full_name || 'Unnamed'}
                  </div>
                  <span style={pillStyle(u.role || 'staff')}>{u.role || 'staff'}</span>
                </div>
                <div style={{ ...lbl(), marginTop: '2px', fontSize: '10px' }}>
                  {u.email || u.id.slice(0, 8) + '…'}
                </div>
              </div>

              {/* Role dropdown */}
              <select
                value={u.role || 'staff'}
                onChange={e => updateRole(u.id, e.target.value)}
                style={{
                  background: B.surface2, color: B.cream,
                  border: `1px solid ${B.border}`, borderRadius: '8px',
                  padding: '6px 10px', fontFamily: font, fontSize: '12px',
                  cursor: 'pointer', outline: 'none', colorScheme: 'dark',
                }}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>

              {/* Remove button */}
              <button
                onClick={() => removeUser(u.id, u.full_name)}
                title="Remove user"
                style={{
                  background: 'none', border: 'none', color: 'rgba(254,252,245,0.15)',
                  fontSize: '18px', cursor: 'pointer', fontFamily: font,
                  padding: '8px', borderRadius: '6px', transition: 'color 0.15s',
                  minWidth: '40px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(254,252,245,0.15)'}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
