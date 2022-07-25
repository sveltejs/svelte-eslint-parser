import type { Readable } from "svelte/store";

declare type MessageFormatter = (id: string) => string;
declare const $format: Readable<MessageFormatter>;

export { $format as _ };
