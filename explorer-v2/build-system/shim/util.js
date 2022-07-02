export default new Proxy(
	{},
	{
		get(target, key) {
			if (key === 'inspect') {
				return {};
			}
			// eslint-disable-next-line no-console -- Demo
			console.log(key);
			return target[key];
		}
	}
);
