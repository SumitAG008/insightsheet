// components/branding/Logo.jsx - Meldra logo, the same as on meldra.ai: a blue rounded square with
// a lime striped "m", and the "meldra" wordmark. The mark is drawn inline (no image to load), so it
// is sharp at every size and never shows a broken image. public/meldra-mark.svg is the same mark as a file.
import PropTypes from 'prop-types';

export const BRAND_BLUE = '#0B4FD0';
export const BRAND_LIME = '#E2FF3B';

// The "m": three legs and two arches, drawn as one dashed stroke.
export function MeldraMark({ size = 40, className = '', title = 'meldra' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100" height="100" rx="24" fill={BRAND_BLUE} />
      <path
        d="M30 77 V45 Q30 33 40 33 Q50 33 50 45 V77 M50 45 Q50 33 60 33 Q70 33 70 45 V77"
        fill="none"
        stroke={BRAND_LIME}
        strokeWidth="8.5"
        strokeDasharray="7.5 4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

MeldraMark.propTypes = {
  size: PropTypes.number,
  className: PropTypes.string,
  title: PropTypes.string,
};

const SIZES = {
  small: { mark: 32, text: 'text-xl', tagline: 'text-[11px]', gap: 'gap-2.5' },
  medium: { mark: 40, text: 'text-2xl', tagline: 'text-xs', gap: 'gap-3' },
  large: { mark: 64, text: 'text-4xl', tagline: 'text-sm', gap: 'gap-4' },
};

export default function Logo({ className = '', size = 'medium', showText = true, style = {}, tagline, brandName: brandNameProp, logoUrl: logoUrlProp }) {
  const s = SIZES[size] || SIZES.medium;
  const brandName = brandNameProp && String(brandNameProp).trim() ? String(brandNameProp).trim() : 'meldra';
  // A logo chosen in Settings (white-label) replaces the Meldra mark.
  const customLogo = logoUrlProp && String(logoUrlProp).trim() ? String(logoUrlProp).trim() : null;

  return (
    <div className={`flex items-center ${s.gap} ${className}`} style={style}>
      {customLogo ? (
        <img
          src={customLogo}
          alt={brandName}
          width={s.mark}
          height={s.mark}
          className="flex-shrink-0 rounded-[24%] object-cover"
          style={{ width: s.mark, height: s.mark }}
        />
      ) : (
        <MeldraMark size={s.mark} className="flex-shrink-0" title={brandName} />
      )}

      {showText && (
        <div className="flex flex-col justify-center min-w-0">
          <span
            className={`${s.text} font-extrabold leading-none whitespace-nowrap overflow-hidden text-ellipsis`}
            style={{ color: 'inherit', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.035em' }}
          >
            {brandName}
          </span>
          {tagline && (
            <span
              className={`${s.tagline} font-medium mt-1 whitespace-nowrap overflow-hidden text-ellipsis opacity-80`}
              style={{ color: 'inherit', fontFamily: "'Inter', sans-serif" }}
            >
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

Logo.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showText: PropTypes.bool,
  style: PropTypes.object,
  lowercaseM: PropTypes.bool, // kept so existing callers still validate; the wordmark is always lowercase
  tagline: PropTypes.string,
  brandName: PropTypes.string,
  logoUrl: PropTypes.string,
};
