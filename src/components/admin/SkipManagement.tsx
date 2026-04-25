import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";

export function SkipManagement() {
  const allAnime = useQuery(api.anime.listAnime);
  const createEcchiSkip = useMutation(api.ecchiSkips.createEcchiSkip);
  const updateEcchiSkip = useMutation(api.ecchiSkips.updateEcchiSkip);
  const deleteEcchiSkip = useMutation(api.ecchiSkips.deleteEcchiSkip);

  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);
  const episodes = useQuery(
    api.episodes.listEpisodes,
    selectedAnimeId ? { animeId: selectedAnimeId } : "skip"
  );

  const [selectedEpisodeId, setSelectedEpisodeId] = useState<Id<"episodes"> | null>(null);
  const ecchiSkips = useQuery(
    api.ecchiSkips.listEcchiSkips,
    selectedEpisodeId ? { episodeId: selectedEpisodeId } : "skip"
  );

  const [skipForm, setSkipForm] = useState({
    startTime: 0,
    endTime: 0,
    summary: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSkip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEpisodeId) {
      toast.error("에피소드를 선택해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createEcchiSkip({
        episodeId: selectedEpisodeId,
        startTime: skipForm.startTime,
        endTime: skipForm.endTime,
        summary: skipForm.summary,
      });

      toast.success("엣찌 건너뛰기가 추가되었습니다!");

      // Reset form
      setSkipForm({
        startTime: 0,
        endTime: 0,
        summary: "",
      });
    } catch (error) {
      toast.error("추가에 실패했습니다.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSkip = async (skipId: Id<"ecchiSkips">) => {
    if (!confirm("정말로 이 건너뛰기를 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteEcchiSkip({ skipId });
      toast.success("건너뛰기가 삭제되었습니다.");
    } catch (error) {
      toast.error("삭제에 실패했습니다.");
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">엣찌 건너뛰기 추가</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">애니메이션 선택</label>
            <select
              value={selectedAnimeId || ""}
              onChange={(e) => {
                setSelectedAnimeId(e.target.value as Id<"anime"> || null);
                setSelectedEpisodeId(null);
              }}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
            >
              <option value="">애니메이션을 선택하세요</option>
              {allAnime?.map((anime) => (
                <option key={anime._id} value={anime._id}>
                  {anime.title}
                </option>
              ))}
            </select>
          </div>

          {selectedAnimeId && (
            <div>
              <label className="block text-sm font-medium mb-2">에피소드 선택</label>
              <select
                value={selectedEpisodeId || ""}
                onChange={(e) => setSelectedEpisodeId(e.target.value as Id<"episodes"> || null)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
              >
                <option value="">에피소드를 선택하세요</option>
                {episodes?.map((episode) => (
                  <option key={episode._id} value={episode._id}>
                    에피소드 {episode.episodeNumber}: {episode.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedEpisodeId && (
          <form onSubmit={handleCreateSkip} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">시작 시간 (초)</label>
                <input
                  type="number"
                  value={skipForm.startTime}
                  onChange={(e) => setSkipForm({ ...skipForm, startTime: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">종료 시간 (초)</label>
                <input
                  type="number"
                  value={skipForm.endTime}
                  onChange={(e) => setSkipForm({ ...skipForm, endTime: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">줄거리 요약</label>
              <textarea
                value={skipForm.summary}
                onChange={(e) => setSkipForm({ ...skipForm, summary: e.target.value })}
                placeholder="건너뛴 부분의 줄거리를 입력하세요..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500 h-24"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              {isSubmitting ? "추가 중..." : "건너뛰기 추가"}
            </button>
          </form>
        )}
      </div>

      {selectedEpisodeId && (
        <div>
          <h2 className="text-2xl font-bold mb-6">등록된 건너뛰기</h2>
          {ecchiSkips === undefined ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : ecchiSkips.length === 0 ? (
            <p className="text-gray-400">등록된 건너뛰기가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {ecchiSkips.map((skip) => (
                <div key={skip._id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">
                        {Math.floor(skip.startTime / 60)}:{String(Math.floor(skip.startTime % 60)).padStart(2, "0")} -{" "}
                        {Math.floor(skip.endTime / 60)}:{String(Math.floor(skip.endTime % 60)).padStart(2, "0")}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">{skip.summary}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteSkip(skip._id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
