import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useRef } from "react";
import { toast } from "sonner";

interface EpisodeManagementProps {
  selectedAnimeId: Id<"anime"> | null;
}

export function EpisodeManagement({ selectedAnimeId }: EpisodeManagementProps) {
  const episodes = useQuery(
    api.episodes.listEpisodes,
    selectedAnimeId ? { animeId: selectedAnimeId } : "skip"
  );
  const createEpisode = useMutation(api.episodes.createEpisode);
  const updateEpisode = useMutation(api.episodes.updateEpisode);
  const deleteEpisode = useMutation(api.episodes.deleteEpisode);
  const generateUploadUrl = useMutation(api.episodes.generateUploadUrl);
  const saveHlsFile = useMutation(api.episodes.saveHlsFile);
  const deleteHlsFiles = useMutation(api.episodes.deleteHlsFiles);

  const [isCreating, setIsCreating] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Id<"episodes"> | null>(null);
  const [formData, setFormData] = useState({
    episodeNumber: "",
    title: "",
    description: "",
    duration: "",
    openingStart: "",
    openingEnd: "",
    endingStart: "",
    endingEnd: "",
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [hlsZipFile, setHlsZipFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copyFromPrevious, setCopyFromPrevious] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hlsInputRef = useRef<HTMLInputElement>(null);

  // Convert seconds to MM:SS format
  const secondsToMMSS = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Convert MM:SS format to seconds
  const mmssToSeconds = (mmss: string): number => {
    if (!mmss) return 0;
    const parts = mmss.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return minutes * 60 + seconds;
  };

  const resetForm = () => {
    setFormData({
      episodeNumber: "",
      title: "",
      description: "",
      duration: "",
      openingStart: "",
      openingEnd: "",
      endingStart: "",
      endingEnd: "",
    });
    setThumbnailFile(null);
    setHlsZipFile(null);
    setCopyFromPrevious(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingEpisode(null);
    resetForm();
  };

  const handleEdit = (episode: any) => {
    setEditingEpisode(episode._id);
    setIsCreating(false);
    setFormData({
      episodeNumber: episode.episodeNumber.toString(),
      title: episode.title,
      description: episode.description || "",
      duration: secondsToMMSS(episode.duration || 0),
      openingStart: episode.openingStart ? secondsToMMSS(episode.openingStart) : "",
      openingEnd: episode.openingEnd ? secondsToMMSS(episode.openingEnd) : "",
      endingStart: episode.endingStart ? secondsToMMSS(episode.endingStart) : "",
      endingEnd: episode.endingEnd ? secondsToMMSS(episode.endingEnd) : "",
    });
    setThumbnailFile(null);
    setHlsZipFile(null);
    setCopyFromPrevious(false);
  };

  const handleCopyFromPrevious = () => {
    if (!episodes || episodes.length === 0) return;
    
    const currentEpisodeNum = parseInt(formData.episodeNumber);
    if (!currentEpisodeNum || currentEpisodeNum <= 1) return;
    
    const previousEpisode = episodes.find(ep => ep.episodeNumber === currentEpisodeNum - 1);
    if (!previousEpisode) return;
    
    setFormData(prev => ({
      ...prev,
      duration: secondsToMMSS(previousEpisode.duration || 0),
      openingStart: previousEpisode.openingStart ? secondsToMMSS(previousEpisode.openingStart) : "",
      openingEnd: previousEpisode.openingEnd ? secondsToMMSS(previousEpisode.openingEnd) : "",
      endingStart: previousEpisode.endingStart ? secondsToMMSS(previousEpisode.endingStart) : "",
      endingEnd: previousEpisode.endingEnd ? secondsToMMSS(previousEpisode.endingEnd) : "",
    }));
    
    toast.success("이전 화 정보를 복사했습니다");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimeId) return;

    setIsUploading(true);
    try {
      let thumbnailId: Id<"_storage"> | undefined;
      
      if (thumbnailFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          body: thumbnailFile,
        });
        const { storageId } = await result.json();
        thumbnailId = storageId;
      }

      const episodeData = {
        animeId: selectedAnimeId,
        episodeNumber: parseInt(formData.episodeNumber),
        title: formData.title,
        description: formData.description || undefined,
        thumbnail: thumbnailId,
        duration: mmssToSeconds(formData.duration),
        openingStart: formData.openingStart ? mmssToSeconds(formData.openingStart) : undefined,
        openingEnd: formData.openingEnd ? mmssToSeconds(formData.openingEnd) : undefined,
        endingStart: formData.endingStart ? mmssToSeconds(formData.endingStart) : undefined,
        endingEnd: formData.endingEnd ? mmssToSeconds(formData.endingEnd) : undefined,
      };

      if (isCreating) {
        const episodeId = await createEpisode(episodeData);
        
        if (hlsZipFile) {
          await uploadHlsZip(episodeId, hlsZipFile);
        }
        
        toast.success("에피소드가 생성되었습니다");
      } else if (editingEpisode) {
        await updateEpisode({
          episodeId: editingEpisode,
          ...episodeData,
        });
        
        if (hlsZipFile) {
          await deleteHlsFiles({ episodeId: editingEpisode });
          await uploadHlsZip(editingEpisode, hlsZipFile);
        }
        
        toast.success("에피소드가 수정되었습니다");
      }

      setIsCreating(false);
      setEditingEpisode(null);
      resetForm();
    } catch (error) {
      console.error("Error saving episode:", error);
      toast.error("에피소드 저장에 실패했습니다");
    } finally {
      setIsUploading(false);
    }
  };

  const uploadHlsZip = async (episodeId: Id<"episodes">, zipFile: File) => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipFile);
    
    for (const [filename, file] of Object.entries(zipContent.files)) {
      if (file.dir) continue;
      
      const content = await file.async('blob');
      const uploadUrl = await generateUploadUrl();
      
      const result = await fetch(uploadUrl, {
        method: "POST",
        body: content,
      });
      
      const { storageId } = await result.json();
      
      await saveHlsFile({
        episodeId,
        filename,
        storageId,
        isPlaylist: filename.endsWith('.m3u8'),
      });
    }
  };

  const handleDelete = async (episodeId: Id<"episodes">) => {
    if (!confirm("정말로 이 에피소드를 삭제하시겠습니까?")) return;
    
    try {
      await deleteEpisode({ episodeId });
      toast.success("에피소드가 삭제되었습니다");
    } catch (error) {
      console.error("Error deleting episode:", error);
      toast.error("에피소드 삭제에 실패했습니다");
    }
  };

  if (!selectedAnimeId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">애니메이션을 먼저 선택해주세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">에피소드 관리</h3>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
        >
          새 에피소드 추가
        </button>
      </div>

      {(isCreating || editingEpisode) && (
        <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg space-y-4">
          <h4 className="text-lg font-semibold">
            {isCreating ? "새 에피소드 추가" : "에피소드 수정"}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">에피소드 번호</label>
              <input
                type="number"
                value={formData.episodeNumber}
                onChange={(e) => setFormData({ ...formData, episodeNumber: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">제목</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
              rows={3}
            />
          </div>

          {isCreating && parseInt(formData.episodeNumber) > 1 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="copyFromPrevious"
                checked={copyFromPrevious}
                onChange={(e) => setCopyFromPrevious(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <label htmlFor="copyFromPrevious" className="text-sm">
                이전 화와 같은 재생시간/오프닝/엔딩 사용
              </label>
              {copyFromPrevious && (
                <button
                  type="button"
                  onClick={handleCopyFromPrevious}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                >
                  복사
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">재생시간 (분:초)</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="25:30"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">오프닝 시작 (분:초)</label>
              <input
                type="text"
                value={formData.openingStart}
                onChange={(e) => setFormData({ ...formData, openingStart: e.target.value })}
                placeholder="1:30"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">오프닝 끝 (분:초)</label>
              <input
                type="text"
                value={formData.openingEnd}
                onChange={(e) => setFormData({ ...formData, openingEnd: e.target.value })}
                placeholder="3:00"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">엔딩 시작 (분:초)</label>
              <input
                type="text"
                value={formData.endingStart}
                onChange={(e) => setFormData({ ...formData, endingStart: e.target.value })}
                placeholder="22:00"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">엔딩 끝 (분:초)</label>
              <input
                type="text"
                value={formData.endingEnd}
                onChange={(e) => setFormData({ ...formData, endingEnd: e.target.value })}
                placeholder="23:30"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">썸네일</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">HLS 파일 (ZIP)</label>
              <input
                ref={hlsInputRef}
                type="file"
                accept=".zip"
                onChange={(e) => setHlsZipFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isUploading}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              {isUploading ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingEpisode(null);
                resetForm();
              }}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {episodes?.map((episode) => (
          <div key={episode._id} className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold">
                  {episode.episodeNumber}화 - {episode.title}
                </h4>
                {episode.description && (
                  <p className="text-gray-400 text-sm mt-1">{episode.description}</p>
                )}
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <div>재생시간: {secondsToMMSS(episode.duration || 0)}</div>
                  {episode.openingStart !== undefined && episode.openingEnd !== undefined && (
                    <div>오프닝: {secondsToMMSS(episode.openingStart)} - {secondsToMMSS(episode.openingEnd)}</div>
                  )}
                  {episode.endingStart !== undefined && episode.endingEnd !== undefined && (
                    <div>엔딩: {secondsToMMSS(episode.endingStart)} - {secondsToMMSS(episode.endingEnd)}</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(episode)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(episode._id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
