// components/branding/Logo.jsx - Meldra Logo Component
import PropTypes from 'prop-types';

export default function Logo({ className = "", size = "medium", showText = true, style = {}, lowercaseM = false }) {
  const sizes = {
    small: { container: "w-10 h-10", text: "text-lg", tagline: "text-[10px]" },
    medium: { container: "w-12 h-12", text: "text-2xl", tagline: "text-xs" },
    large: { container: "w-24 h-24", text: "text-4xl", tagline: "text-sm" }
  };

  const currentSize = sizes[size];
  const brandName = lowercaseM ? 'meldra' : 'Meldra';

  return (
    <div className={`flex items-center gap-5 ${className}`} style={style}>
      {/* Meldra Logo — public/meldra-ai.png */}
      <div className={`${currentSize.container} flex items-center justify-center flex-shrink-0 min-w-0`}>
        <img 
          src="/meldra-ai.png" 
          alt="Meldra" 
          className="w-full h-full object-contain"
          onError={(e) => {
            e.target.style.display = 'none';
            const parent = e.target.parentElement;
            if (!parent.querySelector('.fallback-icon')) {
              parent.innerHTML = `
                <div class="fallback-icon w-full h-full bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
                  <span class="text-white font-bold" style="font-family: 'Space Grotesk', sans-serif; font-size: 0.6em;">m</span>
                </div>
              `;
            }
          }}
        />
      </div>

      {/* Brand Text — more space, less congested */}
      {showText && (
        <div className="flex flex-col justify-center min-w-0 space-y-1">
          <h1 
            className={`${currentSize.text} font-bold leading-tight tracking-tight`} 
            style={{ 
              color: 'inherit', 
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '-0.02em',
              lineHeight: '1.15'
            }}
          >
            {brandName}
          </h1>
          <p 
            className={`${currentSize.tagline} font-medium tracking-widest uppercase`} 
            style={{ 
              color: 'inherit', 
              opacity: 0.9,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '0.08em',
              lineHeight: '1.4',
              fontWeight: 500
            }}
          >
            DATA MADE SIMPLE
          </p>
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
  lowercaseM: PropTypes.bool,
};