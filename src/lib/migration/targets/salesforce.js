/**
 * Salesforce (Workforce / Employee records) — Bulk API 2.0 CSV files. PREVIEW.
 *
 * Bulk API takes one flat CSV per object, with API field names as the only
 * header row. Records are upserted on an external ID, so reloads update rather
 * than duplicate. Lookups are set by external ID with the relationship syntax
 * (Manager__r.EmployeeNumber), which removes the need to capture Salesforce IDs
 * between loads; the one ordering rule left is that a parent must exist before a
 * child points at it, so managers are linked in a second pass.
 *
 * Salesforce orgs differ: the standard Employee object (Workforce Engagement /
 * HR Service) exists only with those licences, and most orgs add custom fields.
 * Field API names below are a starting point: check them against Setup > Object
 * Manager in your org and rename the column headers to match before loading.
 * Custom fields end in __c.
 */

export const SALESFORCE = {
  id: 'salesforce',
  label: 'Salesforce (Bulk API, preview)',
  short: 'Salesforce',
  format: 'csv',
  noLabelRow: true,
  orgRefs: {},
  reconcile: { employees: 'Employee', employeeField: 'EmployeeNumber', money: [] },
  defaultSettings: {
    dateFormat: 'yyyy-MM-dd',
    sfExternalId: 'EmployeeNumber',
    sfActiveStatus: 'Active',
    sfInactiveStatus: 'Inactive',
  },
  settingsFields: [
    ['sfExternalId', 'External ID field', 'Field marked External ID on the Employee object, used for upserts and lookups.'],
    ['sfActiveStatus', 'Status value for active workers', 'Picklist value in your org.'],
    ['sfInactiveStatus', 'Status value for leavers', 'Picklist value in your org.'],
  ],
  readmeNotes: (settings) => [
    'One CSV per object for Bulk API 2.0 (Data Loader or Workbench): UTF-8, comma-separated,',
    'API names as the single header row. Use operation "upsert" with external ID',
    `${settings.sfExternalId}.`,
    '01_Employee.csv creates or updates every worker without managers; 02_Employee_Managers.csv',
    'then sets each manager by external ID (Manager__r.<external id>), so no Salesforce IDs',
    'need to be copied between loads.',
    'PREVIEW: field API names differ between orgs. Check them in Setup > Object Manager >',
    'Employee and rename the headers to match (custom fields end in __c).',
  ],
  entities: [
    {
      id: 'Employee',
      label: 'Employees',
      stage: 'People',
      grain: 'employee',
      dependsOn: [],
      fields: [
        { id: 'EmployeeNumber', label: 'Employee number (external ID)', from: 'employee_id', required: true },
        { id: 'FirstName', label: 'First name', from: 'first_name', required: true },
        { id: 'MiddleName', label: 'Middle name', from: 'middle_name' },
        { id: 'LastName', label: 'Last name', from: 'last_name', required: true },
        { id: 'PreferredFirstName', label: 'Preferred first name', from: 'preferred_name' },
        { id: 'Email', label: 'Work email', from: 'email_work' },
        { id: 'WorkPhone', label: 'Work phone', from: 'phone_work' },
        { id: 'EmployeeStatus', label: 'Status', derive: (c) => (c.get('status') === 'inactive' || c.get('termination_date') ? c.settings.sfInactiveStatus : c.settings.sfActiveStatus), required: true },
        { id: 'StartDate', label: 'Hire date', from: 'hire_date', date: true },
        { id: 'EndDate', label: 'Termination date', from: 'termination_date', date: true },
        { id: 'Title', label: 'Job title', derive: (c) => c.job('job_title') || c.job('job_name') },
        { id: 'Department__c', label: 'Department', derive: (c) => c.orgName('department', c.job('department_code')) || c.job('department_code') },
        { id: 'Job_Code__c', label: 'Job code', derive: (c) => c.job('job_code') },
        { id: 'Location__c', label: 'Location', derive: (c) => c.orgName('location', c.job('location_code')) || c.job('location_code') },
        { id: 'Legal_Entity__c', label: 'Legal entity', derive: (c) => c.job('company_code') },
        { id: 'Cost_Center__c', label: 'Cost centre', derive: (c) => c.job('cost_center') || c.orgExtra('department', c.job('department_code'), 'cost_center') },
        { id: 'Worker_Type__c', label: 'Worker type', derive: (c) => c.job('employee_class') },
        { id: 'FTE__c', label: 'FTE', derive: (c) => c.job('fte') },
        { id: 'Birthdate', label: 'Date of birth', from: 'date_of_birth', date: true },
        { id: 'Gender__c', label: 'Gender', from: 'gender' },
        { id: 'MailingStreet', label: 'Street', derive: (c) => [c.get('address_line1'), c.get('address_line2')].filter(Boolean).join('\n') },
        { id: 'MailingCity', label: 'City', from: 'city' },
        { id: 'MailingState', label: 'State', from: 'state' },
        { id: 'MailingPostalCode', label: 'Postal code', from: 'postal_code' },
        { id: 'MailingCountry', label: 'Country', from: 'address_country' },
      ],
    },
    {
      id: 'Employee_Managers',
      label: 'Manager links (second pass)',
      stage: 'People',
      grain: 'employee',
      dependsOn: ['Employee'],
      onlyIf: (c) => !!c.job('manager_id'),
      fields: [
        { id: 'EmployeeNumber', label: 'Employee number (external ID)', from: 'employee_id', required: true },
        { id: 'Manager__r.EmployeeNumber', label: 'Manager (by external ID)', derive: (c) => c.job('manager_id'), ref: 'employee', required: true },
      ],
    },
  ],
};
