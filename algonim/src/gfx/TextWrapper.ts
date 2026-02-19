import { Drawer } from './Drawer'
import { Point, Vector, VectorUtil, Size } from './Primitives'
import { FontStyle } from '@/gfx/Styles'


export interface TextAtom {
  /** Measures the size of this atom's bounds. */
  measure(style: FontStyle): Size
  /** Draws this atom. */
  draw(position: Point, drawer: Drawer, style: FontStyle): void
  /** Tries to clip this atom so that the clipped part is no wider than `maxWidth`, or returns `null` if such clipping is not possible. */
  tryClip(maxWidth: number, style: FontStyle): ClipResult<TextAtom> | null
  /** Whether this atom should be trimmed from the ends of lines, like whitespace. */
  trimFromEnd(): boolean
}


export type DrawTextResult = {
  size: Size,
  lines: { parts: { piece: TextPiece, size: Size }[], size: Size }[]
}

export type TextPiece = string | TextAtom
export type Text = TextPiece[]
export type ClipResult<T extends TextPiece> = { clipped: T, remainder: T }
/** Splits text at the first newline it finds. */
export type LineBreakFn = (piece: TextPiece) => ClipResult<TextPiece> | null
type ExplicitBreak = true


export class TextWrapper {

  readonly drawer: Drawer

  /** Scales strings' measured heights by this. Values <1 make lines condensed, and values >1 make them sparse. */
  public textHeightFactor: number = 0.8
  public hyphen: string = '‐' // HYPHEN (U+2010)


  constructor(drawer: Drawer) {
    this.drawer = drawer
  }


  /**
  * Draws text wrapped to a maximum width.
  */
  public drawText(text: Text, position: Point, maxWidth: number, style: Partial<FontStyle> = {}): DrawTextResult {
    const fullStyle = { ...Drawer.defaultFontStyle, ...style }

    const lines = this.splitLines(text, maxWidth, style)

    let largestWidth = 0
    let y = 0
    for(let line of lines) {
      largestWidth = Math.max(largestWidth, line.size.width)
      let x = 0

      for(let part of line.parts) {
        const pos: Point = VectorUtil.add(position, Vector(x, y))

        if(typeof(part.piece) === 'string') {
          this.drawer.drawText(part.piece, pos, { align: 'start', baseline: 'top' }, fullStyle)
        } else {
          part.piece.draw(pos, this.drawer, fullStyle)
        }

        x += part.size.width
      }

      y += line.size.height
    }

    return {
      lines: lines,
      size: Size(largestWidth, y)
    }
  }

  /**
  * Splits text into discrete lines based on line breaks and, optionally, width.
  * The resulting lines come with size information.
  *
  * @param maxWidth Optional maximum width to wrap lines at. When left at its default value of `Infinity`, lines will only be split at line breaks.
  * @param style Style used to measure the text. Has no effect if `maxWidth` is `Infinity`.
  * @param explicitBreakFn Function that will be used to identify explicit line breaks, like `'\n'` in strings. The default implementation is `TextWrapper.defaultLineBreakFn`.
  */
  public splitLines(sourceText: Text, maxWidth: number = Infinity, style: Partial<FontStyle> = {}, explicitBreakFn: LineBreakFn = TextWrapper.defaultLineBreakFn): { parts: { piece: TextPiece, size: Size }[], size: Size }[] {
    const fullStyle = { ...Drawer.defaultFontStyle, ...style }

    // This will return a new array that we can manipulate without affecting the original.
    const text = this.findExplicitBreaks(sourceText, explicitBreakFn)

    // Since we will be draining elements from the start of the text, reverse the array so that we can consume from the end instead
    text.reverse()

    const lines = []

    while(text.length > 0) {
      const consumed = this.consumeLine(text, maxWidth, fullStyle)
      const line = []

      let width = 0
      let height = 0
      for(let elem of consumed) {
        width += elem.size.width
        height = Math.max(height, elem.size.height)
        line.push(elem)
      }

      lines.push({ parts: line, size: Size(width, height) })
    }

    return lines
  }


  measure(piece: TextPiece, style: FontStyle): Size {
    if(typeof(piece) === 'string') {
      const metrics = this.drawer.measureText(piece, {}, style)
      return Size(metrics.width, (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) * this.textHeightFactor)
    } else {
      return piece.measure(style)
    }
  }

  clipString(text: string, maxWidth: number, style: FontStyle, trimStart: boolean = false, trimEnd: boolean = true): ClipResult<string> {
    // TODO some kind of heuristic to avoid splitting off 1 letter and looking stupid
    // TODO avoid splitting groups of codepoints that shouldn't be separated, i.e. '\u{1f3f3}\ufe0f\u200d\u26a7\ufe0f'

    if(this.drawer.measureText(text, {}, style).width <= maxWidth) {
      // Happy path: the text just fits
      return {
        clipped: text,
        remainder: ''
      }
    }

    function charKind(char: string): 'high surrogate' | 'low surrogate' | 'whitespace' | 'normal' {
      const cc = char.charCodeAt(0)
      if(cc >= 0xd800 && cc <= 0xdbff) {
        return 'high surrogate'
      } else if(cc >= 0xdc00 && cc <= 0xdfff) {
        return 'low surrogate'
      } else if(char.trim() === '') { // Genuis!
        return 'whitespace'
      } else {
        return 'normal'
      }
    }

    function trimAndAddHyphen(str: string, hyphen: string): string {
      let start = 0
      if(trimStart) {
        while(start < str.length && charKind(str.charAt(start)) === 'whitespace') {
          start += 1
        }
      }

      let end = str.length
      if(trimEnd) {
        while(end > start && charKind(str.charAt(end - 1)) === 'whitespace') {
          end -= 1
        }
      }

      // Only add the hyphen if the end wasn't trimmed
      return str.substring(start, end) + ((end < str.length) ? '' : hyphen)
    }

    let min = 1
    let max = text.length

    while(min + 1 < max) {
      let mid = Math.floor((min + max) / 2)

      // Avoid splitting surrogate pairs
      while(mid > 0 && charKind(text.charAt(mid)) === 'low surrogate') {
        mid -= 1
      }

      const width = this.drawer.measureText(trimAndAddHyphen(text.substring(0, mid), this.hyphen), {}, style).width

      if(width > maxWidth) {
        max = mid
      } else {
        min = mid
      }
    }

    return {
      clipped: trimAndAddHyphen(text.substring(0, min), this.hyphen),
      remainder: text.substring(min)
    }
  }

  /**
  * Creates a line break function that just looks for the specified substrings.
  * Note that `substrings` are checked one after the other, so if it returns `'a'` before `'ab'`, the latter pattern will never be matched.
  *
  * @param substrings Substrings that are considered line breaks. Be careful, this is captured by the returned function!
  * @param keepSeparators Whether to include the matched substring in the result when breaking.
  *
  * @see LineBreakFn
  */
  public static makeSubstringsNewlineFn(substrings: Iterable<string>, keepSeparators: boolean = false): LineBreakFn {
    return (piece: TextPiece): ClipResult<TextPiece> | null => {
      if(typeof(piece) !== 'string') return null

      for(let pattern of substrings) {
        const index = piece.indexOf(pattern)
        if(index >= 0) {
          return {
            clipped: piece.substring(0, index),
            remainder: piece.substring(keepSeparators ? index : index + pattern.length)
          }
        }
      }
      return null
    }
  }

  /** Breaks on the common `'\n'` and the abomination known as `'\r\n'`. */
  public static readonly defaultLineBreakFn: LineBreakFn = TextWrapper.makeSubstringsNewlineFn([ '\r\n', '\n' ])
  /** Never breaks. */
  public static readonly neverLineBreakFn: LineBreakFn = (_piece: TextPiece) => null


  findExplicitBreaks(text: Text, breakFn: LineBreakFn): (TextPiece | ExplicitBreak)[] {
    const result: (TextPiece | ExplicitBreak)[] = []

    for(let piece of text) {
      while(true) {
        const clipResult = breakFn(piece)
        if(clipResult === null) {
          break
        } else {
          result.push(clipResult.clipped)
          result.push(true)
          piece = clipResult.remainder
        }
      }

      result.push(piece)
    }

    return result
  }

  /**
  * @param text Text to be consumed. It's consumed from the end for efficiency.
  *
  * @see TextWrapper.defaultLineBreakFn
  */
  consumeLine(text: (TextPiece | ExplicitBreak)[], maxWidth: number, style: FontStyle): { piece: TextPiece, size: Size }[] {
    const consumed = []
    let widthLeft: number = maxWidth

    while(true) {
      const nextPiece: TextPiece | ExplicitBreak | undefined = text.pop()
      if(nextPiece === undefined || nextPiece === true /* Explicit break */) break

      const size: Size = this.measure(nextPiece, style)

      // Does it fit?
      if(size.width <= widthLeft) {
        // Yes, add it
        consumed.push({ piece: nextPiece, size: size })
        widthLeft -= size.width
      } else {
        // No, try to clip it
        let result: ClipResult<TextPiece> | null
        if(typeof(nextPiece) === 'string') {
          result = this.clipString(nextPiece, widthLeft, style)
        } else {
          result = nextPiece.tryClip(widthLeft, style)
        }

        if(result !== null) {
          consumed.push({ piece: result.clipped, size: this.measure(result.clipped, style) })
          text.push(result.remainder)
        } else {
          text.push(nextPiece)
        }
        break
      }
    }

    // Make sure we consumed at least one piece so that wrapping doesn't get stuck
    if(consumed.length <= 0) {
      const piece: TextPiece | ExplicitBreak | undefined = text.pop()
      if(piece !== undefined && piece !== true) {
        consumed.push({ piece: piece, size: this.measure(piece, style) })
      }
    }

    return consumed
  }

}
