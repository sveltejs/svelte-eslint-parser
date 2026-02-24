export default {
	extname,
	isAbsolute,
	join,
	resolve,
	dirname,
	basename,
	parse,
	relative
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
export function resolve(...args) {
	return join(...args);
}
export function parse(s) {
	const dir = dirname(s);
	const ext = extname(s);
	const base = basename(s);
	return {
		root: '',
		dir,
		base,
		ext,
		name: basename(base, ext)
	};
}
export function dirname(p) {
	return p.split('/').slice(0, -1).join('/') || p;
}
export function basename(p, ext) {
	const base = p.split('/').pop() || p;
	return base.endsWith(ext) ? base.slice(0, -ext.length) : base;
}
export function relative(_from, to) {
	return to;
}
