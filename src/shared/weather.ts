export function formatCurrentPrecipitationMm(value: number | null | undefined) {
  return value === null || value === undefined ? '-- mm' : `${Math.round(value)} mm`
}
