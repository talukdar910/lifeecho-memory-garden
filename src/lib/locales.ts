// Country and language lists, named with the browser's built-in translations.

export const COUNTRY_CODES = (
  "AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW"
).split(" ");

const regionNames = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

export const COUNTRIES = COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const LANGUAGES: { code: string; name: string }[] = [
  ["en", "English"], ["fr", "Français"], ["es", "Español"], ["pt", "Português"], ["de", "Deutsch"],
  ["it", "Italiano"], ["nl", "Nederlands"], ["ar", "العربية"], ["bn", "বাংলা"], ["hi", "हिन्दी"],
  ["ur", "اردو"], ["zh", "中文"], ["ja", "日本語"], ["ko", "한국어"], ["ru", "Русский"],
  ["tr", "Türkçe"], ["fa", "فارسی"], ["sw", "Kiswahili"], ["id", "Bahasa Indonesia"], ["ms", "Bahasa Melayu"],
  ["th", "ไทย"], ["vi", "Tiếng Việt"], ["pl", "Polski"], ["uk", "Українська"], ["ro", "Română"],
  ["el", "Ελληνικά"], ["he", "עברית"], ["sv", "Svenska"], ["no", "Norsk"], ["da", "Dansk"],
  ["fi", "Suomi"], ["cs", "Čeština"], ["hu", "Magyar"], ["ta", "தமிழ்"], ["te", "తెలుగు"],
  ["pa", "ਪੰਜਾਬੀ"], ["am", "አማርኛ"], ["yo", "Yorùbá"], ["ha", "Hausa"], ["zu", "isiZulu"],
  ["tl", "Filipino"], ["ne", "नेपाली"],
].map(([code, name]) => ({ code: code!, name: name! }));

export function languageName(code: string | null | undefined): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code ?? "English";
}
