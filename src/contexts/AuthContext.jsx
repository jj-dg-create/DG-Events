// ─── Auth Context ────────────────────────────────────────────────────────────
//
// Single code path: onAuthStateChange handles ALL events (including
// INITIAL_SESSION), getSession() is only a timeout fallback.
// Fetch counter ref discards stale profile responses.
// Role cached in-memory only (not localStorage — that's exploitable).
// Profile fetch failure uses last known role, never wipes authenticated user.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const AUTH_TIMEOUT_MS = 5000

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [loading, setLoading] = useState(true)
  const fetchCounter = useRef(0)
  const sessionHandled = useRef(false)
  const lastKnownRole = useRef(null)

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single()
    return data
  }

  useEffect(() => {
    let mounted = true
    // Reset refs on each mount (handles StrictMode double-mount)
    fetchCounter.current = 0
    sessionHandled.current = false

    async function handleSession(session) {
      const id = ++fetchCounter.current
      sessionHandled.current = true

      if (session?.user) {
        setUser(session.user)
        try {
          const profile = await fetchProfile(session.user.id)
          if (!mounted || id !== fetchCounter.current) return
          const newRole = profile?.role || 'staff'
          setRole(newRole)
          lastKnownRole.current = newRole
        } catch (err) {
          if (!mounted || id !== fetchCounter.current) return
          console.error('Profile fetch failed, using last known role:', err)
          setRole(lastKnownRole.current || 'staff')
        }
      } else {
        setUser(null)
        setRole(null)
        lastKnownRole.current = null
      }

      if (mounted) setLoading(false)
    }

    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading timed out after 5s, forcing resolution')
        setLoading(false)
      }
    }, AUTH_TIMEOUT_MS)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) handleSession(session)
      }
    )

    const fallback = setTimeout(() => {
      if (!sessionHandled.current && mounted) {
        supabase.auth.getSession()
          .then(({ data: { session } }) => {
            if (mounted && !sessionHandled.current) {
              handleSession(session)
            }
          })
          .catch(() => {
            if (mounted) setLoading(false)
          })
      }
    }, 1000)

    return () => {
      mounted = false
      clearTimeout(timeout)
      clearTimeout(fallback)
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    lastKnownRole.current = null
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
