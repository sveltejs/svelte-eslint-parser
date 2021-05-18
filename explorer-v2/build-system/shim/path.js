export default {
	extname(p) {
		return /\.[^.]*$/.exec(p)?.[0];
	}
};
