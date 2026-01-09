// components/branding/Logo.jsx - Meldra Logo Component
import PropTypes from 'prop-types';

export default function Logo({ className = "", size = "medium", showText = true, style = {} }) {
  const sizes = {
    small: { container: "w-8 h-8", text: "text-sm" },
    medium: { container: "w-10 h-10", text: "text-xl" },
    large: { container: "w-20 h-20", text: "text-3xl" }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`} style={style}>
      {/* Meldra Logo Image */}
      <div className={`${currentSize.container} flex items-center justify-center`}>
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
                <div class="fallback-icon w-full h-full bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <span class="text-white font-bold text-xs">M</span>
                </div>
              `;
            }
          }}
        />
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <h1 className={`${currentSize.text} font-bold leading-tight`} style={{ color: 'inherit' }}>
            Meldra
          </h1>
          <p className="text-xs font-medium tracking-wide" style={{ color: 'inherit', opacity: 0.8 }}>
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