const numberFormat = new Intl.NumberFormat("es-CL");

/** 1234.5 → "1.234,5" */
export function formatNumber(value: number) {
  return numberFormat.format(value);
}

/** Monto con su moneda: CLP → "$86.000", UF → "UF 3,5", otras → "USD 1.200". */
export function formatMoney(amount: number, currency?: string | null) {
  const value = formatNumber(amount);
  if (!currency || currency === "CLP") return `$${value}`;
  return `${currency} ${value}`;
}
