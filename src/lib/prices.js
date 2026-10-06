// List prices per pricing region, before tax. Pro is for one person; Team is per user.
// Paying yearly gives two months free (12 months for the price of 10). Business is quoted per contract.
// The region is decided by the server from the visitor's location (see region.js).
export const ANNUAL_NOTE = 'Pay yearly and get 2 months free.';

export const REGIONS = {
  IN: {
    label: 'India',
    currency: 'INR',
    prices: { free: '₹0', pro: '₹1,499', team: '₹999', business: 'Custom' },
    yearly: { pro: '₹14,990', team: '₹9,990' },
    seatYear: '₹9,990',
    tax: 'Prices exclude GST at 18%, which is added to your invoice.',
  },
  GB: {
    label: 'the United Kingdom',
    currency: 'GBP',
    prices: { free: '£0', pro: '£25', team: '£15', business: 'Custom' },
    yearly: { pro: '£250', team: '£150' },
    seatYear: '£150',
    tax: 'Prices exclude VAT at 20%, which is added where it applies.',
  },
  EU: {
    label: 'the European Union',
    currency: 'EUR',
    prices: { free: '€0', pro: '€29', team: '€17', business: 'Custom' },
    yearly: { pro: '€290', team: '€170' },
    seatYear: '€170',
    tax: 'Prices exclude VAT. Consumers pay the VAT rate of their country; businesses with a valid VAT number are reverse-charged.',
  },
  INTL: {
    label: null,
    currency: 'USD',
    prices: { free: '$0', pro: '$29', team: '$19', business: 'Custom' },
    yearly: { pro: '$290', team: '$190' },
    seatYear: '$190',
    tax: 'Prices exclude sales tax, VAT or GST, which is added where your local law requires it.',
  },
};
