

export type DrawStyle = string | CanvasGradient | CanvasPattern

export type LineStyle = {
  stroke: DrawStyle,
  lineWidth: number,
  lineCap: CanvasLineCap,
  lineJoin: CanvasLineJoin,
  miterLimit: number,
  lineDash: number[],
  lineDashOffset: number
}

export type FontStyle = {
  fill: DrawStyle | null,
  line: LineStyle | null,
  font: string,
  fontKerning: CanvasFontKerning,
  fontStretch: CanvasFontStretch,
  fontVariantCaps: CanvasFontVariantCaps,
  textBaseline: CanvasTextBaseline,
  letterSpacing: string
}

export type TextAlign = {
  align: CanvasTextAlign,
  baseline: CanvasTextBaseline
}

/**
* Adapts a CanvasTextDrawingStyles into Algonim's more constrained text style types.
*
* @see{CanvasTextDrawingStyles} The consumed type.
*/
export function adaptCanvasTextDrawingStyle(drawing: CanvasTextDrawingStyles): { style: FontStyle, align: TextAlign } {
  return {
    style: {
      fill: null,
      line: null,
      font: drawing.font,
      fontKerning: drawing.fontKerning,
      fontStretch: drawing.fontStretch,
      fontVariantCaps: drawing.fontVariantCaps,
      textBaseline: drawing.textBaseline,
      letterSpacing: drawing.letterSpacing
    },
    align: {
      align: drawing.textAlign,
      baseline: drawing.textBaseline
    }
  }
}
