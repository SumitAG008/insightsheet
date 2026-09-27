/**
 * Canonical HR concepts: the neutral "Rosetta Stone" between source and
 * target systems. Source columns map to concepts (by name, synonyms and the
 * shape of their values); target templates are built from concepts. Adding a
 * new source (Oracle, ADP…) or target only means new synonyms or a new
 * target definition, not a new engine.
 *
 * type drives cleansing: date, email, phone, gender, marital, country,
 * status, yesno, number, fte, currency, frequency, text, id.
 */
export const CONCEPTS = [
  // Identity
  { id: 'employee_id', label: 'Employee ID', group: 'Person', type: 'id', synonyms: ['employee id', 'worker id', 'emp id', 'employee number', 'person number', 'personnel number', 'user id', 'empid', 'eeid', 'associate id', 'staff id', 'employee no'] },
  { id: 'username', label: 'Login / username', group: 'Person', type: 'text', synonyms: ['username', 'user name', 'login', 'login id', 'user login', 'network id'] },
  { id: 'first_name', label: 'First name', group: 'Person', type: 'text', synonyms: ['first name', 'legal first name', 'given name', 'forename', 'firstname', 'fname'] },
  { id: 'last_name', label: 'Last name', group: 'Person', type: 'text', synonyms: ['last name', 'legal last name', 'family name', 'surname', 'lastname', 'lname'] },
  { id: 'middle_name', label: 'Middle name', group: 'Person', type: 'text', synonyms: ['middle name', 'legal middle name', 'middle initial', 'mi'] },
  { id: 'preferred_name', label: 'Preferred name', group: 'Person', type: 'text', synonyms: ['preferred name', 'preferred first name', 'known as', 'nickname'] },
  { id: 'salutation', label: 'Salutation', group: 'Person', type: 'text', synonyms: ['salutation', 'title prefix', 'prefix', 'honorific'] },
  { id: 'gender', label: 'Gender', group: 'Person', type: 'gender', synonyms: ['gender', 'sex', 'legal gender'] },
  { id: 'date_of_birth', label: 'Date of birth', group: 'Person', type: 'date', synonyms: ['date of birth', 'birth date', 'dob', 'birthdate'] },
  { id: 'country_of_birth', label: 'Country of birth', group: 'Person', type: 'country', synonyms: ['country of birth', 'birth country'] },
  { id: 'place_of_birth', label: 'Place of birth', group: 'Person', type: 'text', synonyms: ['place of birth', 'city of birth', 'birth city'] },
  { id: 'marital_status', label: 'Marital status', group: 'Person', type: 'marital', synonyms: ['marital status', 'marital', 'civil status'] },
  { id: 'nationality', label: 'Nationality', group: 'Person', type: 'country', synonyms: ['nationality', 'citizenship', 'primary nationality', 'citizenship country'] },

  // Contact
  { id: 'email_work', label: 'Work email', group: 'Contact', type: 'email', synonyms: ['work email', 'primary work email', 'business email', 'email', 'email address', 'office email'] },
  { id: 'email_personal', label: 'Personal email', group: 'Contact', type: 'email', synonyms: ['personal email', 'home email', 'private email'] },
  { id: 'phone_work', label: 'Work phone', group: 'Contact', type: 'phone', synonyms: ['work phone', 'business phone', 'primary work phone', 'office phone', 'phone', 'phone number'] },
  { id: 'address_line1', label: 'Address line 1', group: 'Address', type: 'text', synonyms: ['address line 1', 'address 1', 'street', 'address1', 'street address', 'home address line 1'] },
  { id: 'address_line2', label: 'Address line 2', group: 'Address', type: 'text', synonyms: ['address line 2', 'address 2', 'address2'] },
  { id: 'city', label: 'City', group: 'Address', type: 'text', synonyms: ['city', 'town', 'municipality', 'home city'] },
  { id: 'state', label: 'State / province', group: 'Address', type: 'text', synonyms: ['state', 'province', 'state province', 'county', 'region'] },
  { id: 'postal_code', label: 'Postal code', group: 'Address', type: 'text', synonyms: ['postal code', 'zip', 'zip code', 'postcode', 'post code'] },
  { id: 'address_country', label: 'Address country', group: 'Address', type: 'country', synonyms: ['country', 'address country', 'home country', 'country code'] },

  // Employment
  { id: 'status', label: 'Employment status', group: 'Employment', type: 'status', synonyms: ['worker status', 'employment status', 'status', 'employee status', 'active status'] },
  { id: 'hire_date', label: 'Hire date', group: 'Employment', type: 'date', synonyms: ['hire date', 'start date', 'date of hire', 'hired on', 'most recent hire date', 'employment start date'] },
  { id: 'original_hire_date', label: 'Original hire date', group: 'Employment', type: 'date', synonyms: ['original hire date', 'original start date', 'first hire date'] },
  { id: 'seniority_date', label: 'Seniority date', group: 'Employment', type: 'date', synonyms: ['seniority date', 'continuous service date', 'service date'] },
  { id: 'termination_date', label: 'Termination date', group: 'Termination', type: 'date', synonyms: ['termination date', 'term date', 'end date', 'separation date', 'leaving date'] },
  { id: 'termination_reason', label: 'Termination reason', group: 'Termination', type: 'reason', synonyms: ['termination reason', 'primary reason', 'term reason', 'reason for leaving', 'separation reason'] },
  { id: 'last_day_worked', label: 'Last day worked', group: 'Termination', type: 'date', synonyms: ['last day of work', 'last day worked', 'last working day', 'last date worked'] },
  { id: 'retirement_date', label: 'Retirement date', group: 'Termination', type: 'date', synonyms: ['retirement date', 'date of retirement', 'retired on', 'retired date'] },
  { id: 'rehire_eligible', label: 'Eligible for rehire', group: 'Termination', type: 'yesno', synonyms: ['eligible for rehire', 'rehire eligible', 'ok to rehire', 'rehire'] },

  // Job
  { id: 'job_effective_date', label: 'Job effective date', group: 'Job', type: 'date', synonyms: ['effective date', 'job effective date', 'event date', 'job start date'] },
  { id: 'job_code', label: 'Job code', group: 'Job', type: 'id', synonyms: ['job profile id', 'job code', 'job id', 'job classification', 'job profile code'] },
  { id: 'job_name', label: 'Job name', group: 'Job', type: 'text', synonyms: ['job profile', 'job profile name', 'job name', 'job'] },
  { id: 'job_title', label: 'Job title', group: 'Job', type: 'text', synonyms: ['business title', 'job title', 'position title', 'title', 'position name'] },
  { id: 'company_code', label: 'Legal entity code', group: 'Organization', type: 'id', synonyms: ['company id', 'company code', 'legal entity', 'legal entity id', 'company', 'employing company'] },
  { id: 'company_name', label: 'Legal entity name', group: 'Organization', type: 'text', synonyms: ['company name', 'legal entity name'] },
  { id: 'company_country', label: 'Legal entity country', group: 'Organization', type: 'country', synonyms: ['company country', 'legal entity country'] },
  { id: 'company_currency', label: 'Legal entity currency', group: 'Organization', type: 'currency', synonyms: ['company currency', 'legal entity currency'] },
  { id: 'business_unit', label: 'Business unit', group: 'Organization', type: 'id', synonyms: ['business unit', 'business unit id', 'bu'] },
  { id: 'division', label: 'Division', group: 'Organization', type: 'id', synonyms: ['division', 'division id'] },
  { id: 'department_code', label: 'Department code', group: 'Organization', type: 'id', synonyms: ['supervisory org', 'supervisory organization', 'supervisory org id', 'department id', 'department code', 'dept id', 'org unit', 'organization id', 'department'] },
  { id: 'department_name', label: 'Department name', group: 'Organization', type: 'text', synonyms: ['supervisory org name', 'department name', 'dept name', 'organization name', 'org name'] },
  { id: 'location_code', label: 'Location code', group: 'Organization', type: 'id', synonyms: ['location id', 'location code', 'work location', 'location', 'site id'] },
  { id: 'location_name', label: 'Location name', group: 'Organization', type: 'text', synonyms: ['location name', 'site name', 'work location name'] },
  { id: 'location_country', label: 'Location country', group: 'Organization', type: 'country', synonyms: ['location country', 'site country'] },
  { id: 'timezone', label: 'Time zone', group: 'Organization', type: 'text', synonyms: ['time zone', 'timezone', 'tz'] },
  { id: 'cost_center', label: 'Cost center', group: 'Organization', type: 'id', synonyms: ['cost center', 'cost centre', 'cost center id', 'cost center code', 'kostl'] },
  { id: 'cost_center_name', label: 'Cost center name', group: 'Finance', type: 'text', synonyms: ['cost center name', 'cost centre name', 'cost center description'] },
  { id: 'cost_center_company', label: 'Cost center legal entity', group: 'Finance', type: 'id', synonyms: ['cost center company', 'controlling area company', 'cost center legal entity'] },
  { id: 'cost_center_parent', label: 'Parent cost center', group: 'Finance', type: 'id', synonyms: ['parent cost center', 'parent cost centre', 'parent', 'cost center group', 'rollup'] },
  { id: 'manager_id', label: 'Manager ID', group: 'Job', type: 'id', synonyms: ['manager employee id', 'manager id', 'supervisor id', 'reports to', 'manager', 'line manager id'] },
  { id: 'employee_class', label: 'Employee class / worker type', group: 'Job', type: 'text', synonyms: ['worker type', 'employee type', 'employee class', 'worker sub type', 'employment type'] },
  { id: 'fte', label: 'FTE', group: 'Job', type: 'fte', synonyms: ['fte', 'full time equivalent', 'scheduled fte', 'fte percent', 'fte %'] },
  { id: 'standard_hours', label: 'Standard weekly hours', group: 'Job', type: 'number', synonyms: ['scheduled weekly hours', 'standard hours', 'weekly hours', 'default weekly hours'] },
  { id: 'pay_grade', label: 'Pay grade', group: 'Job', type: 'id', synonyms: ['pay grade', 'grade', 'compensation grade', 'salary grade'] },

  // Compensation
  { id: 'comp_effective_date', label: 'Compensation effective date', group: 'Compensation', type: 'date', synonyms: ['compensation effective date', 'comp effective date', 'salary effective date', 'pay effective date'] },
  { id: 'pay_group', label: 'Pay group', group: 'Compensation', type: 'id', synonyms: ['pay group', 'payroll group', 'pay group id'] },
  { id: 'pay_component', label: 'Pay component', group: 'Compensation', type: 'paycomp', synonyms: ['pay component', 'compensation element', 'compensation plan', 'pay element', 'allowance plan', 'earning code', 'earning'] },
  { id: 'salary_amount', label: 'Base pay amount', group: 'Compensation', type: 'number', synonyms: ['base pay amount', 'base pay', 'salary', 'annual salary', 'base salary', 'amount', 'pay rate'] },
  { id: 'currency', label: 'Currency', group: 'Compensation', type: 'currency', synonyms: ['currency', 'currency code', 'pay currency'] },
  { id: 'pay_frequency', label: 'Pay frequency', group: 'Compensation', type: 'frequency', synonyms: ['frequency', 'pay frequency', 'salary frequency', 'pay rate frequency'] },

  // One-time payments (bonuses, awards)
  { id: 'one_time_date', label: 'One-time payment date', group: 'One-time pay', type: 'date', synonyms: ['payment date', 'pay date', 'one time payment date', 'award date', 'bonus date'] },
  { id: 'one_time_component', label: 'One-time payment type', group: 'One-time pay', type: 'paycomp', synonyms: ['one time payment plan', 'one time payment type', 'bonus type', 'payment type', 'award type', 'one time plan'] },
  { id: 'one_time_amount', label: 'One-time payment amount', group: 'One-time pay', type: 'number', synonyms: ['one time payment amount', 'bonus amount', 'award amount', 'payment amount'] },

  // Bank / payment information
  { id: 'payment_method', label: 'Payment method', group: 'Bank', type: 'paymethod', synonyms: ['payment method', 'payment type method', 'pay method'] },
  { id: 'account_holder', label: 'Account holder', group: 'Bank', type: 'text', synonyms: ['account holder', 'account owner', 'account name', 'name on account'] },
  { id: 'iban', label: 'IBAN', group: 'Bank', type: 'iban', synonyms: ['iban', 'iban number', 'international bank account number'] },
  { id: 'account_number', label: 'Bank account number', group: 'Bank', type: 'digits', synonyms: ['account number', 'bank account number', 'bank account', 'acct number'] },
  { id: 'bank_routing', label: 'Sort code / routing number', group: 'Bank', type: 'digits', synonyms: ['sort code', 'routing number', 'routing', 'bank code', 'blz', 'aba', 'transit number', 'bank id'] },
  { id: 'bic', label: 'BIC / SWIFT', group: 'Bank', type: 'bic', synonyms: ['bic', 'swift', 'swift code', 'bic code'] },
  { id: 'bank_name', label: 'Bank name', group: 'Bank', type: 'text', synonyms: ['bank name', 'bank', 'financial institution'] },
  { id: 'bank_country', label: 'Bank country', group: 'Bank', type: 'country', synonyms: ['bank country', 'country of bank'] },

  // Pension
  { id: 'pension_scheme', label: 'Pension scheme', group: 'Pension', type: 'paycomp', synonyms: ['pension scheme', 'pension plan', 'retirement plan', 'pension fund', 'scheme', 'scheme name'] },
  { id: 'pension_member_id', label: 'Pension member number', group: 'Pension', type: 'id', synonyms: ['member number', 'member id', 'pension member id', 'scheme member number', 'membership number'] },
  { id: 'pension_start_date', label: 'Pension enrolment date', group: 'Pension', type: 'date', synonyms: ['enrolment date', 'enrollment date', 'pension start date', 'scheme join date', 'join date', 'enrolled on'] },
  { id: 'employee_contribution', label: 'Employee contribution %', group: 'Pension', type: 'number', synonyms: ['employee contribution pct', 'employee contribution', 'ee contribution', 'employee contribution percent', 'employee rate'] },
  { id: 'employer_contribution', label: 'Employer contribution %', group: 'Pension', type: 'number', synonyms: ['employer contribution pct', 'employer contribution', 'er contribution', 'employer contribution percent', 'employer rate'] },
  { id: 'pension_payout_amount', label: 'Pension payout amount', group: 'Pension', type: 'number', synonyms: ['monthly pension', 'pension amount', 'pension payout', 'annual pension', 'pension paid', 'pension payment'] },

  // Payroll year-to-date balances
  { id: 'tax_year', label: 'Tax year', group: 'Payroll balances', type: 'text', synonyms: ['tax year', 'payroll year', 'fiscal year', 'balance year'] },
  { id: 'wage_type', label: 'Wage type / balance', group: 'Payroll balances', type: 'wagetype', synonyms: ['wage type', 'balance type', 'pay balance', 'earning deduction code', 'payroll balance', 'balance'] },
  { id: 'ytd_amount', label: 'YTD amount', group: 'Payroll balances', type: 'number', synonyms: ['ytd amount', 'year to date amount', 'ytd', 'ytd total', 'balance amount'] },
];

export const CONCEPT_BY_ID = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

/** Concepts that describe an org object (a lookup list), not a person. */
export const ORG_LISTS = [
  { id: 'company', code: 'company_code', name: 'company_name', extra: ['company_country', 'company_currency'] },
  { id: 'department', code: 'department_code', name: 'department_name', extra: ['cost_center'] },
  { id: 'cost_center', code: 'cost_center', name: 'cost_center_name', extra: ['cost_center_company', 'cost_center_parent'] },
  { id: 'location', code: 'location_code', name: 'location_name', extra: ['location_country', 'timezone'] },
  { id: 'job', code: 'job_code', name: 'job_name', extra: [] },
  { id: 'business_unit', code: 'business_unit', name: null, extra: [] },
  { id: 'division', code: 'division', name: null, extra: [] },
];
