// components/branding/Logo.jsx - Meldra Logo Component
import PropTypes from 'prop-types';

export default function Logo({ className = "", size = "medium", showText = true, style = {} }) {
  const sizes = {
    small: { container: "w-10 h-10", text: "text-lg", tagline: "text-[10px]" },
    medium: { container: "w-12 h-12", text: "text-2xl", tagline: "text-xs" },
    large: { container: "w-24 h-24", text: "text-4xl", tagline: "text-sm" }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center gap-4 ${className}`} style={style}>
      {/* Meldra Logo Image */}
      <div className={`${currentSize.container} flex items-center justify-center flex-shrink-0`}>
        <img 
          src="/meldra.png" 
          alt="Meldra Logo" 
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback if image doesn't load
            e.target.style.display = 'none';
            const parent = e.target.parentElement;
            if (!parent.querySelector('.fallback-icon')) {
              parent.innerHTML = `
                <div class="fallback-icon w-full h-full bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
                  <span class="text-white font-bold" style="font-family: 'Space Grotesk', sans-serif; font-size: 0.6em;">M</span>
                </div>
              `;
            }
          }}
        />
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col justify-center">
          <h1 
            className={`${currentSize.text} font-bold leading-tight tracking-tight`} 
            style={{ 
              color: 'inherit', 
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '-0.02em',
              lineHeight: '1.1'
            }}
          >
            Meldra
          </h1>
          <p 
            className={`${currentSize.tagline} font-medium tracking-wider uppercase`} 
            style={{ 
              color: 'inherit', 
              opacity: 0.85,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '0.1em',
              lineHeight: '1.3',
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
};