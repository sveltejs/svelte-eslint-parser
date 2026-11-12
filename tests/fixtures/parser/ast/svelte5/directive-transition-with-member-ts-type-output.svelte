<script lang="ts">
	import { fade } from 'svelte/transition'; // fade: (node: Element, { delay, duration, easing }?: FadeParams | undefined) => TransitionConfig, fade: (node: Element, { delay, duration, easing }?: FadeParams | undefined) => TransitionConfig
	import { flip } from 'svelte/animate'; // flip: (node: Element, { from, to }: { from: DOMRect; to: DOMRect; }, params?: FlipParams | undefined) => AnimationConfig, flip: (node: Element, { from, to }: { from: DOMRect; to: DOMRect; }, params?: FlipParams | undefined) => AnimationConfig
	const foo = { fade, flip }; // foo: { fade: (node: Element, { delay, duration, easing }?: FadeParams | undefined) => TransitionConfig; flip: (node: Element, { from, to }: { from: DOMRect; to: DOMRect; }, params?: FlipParams | undefined) => AnimationConfig; }, fade: (node: Element, { delay, duration, easing }?: FadeParams | undefined) => TransitionConfig, fade: (node: Element, { delay, duration, easing }?: FadeParams | undefined) => TransitionConfig, flip: (node: Element, { from, to }: { from: DOMRect; to: DOMRect; }, params?: FlipParams | undefined) => AnimationConfig, flip: (node: Element, { from, to }: { from: DOMRect; to: DOMRect; }, params?: FlipParams | undefined) => AnimationConfig
	const list: number[] = $state([1, 2, 3]); // list: number[], $state([1, 2, 3]): number[]
</script>

{#each list as item (item)} <!-- list: number[], item: number, item: number -->
	<li transition:foo.fade={{ duration: 200 }} animate:foo.flip>{item}</li> <!-- foo.fade: (node: Element, { delay, duration, easing }?: FadeParams | undefined) => TransitionConfig, duration: number, foo.flip: (node: Element, { from, to }: { from: DOMRect; to: DOMRect; }, params?: FlipParams | undefined) => AnimationConfig, item: number -->
{/each}
