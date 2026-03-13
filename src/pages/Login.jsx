import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const S = {
  page: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100vh', padding: '0 32px',
    background: '#1D1B1C',
  },
  wordmark: {
    fontFamily: "'GT Pressura', Arial, sans-serif",
    fontWeight: 400, fontSize: '40px',
    color: '#FEFCF5', letterSpacing: '-0.01em', lineHeight: 1,
  },
  divider: {
    height: '3px', background: '#DEE548',
    width: '48px', margin: '14px auto',
  },
  label: {
    fontFamily: "'GT Pressura', Arial, sans-serif",
    fontWeight: 400, fontSize: '11px',
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: '#C4C4C4', display: 'block', marginBottom: '8px',
  },
  input: {
    width: '100%', background: '#262323',
    border: '1px solid #333131', borderRadius: '10px',
    padding: '16px 18px', color: '#FEFCF5',
    fontSize: '16px', fontFamily: "'GT Pressura', Arial, sans-serif",
    fontWeight: 400, outline: 'none',
  },
  btn: {
    width: '100%', background: '#DEE548', color: '#1D1B1C',
    fontFamily: "'GT Pressura', Arial, sans-serif",
    fontWeight: 400, fontSize: '13px',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    borderRadius: '10px', padding: '18px',
    border: 'none', cursor: 'pointer', minHeight: '56px',
  },
}

export default function Login() {
  const { signIn }  = useAuth()
  const navigate    = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      setTimeout(() => navigate('/checkin', { replace: true }), 400)
    } catch (err) {
      setError(err.message || 'Invalid email or password')
      setLoading(false)
    }
  }

  const inputStyle = (field) => ({
    ...S.input,
    borderColor: focusedField === field ? '#DEE548' : '#333131',
    transition: 'border-color 0.15s',
  })

  return (
    <div style={S.page}>
      {/* Wordmark block */}
      <div style={{ marginBottom: '56px', textAlign: 'center' }}>
        <div style={S.wordmark}>David Ghiyam</div>
        <div style={S.divider} />
        <div style={{
          fontFamily: "'Druk Wide', 'GT Pressura', Arial, sans-serif",
          fontWeight: 500,
          fontSize: '22px',
          color: '#DEE548',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}>Event Check-In</div>
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ marginBottom: '14px' }}>
          <label style={S.label}>Email</label>
          <input
            type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={inputStyle('email')}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={S.label}>Password</label>
          <input
            type="password" required value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            style={inputStyle('password')}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(180,40,40,0.15)',
            border: '1px solid rgba(180,40,40,0.4)',
            borderRadius: '10px', padding: '12px 16px',
            color: '#F87171', fontSize: '14px', textAlign: 'center',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit" disabled={loading}
          style={{ ...S.btn, opacity: loading ? 0.5 : 1 }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p style={{
        marginTop: '48px', color: 'rgba(254,252,245,0.18)',
        fontSize: '12px', textAlign: 'center', letterSpacing: '0.05em',
      }}>
        Contact your admin for access
      </p>
    </div>
  )
}
