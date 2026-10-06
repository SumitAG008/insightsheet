// The legal entity behind meldra, shown in the footer, Terms and regional notices.
// Set these in Vercel (Project → Settings → Environment Variables) once the company is registered,
// then redeploy. Anything left unset is simply not shown; nothing placeholder-like goes live.
const env = import.meta.env || {};
const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

export const COMPANY = {
  name: clean(env.VITE_COMPANY_NAME), // e.g. "meldra Technologies Private Limited"
  address: clean(env.VITE_COMPANY_ADDRESS), // registered office
  cin: clean(env.VITE_COMPANY_CIN), // India: Corporate Identity Number
  gstin: clean(env.VITE_COMPANY_GSTIN), // India: GST registration
  ukVat: clean(env.VITE_COMPANY_UK_VAT), // UK VAT number, once registered
  euVat: clean(env.VITE_COMPANY_EU_VAT), // EU OSS / VAT number, once registered
  legalEmail: clean(env.VITE_LEGAL_EMAIL) || 'legal@meldra.ai',
  privacyEmail: clean(env.VITE_PRIVACY_EMAIL) || 'privacy@meldra.ai',
  // India: the IT Rules and the DPDP Act require a named person who handles complaints.
  grievanceOfficer: clean(env.VITE_GRIEVANCE_OFFICER_NAME),
  grievanceEmail: clean(env.VITE_GRIEVANCE_OFFICER_EMAIL),
  // EU: a representative in the EU (GDPR Article 27) when the company has no EU establishment.
  euRepresentative: clean(env.VITE_EU_REPRESENTATIVE),
};

export function companyLine() {
  return [COMPANY.name, COMPANY.address, COMPANY.cin && `CIN ${COMPANY.cin}`].filter(Boolean).join(' · ');
}
