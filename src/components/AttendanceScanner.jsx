import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { validateQRData } from '../utils/qrToken'
import { fetchPlanById } from '../services/workoutService'
import { markAttendance } from '../services/attendanceService'
import { useAuth } from '../context/AuthContext'

const SCANNER_DIV_ID = 'qr-scan-region'

export default function AttendanceScanner({ onClose, onSuccess }) {
  const { user } = useAuth()
  const [status, setStatus]   = useState('starting') // starting | scanning | processing | success | error
  const [message, setMessage] = useState('')
  const startedRef = useRef(false)
  const scannerRef = useRef(null)

  useEffect(() => {
    let active = true
    const scanner = new Html5Qrcode(SCANNER_DIV_ID)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1.0 },
        async (text) => {
          if (!active) return
          active = false        // only process first successful scan
          startedRef.current = false

          // Stop camera immediately
          try { await scanner.stop() } catch {}

          setStatus('processing')

          try {
            // 1. Validate QR token (timing + app key)
            const parsed = validateQRData(text)
            if (!parsed) throw new Error('QR code is expired or invalid. Please scan the live QR on the coach\'s screen.')

            const { planId, phase } = parsed

            // 2. Verify the plan is currently open for this phase
            const plan = await fetchPlanById(planId)
            const expectedStatus = phase === 'checkin' ? 'checkin_open' : 'checkout_open'
            if (plan.attendance_status !== expectedStatus) {
              throw new Error(`Attendance is not currently open for ${phase === 'checkin' ? 'check-in' : 'check-out'}.`)
            }

            // 3. Record attendance (Supabase unique constraint catches duplicates)
            await markAttendance({
              planId,
              userId:       user.username,
              userName:     user.name,
              userInitials: user.initials,
              phase,
            })

            setStatus('success')
            setMessage(`${phase === 'checkin' ? '✅ Check-in' : '✅ Check-out'} recorded successfully!`)
            if (onSuccess) onSuccess({ planId, phase })

          } catch (err) {
            if (err.message === 'already_marked') {
              setStatus('error')
              setMessage('You have already marked attendance for this phase.')
            } else {
              setStatus('error')
              setMessage(err.message || 'Something went wrong. Please try again.')
            }
          }
        },
        () => {} // ignore per-frame decode errors
      )
      .then(() => {
        if (active) { startedRef.current = true; setStatus('scanning') }
      })
      .catch(() => {
        if (active) {
          setStatus('error')
          setMessage('Camera not available. Please allow camera access and try again.')
        }
      })

    return () => {
      active = false
      if (startedRef.current) {
        scanner.stop().catch(() => {})
        startedRef.current = false
      }
    }
  }, [])

  return (
    <div className="scanner-overlay" onClick={status === 'success' || status === 'error' ? onClose : undefined}>
      <div className="scanner-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="scanner-header">
          <span>📷 {status === 'success' ? 'Attendance Marked' : 'Scan QR Code'}</span>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* States */}
        {status === 'starting' && (
          <div className="scanner-state-msg">Starting camera…</div>
        )}

        {/* Camera viewfinder (always in DOM so html5-qrcode can mount into it) */}
        <div
          id={SCANNER_DIV_ID}
          className="scanner-viewport"
          style={{ display: status === 'scanning' ? 'block' : 'none' }}
        />

        {status === 'scanning' && (
          <p className="scanner-hint">
            Point your camera at the QR code shown by your coach or captain.
          </p>
        )}

        {status === 'processing' && (
          <div className="scanner-state-msg">Verifying…</div>
        )}

        {status === 'success' && (
          <div className="scanner-success">
            <div className="scanner-success-icon">✅</div>
            <p>{message}</p>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={onClose}>Done</button>
          </div>
        )}

        {status === 'error' && (
          <div className="scanner-error">
            <div className="scanner-error-icon">❌</div>
            <p>{message}</p>
            <button className="btn-secondary" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  )
}
