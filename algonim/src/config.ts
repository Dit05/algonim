/**
* Enable/disable extra checks of invariants. When enabled, `console.warn` warns of violated invariants.
* This option should only be enabled when debugging, since some checks can be very expensive.
*/
export const CONSISTENCY_CHECKS = true
export function warnInconsistency(msg: string) {
  if(!CONSISTENCY_CHECKS) {
    throw new TypeError('This shouldn\'t be called when consistency checks are disabled.')
  }
  console.log(`Inconsistency detected (CONFIG.CONSISTENCY_CHECKS): ${msg}`)
}
