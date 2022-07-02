export default {
	extname,
	isAbsolute,
	join
};

export function extname(p) {
	return /\.[^.]*$/.exec(p)?.[0];
}

export function isAbsolute() {
	return false;
}
export function join(...args) {
	return args.join('/');
}
