// Lexicographic combinations of [0..n-1] choose k
export function combinationsLex(n: number, k: number): number[][] {
  if (k < 1 || k > n) return [];
  const comb: number[] = Array.from({ length: k }, (_, i) => i);
  const res: number[][] = [];
  while (true) {
    res.push([...comb]);
    let i = k - 1;
    while (i >= 0 && comb[i] === n - k + i) i--;
    if (i < 0) break;
    comb[i]++;
    for (let j = i + 1; j < k; j++) comb[j] = comb[j - 1] + 1;
  }
  return res;
}

export function page<T>(arr: T[], pageIndex: number, perPage: number): T[] {
  const start = pageIndex * perPage;
  return arr.slice(start, start + perPage);
}