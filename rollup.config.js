import * as path from 'path'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import cleaner from 'rollup-plugin-cleaner'
import multiEntry from 'rollup-plugin-multi-entry'
import replace from 'rollup-plugin-replace'

import pkg from './package.json'

const dist = 'dist'
const test = path.dirname(pkg.testBundle)
const defaultPlatform = 'node'

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
    const platform = commandLineArgs.configPlatform || defaultPlatform

    const pluginsForTest = [
      cleaner({ targets: [test] }),
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

    return [
      {
        input: `**/__test__/**/*.${platform}.ts`,
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
