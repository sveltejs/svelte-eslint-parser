<script lang="ts">
	import type { Attachment } from 'svelte/attachments';


	const myAttachment: Attachment = (element) => {
		console.log(element.nodeName); // 'DIV'

		return () => {
			console.log('cleaning up');
		};
	};
</script>

<div {@attach myAttachment}>...</div>