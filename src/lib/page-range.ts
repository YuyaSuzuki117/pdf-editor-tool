export function parsePageRange(input: string, totalPages: number): number[] {
  const indices = new Set<number>();

  for (const rawPart of input.split(',')) {
    const part = rawPart.trim();
    if (!part) continue;

    const match = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) continue;

    const start = parseInt(match[1], 10) - 1;
    const end = match[2] ? parseInt(match[2], 10) - 1 : start;
    const from = Math.max(0, Math.min(start, end));
    const to = Math.min(totalPages - 1, Math.max(start, end));

    for (let index = from; index <= to; index++) {
      indices.add(index);
    }
  }

  return Array.from(indices).sort((left, right) => left - right);
}
