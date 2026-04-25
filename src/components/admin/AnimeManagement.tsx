import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

export function AnimeManagement() {
  const allAnime = useQuery(api.anime.listAnime);
  const generateUploadUrl = useMutation(api.anime.generateUploadUrl);
  const createAnime = useMutation(api.anime.createAnime);
  const updateAnime = useMutation(api.anime.updateAnime);
  const deleteAnime = useMutation(api.anime.deleteAnime);

  const [animeForm, setAnimeForm] = useState({
    title: "",
    description: "",
    genres: "",
    releaseYear: new Date().getFullYear(),
    status: "ongoing" as "ongoing" | "completed",
  });

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAnime = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!posterFile || !thumbnailFile) {
        toast.error("포스터와 썸네일을 모두 업로드해주세요.");
        return;
      }

      // Upload poster
      const posterUploadUrl = await generateUploadUrl();
      const posterResult = await fetch(posterUploadUrl, {
        method: "POST",
        headers: { "Content-Type": posterFile.type },
        body: posterFile,
      });
      const posterJson = await posterResult.json();

      // Upload thumbnail
      const thumbnailUploadUrl = await generateUploadUrl();
      const thumbnailResult = await fetch(thumbnailUploadUrl, {
        method: "POST",
        headers: { "Content-Type": thumbnailFile.type },
        body: thumbnailFile,
      });
      const thumbnailJson = await thumbnailResult.json();

      // Create anime
      await createAnime({
        title: animeForm.title,
        description: animeForm.description,
        poster: posterJson.storageId,
        thumbnail: thumbnailJson.storageId,
        genres: animeForm.genres.split(",").map((g) => g.trim()),
        releaseYear: animeForm.releaseYear,
        status: animeForm.status,
      });

      toast.success("애니메이션이 추가되었습니다!");

      // Reset form
      setAnimeForm({
        title: "",
        description: "",
        genres: "",
        releaseYear: new Date().getFullYear(),
        status: "ongoing",
      });
      setPosterFile(null);
      setThumbnailFile(null);
    } catch (error) {
      toast.error("애니메이션 추가에 실패했습니다.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnime = async (animeId: string) => {
    if (!confirm("정말로 이 애니메이션을 삭제하시겠습니까? 모든 에피소드도 함께 삭제됩니다.")) {
      return;
    }

    try {
      await deleteAnime({ animeId: animeId as any });
      toast.success("애니메이션이 삭제되었습니다.");
    } catch (error) {
      toast.error("삭제에 실패했습니다.");
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">애니메이션 추가</h2>
        <form onSubmit={handleCreateAnime} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">제목</label>
            <input
              type="text"
              value={animeForm.title}
              onChange={(e) => setAnimeForm({ ...animeForm, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">설명</label>
            <textarea
              value={animeForm.description}
              onChange={(e) => setAnimeForm({ ...animeForm, description: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500 h-32"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">장르 (쉼표로 구분)</label>
            <input
              type="text"
              value={animeForm.genres}
              onChange={(e) => setAnimeForm({ ...animeForm, genres: e.target.value })}
              placeholder="액션, 판타지, 모험"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">개봉 연도</label>
              <input
                type="number"
                value={animeForm.releaseYear}
                onChange={(e) => setAnimeForm({ ...animeForm, releaseYear: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">상태</label>
              <select
                value={animeForm.status}
                onChange={(e) => setAnimeForm({ ...animeForm, status: e.target.value as "ongoing" | "completed" })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
              >
                <option value="ongoing">방영중</option>
                <option value="completed">완결</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">포스터 이미지 (세로형)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">썸네일 이미지 (가로형)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
          >
            {isSubmitting ? "추가 중..." : "애니메이션 추가"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">등록된 애니메이션</h2>
        {allAnime === undefined ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          </div>
        ) : allAnime.length === 0 ? (
          <p className="text-gray-400">등록된 애니메이션이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allAnime.map((anime) => (
              <div key={anime._id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex gap-4">
                  {anime.posterUrl && (
                    <img src={anime.posterUrl} alt={anime.title} className="w-20 h-28 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{anime.title}</h3>
                    <p className="text-sm text-gray-400">{anime.releaseYear}</p>
                    <p className="text-xs text-gray-500 mt-1">{anime.genres.join(", ")}</p>
                    <button
                      onClick={() => handleDeleteAnime(anime._id)}
                      className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
