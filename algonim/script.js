'use strict'

function downloadBlob(blob) {
  window.open(URL.createObjectURL(blob))
}

function showError(err, selectLine = false) {
  const div = document.getElementById('error-div')

  if(err) {
    console.error(err)
    div.style.display = 'block'
    div.children[0].innerText = err
    if(selectLine && err.lineNumber) {
      const scriptArea = document.getElementById('script-area')
      const text = scriptArea.value

      let lines = err.lineNumber
      let start = -1
      let end = -1
      while(lines --> 0) {
        if(lines === 1) start = end + 1
        end = text.indexOf('\n', end + 1)
      }

      scriptArea.focus()
      scriptArea.setSelectionRange(start, end)
    }
  } else {
    div.style.display = 'none'
  }
}

function loadExample(name) {
  document.getElementById('example-select').value = ''
  if(name in examples) {
    document.getElementById('script-area').value = String(examples[name]).replace('async function(seq)', 'async (seq) =>')
  }
}

function getUserFunction() {
  let text = document.getElementById('script-area').value
  text = 'const Algonim = window.Algonim; ' + text
  const result = eval(text)
  if(typeof(result) !== 'function') {
    throw new TypeError("Your code must be an expression that evaluates to a function.")
  }
  return result
}

function dropHandler(ev) {
  showError(undefined)
  try {
    ev.preventDefault()
    const files = [...ev.dataTransfer.items]
      .map((item) => item.getAsFile())
      .filter((file) => file && file.type == 'image/gif')

    if(files.length == 0) {
      throw new Error("No GIF file has been provided.")
    }

    window.Algonim.importEmbedFromGif(files[0])
      .catch((err) => {
        showError(err)
        throw err
      })
      .then((payload) => {
        const decoder = new TextDecoder()
        const str = decoder.decode(payload)
        document.getElementById('script-area').value = str
      })

  } catch(err) {
    showError(err)
  }
}


async function slideshow() {
  showError(undefined)
  try {
    algonim.scrollIntoView()
    await algonim.slideshow(getUserFunction())
  } catch(err) {
    showError(err, true)
  }
}

function stopSlideshow() {
  algonim.stopSlideshow()
}

async function makeGif() {
  showError(undefined)

  let embed = undefined
  if(document.getElementById('gif-embedCode').checked) {
    const encoder = new TextEncoder()
    embed = encoder.encode(document.getElementById('script-area').value)
  }

  const options = {
    colorTableBits: Number(document.getElementById('gif-tableBits').value),
    allowSmallerTables: Boolean(document.getElementById('gif-allowSmallerTables').checked),
    loopCount: Number(document.getElementById('gif-loop').checked ? Infinity : NaN),
    useLocalColorTables: Boolean(document.getElementById('gif-useLocalColorTables').checked),
    embedContent: embed
  }

  let blob = undefined
  try {
    blob = await algonim.recordGif(getUserFunction(), document.getElementById('gif-progress'), options)
  } catch(err) {
    showError(err)
  }
  if(blob) downloadBlob(blob)
}


const examples = {

'complete example': async (seq) => {
  // An example showing off most features.
  seq.config.resolution = { width: 640, height: 480 }

  const code = new Algonim.Models.Code()
  code.setLines([
    'i <- 3',
    'while i>0 do',
    '\tprint(i)',
    '\ti <- i-1',
    'done'
  ])

  const fakeConsole = new Algonim.Models.Code()
  fakeConsole.numberingStyleOverride = null
  fakeConsole.numberSeparatorStyle = null
  const outputLines = [ 'Output: (totally not a CodeModel)' ]
  fakeConsole.setLines(outputLines)

  const graph = new Algonim.Models.Graph()
  //graph.fontStyle.font = '8px sans'
  graph.setLayout({
    'node': { pos: [50, 50], value: 149, connect: ['node2', 'node3'] },
    'node2': { pos: [200, 60], connect: ['node'] },
    'node3': { pos: [100, 350], value: 'node three' }
  })

  let layout = {
    'split': 'vertical',
    'ratio': 0.4,
    'left': graph,
    'right': {
      'split': 'horizontal',
      'top': code,
      'bottom': fakeConsole
    }
  }

  code.arrowLines = 0

  seq.setLayout(layout)

  await seq.capture()

  let i = 3
  const signs = {}
  signs['i'] = code.createSign(0)
  signs['i'].text = `${i}`

  code.arrowLines = 1
  await seq.capture()
  while(i > 0) {
    code.arrowLines = 2
    await seq.capture()
    outputLines.push(`${i}`)
    fakeConsole.setLines(outputLines)
    await seq.capture()
    i -= 1
    signs['i'].text = `${i}`
    code.arrowLines = 3
    await seq.capture()
    code.arrowLines = 1
    await seq.capture()
  }
  code.arrowLines = 4
  await seq.capture()

  code.arrowLines = null
  await seq.capture()

  signs['i'].destroy()
  code.createSign(4).text = 'Fin.'
  await seq.capture()
},

rainbow: async function(seq) {
  // Generates a single frame with lots of colors for quantization to deal with.
  seq.config.resolution = { width: 512, height: 256 }
  const rainbow = new Algonim.Models.Rainbow()
  rainbow.step = { x: 4, y: 4 }
  seq.setLayout(rainbow)
  await seq.capture()
},

voronoi: async function(seq) {
  // Demonstrates the built-in Voronoi model that was used to test the k-d tree utilized by color tables.
  const COUNT = 64
  const SPEED = 8
  const FRAMES = 64

  const points = new Array(COUNT)
  for(let i = 0; i < points.length; i++) {
    points[i] = {
      x: Math.floor(Math.random() * seq.config.resolution.width),
      y: Math.floor(Math.random() * seq.config.resolution.height),
      vx: Math.floor((Math.random() - 0.5) * SPEED),
      vy: Math.floor((Math.random() - 0.5) * SPEED),
      color: Math.floor(Math.random() * 0xffffff)
    }
  }

  seq.config.resolution = { width: 480, height: 272 }
  const voronoi = new Algonim.Models.Voronoi()
  seq.setLayout(voronoi)
  voronoi.step = { x: 2, y: 2 }

  for(let j = 0; j < FRAMES; j++) {
    voronoi.points.clear()
    for(let i = 0; i < points.length; i++) {
      const point = points[i]
      voronoi.points.set({ x: point.x, y: point.y }, point.color)
      point.x += point.vx
      point.y += point.vy
      if(point.x < 0 && point.vx < 0) point.vx *= -1
      if(point.y < 0 && point.vy < 0) point.vy *= -1
      if(point.x >= seq.config.resolution.width && point.vx > 0) point.vx *= -1
      if(point.y >= seq.config.resolution.height && point.vy > 0) point.vy *= -1
    }
    await seq.capture(0.05)
  }
},

'loop test': async function(seq) {
  // Short animation with two frames to test looping.
  seq.config.resolution = { width: 128, height: 64 }
  seq.config.defaultDelayMs = 500 // Five. Hundred. Millisecs.
  const code = new Algonim.Models.Code()
  seq.setLayout(code)
  code.setLines(['a'])
  await seq.capture()
  code.setLines(['b'])
  await seq.capture()
},

'text wrapping': async function(seq) {
  // Shows CodeModel's automatic line wrapping.
  seq.config.resolution = { width: 256, height: 512 }
  const code = new Algonim.Models.Code()
  seq.setLayout(code)
  code.setLines([
    "Hello World!",
    "This line is quite long, I sure hope it's all visible.",
    "    This one is indented and long as well.",
    "Manually\nbroken\nline"
  ])
  await seq.capture()
}

} // End of example object
