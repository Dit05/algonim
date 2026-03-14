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

// https://giflib.sourceforge.net/whatsinagif/lzw_image_data.html
export function makeGiflibExample(globalTable: boolean = true): Gif {
  const gif = new Gif(10, 10)

  const table = new ColorTable(ColorTable.desiredSizeToSizefield(4) ?? -1)
  table.colors[0] = 0xffffff
  table.colors[1] = 0xff0000
  table.colors[2] = 0x0000ff
  table.colors[3] = 0x000000

  const image = new Image(gif.width, gif.height, table)
  for(let y = 0; y < image.height; y++) {
    for(let x = 0; x < image.width; x++) {
      let index
      if(x >= 3 && x <= 6 && y >= 3 && y <= 6) {
        index = 0
      } else {
        if((x < 5) === (y < 5)) {
          index = 1
        } else {
          index = 2
        }
      }
      image.indices[(y * image.width) + x] = index
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
