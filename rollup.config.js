import * as path from 'path'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import cleaner from 'rollup-plugin-cleaner'
import multiEntry from "rollup-plugin-multi-entry"

import pkg from './package.json'

const dist = 'dist'
const test = path.dirname(pkg.testBundle)

export default commandLineArgs => {

  const plugins = [
    babel({
      exclude: 'node_modules/**',
      extensions: ['.js', '.ts']
    }),
    resolve({
      module: true,
      extensions: ['.mjs', '.js', '.ts', 'json'],
      preferBuiltins: true
    })
  ]

  const input = 'src/index.ts'

  if (commandLineArgs.configPurpose === 'test') {
    const pluginsForTest = plugins.concat([
      commonjs({
        namedExports: {
          'should-util': ['hasOwnProperty']
        }
      }),
      cleaner({ targets: [test] }),
      multiEntry()
    ])

    return [
      {
        input: 'src/**/*.spec.ts',
        output: {
          file: pkg.testBundle,
          format: 'cjs',
        },
        external: ['events'],
        plugins: pluginsForTest
      }
    ]
  }
  else {
    const pluginsForDist = plugins.concat([commonjs()])
    const pluginsWitchCleanUp = pluginsForDist.concat([
      cleaner({
        targets: [dist]
      })
    ])

    return [
      {
        input,
        output: {
          file: path.resolve(dist, pkg.module),
          format: 'esm'
        },
        plugins: pluginsWitchCleanUp
      },
      {
        input,
        output: {
          file: path.resolve(dist, pkg.main),
          format: 'cjs'
        },
        plugins: pluginsForDist
      },
      {
        input,
        output: {
          file: path.resolve(dist, pkg.browser),
          name: 'EventSequenceListener',
          format: 'iife'
        },
        plugins: pluginsForDist
      }
    ]
  }
}
