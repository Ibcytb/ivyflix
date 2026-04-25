import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { AnimeManagement } from "./admin/AnimeManagement";
import { EpisodeManagement } from "./admin/EpisodeManagement";
import { SubtitleManagement } from "./admin/SubtitleManagement";
import { SkipManagement } from "./admin/SkipManagement";
import { LanguageManagement } from "./admin/LanguageManagement";

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"anime" | "episode" | "subtitle" | "skip" | "language">("anime");
  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const animeList = useQuery(api.anime.listAnime);

  if (!loggedInUser || loggedInUser.email !== "Ivyee0601") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-500 text-lg">관리자 권한이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로 가기
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-8">관리자 패널</h1>

      <div className="flex gap-4 mb-8 border-b border-gray-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab("anime")}
          className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap ${
            activeTab === "anime"
              ? "text-red-500 border-b-2 border-red-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          애니메이션 관리
        </button>
        <button
          onClick={() => setActiveTab("episode")}
          className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap ${
            activeTab === "episode"
              ? "text-red-500 border-b-2 border-red-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          에피소드 관리
        </button>
        <button
          onClick={() => setActiveTab("subtitle")}
          className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap ${
            activeTab === "subtitle"
              ? "text-red-500 border-b-2 border-red-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          자막 관리
        </button>
        <button
          onClick={() => setActiveTab("skip")}
          className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap ${
            activeTab === "skip"
              ? "text-red-500 border-b-2 border-red-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          건너뛰기 관리
        </button>
        <button
          onClick={() => setActiveTab("language")}
          className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap ${
            activeTab === "language"
              ? "text-red-500 border-b-2 border-red-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          언어 관리
        </button>
      </div>

      {activeTab === "anime" && <AnimeManagement />}
      
      {activeTab === "episode" && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-2">애니메이션 선택</label>
            <select
              value={selectedAnimeId || ""}
              onChange={(e) => setSelectedAnimeId(e.target.value as Id<"anime">)}
              className="w-full max-w-md px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
            >
              <option value="">애니메이션을 선택하세요</option>
              {animeList?.map((anime) => (
                <option key={anime._id} value={anime._id}>
                  {anime.title}
                </option>
              ))}
            </select>
          </div>
          {selectedAnimeId && <EpisodeManagement selectedAnimeId={selectedAnimeId} />}
        </div>
      )}
      
      {activeTab === "subtitle" && <SubtitleManagement />}
      {activeTab === "skip" && <SkipManagement />}
      {activeTab === "language" && <LanguageManagement />}
    </div>
  );
}
