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
  { id: 'manager_id', label: 'Manager ID', group: 'Job', type: 'id', synonyms: ['manager employee id', 'manager id', 'supervisor id', 'reports to', 'manager', 'line manager id'] },
  { id: 'employee_class', label: 'Employee class / worker type', group: 'Job', type: 'text', synonyms: ['worker type', 'employee type', 'employee class', 'worker sub type', 'employment type'] },
  { id: 'fte', label: 'FTE', group: 'Job', type: 'fte', synonyms: ['fte', 'full time equivalent', 'scheduled fte', 'fte percent', 'fte %'] },
  { id: 'standard_hours', label: 'Standard weekly hours', group: 'Job', type: 'number', synonyms: ['scheduled weekly hours', 'standard hours', 'weekly hours', 'default weekly hours'] },
  { id: 'pay_grade', label: 'Pay grade', group: 'Job', type: 'id', synonyms: ['pay grade', 'grade', 'compensation grade', 'salary grade'] },

  // Compensation
  { id: 'comp_effective_date', label: 'Compensation effective date', group: 'Compensation', type: 'date', synonyms: ['compensation effective date', 'comp effective date', 'salary effective date', 'pay effective date'] },
  { id: 'pay_group', label: 'Pay group', group: 'Compensation', type: 'id', synonyms: ['pay group', 'payroll group', 'pay group id'] },
  { id: 'pay_component', label: 'Pay component', group: 'Compensation', type: 'id', synonyms: ['pay component', 'compensation element', 'compensation plan', 'pay element'] },
  { id: 'salary_amount', label: 'Base pay amount', group: 'Compensation', type: 'number', synonyms: ['base pay amount', 'base pay', 'salary', 'annual salary', 'base salary', 'amount', 'pay rate'] },
  { id: 'currency', label: 'Currency', group: 'Compensation', type: 'currency', synonyms: ['currency', 'currency code', 'pay currency'] },
  { id: 'pay_frequency', label: 'Pay frequency', group: 'Compensation', type: 'frequency', synonyms: ['frequency', 'pay frequency', 'salary frequency', 'pay rate frequency'] },
];

export const CONCEPT_BY_ID = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

/** Concepts that describe an org object (a lookup list), not a person. */
export const ORG_LISTS = [
  { id: 'company', code: 'company_code', name: 'company_name', extra: ['company_country', 'company_currency'] },
  { id: 'department', code: 'department_code', name: 'department_name', extra: ['cost_center'] },
  { id: 'location', code: 'location_code', name: 'location_name', extra: ['location_country', 'timezone'] },
  { id: 'job', code: 'job_code', name: 'job_name', extra: [] },
  { id: 'business_unit', code: 'business_unit', name: null, extra: [] },
  { id: 'division', code: 'division', name: null, extra: [] },
];
