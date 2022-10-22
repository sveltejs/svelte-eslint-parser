export class UniqueIdGenerator {
  private uniqueIdSeq = 1;

  private readonly usedUniqueIds = new Set<string>();

  public generate(base: string, ...texts: string[]): string {
    const hasId = (id: string) =>
      this.usedUniqueIds.has(id) || texts.some((t) => t.includes(id));

    let candidate = `$_${base.replace(/\W/g, "_")}${this.uniqueIdSeq++}`;
    while (hasId(candidate)) {
      candidate = `$_${base.replace(/\W/g, "_")}${this.uniqueIdSeq++}`;
    }
    this.usedUniqueIds.add(candidate);
    return candidate;
  }
}
