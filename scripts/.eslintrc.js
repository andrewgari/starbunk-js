module.exports = {
	root: false,
	env: {
		node: true,
		es6: true
	},
	extends: ['eslint:recommended'],
	rules: {
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/no-explicit-any': 'off'
	}
};
