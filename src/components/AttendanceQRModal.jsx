import { useState, useEffect, useRef } from 'react'
import QRCode from 'react-qr-code'
import { generateQRData, msUntilNextSlot, secsUntilRefresh } from '../utils/qrToken'
import { fetchAttendanceForPlan, subscribeToAttendance } from '../services/attendanceService'
import { supabase } from '../lib/supabase'

export default function AttendanceQRModal({ planId, phase, title, onClose }) {
  const [qrData,    setQrData]    = useState(() => generateQRData(planId, phase))
  const [countdown, setCountdown] = useState(secsUntilRefresh())
  const [records,   setRecords]   = useState([])
  const intervalRef = useRef(null)

  /* ── QR auto-refresh synced to wall-clock 5-second boundary ── */
  useEffect(() => {
    function refresh() { setQrData(generateQRData(planId, phase)) }

    // Fire at the next slot boundary, then every 5 s
    const firstDelay = msUntilNextSlot()
    const timeout = setTimeout(() => {
      refresh()
      intervalRef.current = setInterval(refresh, 5000)
    }, firstDelay)

    return () => {
      clearTimeout(timeout)
      clearInterval(intervalRef.current)
    }
  }, [planId, phase])

  /* ── Countdown display (updates every 200 ms) ── */
  useEffect(() => {
    const t = setInterval(() => setCountdown(secsUntilRefresh()), 200)
    return () => clearInterval(t)
  }, [])

  /* ── Realtime attendance count ── */
  useEffect(() => {
    fetchAttendanceForPlan(planId).then(data => setRecords(data || [])).catch(() => {})
    const channel = subscribeToAttendance(planId, () => {
      fetchAttendanceForPlan(planId).then(data => setRecords(data || [])).catch(() => {})
    })
    return () => supabase.removeChannel(channel)
  }, [planId])

  const checkinCount  = records.filter(r => r.phase === 'checkin').length
  const checkoutCount = records.filter(r => r.phase === 'checkout').length
  const phaseLabel    = phase === 'checkin' ? 'Check-in' : 'Check-out'
  const count         = phase === 'checkin' ? checkinCount : checkoutCount
  const pct           = (countdown / 5) * 100

  return (
    <div className="qr-overlay" onClick={onClose}>
      <div className="qr-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="qr-header">
          <div>
            <div className="qr-phase-label">
              {phase === 'checkin' ? '📋 Check-in Attendance' : '🏁 Check-out Attendance'}
            </div>
            <div className="qr-session-title">{title}</div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* QR Code */}
        <div className="qr-code-wrapper">
          <QRCode
            value={qrData}
            size={270}
            bgColor="#1c2128"
            fgColor="#e6edf3"
            style={{ height: 'auto', maxWidth: '100%' }}
          />
        </div>

        {/* Countdown bar */}
        <div className="qr-countdown">
          <div className="qr-countdown-bar-wrap">
            <div className="qr-countdown-bar" style={{ width: `${pct}%` }} />
          </div>
          <span className="qr-countdown-text">Refreshes in {countdown}s</span>
        </div>

        {/* Attendance count */}
        <div className="qr-stats">
          <div className="qr-stat-item">
            <span className="qr-stat-num">{checkinCount}</span>
            <span className="qr-stat-lbl">Checked In</span>
          </div>
          <div className="qr-stat-divider" />
          <div className="qr-stat-item">
            <span className="qr-stat-num">{checkoutCount}</span>
            <span className="qr-stat-lbl">Checked Out</span>
          </div>
        </div>

        <p className="qr-instruction">
          Show this screen to athletes — they scan it in the app to mark attendance.
        </p>

        <button className="btn-secondary" style={{ width: '100%', marginTop: 4 }} onClick={onClose}>
          Close QR Display
        </button>
      </div>
    </div>
  )
}
