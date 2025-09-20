export {};

// Extending the Array prototype to add a shuffle method
declare global {
	interface Array<T> {
		shuffle(): T[];
	}
}

Array.prototype.shuffle = function <T>(): T[] {
	const _result = [...this];

	for (let i = _result.length - 1; i > 0; i--) {
		const randomIndex = Math.floor(Math.random() * (i + 1));
		[_result[i], _result[randomIndex]] = [_result[randomIndex], _result[i]];
	}

	return _result;
};
