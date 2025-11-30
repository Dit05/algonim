const typescript = require('@rollup/plugin-typescript')
const { nodeResolve } = require('@rollup/plugin-node-resolve')

module.exports = {
  input: './src/Algonim.ts',

  output: {
    dir: './dist/',
    format: 'iife',
    name: 'Algonim',
    sourcemap: true
  },

  plugins: [
    nodeResolve(),
    typescript({
      rootDir: './src/'
    })
  ]
}
