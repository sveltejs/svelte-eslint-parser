<script lang="ts">
type EventInfo = {
    start_at: number,
}
let info: EventInfo | null = null

const lightFormat = (i: Date | number) => i.toString()

fetch('/fakeurl').then(() => { info = { start_at: 0 } }).catch(console.error)

$: startDate = (info?.start_at ? lightFormat(info.start_at) : null)
const endDate = () => (info?.start_at ? lightFormat(info.start_at) : null)
</script>
    
<input type='text'/>
