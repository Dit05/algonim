
function downloadBlob(blob) {
  window.open(URL.createObjectURL(blob))
}

function makeGif() {
  options = {
    colorTableBits: document.getElementById('gif-tableBits').value,
    allowSmallerTables: document.getElementById('gif-allowSmallerTables').checked,
    loopCount: document.getElementById('gif-allowSmallerTables').checked ? Infinity : NaN
  }
  algonim.recordGif(getUserFunction(), document.getElementById('gif-progress'), options)
    .then(blob => downloadBlob(blob))
}

function getUserFunction() {
  const text = document.getElementById('script-area').value
  const result = eval(text)
  if(typeof(result) !== 'function') {
    throw new TypeError("Your code must be an expression that evaluates to a function.")
  }
  return result
}

function slideshow() {
  algonim.slideshow(getUserFunction())
}

function loadExample(name) {
  document.getElementById('example-select').value = ''
  if(name in examples) {
    document.getElementById('script-area').value = String(examples[name]).replace('async function(seq)', 'async (seq) =>')
  }
}


const examples = {

'complete example': async (seq) => {
  // An example showing off most features.
  seq.config.resolution = { width: 640, height: 480 }

  const code = seq.createModel('code')
  code.setLines([
    'i <- 3',
    'while i>0 do',
    '\tprint(i)',
    '\ti <- i-1',
    'done'
  ])

  const fakeConsole = seq.createModel('code')
  fakeConsole.numberingStyleOverride = null
  fakeConsole.numberSeparatorStyle = null
  const outputLines = [ 'Output: (totally not a CodeModel)' ]
  fakeConsole.setLines(outputLines)

  const graph = seq.createModel('graph')
  let node = graph.createNode()
  node.position.x = 48
  node.position.y = 48
  node.value = 149

  let node2 = graph.createNode()
  node2.connect(node, false)
  node2.position.x = 128
  node2.position.y = 192

  let node3 = graph.createNode()
  node3.value = "lonely node"
  node3.position.x = 180
  node3.position.y = 450

  graph.roots = [node, node3]

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
  const iSign = code.createSign(0)
  iSign.text = `${i}`

  code.arrowLines = 1
  await seq.capture()
  while(i > 0) {
    code.arrowLines = 2
    await seq.capture()
    outputLines.push(`${i}`)
    fakeConsole.setLines(outputLines)
    await seq.capture()
    i -= 1
    iSign.text = `${i}`
    code.arrowLines = 3
    await seq.capture()
    code.arrowLines = 1
    await seq.capture()
  }
  code.arrowLines = 4
  await seq.capture()

  code.arrowLines = null
  await seq.capture()

  iSign.destroy()
  code.createSign(4).text = 'Fin.'
  await seq.capture()
},

rainbow: async function(seq) {
  // Generates a single frame with lots of colors for quantization to deal with.
  seq.config.resolution = { width: 512, height: 256 }
  const rainbow = seq.createModel('rainbow')
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
  const voronoi = seq.createModel('voronoi')
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
  const code = seq.createModel('code')
  seq.setLayout(code)
  code.setLines(['a'])
  await seq.capture()
  code.setLines(['b'])
  await seq.capture()
},

'text wrapping': async function(seq) {
  // Shows CodeModel's automatic line wrapping.
  seq.config.resolution = { width: 256, height: 512 }
  const code = seq.createModel('code')
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
