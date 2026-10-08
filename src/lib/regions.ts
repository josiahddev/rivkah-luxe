// Countries and the provinces/states we offer as dropdowns at checkout.

const ISO_CODES =
  "AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FR GA GB GD GE GH GI GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IS IT JM JO JP KE KG KH KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PG PH PK PL PR PT PY QA RO RS RW SA SB SC SE SG SI SK SL SM SN SO SR SS ST SV SZ TC TD TG TH TJ TL TM TN TO TR TT TW TZ UA UG US UY UZ VC VE VG VN VU WS YE ZA ZM ZW".split(
    " ",
  );

let names: Intl.DisplayNames | null = null;
export function countryName(code: string) {
  try {
    names ??= new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Countries for dropdowns: priority markets first, then A–Z. */
export function countryOptions() {
  const priority = ["CA", "US", "NG", "GB"];
  const rest = ISO_CODES.filter((c) => !priority.includes(c))
    .map((c) => ({ value: c, label: countryName(c) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...priority.map((c) => ({ value: c, label: countryName(c) })), ...rest];
}

export const CANADIAN_PROVINCES: { code: string; name: string }[] = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

export const US_STATES =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

export const NIGERIAN_STATES = [
  "FCT", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

/** Province/state options for a country, or null when it should be free text. */
export function regionOptions(country: string): { value: string; label: string }[] | null {
  if (country === "CA") return CANADIAN_PROVINCES.map((p) => ({ value: p.code, label: p.name }));
  if (country === "US") return US_STATES.map((s) => ({ value: s, label: s }));
  if (country === "NG") return NIGERIAN_STATES.map((s) => ({ value: s, label: s === "FCT" ? "FCT – Abuja" : s }));
  return null;
}

export function regionLabel(country: string) {
  if (country === "CA") return "Province";
  if (country === "US" || country === "NG") return "State";
  return "State / region";
}

export function postalLabel(country: string) {
  if (country === "US") return "ZIP code";
  if (country === "CA" || country === "GB") return "Postal code";
  return "Postal code (if any)";
}

export function postalRequired(country: string) {
  return ["CA", "US", "GB"].includes(country);
}

// Default Canadian sales tax rates (%). GST/HST plus provincial PST/QST where
// collected. The owner can edit these in Settings → Tax — please confirm with an
// accountant; rates change.
export const DEFAULT_CA_TAX_RATES: Record<string, number> = {
  AB: 5, BC: 12, MB: 12, NB: 15, NL: 15, NS: 14, NT: 5, NU: 5, ON: 13, PE: 15, QC: 14.975, SK: 11, YT: 5,
};
