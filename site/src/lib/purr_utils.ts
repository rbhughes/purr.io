export function parseUwiInput(input: string): string[] {
  const low = input.toLowerCase();
  const cleaned = low.replace(/[^a-z0-9,|]/g, "");
  const tokens = cleaned.split(/[,|]/).filter((token) => token.trim() !== "");
  const uniqueTokens = Array.from(new Set(tokens));

  //TODO: enforce longer tokens?
  //   uniqueTokens.forEach((token) => {
  //     if (token.length < 5) {
  //       console.warn(`Flagged token: "${token}" has fewer than 5 characters.`);
  //     }
  //   });

  return uniqueTokens;
}

export function parseCurveInput(input: string): string[] {
  const low = input.toLowerCase();
  const tokens = low.split(/[,|]/).filter((token) => token.trim() !== "");
  const uniqueTokens = Array.from(new Set(tokens));
  return uniqueTokens;
}

export function formatRasterSearchResults(results: any) {
  results.map((x) => console.log(JSON.stringify(x, null, 2)));
}
