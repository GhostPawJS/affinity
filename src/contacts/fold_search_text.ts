/** Collapse both German transliterations and accents to a shared search alphabet. */
export function foldSearchText(value: string): string {
  let folded = value.toLowerCase();
  if (/[^\u0020-\u007e]/.test(folded))
    folded = folded
      .replace(/ß/g, "ss")
      .normalize("NFKD")
      .replace(/\p{M}/gu, "");
  return folded.replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u");
}
