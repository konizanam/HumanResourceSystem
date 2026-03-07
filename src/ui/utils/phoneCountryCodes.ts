export type CallingCodeOption = { code: string; label: string };

export const DEFAULT_CALLING_CODE = "+264";

// Global calling codes for international dialing prefixes.
export const CALLING_CODE_OPTIONS: CallingCodeOption[] = [
  { code: "+1", label: "United States/Canada (+1)" },
  { code: "+7", label: "Russia/Kazakhstan (+7)" },
  { code: "+20", label: "Egypt (+20)" },
  { code: "+27", label: "South Africa (+27)" },
  { code: "+30", label: "Greece (+30)" },
  { code: "+31", label: "Netherlands (+31)" },
  { code: "+32", label: "Belgium (+32)" },
  { code: "+33", label: "France (+33)" },
  { code: "+34", label: "Spain (+34)" },
  { code: "+36", label: "Hungary (+36)" },
  { code: "+39", label: "Italy (+39)" },
  { code: "+40", label: "Romania (+40)" },
  { code: "+41", label: "Switzerland (+41)" },
  { code: "+43", label: "Austria (+43)" },
  { code: "+44", label: "United Kingdom (+44)" },
  { code: "+45", label: "Denmark (+45)" },
  { code: "+46", label: "Sweden (+46)" },
  { code: "+47", label: "Norway (+47)" },
  { code: "+48", label: "Poland (+48)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+51", label: "Peru (+51)" },
  { code: "+52", label: "Mexico (+52)" },
  { code: "+53", label: "Cuba (+53)" },
  { code: "+54", label: "Argentina (+54)" },
  { code: "+55", label: "Brazil (+55)" },
  { code: "+56", label: "Chile (+56)" },
  { code: "+57", label: "Colombia (+57)" },
  { code: "+58", label: "Venezuela (+58)" },
  { code: "+60", label: "Malaysia (+60)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+62", label: "Indonesia (+62)" },
  { code: "+63", label: "Philippines (+63)" },
  { code: "+64", label: "New Zealand (+64)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+66", label: "Thailand (+66)" },
  { code: "+81", label: "Japan (+81)" },
  { code: "+82", label: "South Korea (+82)" },
  { code: "+84", label: "Vietnam (+84)" },
  { code: "+86", label: "China (+86)" },
  { code: "+90", label: "Turkey (+90)" },
  { code: "+91", label: "India (+91)" },
  { code: "+92", label: "Pakistan (+92)" },
  { code: "+93", label: "Afghanistan (+93)" },
  { code: "+94", label: "Sri Lanka (+94)" },
  { code: "+95", label: "Myanmar (+95)" },
  { code: "+98", label: "Iran (+98)" },
  { code: "+211", label: "South Sudan (+211)" },
  { code: "+212", label: "Morocco (+212)" },
  { code: "+213", label: "Algeria (+213)" },
  { code: "+216", label: "Tunisia (+216)" },
  { code: "+218", label: "Libya (+218)" },
  { code: "+220", label: "Gambia (+220)" },
  { code: "+221", label: "Senegal (+221)" },
  { code: "+222", label: "Mauritania (+222)" },
  { code: "+223", label: "Mali (+223)" },
  { code: "+224", label: "Guinea (+224)" },
  { code: "+225", label: "Cote d'Ivoire (+225)" },
  { code: "+226", label: "Burkina Faso (+226)" },
  { code: "+227", label: "Niger (+227)" },
  { code: "+228", label: "Togo (+228)" },
  { code: "+229", label: "Benin (+229)" },
  { code: "+230", label: "Mauritius (+230)" },
  { code: "+231", label: "Liberia (+231)" },
  { code: "+232", label: "Sierra Leone (+232)" },
  { code: "+233", label: "Ghana (+233)" },
  { code: "+234", label: "Nigeria (+234)" },
  { code: "+235", label: "Chad (+235)" },
  { code: "+236", label: "Central African Republic (+236)" },
  { code: "+237", label: "Cameroon (+237)" },
  { code: "+238", label: "Cape Verde (+238)" },
  { code: "+239", label: "Sao Tome and Principe (+239)" },
  { code: "+240", label: "Equatorial Guinea (+240)" },
  { code: "+241", label: "Gabon (+241)" },
  { code: "+242", label: "Congo (+242)" },
  { code: "+243", label: "DR Congo (+243)" },
  { code: "+244", label: "Angola (+244)" },
  { code: "+245", label: "Guinea-Bissau (+245)" },
  { code: "+246", label: "Diego Garcia (+246)" },
  { code: "+248", label: "Seychelles (+248)" },
  { code: "+249", label: "Sudan (+249)" },
  { code: "+250", label: "Rwanda (+250)" },
  { code: "+251", label: "Ethiopia (+251)" },
  { code: "+252", label: "Somalia (+252)" },
  { code: "+253", label: "Djibouti (+253)" },
  { code: "+254", label: "Kenya (+254)" },
  { code: "+255", label: "Tanzania (+255)" },
  { code: "+256", label: "Uganda (+256)" },
  { code: "+257", label: "Burundi (+257)" },
  { code: "+258", label: "Mozambique (+258)" },
  { code: "+260", label: "Zambia (+260)" },
  { code: "+261", label: "Madagascar (+261)" },
  { code: "+262", label: "Reunion/Mayotte (+262)" },
  { code: "+263", label: "Zimbabwe (+263)" },
  { code: "+264", label: "Namibia (+264)" },
  { code: "+265", label: "Malawi (+265)" },
  { code: "+266", label: "Lesotho (+266)" },
  { code: "+267", label: "Botswana (+267)" },
  { code: "+268", label: "Eswatini (+268)" },
  { code: "+269", label: "Comoros (+269)" },
  { code: "+290", label: "Saint Helena (+290)" },
  { code: "+291", label: "Eritrea (+291)" },
  { code: "+297", label: "Aruba (+297)" },
  { code: "+298", label: "Faroe Islands (+298)" },
  { code: "+299", label: "Greenland (+299)" },
  { code: "+350", label: "Gibraltar (+350)" },
  { code: "+351", label: "Portugal (+351)" },
  { code: "+352", label: "Luxembourg (+352)" },
  { code: "+353", label: "Ireland (+353)" },
  { code: "+354", label: "Iceland (+354)" },
  { code: "+355", label: "Albania (+355)" },
  { code: "+356", label: "Malta (+356)" },
  { code: "+357", label: "Cyprus (+357)" },
  { code: "+358", label: "Finland (+358)" },
  { code: "+359", label: "Bulgaria (+359)" },
  { code: "+370", label: "Lithuania (+370)" },
  { code: "+371", label: "Latvia (+371)" },
  { code: "+372", label: "Estonia (+372)" },
  { code: "+373", label: "Moldova (+373)" },
  { code: "+374", label: "Armenia (+374)" },
  { code: "+375", label: "Belarus (+375)" },
  { code: "+376", label: "Andorra (+376)" },
  { code: "+377", label: "Monaco (+377)" },
  { code: "+378", label: "San Marino (+378)" },
  { code: "+380", label: "Ukraine (+380)" },
  { code: "+381", label: "Serbia (+381)" },
  { code: "+382", label: "Montenegro (+382)" },
  { code: "+383", label: "Kosovo (+383)" },
  { code: "+385", label: "Croatia (+385)" },
  { code: "+386", label: "Slovenia (+386)" },
  { code: "+387", label: "Bosnia and Herzegovina (+387)" },
  { code: "+389", label: "North Macedonia (+389)" },
  { code: "+420", label: "Czech Republic (+420)" },
  { code: "+421", label: "Slovakia (+421)" },
  { code: "+423", label: "Liechtenstein (+423)" },
  { code: "+500", label: "Falkland Islands (+500)" },
  { code: "+501", label: "Belize (+501)" },
  { code: "+502", label: "Guatemala (+502)" },
  { code: "+503", label: "El Salvador (+503)" },
  { code: "+504", label: "Honduras (+504)" },
  { code: "+505", label: "Nicaragua (+505)" },
  { code: "+506", label: "Costa Rica (+506)" },
  { code: "+507", label: "Panama (+507)" },
  { code: "+508", label: "Saint Pierre and Miquelon (+508)" },
  { code: "+509", label: "Haiti (+509)" },
  { code: "+590", label: "Guadeloupe (+590)" },
  { code: "+591", label: "Bolivia (+591)" },
  { code: "+592", label: "Guyana (+592)" },
  { code: "+593", label: "Ecuador (+593)" },
  { code: "+594", label: "French Guiana (+594)" },
  { code: "+595", label: "Paraguay (+595)" },
  { code: "+596", label: "Martinique (+596)" },
  { code: "+597", label: "Suriname (+597)" },
  { code: "+598", label: "Uruguay (+598)" },
  { code: "+599", label: "Curacao/Bonaire (+599)" },
  { code: "+670", label: "Timor-Leste (+670)" },
  { code: "+672", label: "Australian External Territories (+672)" },
  { code: "+673", label: "Brunei (+673)" },
  { code: "+674", label: "Nauru (+674)" },
  { code: "+675", label: "Papua New Guinea (+675)" },
  { code: "+676", label: "Tonga (+676)" },
  { code: "+677", label: "Solomon Islands (+677)" },
  { code: "+678", label: "Vanuatu (+678)" },
  { code: "+679", label: "Fiji (+679)" },
  { code: "+680", label: "Palau (+680)" },
  { code: "+681", label: "Wallis and Futuna (+681)" },
  { code: "+682", label: "Cook Islands (+682)" },
  { code: "+683", label: "Niue (+683)" },
  { code: "+685", label: "Samoa (+685)" },
  { code: "+686", label: "Kiribati (+686)" },
  { code: "+687", label: "New Caledonia (+687)" },
  { code: "+688", label: "Tuvalu (+688)" },
  { code: "+689", label: "French Polynesia (+689)" },
  { code: "+690", label: "Tokelau (+690)" },
  { code: "+691", label: "Micronesia (+691)" },
  { code: "+692", label: "Marshall Islands (+692)" },
  { code: "+850", label: "North Korea (+850)" },
  { code: "+852", label: "Hong Kong (+852)" },
  { code: "+853", label: "Macau (+853)" },
  { code: "+855", label: "Cambodia (+855)" },
  { code: "+856", label: "Laos (+856)" },
  { code: "+880", label: "Bangladesh (+880)" },
  { code: "+886", label: "Taiwan (+886)" },
  { code: "+960", label: "Maldives (+960)" },
  { code: "+961", label: "Lebanon (+961)" },
  { code: "+962", label: "Jordan (+962)" },
  { code: "+963", label: "Syria (+963)" },
  { code: "+964", label: "Iraq (+964)" },
  { code: "+965", label: "Kuwait (+965)" },
  { code: "+966", label: "Saudi Arabia (+966)" },
  { code: "+967", label: "Yemen (+967)" },
  { code: "+968", label: "Oman (+968)" },
  { code: "+970", label: "Palestine (+970)" },
  { code: "+971", label: "United Arab Emirates (+971)" },
  { code: "+972", label: "Israel (+972)" },
  { code: "+973", label: "Bahrain (+973)" },
  { code: "+974", label: "Qatar (+974)" },
  { code: "+975", label: "Bhutan (+975)" },
  { code: "+976", label: "Mongolia (+976)" },
  { code: "+977", label: "Nepal (+977)" },
  { code: "+992", label: "Tajikistan (+992)" },
  { code: "+993", label: "Turkmenistan (+993)" },
  { code: "+994", label: "Azerbaijan (+994)" },
  { code: "+995", label: "Georgia (+995)" },
  { code: "+996", label: "Kyrgyzstan (+996)" },
  { code: "+998", label: "Uzbekistan (+998)" },
];

const CODE_SET = new Set(CALLING_CODE_OPTIONS.map((item) => item.code));

export function sanitizePhoneLocalInput(raw: string, maxDigits = 15): string {
  let v = String(raw ?? "").replace(/[^\d\s]/g, "");
  v = v.replace(/\s+/g, " ").trimStart();

  let digitCount = 0;
  let out = "";
  for (const ch of v) {
    if (ch >= "0" && ch <= "9") {
      if (digitCount >= maxDigits) continue;
      digitCount += 1;
      out += ch;
    } else if (ch === " ") {
      if (out.length > 0 && out[out.length - 1] !== " ") out += ch;
    }
  }
  return out;
}

export function splitInternationalPhone(
  raw: string,
  fallbackCode = DEFAULT_CALLING_CODE,
): { code: string; local: string } {
  const value = String(raw ?? "").trim();
  if (!value) return { code: fallbackCode, local: "" };

  if (!value.startsWith("+")) {
    return { code: fallbackCode, local: sanitizePhoneLocalInput(value) };
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  const compact = normalized.replace(/\s/g, "");

  // Find the longest matching country code from the known list.
  const candidateCodes = [
    compact.slice(0, 5),
    compact.slice(0, 4),
    compact.slice(0, 3),
    compact.slice(0, 2),
  ].filter(Boolean);

  const code = candidateCodes.find((c) => CODE_SET.has(c)) ?? fallbackCode;
  const localRaw = compact.startsWith(code) ? compact.slice(code.length) : compact.replace(/^\+/, "");
  return { code, local: sanitizePhoneLocalInput(localRaw) };
}

export function composeInternationalPhone(code: string, local: string): string {
  const normalizedCode = String(code ?? "").trim() || DEFAULT_CALLING_CODE;
  const normalizedLocal = sanitizePhoneLocalInput(local);
  return normalizedLocal ? `${normalizedCode} ${normalizedLocal}` : normalizedCode;
}

export function validateInternationalPhone(raw: string, requiredLabel = "Phone is required"): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return requiredLabel;
  if (digits.length > 15) return "Phone number must not exceed 15 digits";
  if (digits.length < 6) return "Phone number appears too short";
  return null;
}
