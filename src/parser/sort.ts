/**
 * Sort tokens
 */
export function sort<T extends { range: [number, number] }>(tokens: T[]): T[] {
    return tokens.sort((a, b) => {
        if (a.range[0] !== b.range[0]) {
            return a.range[0] - b.range[0]
        }
        return a.range[1] - b.range[1]
    })
}
