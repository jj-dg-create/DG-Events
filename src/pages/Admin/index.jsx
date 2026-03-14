import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import EventList   from './EventList'
import EventDetail from './EventDetail'
import Team        from './Team'

const B    = { canvas: '#1D1B1C', surface: '#262323', border: '#333131', cream: '#FEFCF5', muted: '#C4C4C4', chartreuse: '#DEE548' }
const font = "'GT Pressura', Arial, Helvetica, sans-serif"
const lbl  = { fontFamily: font, fontWeight: 400, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' }

export default function AdminRoot() {
  const { signOut } = useAuth()
  const navigate    = useNavigate()
  const location    = useLocation()
  const isTeam = location.pathname.startsWith('/admin/team')

  return (
    <div style={{ minHeight: '100vh', background: B.canvas, display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <nav style={{
        background: B.surface, borderBottom: `1px solid ${B.border}`,
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontFamily: font, fontWeight: 400, fontSize: '20px', color: B.cream, letterSpacing: '-0.01em' }}>
            David Ghiyam
          </div>
          <div style={{ width: '1px', height: '16px', background: B.border }} />
          <div style={{ ...lbl, color: B.chartreuse }}>Admin</div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => navigate('/admin')} style={{
            background: 'none', border: `1px solid ${!isTeam ? B.chartreuse + '44' : B.border}`, borderRadius: '10px',
            padding: '8px 16px', color: !isTeam ? B.cream : B.muted, fontFamily: font, fontSize: '13px',
            letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
          }}>Events</button>
          <button onClick={() => navigate('/admin/team')} style={{
            background: 'none', border: `1px solid ${isTeam ? B.chartreuse + '44' : B.border}`, borderRadius: '10px',
            padding: '8px 16px', color: isTeam ? B.cream : B.muted, fontFamily: font, fontSize: '13px',
            letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
          }}>Team</button>
          <div style={{ width: '1px', height: '16px', background: B.border }} />
          <button onClick={() => navigate('/checkin')} style={{
            background: 'none', border: `1px solid ${B.border}`, borderRadius: '10px',
            padding: '8px 16px', color: B.muted, fontFamily: font, fontSize: '13px',
            letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
          }}>← Check-In</button>
          <button onClick={signOut} style={{
            background: 'none', border: 'none', color: 'rgba(254,252,245,0.2)',
            fontFamily: font, fontSize: '13px', cursor: 'pointer', padding: '8px 12px',
          }}>Sign Out</button>
        </div>
      </nav>

      {/* 3px chartreuse accent line */}
      <div style={{ height: '3px', background: B.chartreuse }} />

      <div style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route index element={<EventList />} />
          <Route path="events" element={<EventList />} />
          <Route path="events/:eventId" element={<EventDetail />} />
          <Route path="team" element={<Team />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  )
}
