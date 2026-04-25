import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";

export function SubtitleManagement() {
  const allAnime = useQuery(api.anime.listAnime);
  const generateUploadUrl = useMutation(api.anime.generateUploadUrl);
  const createSubtitle = useMutation(api.subtitles.createSubtitle);
  const deleteSubtitle = useMutation(api.subtitles.deleteSubtitle);

  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);
  const episodes = useQuery(
    api.episodes.listEpisodes,
    selectedAnimeId ? { animeId: selectedAnimeId } : "skip"
  );

  const [selectedEpisodeId, setSelectedEpisodeId] = useState<Id<"episodes"> | null>(null);
  const subtitles = useQuery(
    api.subtitles.listSubtitles,
    selectedEpisodeId ? { episodeId: selectedEpisodeId } : "skip"
  );

  const [subtitleForm, setSubtitleForm] = useState({
    language: "ko",
    label: "한국어",
    format: "smi" as "smi" | "srt" | "vtt" | "ass",
  });

  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSubtitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEpisodeId) {
      toast.error("에피소드를 선택해주세요.");
      return;
    }

    if (!subtitleFile) {
      toast.error("자막 파일을 업로드해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload subtitle file
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": subtitleFile.type || "text/plain" },
        body: subtitleFile,
      });
      const json = await result.json();

      await createSubtitle({
        episodeId: selectedEpisodeId,
        language: subtitleForm.language,
        label: subtitleForm.label,
        fileId: json.storageId,
        format: subtitleForm.format,
      });

      toast.success("자막이 추가되었습니다!");

      // Reset form
      setSubtitleFile(null);
    } catch (error) {
      toast.error("자막 추가에 실패했습니다.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubtitle = async (subtitleId: Id<"subtitles">) => {
    if (!confirm("정말로 이 자막을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteSubtitle({ subtitleId });
      toast.success("자막이 삭제되었습니다.");
    } catch (error) {
      toast.error("삭제에 실패했습니다.");
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">자막 추가</h2>

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
          <form onSubmit={handleCreateSubtitle} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">언어 코드</label>
                <input
                  type="text"
                  value={subtitleForm.language}
                  onChange={(e) => setSubtitleForm({ ...subtitleForm, language: e.target.value })}
                  placeholder="ko, en, ja"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">표시 이름</label>
                <input
                  type="text"
                  value={subtitleForm.label}
                  onChange={(e) => setSubtitleForm({ ...subtitleForm, label: e.target.value })}
                  placeholder="한국어, English"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">자막 형식</label>
              <select
                value={subtitleForm.format}
                onChange={(e) => setSubtitleForm({ ...subtitleForm, format: e.target.value as any })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
              >
                <option value="smi">SMI</option>
                <option value="srt">SRT</option>
                <option value="vtt">VTT</option>
                <option value="ass">ASS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">자막 파일</label>
              <input
                type="file"
                accept=".smi,.srt,.vtt,.ass"
                onChange={(e) => setSubtitleFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              {isSubmitting ? "추가 중..." : "자막 추가"}
            </button>
          </form>
        )}
      </div>

      {selectedEpisodeId && (
        <div>
          <h2 className="text-2xl font-bold mb-6">등록된 자막</h2>
          {subtitles === undefined ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : subtitles.length === 0 ? (
            <p className="text-gray-400">등록된 자막이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {subtitles.map((subtitle) => (
                <div key={subtitle._id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{subtitle.label}</h3>
                    <p className="text-sm text-gray-400">
                      {subtitle.language} • {subtitle.format.toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteSubtitle(subtitle._id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
