import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect } from "react";

interface AnimeListProps {
  searchTerm: string;
  onAnimeClick: (animeId: Id<"anime">) => void;
  showAuthPrompt: boolean;
}

export function AnimeList({ searchTerm, onAnimeClick, showAuthPrompt }: AnimeListProps) {
  const allAnime = useQuery(api.anime.listAnime);
  const searchResults = useQuery(
    api.anime.searchAnime,
    searchTerm ? { searchTerm } : "skip"
  );

  const displayAnime = searchTerm ? searchResults : allAnime;

  // Cache anime list for faster subsequent loads
  useEffect(() => {
    if (allAnime && allAnime.length > 0) {
      try {
        localStorage.setItem('anime_cache', JSON.stringify({
          data: allAnime,
          timestamp: Date.now(),
        }));
      } catch (e) {}
    }
  }, [allAnime]);

  if (displayAnime === undefined) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (displayAnime.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">
          {searchTerm ? "검색 결과가 없습니다." : "아직 등록된 애니메이션이 없습니다."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showAuthPrompt && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <p className="text-lg mb-2">로그인하지 않고도 시청할 수 있습니다!</p>
          <p className="text-gray-400 text-sm">
            찜하기, 이어보기, 플레이어 설정을 저장하려면 로그인하세요.
          </p>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4">
          {searchTerm ? `"${searchTerm}" 검색 결과` : "모든 애니메이션"}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {displayAnime.map((anime) => (
            <div
              key={anime._id}
              onClick={() => onAnimeClick(anime._id)}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 mb-2">
                {anime.posterUrl ? (
                  <img
                    src={anime.posterUrl}
                    alt={anime.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    No Image
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                </div>
              </div>
              <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-red-500 transition-colors">
                {anime.title}
              </h3>
              <p className="text-xs text-gray-400 mt-1">{anime.releaseYear}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
