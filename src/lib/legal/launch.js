// meldra Legal launch switch. While false, nobody but accounts with the licence (today only the
// operator) sees any sign of Legal: no landing-page banner, no Solutions entry, no public /legal-diary
// page or search-engine page, and other accounts opening /legal are sent to their dashboard.
// Set to true when meldra Legal is ready to sell publicly. No app imports, so the build can read it.
export const LEGAL_PUBLIC = false;

// Accounts that always see the Legal menu entry, even before the server answers. Mirrors the server's
// LEGAL_OPERATOR_EMAILS default; the server still checks the licence on every call.
export const LEGAL_OPERATOR_EMAILS = ['sumitagaria@gmail.com'];

export function isLegalOperator(email) {
  return LEGAL_OPERATOR_EMAILS.includes(String(email || '').trim().toLowerCase());
}
