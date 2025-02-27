import moduleAlias from 'module-alias';

// Add path aliases for easier imports
moduleAlias.addAliases({
	'@services': __dirname + '/services',
	'@starbunk': __dirname + '/starbunk',
	'@snowbunk': __dirname + '/snowbunk',
	'@helpers': __dirname + '/helpers',
	'@utils': __dirname + '/utils',
	'@tests': __dirname + '/__tests__'
});
