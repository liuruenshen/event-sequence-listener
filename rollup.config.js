import * as path from 'path'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import cleaner from 'rollup-plugin-cleaner'
import multiEntry from 'rollup-plugin-multi-entry'
import replace from 'rollup-plugin-replace'

import pkg from './package.json'

const dist = 'dist'
const defaultPlatform = 'node'

export default () => {

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

  if (process.env.PURPOSE === 'test') {
    const platform = process.env.PLATFORM || defaultPlatform

    const pluginsForTest = [
      multiEntry(),
      replace({
        PLATFORM: JSON.stringify(platform)
      })
    ]
      .concat(plugins)
      .concat([
        commonjs({
          namedExports: {
            'should-util': ['hasOwnProperty']
          }
        }),
      ])

    const output = {}
    if(platform === 'node') {
      output.file = pkg.testBundleInNode.output
      output.format = pkg.testBundleInNode.format
    }
    else {
      output.file = pkg.testBundleInBrowser.output
      output.format = pkg.testBundleInBrowser.format
      output.name = pkg.testBundleInBrowser.name
    }

    return [
      {
        input: `**/__test__/**/*.${platform}.ts`,
        output,
        external: ['events'],
        plugins: pluginsForTest
      }
    ]
  }
  else {
    const pluginsForDist = plugins.concat([commonjs()])
    const pluginsWitchCleanUp = [
      cleaner({
        targets: [dist]
      })
    ].concat(pluginsForDist)

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
