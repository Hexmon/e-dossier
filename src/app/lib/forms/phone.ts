const INDIA_COUNTRY_CODE = "91";
const INDIA_NATIONAL_NUMBER_LENGTH = 10;

export function normalizeIndiaPhoneDigits(input: string | null | undefined): string {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length > INDIA_NATIONAL_NUMBER_LENGTH && digits.startsWith(INDIA_COUNTRY_CODE)) {
    return digits.slice(INDIA_COUNTRY_CODE.length, INDIA_COUNTRY_CODE.length + INDIA_NATIONAL_NUMBER_LENGTH);
  }
  return digits.slice(0, INDIA_NATIONAL_NUMBER_LENGTH);
}

export function formatIndiaPhoneForDisplay(input: string | null | undefined): string {
  const digits = normalizeIndiaPhoneDigits(input);
  return digits ? `+91 ${digits}` : "+91";
}
