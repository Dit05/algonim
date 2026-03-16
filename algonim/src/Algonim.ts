import { Gif } from '@/gif/Gif'
import { ColorTable, ColorUtil } from './gif/ColorTable'
import { Image } from './gif/blocks/Image'
import { GraphicControl } from './gif/blocks/GraphicControl'
import { ByteVector } from '@/gif/ByteVector'
import { SequenceFn, Sequence, ImageDataConsumerFn } from '@/Sequence'


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

  public async recordGif(func: SequenceFn, progressElement: HTMLProgressElement | undefined = undefined): Promise<Gif> {
    const progress = {
      setHidden(hidden: boolean) {
        if(progressElement) progressElement.hidden = hidden
      },
      setMax(max: number) {
        if(progressElement) progressElement.max = max
      },
      setValue(value: number | undefined) {
        if(progressElement) {
          if(value === undefined) {
            progressElement.removeAttribute('value') // Make indeterminate
          } else {
            progressElement.value = value
          }
        }
      },
      animationFrame(): Promise<unknown> {
        return new Promise((resolve) => requestAnimationFrame(resolve))
      }
    }

    // Capture frames
    const gifCanvas = this.createCanvas()
    const seq = new Sequence(gifCanvas)
    const frames: {
      image: ImageData,
      delay: number
    }[] = []
    seq.addImageDataConsumer(function(img: ImageData) {
      frames.push({
        image: img,
        delay: 100 // TODO obtain actual delay as passed to keyframe
      })
    })

    progress.setHidden(false)
    progress.setValue(undefined) // To avoid having to solve the halting problem, set the progress bar to indeterminate
    await progress.animationFrame()

    await func(seq)

    progress.setValue(0)
    progress.setMax(frames.length)
    await progress.animationFrame()

    // Make the GIF
    const gif = new Gif(gifCanvas.width, gifCanvas.height)

    const stupidColorTable = new ColorTable(ColorTable.desiredSizeToSizefield(2) ?? -1)
    stupidColorTable.colors[0] = ColorUtil.rgb8(0, 0, 0)
    stupidColorTable.colors[1] = ColorUtil.rgb8(255, 255, 255)

    gif.globalColorTable = stupidColorTable

    for(let i = 0; i < frames.length; i++) {
      const frame = frames[i]

      // FIXME even despite this, the browser stops playing the gif halfway through
      const control = new GraphicControl()
      control.delay = frame.delay
      gif.blocks.push(control)

      gif.blocks.push(Image.fromCanvasImageData(frame.image, stupidColorTable))

      progress.setValue(i + 1)
      await progress.animationFrame()
    }

    // TODO track progress in GIF encodement

    progress.setHidden(true)
    await progress.animationFrame()
    return gif
  }

}


export function downloadGif(gif: Gif) {
  const vec = new ByteVector(1024)
  gif.createFile(vec)
  window.open(URL.createObjectURL(new Blob(vec.finish())))
}


// Module setup
customElements.define('algonim-element', Algonim)
