import { Globe } from 'lucide-react';
import { REGIONS, REGION_ORDER } from '@/lib/region';
import { COMPANY, companyLine } from '@/lib/company';

// Small "Prices and terms for: [region]" switch. Pass the value and setter from useRegion().
export function RegionPicker({ region, onChange, className = '' }) {
  return (
    <label className={`inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 ${className}`}>
      <Globe className="w-4 h-4" />
      <span>Prices and terms for</span>
      <select
        value={region}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-slate-900 dark:text-slate-100"
        aria-label="Region"
      >
        {REGION_ORDER.map((r) => (
          <option key={r} value={r}>
            {REGIONS[r].label} ({REGIONS[r].currency})
          </option>
        ))}
      </select>
    </label>
  );
}

const mail = (addr) => (
  <a className="text-blue-700 dark:text-blue-400 underline" href={`mailto:${addr}`}>
    {addr}
  </a>
);

// What the law of the visitor's region gives them, in plain words.
const NOTICES = {
  IN: {
    title: 'For customers in India',
    items: () => [
      REGIONS.IN.tax + (COMPANY.gstin ? ` GSTIN: ${COMPANY.gstin}.` : ''),
      <>
        Personal data is handled under the Digital Personal Data Protection Act, 2023 and the Information Technology Act,
        2000. You can ask to see, correct or erase your personal data, withdraw consent, and nominate someone to act for you,
        by writing to {mail(COMPANY.privacyEmail)}. You can delete your account yourself in Settings.
      </>,
      <>
        Grievance Officer: {COMPANY.grievanceOfficer ? `${COMPANY.grievanceOfficer}, ` : ''}
        {mail(COMPANY.grievanceEmail || COMPANY.legalEmail)}. We acknowledge complaints within 24 hours and aim to resolve
        them within 15 days. If you are not satisfied, you can complain to the Data Protection Board of India.
      </>,
      'Invoices are issued in INR. Public institutions can buy through a purchase order.',
    ],
  },
  GB: {
    title: 'For customers in the United Kingdom',
    items: () => [
      REGIONS.GB.tax + (COMPANY.ukVat ? ` VAT number: ${COMPANY.ukVat}.` : ''),
      <>
        Personal data is handled under the UK GDPR and the Data Protection Act 2018. You can ask to access, correct,
        erase or export your data, or object to its use, by writing to {mail(COMPANY.privacyEmail)}. You can complain to
        the Information Commissioner&apos;s Office (ico.org.uk).
      </>,
      'Consumers can cancel a new paid plan within 14 days of buying it under the Consumer Contracts Regulations 2013. If you used the service in that time, we may keep a proportionate amount for that use.',
      'Your statutory rights as a consumer are not affected by our Terms.',
    ],
  },
  EU: {
    title: 'For customers in the European Union',
    items: () => [
      REGIONS.EU.tax + (COMPANY.euVat ? ` VAT number: ${COMPANY.euVat}.` : ''),
      <>
        Personal data is handled under the GDPR. You can ask to access, correct, erase or port your data, restrict or
        object to its use, by writing to {mail(COMPANY.privacyEmail)}. You can complain to the data protection authority
        in your country.
        {COMPANY.euRepresentative ? ` Our EU representative: ${COMPANY.euRepresentative}.` : ''}
      </>,
      'Consumers can withdraw from a new paid plan within 14 days of buying it. If you asked us to start the service in that time, we may keep a proportionate amount for that use.',
      'Your statutory rights as a consumer are not affected by our Terms.',
    ],
  },
  ROW: {
    title: 'For customers outside India, the UK and the EU',
    items: () => [
      REGIONS.ROW.tax,
      <>
        We do not sell or share your personal information for advertising, and we do not use your files to train AI
        models. Residents of California and other US states with privacy laws can ask to know, correct or delete their
        personal information by writing to {mail(COMPANY.privacyEmail)}; we will not treat you differently for asking.
      </>,
      'Prices are in US dollars; your card provider may convert them to your currency.',
    ],
  },
};

export default function RegionalCompliance({ region, compact = false }) {
  const notice = NOTICES[region] || NOTICES.ROW;
  const entity = companyLine();
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{notice.title}</h3>
      <ul className={`list-disc ml-5 space-y-2 text-slate-700 dark:text-slate-300 ${compact ? 'text-sm' : ''}`}>
        {notice.items().map((item, i) => (
          <li key={i}>{item}</li>
        ))}
        <li>Files you process are held in memory only while the result is produced, and are not stored unless you choose to save them.</li>
      </ul>
      {entity && <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">Service provided by {entity}.</p>}
    </div>
  );
}
