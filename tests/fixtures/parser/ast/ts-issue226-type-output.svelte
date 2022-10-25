<script lang="ts">
type EventInfo = { // EventInfo: EventInfo
    start_at: number, // start_at: number
}
let info: EventInfo | null = null // info: EventInfo | null

const lightFormat = (i: Date | number) => i.toString() // lightFormat: (i: number | Date) => string, i: number | Date, i.toString(): string

fetch('/fakeurl').then(() => { info = { start_at: 0 } }).catch(console.error) // fetch('/fakeurl').then(() => { info = { start_at: 0 } }).catch(console.error): Promise<void>

$: startDate = (info?.start_at ? lightFormat(info.start_at) : null) // $: any, startDate: string | null, info?.start_at: number | undefined, lightFormat(info.start_at): string
const endDate = () => (info?.start_at ? lightFormat(info.start_at) : null) // endDate: () => string | null, info?.start_at: number | undefined, lightFormat(info.start_at): string
</script>
    
<input type='text'/>
