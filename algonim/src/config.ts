/** @packageDocumentation Constants that can be set to configure application behavior. */

/**
* Enable/disable extra checks of invariants. When enabled, `console.warn`ings will be generated when certain invariants are violated.
* This option should only be enabled when debugging, since some checks can be quite expensive.
*/
export const CONSISTENCY_CHECKS = true
/** @ignore */
export function warnInconsistency(msg: string) {
  if(!CONSISTENCY_CHECKS) {
    throw new TypeError('This shouldn\'t be called when consistency checks are disabled.')
  }
  console.log(`Inconsistency detected (CONFIG.CONSISTENCY_CHECKS): ${msg}`)
}
