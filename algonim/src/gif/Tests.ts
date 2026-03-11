import { Gif } from './Gif'
import { Image } from './blocks/Image'
import { Color, ColorTable } from './ColorTable'


export type Mask = {
  data: number[],
  size: [ number, number ]
}


export function makeSolidRectangle(color: Color, width: number, height: number, globalTable: boolean = true): Gif {
  const gif = new Gif(width, height)

  const table = new ColorTable(ColorTable.desiredSizeToSizefield(1) ?? -1)
  table.colors[0] = color

  const image = new Image(width, height, table)
  for(let i = 0; i < width * height; i++) {
    image.indices[i] = 0
  }
  gif.blocks.push(image)

  if(globalTable) {
    gif.globalColorTable = table
    image.isTableLocal = false
  } else {
    image.isTableLocal = true
  }

  return gif
}

export function makeCheckerboard(evenColor: Color, oddColor: Color, width: number, height: number, globalTable: boolean = true): Gif {
  const gif = new Gif(width, height)

  const table = new ColorTable(ColorTable.desiredSizeToSizefield(2) ?? -1)
  table.colors[0] = evenColor
  table.colors[1] = oddColor

  const image = new Image(width, height, table)
  for(let y = 0; y < height; y++) {
    for(let x = 0; x < width; x++) {
      image.indices[(y * width) + x] = (((x + y) % 2) == 0) ? 0 : 1
    }
  }
  gif.blocks.push(image)

  if(globalTable) {
    gif.globalColorTable = table
    image.isTableLocal = false
  } else {
    image.isTableLocal = true
  }

  return gif
}
