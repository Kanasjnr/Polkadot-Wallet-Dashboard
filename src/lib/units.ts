export const WND_DECIMALS = 12n;

const PLANCKS_PER_WND: bigint = 10n ** WND_DECIMALS;
const MAX_DECIMALS: number = Number(WND_DECIMALS);

function leftPadWithZeros(value: string, totalLength: number): string {
  if (value.length >= totalLength) return value;
  return "0".repeat(totalLength - value.length) + value;
}

function rightPadWithZeros(value: string, totalLength: number): string {
  if (value.length >= totalLength) return value.slice(0, totalLength);
  return value + "0".repeat(totalLength - value.length);
}

function stripTrailingZeros(value: string): string {
  let i = value.length - 1;
  while (i >= 0 && value[i] === "0") i--;
  return value.slice(0, i + 1);
}

export function formatWnd(plancks: bigint): string {
  const integerPart: bigint = plancks / PLANCKS_PER_WND;
  const fractionalPart: bigint = plancks % PLANCKS_PER_WND;

  if (fractionalPart === 0n) {
    return integerPart.toString();
  }

  const fractionalRaw = fractionalPart.toString();
  const fractionalPadded = leftPadWithZeros(fractionalRaw, MAX_DECIMALS);
  const fractionalTrimmed = stripTrailingZeros(fractionalPadded);

  return `${integerPart.toString()}.${fractionalTrimmed}`;
}

export function parseWnd(input: string): bigint {
  const trimmed = input.trim();
  if (trimmed === "") return 0n;

  // Basic numeric validation: digits with optional single dot
  if (!/^\d*(?:\.\d*)?$/.test(trimmed)) {
    throw new Error("Invalid amount format");
  }

  const [integerStrRaw, fractionalStrRaw = ""] = trimmed.split(".");
  const integerStr = integerStrRaw === "" ? "0" : integerStrRaw;

  if (fractionalStrRaw.length > MAX_DECIMALS) {
    throw new Error("Too many decimal places");
  }

  const fractionalPadded = rightPadWithZeros(fractionalStrRaw, MAX_DECIMALS);

  // Combine into a single bigint string (integer + 12-decimal fractional)
  const combined = `${integerStr}${fractionalPadded}`.replace(/^0+(?=\d)/, "");
  return BigInt(combined || "0");
}

