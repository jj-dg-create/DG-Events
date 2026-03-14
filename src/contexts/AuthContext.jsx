// ─── DIAGNOSIS (2026-03-13) ──────────────────────────────────────────────────
//
// ROOT CAUSE: Race condition between initSession() and onAuthStateChange().
//
// On hard refresh, BOTH code paths fire concurrently:
//   1. initSession() calls getSession() → gets session → starts fetchProfile()
//   2. onAuthStateChange fires INITIAL_SESSION → starts a SECOND fetchProfile()
//
// Two concurrent fetchProfile() calls race. If either fails:
//   - initSession's catch: wiped user/role to null (too aggressive — user IS
//     authenticated, only the profile fetch failed)
//   - onAuthStateChange's catch: didn't reset role, but the fallback
//     `profile?.role || 'staff'` would downgrade admin → staff if data was null
//
// Whichever handler finished LAST overwrote the state from the first,
// regardless of the `resolved` ref (which only gated setLoading, not
// setUser/setRole). So an admin could see their role flicker from 'admin'
// to 'staff' or null after the page had already rendered.
//
// FIX:
//   - Single code path: onAuthStateChange handles ALL events (including
//     INITIAL_SESSION), getSession() is only a timeout fallback
//   - Fetch counter ref: late-arriving profile responses from stale fetches
//     are discarded
//   - Role cached in localStorage: survives transient fetch failures
//   - Profile fetch failure no longer wipes the user — uses cached role
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const AUTH_TIMEOUT_MS = 5000
const ROLE_CACHE_KEY = 'dg_cached_role'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(() => localStorage.getItem(ROLE_CACHE_KEY))
  const [loading, setLoading] = useState(true)
  const fetchCounter = useRef(0)
  const sessionHandled = useRef(false)

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

    async function handleSession(session) {
      // Increment counter — any in-flight fetch with a stale id is ignored
      const id = ++fetchCounter.current
      sessionHandled.current = true

      if (session?.user) {
        setUser(session.user)
        try {
          const profile = await fetchProfile(session.user.id)
          if (!mounted || id !== fetchCounter.current) return // stale
          const newRole = profile?.role || 'staff'
          setRole(newRole)
          localStorage.setItem(ROLE_CACHE_KEY, newRole)
        } catch (err) {
          if (!mounted || id !== fetchCounter.current) return // stale
          console.error('Profile fetch failed, using cached role:', err)
          // User IS authenticated — don't wipe their session.
          // Fall back to cached role or default.
          const cached = localStorage.getItem(ROLE_CACHE_KEY)
          setRole(cached || 'staff')
        }
      } else {
        setUser(null)
        setRole(null)
        localStorage.removeItem(ROLE_CACHE_KEY)
      }

      if (mounted) setLoading(false)
    }

    // Safety timeout — never stay loading longer than 5s
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth loading timed out after 5s, forcing resolution')
        setLoading(false)
      }
    }, AUTH_TIMEOUT_MS)

    // Single listener handles ALL auth events including INITIAL_SESSION
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) handleSession(session)
      }
    )

    // Fallback: if onAuthStateChange hasn't fired within 1s, use getSession
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
    localStorage.removeItem(ROLE_CACHE_KEY)
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
