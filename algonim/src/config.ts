/** @packageDocumentation Constants that can be set to configure application behavior. */

/**
* Enable/disable extra checks of invariants. When enabled, `console.warn`ings will be generated when certain invariants are violated.
* This option should only be enabled when debugging, since some checks can be quite expensive.
*/
export const CONSISTENCY_CHECKS = true
/** @ignore */
export function warnInconsistency(msg: string) {
  if(!CONSISTENCY_CHECKS) {
    throw new TypeError("This shouldn\'t be called when consistency checks are disabled.")
  }
  console.warn(`Inconsistency detected (CONFIG.CONSISTENCY_CHECKS): ${msg}`)
}

/** Shuffles the given arrays in the same random way if consistency checks are enabled, otherwise doesn't do anything. */
export function consistencyShuffle(...arrays: any[][]) {
  if(!CONSISTENCY_CHECKS) return

  for(let i = 1; i < arrays.length; i++) {
    if(arrays[i - 1].length != arrays[i].length) {
      throw new RangeError(`Arrays ${i - 1} and ${i} have differing lengths.`)
    }
  }

  for(let i = 0; i < arrays[0].length; i++) {
    const j = i + Math.floor(Math.random() * (arrays[0].length - i))
    for(const array of arrays) {
      array[i], array[j] = array[j], array[i]
    }
  }
}
