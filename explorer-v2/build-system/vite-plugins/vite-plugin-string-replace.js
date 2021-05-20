/** @returns {import('vite').Plugin} */
export default function stringReplacePlugin({ test, search, replace, flags }) {
	return {
		name: 'string-replace-plugin',
		transform(code, id) {
			if (!test.test(id)) {
				return code;
			}
			const re = new RegExp(search, flags || '');
			return code.replace(re, replace);
		}
	};
}
