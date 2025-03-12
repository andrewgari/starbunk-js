declare module 'module-alias' {
	function addAliases(aliases: Record<string, string>): void;
	function addPath(path: string): void;
	export default {
		addAliases,
		addPath
	};
}
