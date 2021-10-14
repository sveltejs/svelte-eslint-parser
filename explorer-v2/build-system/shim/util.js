export default new Proxy(
	{},
	{
		get(target, key) {
			console.log(key);
			if (key === 'inspect') {
				return {};
			}
			return target[key];
		}
	}
);
