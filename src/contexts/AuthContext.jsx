import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single()
    return data
  }

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user) {
          setUser(session.user)
          const profile = await fetchProfile(session.user.id)
          setRole(profile?.role || 'staff')
        }
      } catch (err) {
        console.error('Failed to fetch profile on init:', err)
      } finally {
        setLoading(false)
      }
    })

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
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
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
