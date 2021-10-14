export default {
	extname
};

export function extname(p) {
	return /\.[^.]*$/.exec(p)?.[0];
}
