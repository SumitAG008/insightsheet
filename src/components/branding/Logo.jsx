// components/branding/Logo.jsx - Meldra logo, traced block by block from the brand file (meldraweb/meldra.png):
// a blue rounded square with a lime block "m", and the "meldra" wordmark. The mark is drawn inline (no image to load), so it
// is sharp at every size and never shows a broken image. public/meldra-mark.svg is the same mark as a file.
import PropTypes from 'prop-types';

export const BRAND_BLUE = '#004FCD';
export const BRAND_LIME = '#DDFA21';
export const BRAND_INK = '#02161A';

const M_PATH =
  'M59 58h21v25h-21ZM90 58h20v24h-20ZM59 92h22v24h-22ZM119 92h24v24h-24ZM181 92h22v24h-22ZM59 124h22v24h-22ZM119 124h24v24h-24ZM181 124h22v24h-22ZM59 157h23v24h-23ZM119 157h24v24h-24ZM181 157h22v24h-22ZM59 190h24v18h-24ZM119 190h23v18h-23ZM181 190h22v18h-22ZM120 82V62A21 20 0 0 1 141 82ZM170 82V61A19 21 0 0 0 151 82ZM181 82V61A20 21 0 0 1 201 82Z';

// The "m": square blocks for the legs, quarter-round blocks for the arches.
export function MeldraMark({ size = 40, className = '', title = 'meldra' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 260 260"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="260" height="260" rx="46" fill={BRAND_BLUE} />
      <path fill={BRAND_LIME} d={M_PATH} />
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
            className={`${s.text} font-black leading-none whitespace-nowrap overflow-hidden text-ellipsis`}
            style={{ color: 'inherit', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.025em' }}
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
