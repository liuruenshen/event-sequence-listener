import * as path from 'path'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'

import pkg from './package.json'

export default commandLineArgs => {
  const plugins = [
    babel({
      exclude: 'node_modules/**',
      extensions: ['.js', '.ts']
    }),
    resolve({
      module: true,
      extensions: ['.mjs', '.js', '.ts', 'json']
    }),
    commonjs()
  ]

  const input = 'src/index.ts'
  const dist = 'dist'

  return [
    {
      input,
      output: {
        file: path.resolve(dist, pkg.module),
        format: 'esm'
      },
      plugins
    },
    {
      input,
      output: {
        file: path.resolve(dist, pkg.main),
        format: 'cjs'
      },
      plugins
    },
    {
      input,
      output: {
        file: path.resolve(dist, pkg.browser),
        name: 'EventSequenceListener',
        format: 'iife'
      },
      plugins
    }
  ]
}
