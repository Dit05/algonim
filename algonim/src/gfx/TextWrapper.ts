import { Drawer } from './Drawer'
import { Point, Vector, VectorUtil, Size } from './Primitives'
import { TextAlign, FontStyle } from '@/gfx/Styles'


export interface TextAtom {
  measure(align: TextAlign, style: FontStyle): Size
  draw(position: Point, drawer: Drawer, align: TextAlign, style: FontStyle): void
  tryClip(maxWidth: number, align: TextAlign, style: FontStyle): ClipResult<TextAtom> | null
}


export type DrawTextResult = {
  height: number,
  lineBreaks: number
}

export type TextPiece = string | TextAtom
export type Text = TextPiece[]
export type ClipResult<T extends TextPiece> = { clipped: T, remainder: T }


export class TextWrapper {

  readonly drawer: Drawer

  public textSpacingFactor: number = 0.8 // TODO
  public atomSpacing: number = 0 // TODO
  public hyphen: string = '-' // TODO


  constructor(drawer: Drawer) {
    this.drawer = drawer
  }


  /**
  * Draws text wrapped to a maximum width.
  */
  public drawText(text: Text, position: Point, maxWidth: number, align: Partial<TextAlign> = {}, style: Partial<FontStyle> = {}): DrawTextResult {
    // TODO respect align
    const fullAlign = { ...Drawer.defaultTextAlign, ...align }
    const fullStyle = { ...Drawer.defaultFontStyle, ...style }

    // Shallow-copy the array so that we can manipulate it without affecting the original
    text = Array.from(text)

    // Since we will be draining elements from the start of the text, reverse the array so that we can consume from the end instead
    text.reverse()

    let lineBreaks = 0
    let y = 0

    while(true) {
      const consumed = this.consumeMaximalText(text, maxWidth, fullAlign, fullStyle)

      let x = 0
      for(let elem of consumed) {
        const pos: Point = VectorUtil.add(position, Vector(x, y))

        if(typeof(elem.piece) === 'string') {
          this.drawer.drawText(elem.piece, pos, fullAlign, fullStyle)
        } else {
          elem.piece.draw(pos, this.drawer, fullAlign, fullStyle)
        }

        x += elem.size.width
      }

      y += TextWrapper.getMaximumHeight(consumed)

      if(text.length <= 0) {
        break
      } else {
        lineBreaks += 1
        continue
      }
    }

    return {
      height: y,
      lineBreaks: lineBreaks
    }
  }


  measure(piece: TextPiece, align: TextAlign, style: FontStyle): Size {
    if(typeof(piece) === 'string') {
      const metrics = this.drawer.measureText(piece, align, style)
      return Size(metrics.width, metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent)
    } else {
      return piece.measure(align, style)
    }
  }

  static getMaximumHeight(things: { size: Size }[]): number {
    let max = 0
    for(let thing of things) {
      max = Math.max(max, thing.size.height)
    }
    return max
  }

  clipString(text: string, maxWidth: number, align: TextAlign, style: FontStyle): ClipResult<string> {
    if(this.drawer.measureText(text, align, style).width <= maxWidth) {
      // Happy path: the text just fits
      return {
        clipped: text,
        remainder: ''
      }
    }

    let min = 1
    let max = text.length

    while(min + 1 < max) {
      const mid = Math.floor((min + max) / 2)
      // TODO trim before measuring
      const width = this.drawer.measureText(text.substring(0, mid) + this.hyphen, align, style).width

      if(width > maxWidth) {
        max = mid
      } else {
        min = mid
      }
    }

    // TODO trim
    return {
      clipped: text.substring(0, min),
      remainder: text.substring(min)
    }
  }

  consumeMaximalText(text: Text, maxWidth: number, align: TextAlign, style: FontStyle): { piece: TextPiece, size: Size }[] {
    const consumed = []
    let widthLeft: number = maxWidth

    while(true) {
      const nextPiece: TextPiece | undefined = text.pop()
      if(nextPiece === undefined) break

      const size: Size = this.measure(nextPiece, align, style)

      // Does it fit?
      if(size.width <= widthLeft) {
        // Yes, add it
        consumed.push({ piece: nextPiece, size: size })
        widthLeft -= size.width
      } else {
        // No, try to clip it
        let result: ClipResult<TextPiece> | null
        if(typeof(nextPiece) === 'string') {
          result = this.clipString(nextPiece, widthLeft, align, style)
        } else {
          result = nextPiece.tryClip(widthLeft, align, style)
        }

        if(result !== null) {
          consumed.push({ piece: result.clipped, size: this.measure(result.clipped, align, style) })
          text.push(result.remainder)
        } else {
          text.push(nextPiece)
        }
        break
      }
    }

    // Make sure we consumed at least one piece so that wrapping doesn't get stuck
    if(consumed.length <= 0) {
      const piece: TextPiece | undefined = text.pop()
      if(piece !== undefined) {
        consumed.push({ piece: piece, size: this.measure(piece, align, style) })
      }
    }

    return consumed
  }


}
