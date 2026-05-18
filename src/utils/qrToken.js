const APP_KEY       = 'IITDWL2025'
const SLOT_MS       = 5000   // QR regenerates every 5 seconds
const SLOT_TOLERANCE = 2     // accept QRs up to 2 slots old (10-second window)

/** Current time-slot index (aligned to wall clock, not component mount) */
function currentSlot() {
  return Math.floor(Date.now() / SLOT_MS)
}

/** Milliseconds remaining until the next slot boundary */
export function msUntilNextSlot() {
  return SLOT_MS - (Date.now() % SLOT_MS)
}

/** Seconds until next slot (1-5), for countdown display */
export function secsUntilRefresh() {
  return Math.ceil(msUntilNextSlot() / 1000)
}

/** Generate the QR payload string for the current slot */
export function generateQRData(planId, phase) {
  return JSON.stringify({ p: planId, ph: phase, s: currentSlot(), k: APP_KEY })
}

/**
 * Validate a scanned QR string.
 * Returns { planId, phase } if valid, or null if expired / tampered.
 */
export function validateQRData(raw) {
  try {
    const { p: planId, ph: phase, s: slot, k: key } = JSON.parse(raw)
    if (key !== APP_KEY)                         return null
    if (!planId || !phase)                       return null
    if (Math.abs(currentSlot() - slot) > SLOT_TOLERANCE) return null
    return { planId, phase }
  } catch {
    return null
  }
}
