import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const AUTH_TIMEOUT_MS = 5000

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [loading, setLoading] = useState(true)
  const resolved = useRef(false)

  function finishLoading() {
    if (!resolved.current) {
      resolved.current = true
      setLoading(false)
    }
  }

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single()
    return data
  }

  useEffect(() => {
    // Safety timeout — never stay loading longer than 5s
    const timeout = setTimeout(() => {
      if (!resolved.current) {
        console.warn('Auth loading timed out after 5s, forcing resolution')
        finishLoading()
      }
    }, AUTH_TIMEOUT_MS)

    // Initial session restore
    async function initSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        if (session?.user) {
          setUser(session.user)
          const profile = await fetchProfile(session.user.id)
          setRole(profile?.role || 'staff')
        }
      } catch (err) {
        console.error('Failed to restore session:', err)
        setUser(null)
        setRole(null)
      } finally {
        finishLoading()
      }
    }

    initSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            setUser(session.user)
            const profile = await fetchProfile(session.user.id)
            setRole(profile?.role || 'staff')
          } else {
            setUser(null)
            setRole(null)
          }
        } catch (err) {
          console.error('Failed to fetch profile on auth change:', err)
        } finally {
          finishLoading()
        }
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
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
