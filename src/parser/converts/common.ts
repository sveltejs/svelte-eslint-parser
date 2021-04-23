/** indexOf */
export function indexOf(
    str: string,
    search: (c: string) => boolean,
    start: number,
): number {
    for (let index = start; index < str.length; index++) {
        const c = str[index]
        if (search(c)) {
            return index
        }
    }
    return -1
}

/** lastIndexOf */
export function lastIndexOf(
    str: string,
    search: (c: string) => boolean,
    end: number,
): number {
    for (let index = end; index >= 0; index--) {
        const c = str[index]
        if (search(c)) {
            return index
        }
    }
    return -1
}
