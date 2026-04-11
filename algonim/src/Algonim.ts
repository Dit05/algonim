// Exports
export * from '@/AlgonimElement'
import * as models from '@/models'; export const Models = models
export { Border, LineAndFillBorder, EllipseBorder } from '@/gfx/Border'

// Module setup
import { AlgonimElement } from '@/AlgonimElement'
customElements.define('algonim-element', AlgonimElement)
