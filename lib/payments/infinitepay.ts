export function infinitePayMethod(captureMethod: string | undefined) {
  return captureMethod === "pix" ? "pix" : "card";
}

export function infinitePayAmountMatches(receivedInCents: number | undefined, expectedInReais: number) {
  return Number(receivedInCents) === Math.round(Number(expectedInReais) * 100);
}
