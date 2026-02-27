import { Gif } from '@/gif/Gif'
import { SequenceFn, Sequence, ImageDataConsumerFn } from '@/Sequence'


/**
* Algonim's [custom HTML element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements).
*/
export class Algonim extends HTMLElement {

  protected static observedAttributes = ["delay"]

  // Observed attributes
  /** Default delay in ms between frames. This is linked to a HTML attribute of the same name. @see {@link keyframe} */
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

  public recordGif(func: SequenceFn): Promise<void> {
    const gifCanvas = this.createCanvas()
    const gif = new Gif(gifCanvas.width, gifCanvas.height)

    const consumer: ImageDataConsumerFn = function(img: ImageData) {
      let hash = 0
      for(let i = 0; i < img.data.length; i++) {
        hash = (hash + 7*img.data[i]) % 149
      }
      console.log(`GIF FRAME (${hash})`)
      // TODO accept ImageData directly
      gif.addFrame(img.data)
    }

    const seq = new Sequence(gifCanvas)
    seq.addImageDataConsumer(consumer)
    return func(seq)
  }

}



// Module setup
customElements.define('algonim-element', Algonim)
