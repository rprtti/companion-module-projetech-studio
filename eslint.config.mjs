import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

const baseConfig = await generateEslintConfig({
	enableTypescript: true,
})

export default [
	...baseConfig,
	{
		// The protocol tests import the compiled module from dist/, which is built locally and never published.
		files: ['test/**/*.mjs'],
		rules: {
			'n/no-unpublished-import': 'off',
		},
	},
]
