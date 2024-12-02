// eslint-disable-next-line n/no-extraneous-import -- shim
import * as estree from 'espree';
export function createRequire() {
	function req(mod) {
		if (mod === 'espree') {
			return estree;
		}
		throw new Error(`Cannot find module '${mod}'`);
	}

	req.cache = {};
	return req;
}
export default {
	createRequire
};
