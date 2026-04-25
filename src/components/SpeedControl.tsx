import { useState, useRef, useEffect } from "react";

interface SpeedControlProps {
  playbackRate: number;
  onSpeedChange: (rate: number) => void;
}

export function SpeedControl({ playbackRate, onSpeedChange }: SpeedControlProps) {
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

  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-3 py-1 text-sm hover:text-red-500 transition-colors font-medium"
        title="재생 속도"
      >
        {playbackRate}x
      </button>
      {showMenu && (
        <div className="absolute bottom-full mb-2 right-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-2 min-w-[100px] shadow-2xl">
          {speeds.map((rate) => (
            <button
              key={rate}
              onClick={() => {
                onSpeedChange(rate);
                setShowMenu(false);
              }}
              className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                playbackRate === rate
                  ? 'bg-red-500/20 text-red-400 font-semibold'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              {rate === 1 ? '보통' : `${rate}x`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
