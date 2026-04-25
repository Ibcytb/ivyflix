import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../../convex/_generated/dataModel";

export function LanguageManagement() {
  const [activeTab, setActiveTab] = useState<"languages" | "translations">("languages");
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string | null>(null);
  
  const languages = useQuery(api.languages.listLanguages);
  const createLanguage = useMutation(api.languages.createLanguage);
  const updateLanguage = useMutation(api.languages.updateLanguage);
  const deleteLanguage = useMutation(api.languages.deleteLanguage);
  const getTranslations = useQuery(
    api.languages.getTranslations,
    selectedLanguageCode ? { languageCode: selectedLanguageCode } : "skip"
  );
  const setTranslation = useMutation(api.languages.setTranslation);
  const deleteTranslation = useMutation(api.languages.deleteTranslation);
  const bulkSetTranslations = useMutation(api.languages.bulkSetTranslations);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<Id<"languages"> | null>(null);

  const [languageForm, setLanguageForm] = useState({
    code: "",
    name: "",
    nativeName: "",
    flag: "",
    isActive: true,
  });

  const [translationForm, setTranslationForm] = useState({
    key: "",
    value: "",
  });

  const [bulkTranslations, setBulkTranslations] = useState("");

  const handleCreateLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLanguage(languageForm);
      toast.success("언어가 추가되었습니다");
      setLanguageForm({ code: "", name: "", nativeName: "", flag: "", isActive: true });
      setIsCreating(false);
    } catch (error: any) {
      toast.error(error.message || "언어 추가에 실패했습니다");
    }
  };

  const handleUpdateLanguage = async (languageId: Id<"languages">) => {
    try {
      await updateLanguage({ languageId, ...languageForm });
      toast.success("언어가 수정되었습니다");
      setEditingId(null);
      setLanguageForm({ code: "", name: "", nativeName: "", flag: "", isActive: true });
    } catch (error: any) {
      toast.error(error.message || "언어 수정에 실패했습니다");
    }
  };

  const handleDeleteLanguage = async (languageId: Id<"languages">) => {
    if (!confirm("이 언어와 모든 번역을 삭제하시겠습니까?")) return;
    try {
      await deleteLanguage({ languageId });
      toast.success("언어가 삭제되었습니다");
    } catch (error: any) {
      toast.error(error.message || "언어 삭제에 실패했습니다");
    }
  };

  const handleToggleActive = async (languageId: Id<"languages">, currentActive: boolean) => {
    try {
      await updateLanguage({ languageId, isActive: !currentActive });
      toast.success(currentActive ? "언어가 비활성화되었습니다" : "언어가 활성화되었습니다");
    } catch (error: any) {
      toast.error(error.message || "상태 변경에 실패했습니다");
    }
  };

  const startEdit = (language: any) => {
    setEditingId(language._id);
    setLanguageForm({
      code: language.code,
      name: language.name,
      nativeName: language.nativeName,
      flag: language.flag,
      isActive: language.isActive,
    });
  };

  const handleAddTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLanguageCode) return;

    try {
      await setTranslation({
        languageCode: selectedLanguageCode,
        key: translationForm.key,
        value: translationForm.value,
      });
      toast.success("번역이 추가되었습니다");
      setTranslationForm({ key: "", value: "" });
    } catch (error: any) {
      toast.error(error.message || "번역 추가에 실패했습니다");
    }
  };

  const handleDeleteTranslation = async (translationId: Id<"translations">) => {
    if (!confirm("이 번역을 삭제하시겠습니까?")) return;
    try {
      await deleteTranslation({ translationId });
      toast.success("번역이 삭제되었습니다");
    } catch (error: any) {
      toast.error(error.message || "번역 삭제에 실패했습니다");
    }
  };

  const handleBulkImport = async () => {
    if (!selectedLanguageCode) return;

    try {
      const lines = bulkTranslations.split("\n").filter((line) => line.trim());
      const translations = lines.map((line) => {
        const [key, ...valueParts] = line.split("=");
        return {
          key: key.trim(),
          value: valueParts.join("=").trim(),
        };
      });

      await bulkSetTranslations({
        languageCode: selectedLanguageCode,
        translations,
      });

      toast.success(`${translations.length}개의 번역이 추가되었습니다`);
      setBulkTranslations("");
    } catch (error: any) {
      toast.error(error.message || "일괄 추가에 실패했습니다");
    }
  };

  const handleSeedDefaults = async () => {
    const defaults = [
      { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷", isActive: true },
      { code: "en", name: "English", nativeName: "English", flag: "🇺🇸", isActive: true },
      { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", isActive: true },
    ];

    try {
      let added = 0;
      for (const lang of defaults) {
        try {
          await createLanguage(lang);
          added++;
        } catch (e: any) {
          if (!e.message.includes("already exists")) throw e;
        }
      }
      toast.success(`${added}개의 기본 언어가 추가되었습니다`);
    } catch (error: any) {
      toast.error(error.message || "기본 언어 추가에 실패했습니다");
    }
  };

  if (!languages) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-gray-700 pb-4">
        <button
          onClick={() => setActiveTab("languages")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "languages"
              ? "text-red-500 border-b-2 border-red-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          언어 관리
        </button>
        <button
          onClick={() => setActiveTab("translations")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "translations"
              ? "text-red-500 border-b-2 border-red-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          번역 관리
        </button>
      </div>

      {activeTab === "languages" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">언어 목록</h2>
            <div className="flex gap-2">
              {languages.length === 0 && (
                <button
                  onClick={handleSeedDefaults}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  기본 언어 추가
                </button>
              )}
              <button
                onClick={() => setIsCreating(!isCreating)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                {isCreating ? "취소" : "언어 추가"}
              </button>
            </div>
          </div>

          {isCreating && (
            <form onSubmit={handleCreateLanguage} className="bg-gray-800 p-6 rounded-lg space-y-4">
              <h3 className="text-xl font-semibold mb-4">새 언어 추가</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">언어 코드 (예: ko, en, ja)</label>
                  <input
                    type="text"
                    value={languageForm.code}
                    onChange={(e) => setLanguageForm({ ...languageForm, code: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">언어 이름 (예: Korean)</label>
                  <input
                    type="text"
                    value={languageForm.name}
                    onChange={(e) => setLanguageForm({ ...languageForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">원어 이름 (예: 한국어)</label>
                  <input
                    type="text"
                    value={languageForm.nativeName}
                    onChange={(e) => setLanguageForm({ ...languageForm, nativeName: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">국기 이모지 (예: 🇰🇷)</label>
                  <input
                    type="text"
                    value={languageForm.flag}
                    onChange={(e) => setLanguageForm({ ...languageForm, flag: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={languageForm.isActive}
                  onChange={(e) => setLanguageForm({ ...languageForm, isActive: e.target.checked })}
                  className="w-4 h-4 accent-red-600"
                />
                <label className="text-sm">활성화</label>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                추가
              </button>
            </form>
          )}

          <div className="space-y-4">
            {languages.map((language) => (
              <div key={language._id} className="bg-gray-800 p-6 rounded-lg">
                {editingId === language._id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdateLanguage(language._id);
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-2">언어 코드</label>
                        <input
                          type="text"
                          value={languageForm.code}
                          onChange={(e) => setLanguageForm({ ...languageForm, code: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-2">언어 이름</label>
                        <input
                          type="text"
                          value={languageForm.name}
                          onChange={(e) => setLanguageForm({ ...languageForm, name: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-2">원어 이름</label>
                        <input
                          type="text"
                          value={languageForm.nativeName}
                          onChange={(e) => setLanguageForm({ ...languageForm, nativeName: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-2">국기 이모지</label>
                        <input
                          type="text"
                          value={languageForm.flag}
                          onChange={(e) => setLanguageForm({ ...languageForm, flag: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setLanguageForm({ code: "", name: "", nativeName: "", flag: "", isActive: true });
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{language.flag}</span>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {language.nativeName} ({language.name})
                        </h3>
                        <p className="text-sm text-gray-400">코드: {language.code}</p>
                        <p className="text-sm">
                          상태:{" "}
                          <span className={language.isActive ? "text-green-400" : "text-red-400"}>
                            {language.isActive ? "활성" : "비활성"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleActive(language._id, language.isActive)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          language.isActive
                            ? "bg-yellow-600 hover:bg-yellow-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {language.isActive ? "비활성화" : "활성화"}
                      </button>
                      <button
                        onClick={() => startEdit(language)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteLanguage(language._id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "translations" && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-2">언어 선택</label>
            <select
              value={selectedLanguageCode || ""}
              onChange={(e) => setSelectedLanguageCode(e.target.value || null)}
              className="w-full max-w-md px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500"
            >
              <option value="">언어를 선택하세요</option>
              {languages.map((lang) => (
                <option key={lang._id} value={lang.code}>
                  {lang.flag} {lang.nativeName} ({lang.code})
                </option>
              ))}
            </select>
          </div>

          {selectedLanguageCode && (
            <>
              <form onSubmit={handleAddTranslation} className="bg-gray-800 p-6 rounded-lg space-y-4">
                <h3 className="text-xl font-semibold">번역 추가</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">키 (예: home.title)</label>
                    <input
                      type="text"
                      value={translationForm.key}
                      onChange={(e) => setTranslationForm({ ...translationForm, key: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">번역 텍스트</label>
                    <input
                      type="text"
                      value={translationForm.value}
                      onChange={(e) => setTranslationForm({ ...translationForm, value: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  추가
                </button>
              </form>

              <div className="bg-gray-800 p-6 rounded-lg space-y-4">
                <h3 className="text-xl font-semibold">일괄 추가</h3>
                <p className="text-sm text-gray-400">
                  한 줄에 하나씩 "키=값" 형식으로 입력하세요. 예: home.title=홈
                </p>
                <textarea
                  value={bulkTranslations}
                  onChange={(e) => setBulkTranslations(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500 font-mono text-sm"
                  rows={10}
                  placeholder="home.title=홈&#10;home.search=검색&#10;settings.theme=테마"
                />
                <button
                  onClick={handleBulkImport}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  일괄 추가
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold">번역 목록</h3>
                {getTranslations && getTranslations.length === 0 && (
                  <p className="text-gray-400">번역이 없습니다.</p>
                )}
                {getTranslations?.map((translation) => (
                  <div key={translation._id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-mono text-sm text-gray-400">{translation.key}</p>
                      <p className="text-lg">{translation.value}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteTranslation(translation._id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
