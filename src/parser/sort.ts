/**
 * Sort tokens
 */
export function sort<T extends { range: [number, number] }>(tokens: T[]): T[] {
    return tokens.sort((a, b) => {
        if (a.range[0] > b.range[0]) {
            return 1
        }
        if (a.range[0] < b.range[0]) {
            return -1
        }
        if (a.range[1] > b.range[1]) {
            return 1
        }
        if (a.range[1] < b.range[1]) {
            return -1
        }
        return 0
    })
}
