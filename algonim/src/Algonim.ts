import { Gif } from '@/gif/Gif'
import { ColorTable, ColorUtil } from './gif/ColorTable'
import { Image } from './gif/blocks/Image'
import { ByteVector } from '@/gif/ByteVector'
import * as TESTS from '@/gif/Tests'
import { BitVector } from '@/gif/BitVector'
import { SequenceFn, Sequence, ImageDataConsumerFn } from '@/Sequence'
import { compress } from './gif/VLCLZW'


/**
* Algonim's [custom HTML element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements).
*/
export class Algonim extends HTMLElement {

  protected static observedAttributes = ["delay"]

  // Observed attributes
  /** Default delay in ms between frames. This is linked to a HTML attribute of the same name. */
  delay: number = 1000
  //

  private canvas: HTMLCanvasElement


  public constructor() {
    super()

    // Create shadow canvas
    const shadow = this.attachShadow({ 'mode': 'closed' })
    this.canvas = this.createCanvas()
    shadow.appendChild(this.canvas)
  }


  protected connectedCallback() {
    //console.log("Custom element added to page.")
  }

  protected disconnectedCallback() {
    //console.log("Custom element removed from page.")
  }

  protected connectedMoveCallback() {
    //console.log("Custom element moved with moveBefore()")
  }

  protected adoptedCallback() {
    //console.log("Custom element moved to new page.")
  }

  protected attributeChangedCallback(name: any, _oldValue: any, newValue: any) {
    //console.log(`Attribute ${name} has changed from ${oldValue} to ${newValue}.`)
    switch(name) {
      case 'delay':
        this.delay = Number(newValue)
        break
    }
  }

  createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    // TODO customizable size
    canvas.width = 640
    canvas.height = 480
    return canvas
  }

  public slideshow(func: SequenceFn): Promise<void> {
    // TODO do something about concurrent runs
    const seq = new Sequence(this.canvas)
    seq.delay = this.delay
    return func(seq)
  }

  public async recordGif(func: SequenceFn): Promise<Gif> {
    const gifCanvas = this.createCanvas()
    const gif = new Gif(gifCanvas.width, gifCanvas.height)

    const stupidColorTable = new ColorTable(ColorTable.desiredSizeToSizefield(2) ?? -1)
    stupidColorTable.colors[0] = ColorUtil.rgb8(0, 0, 0)
    stupidColorTable.colors[1] = ColorUtil.rgb8(255, 255, 255)

    gif.globalColorTable = stupidColorTable

    const consumer: ImageDataConsumerFn = function(img: ImageData) {
      let hash = 0
      for(let i = 0; i < img.data.length; i++) {
        hash = (hash + 7*img.data[i]) % 149
      }
      console.log(`GIF FRAME (${hash})`)
      gif.blocks.push(Image.fromCanvasImageData(img, stupidColorTable))
    }

    const seq = new Sequence(gifCanvas)
    seq.addImageDataConsumer(consumer)
    await func(seq)

    // HACK
    downloadGif(gif)
    return gif
  }

}


// HACK
export function downloadGif(gif: Gif) {
  const vec = new ByteVector(1024)
  gif.createFile(vec)
  window.open(URL.createObjectURL(new Blob(vec.finish())))
}


// Module setup
customElements.define('algonim-element', Algonim)

// HACK
function binary(byte: number): string {
  let str = ''
  for(let i = 0; i < 8; i++) {
    str = ((byte & 1) > 0 ? '1' : '0') + str
    byte >>= 1
  }
  return str
}

/*
let msg = ''
for(let byte of compress([0, 255, 0, 255], 8)) {
  msg += binary(byte) + '\n'
}
console.log(msg)

const fos = new BitVector(byte => console.log(binary(byte)))
fos.add(0b11111, 5)
fos.add(0, 5)
fos.add(0b11111, 5)
fos.flush()
*/

/*
const data = "TOBEORNOTTOBEORTOBEORNOT"
const array: number[] = []
for(let i = 0; i < data.length; i++) {
  array.push((data.codePointAt(i) ?? 0) - ('A'.codePointAt(0) ?? 0) + 1)
}
const gen = compress(array, 5)
let msg = ''
for(let byte of gen) {
  msg += binary(byte) + '\n'
}
console.log(msg)
*/

export function test(w: number, h: number) {
  const gif = TESTS.makeCheckerboard(0xc8c0da, 0x0000ff, w, h)
  downloadGif(gif)
}
