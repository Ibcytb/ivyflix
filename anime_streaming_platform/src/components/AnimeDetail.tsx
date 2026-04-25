import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { EpisodeCard } from "./EpisodeCard";

interface AnimeDetailProps {
  animeId: Id<"anime">;
  onBack: () => void;
  onEpisodeClick: (episodeId: Id<"episodes">) => void;
}

export function AnimeDetail({ animeId, onBack, onEpisodeClick }: AnimeDetailProps) {
  const anime = useQuery(api.anime.getAnime, { animeId });
  const episodes = useQuery(api.episodes.listEpisodes, { animeId });
  const isFavorite = useQuery(api.favorites.isFavorite, { animeId });
  const lastWatched = useQuery(api.watchHistory.getLastWatchedEpisode, { animeId });
  const toggleFavorite = useMutation(api.favorites.toggleFavorite);

  if (anime === undefined || episodes === undefined) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button onClick={onBack} className="text-gray-400 hover:text-white mb-4">
          ← 뒤로 가기
        </button>
        <p className="text-center text-gray-400">애니메이션을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite({ animeId });
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="relative h-[60vh] overflow-hidden">
        {anime.thumbnailUrl && (
          <>
            <img
              src={anime.thumbnailUrl}
              alt={anime.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
          </>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto">
            <button
              onClick={onBack}
              className="text-gray-300 hover:text-white mb-4 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              뒤로 가기
            </button>
            
            <h1 className="text-5xl font-bold mb-4">{anime.title}</h1>
            
            <div className="flex items-center gap-4 mb-4">
              <span className="text-green-500 font-semibold">{anime.releaseYear}</span>
              <span className="px-3 py-1 bg-gray-800 rounded-full text-sm">
                {anime.status === "ongoing" ? "방영중" : "완결"}
              </span>
              <div className="flex gap-2">
                {anime.genres.map((genre) => (
                  <span key={genre} className="px-3 py-1 bg-gray-700 rounded-full text-sm">
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              {episodes && episodes.length > 0 && (
                <button
                  onClick={() => {
                    const episodeToPlay = lastWatched?.episodeId || episodes[0]._id;
                    onEpisodeClick(episodeToPlay);
                  }}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  {lastWatched ? "이어보기" : "재생"}
                </button>
              )}
              
              <button
                onClick={handleToggleFavorite}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill={isFavorite ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {isFavorite ? "찜 해제" : "찜하기"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">줄거리</h2>
          <p className="text-gray-300 leading-relaxed">{anime.description}</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">에피소드</h2>
          {episodes.length === 0 ? (
            <p className="text-gray-400">아직 등록된 에피소드가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {episodes.map((episode) => (
                <EpisodeCard
                  key={episode._id}
                  episode={episode}
                  onClick={() => onEpisodeClick(episode._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
