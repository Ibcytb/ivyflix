import { useState, useRef, useEffect } from "react";

interface QualityControlProps {
  selectedQuality: string;
  onQualityChange: (quality: string) => void;
}

export function QualityControl({ selectedQuality, onQualityChange }: QualityControlProps) {
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const qualities = [
    { value: "auto", label: "자동" },
    { value: "1080p", label: "1080p" },
    { value: "1440p", label: "1440p (2K)" },
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-3 py-1 text-sm hover:text-red-500 transition-colors font-medium"
        title="화질"
      >
        {selectedQuality === "auto" ? "자동" : selectedQuality}
      </button>
      {showMenu && (
        <div className="absolute bottom-full mb-2 right-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-2 min-w-[120px] shadow-2xl">
          {qualities.map((quality) => (
            <button
              key={quality.value}
              onClick={() => {
                onQualityChange(quality.value);
                setShowMenu(false);
              }}
              className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                selectedQuality === quality.value
                  ? 'bg-red-500/20 text-red-400 font-semibold'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              {quality.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
