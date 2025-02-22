module.exports = {
	root: true,
	overrides: [
		{
			files: ['*.ts'],
			parser: '@typescript-eslint/parser',
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: '.'
			},
			plugins: ['@typescript-eslint'],
			extends: [
				'eslint:recommended',
				'plugin:@typescript-eslint/recommended',
				'prettier'
			],
			rules: {
				'@typescript-eslint/indent': ['error', 'tab'],
				'@typescript-eslint/member-delimiter-style': ['error', {
					multiline: { delimiter: 'semi', requireLast: true },
					singleline: { delimiter: 'semi', requireLast: false }
				}],
				'@typescript-eslint/type-annotation-spacing': ['error', {
					before: false,
					after: true,
					overrides: { arrow: { before: true, after: true } }
				}],
				'@typescript-eslint/explicit-function-return-type': 'error',
				'@typescript-eslint/no-explicit-any': 'error',
				'@typescript-eslint/no-unused-vars': 'error',
				'no-console': ['error', { allow: ['warn', 'error'] }]
			}
		},
		{
			files: ['*.js'],
			env: {
				node: true,
				es6: true
			},
			extends: ['eslint:recommended', 'prettier']
		}
	],
	env: {
		node: true,
		es6: true,
		jest: true
	},
	rules: {
		'@typescript-eslint/indent': ['error', 'tab'],
		'@typescript-eslint/member-delimiter-style': [
			'error',
			{
				multiline: {
					delimiter: 'semi',
					requireLast: true
				},
				singleline: {
					delimiter: 'semi',
					requireLast: false
				}
			}
		],
		'@typescript-eslint/type-annotation-spacing': [
			'error',
			{
				before: false,
				after: true,
				overrides: {
					arrow: {
						before: true,
						after: true
					}
				}
			}
		],
		'@typescript-eslint/explicit-function-return-type': [
			'error',
			{
				allowExpressions: true,
				allowTypedFunctionExpressions: true,
				allowHigherOrderFunctions: true,
				allowDirectConstAssertionInArrowFunctions: true,
				allowConciseArrowFunctionExpressionsStartingWithVoid: true
			}
		],
		'@typescript-eslint/no-explicit-any': 'error',
		'@typescript-eslint/no-unused-vars': 'error',
		'@typescript-eslint/no-empty-function': 'error',
		'no-console': ['error', { allow: ['warn', 'error'] }],
		'no-empty-function': 'off',
		'no-inline-comments': 'error',
		'@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }]
	}
};
