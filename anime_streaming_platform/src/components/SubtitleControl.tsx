import { useState, useRef, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";

interface Subtitle {
  _id: string;
  label: string;
}

interface SubtitleControlProps {
  subtitles: Subtitle[];
  selectedSubtitle: string | null;
  onSubtitleChange: (subtitleId: string | null) => void;
  subtitleOffset: number;
  onOffsetChange: (offset: number) => void;
}

export function SubtitleControl({
  subtitles,
  selectedSubtitle,
  onSubtitleChange,
  subtitleOffset,
  onOffsetChange,
}: SubtitleControlProps) {
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

  if (!subtitles || subtitles.length === 0) return null;

  const selectedSubtitleLabel = selectedSubtitle
    ? subtitles.find((s) => s._id === selectedSubtitle)?.label || "자막"
    : "자막 없음";

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="hover:text-red-500 transition-colors"
        title="자막"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"/>
        </svg>
      </button>
      {showMenu && (
        <div className="absolute bottom-full mb-2 right-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-2 min-w-[180px] shadow-2xl">
          <button
            onClick={() => {
              onSubtitleChange(null);
              setShowMenu(false);
            }}
            className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors ${
              !selectedSubtitle
                ? 'bg-red-500/20 text-red-400 font-semibold'
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            자막 없음
          </button>
          {subtitles.map((sub) => (
            <button
              key={sub._id}
              onClick={() => {
                onSubtitleChange(sub._id);
                setShowMenu(false);
              }}
              className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                selectedSubtitle === sub._id
                  ? 'bg-red-500/20 text-red-400 font-semibold'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              {sub.label}
            </button>
          ))}
          {selectedSubtitle && (
            <>
              <div className="border-t border-white/10 my-2" />
              <div className="px-3 py-2">
                <p className="text-xs text-white/60 mb-2">자막 동기화</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOffsetChange(subtitleOffset - 0.5)}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                  >
                    -0.5s
                  </button>
                  <span className="text-xs text-white/80 font-medium min-w-[40px] text-center">
                    {subtitleOffset.toFixed(1)}s
                  </span>
                  <button
                    onClick={() => onOffsetChange(subtitleOffset + 0.5)}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                  >
                    +0.5s
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
