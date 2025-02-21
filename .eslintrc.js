module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'prettier'],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'prettier',
		'plugin:prettier/recommended'
	],
	rules: {
		'prettier/prettier': 'error',
		'no-unused-vars': 'error',
		'padding-line-before-return': 'error',
		'max-len': ['warn', {
			code: 120,
			ignoreStrings: true,
			ignoreTemplateLiterals: true,
			ignoreRegExpLiterals: true
		}],
		'indent': ['error', 'tab'],
		'no-mixed-spaces-and-tabs': ['error', 'smart-tabs']
	},
	env: {
		node: true,
		browser: true,
		es2021: true
	}
}; 