import { useState } from "react";

interface EpisodeCardProps {
  episode: {
    _id: string;
    episodeNumber: number;
    title: string;
    description?: string;
    duration: number;
    thumbnail?: string;
    thumbnailUrl?: string | null;
  };
  onClick: () => void;
}

export function EpisodeCard({ episode, onClick }: EpisodeCardProps) {
  const [imageError, setImageError] = useState(false);
  
  return (
    <div
      onClick={onClick}
      className="bg-gray-800 hover:bg-gray-700 rounded-lg overflow-hidden cursor-pointer transition-all group hover:scale-[1.01]"
    >
      <div className="flex gap-4 p-4">
        {episode.thumbnail && !imageError ? (
          <img
            src={episode.thumbnailUrl || ""}
            alt={episode.title}
            onError={() => setImageError(true)}
            className="w-40 h-24 object-cover rounded flex-shrink-0"
          />
        ) : (
          <div className="w-40 h-24 bg-gray-700 rounded flex-shrink-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-400 mb-1">에피소드 {episode.episodeNumber}</p>
          <h3 className="font-semibold text-lg mb-2 group-hover:text-red-500 transition-colors">{episode.title}</h3>
          {episode.description && (
            <p className="text-sm text-gray-400 line-clamp-2 mb-2">{episode.description}</p>
          )}
          <p className="text-sm text-gray-500">{Math.floor(episode.duration / 60)}분</p>
        </div>
      </div>
    </div>
  );
}
