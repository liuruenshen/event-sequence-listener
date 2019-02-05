import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'

export default commandLineArgs => {
  return [
    {
      input: 'src/index.js',
      output: {
        name: 'event-order-es.js',
        format: 'esm'
      },
      plugins: [
        resolve(),
        commonjs(),
        babel()
      ]
    },
  ]
}
