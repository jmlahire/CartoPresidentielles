import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import babel from '@rollup/plugin-babel';
import sass from 'rollup-plugin-sass';
import staticimport from 'rollup-plugin-static-import';

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'src/js/app.js',
	output: {
		file: 'public/bundle.js',
		format: 'iife', // immediately-invoked function expression — suitable for <script> tags
		sourcemap: true
	},
	plugins: [
		resolve(), // tells Rollup how to find date-fns in node_modules
		commonjs(), // converts date-fns to ES modules
		production && terser(), // minify, but only in production
		babel({ babelHelpers: 'bundled' }), // transpilation
		sass({
			include: ["/**/*.css", "/**/*.scss", "/**/*.sass"],
			output: "public/style/style.css",
			failOnError: true,
		}),
		staticimport({ include: ['src/assets/**/*.csv', 'src/assets/**/*.json','src/assets/**/*.topojson','src/assets/**/*.geojson','src/assets/**/*.xml']})
	]
};
