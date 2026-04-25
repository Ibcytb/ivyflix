import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface SettingsPageProps {
  onBack: () => void;
}

const AVAILABLE_GENRES = [
  "액션", "모험", "코미디", "드라마", "판타지", "공포", "미스터리", 
  "로맨스", "SF", "스릴러", "슬라이스 오브 라이프", "스포츠", "초자연"
];

export function SettingsPage({ onBack }: SettingsPageProps) {
  const preferences = useQuery(api.userPreferences.getPreferences);
  const user = useQuery(api.auth.loggedInUser);
  const updatePreferences = useMutation(api.userPreferences.updatePreferences);
  const generateProfileImageUploadUrl = useMutation(api.userPreferences.generateProfileImageUploadUrl);
  const deleteAccount = useMutation(api.userPreferences.deleteAccount);
  const profileImageUrl = useQuery(
    api.userPreferences.getProfileImageUrl,
    (preferences as any)?.profileImage ? { storageId: (preferences as any).profileImage } : "skip"
  );
  const activeLanguages = useQuery(api.languages.listActiveLanguages);
  
  const [activeTab, setActiveTab] = useState<"appearance" | "content" | "language" | "profile" | "privacy">("appearance");
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Apply UI scale
  const uiScale = preferences?.uiScale || 1.0;
  
  if (!preferences || !user) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다');
      return;
    }
    
    setIsUploadingProfile(true);
    try {
      const url = await generateProfileImageUploadUrl();
      const res = await fetch(url, { method: "POST", body: file });
      const json = await res.json();
      await updatePreferences({ profileImage: json.storageId });
      toast.success('프로필 사진이 변경되었습니다');
    } catch {
      toast.error('프로필 사진 업로드에 실패했습니다');
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      toast.success('계정이 삭제되었습니다');
      window.location.reload();
    } catch {
      toast.error('계정 삭제에 실패했습니다');
    }
  };

  const toggleGenre = (genre: string, list: "hidden" | "favorite") => {
    if (list === "hidden") {
      const current = preferences.hiddenGenres || [];
      const updated = current.includes(genre)
        ? current.filter(g => g !== genre)
        : [...current, genre];
      updatePreferences({ hiddenGenres: updated });
      toast.success(current.includes(genre) ? `${genre} 장르 표시` : `${genre} 장르 숨김`);
    } else {
      const current = preferences.favoriteGenres || [];
      const updated = current.includes(genre)
        ? current.filter(g => g !== genre)
        : [...current, genre];
      updatePreferences({ favoriteGenres: updated });
    }
  };

  return (
    <div 
      className={`min-h-screen text-white ${preferences.theme === 'light' ? 'bg-gray-100' : 'bg-gray-900'}`}
      style={{ fontSize: `${uiScale}rem` }}
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold">설정</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: "appearance", label: "🎨 외관", icon: "🎨" },
            { id: "content", label: "📺 콘텐츠", icon: "📺" },
            { id: "language", label: "🌐 언어", icon: "🌐" },
            { id: "profile", label: "👤 프로필", icon: "👤" },
            { id: "privacy", label: "🔒 프라이버시", icon: "🔒" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={`rounded-lg p-6 space-y-6 ${preferences.theme === 'light' ? 'bg-white text-gray-900' : 'bg-gray-800 text-white'}`}>
          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">테마</label>
                <select
                  value={preferences.theme || "dark"}
                  onChange={(e) => updatePreferences({ theme: e.target.value as any })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500 ${
                    preferences.theme === 'light' 
                      ? 'bg-gray-100 border-gray-300 text-gray-900' 
                      : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                >
                  <option value="dark">다크 모드</option>
                  <option value="light">라이트 모드</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">UI 크기 배율</label>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.1"
                  value={preferences.uiScale || 1.0}
                  onChange={(e) => updatePreferences({ uiScale: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>작게 (80%)</span>
                  <span>{Math.round((preferences.uiScale || 1.0) * 100)}%</span>
                  <span>크게 (150%)</span>
                </div>
              </div>
            </>
          )}

          {/* Content Tab */}
          {activeTab === "content" && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-4">📺 콘텐츠 표시 설정</h3>
                <p className="text-sm text-gray-400 mb-4">
                  홈 화면에 표시될 콘텐츠를 필터링합니다.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.showAdultContent ?? true}
                    onChange={(e) => {
                      updatePreferences({ showAdultContent: e.target.checked });
                      toast.success(e.target.checked ? '성인 콘텐츠 표시' : '성인 콘텐츠 숨김');
                    }}
                    className="w-4 h-4 accent-red-600"
                  />
                  <span className="text-sm">성인 콘텐츠 표시</span>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-6">
                  만 18세 이상 콘텐츠를 목록에 표시합니다
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">콘텐츠 상태 필터</label>
                <select
                  value={preferences.contentFilter || "all"}
                  onChange={(e) => {
                    updatePreferences({ contentFilter: e.target.value as any });
                    const labels = { all: '전체', ongoing: '진행 중', completed: '완결' };
                    toast.success(`${labels[e.target.value as keyof typeof labels]} 콘텐츠만 표시`);
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500 ${
                    preferences.theme === 'light' 
                      ? 'bg-gray-100 border-gray-300 text-gray-900' 
                      : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                >
                  <option value="all">전체 (진행 중 + 완결)</option>
                  <option value="ongoing">진행 중만 표시</option>
                  <option value="completed">완결만 표시</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  현재 설정: <strong>{preferences.contentFilter === 'ongoing' ? '진행 중' : preferences.contentFilter === 'completed' ? '완결' : '전체'}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">숨길 장르 선택</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_GENRES.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre, "hidden")}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        (preferences.hiddenGenres || []).includes(genre)
                          ? "bg-red-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  선택한 장르의 콘텐츠는 목록에서 숨겨집니다 (현재 {(preferences.hiddenGenres || []).length}개 숨김)
                </p>
              </div>

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <h4 className="font-medium mb-2">💡 필터링 작동 확인</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• 콘텐츠 상태: <strong>{preferences.contentFilter === 'ongoing' ? '진행 중만' : preferences.contentFilter === 'completed' ? '완결만' : '전체'}</strong></li>
                  <li>• 숨긴 장르: <strong>{(preferences.hiddenGenres || []).length > 0 ? (preferences.hiddenGenres || []).join(', ') : '없음'}</strong></li>
                  <li>• 홈 화면으로 돌아가면 필터가 즉시 적용됩니다</li>
                </ul>
              </div>
            </>
          )}

          {/* Language Tab */}
          {activeTab === "language" && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-4">🌐 언어 설정</h3>
                <p className="text-sm text-gray-400 mb-4">
                  인터페이스와 자막의 기본 언어를 설정합니다.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">인터페이스 언어</label>
                <select
                  value={preferences.interfaceLanguage || "ko"}
                  onChange={(e) => {
                    updatePreferences({ interfaceLanguage: e.target.value });
                    toast.success('언어 설정이 저장되었습니다');
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500 ${
                    preferences.theme === 'light' 
                      ? 'bg-gray-100 border-gray-300 text-gray-900' 
                      : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                >
                  {activeLanguages && activeLanguages.length > 0 ? (
                    activeLanguages.map((lang) => (
                      <option key={lang._id} value={lang.code}>
                        {lang.flag} {lang.nativeName} ({lang.name})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="ko">🇰🇷 한국어 (Korean)</option>
                      <option value="en">🇺🇸 English</option>
                      <option value="ja">🇯🇵 日本語 (Japanese)</option>
                    </>
                  )}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  앱의 메뉴, 버튼 등 모든 인터페이스 언어를 변경합니다.
                  {(!activeLanguages || activeLanguages.length === 0) && " (관리자가 언어를 추가할 수 있습니다)"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">기본 자막 언어</label>
                <select
                  value={preferences.defaultSubtitleLanguage || "ko"}
                  onChange={(e) => {
                    updatePreferences({ defaultSubtitleLanguage: e.target.value });
                    toast.success('자막 언어 설정이 저장되었습니다');
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500 ${
                    preferences.theme === 'light' 
                      ? 'bg-gray-100 border-gray-300 text-gray-900' 
                      : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                >
                  {activeLanguages && activeLanguages.length > 0 ? (
                    activeLanguages.map((lang) => (
                      <option key={lang._id} value={lang.code}>
                        {lang.flag} {lang.nativeName}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="ko">🇰🇷 한국어</option>
                      <option value="en">🇺🇸 English</option>
                      <option value="ja">🇯🇵 日本語</option>
                      <option value="zh">🇨🇳 中文</option>
                    </>
                  )}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  영상 재생 시 자동으로 선택될 자막 언어입니다.
                </p>
              </div>

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <h4 className="font-medium mb-2">💡 참고사항</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• 관리자가 언어 관리 패널에서 언어를 추가할 수 있습니다</li>
                  <li>• 자막은 영상마다 제공되는 언어가 다를 수 있습니다</li>
                  <li>• 플레이어에서 언제든지 자막 언어를 변경할 수 있습니다</li>
                </ul>
              </div>
            </>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">프로필 사진</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    {profileImageUrl ? (
                      <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    disabled={isUploadingProfile}
                    className="text-sm text-gray-400 file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer"
                  />
                </div>
                {isUploadingProfile && <p className="text-xs text-blue-400 mt-2">업로드 중...</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">닉네임</label>
                <input
                  type="text"
                  value={(preferences as any).nickname || user.name || ""}
                  onChange={(e) => updatePreferences({ nickname: e.target.value })}
                  placeholder="닉네임을 입력하세요"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500 ${
                    preferences.theme === 'light' 
                      ? 'bg-gray-100 border-gray-300 text-gray-900' 
                      : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">생년월일</label>
                <input
                  type="number"
                  value={(preferences as any).birthYear || ""}
                  onChange={(e) => updatePreferences({ birthYear: Number(e.target.value) })}
                  placeholder="예: 2000"
                  min={1900}
                  max={new Date().getFullYear()}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-red-500 ${
                    preferences.theme === 'light' 
                      ? 'bg-gray-100 border-gray-300 text-gray-900' 
                      : 'bg-gray-700 border-gray-600 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">선호 장르</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_GENRES.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre, "favorite")}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        (preferences.favoriteGenres || []).includes(genre)
                          ? "bg-red-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Privacy Tab */}
          {activeTab === "privacy" && (
            <>
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 text-red-400">계정 삭제</h3>
                <p className="text-sm text-gray-300 mb-4">
                  계정을 삭제하면 모든 데이터(시청 기록, 즐겨찾기, 설정)가 영구적으로 삭제됩니다. 
                  이 작업은 되돌릴 수 없습니다.
                </p>
                
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    계정 삭제
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-red-300">
                      정말로 계정을 삭제하시겠습니까?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      >
                        예, 삭제합니다
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">계정 정보</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">이메일</span>
                    <span>{user.email || "없음"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">가입일</span>
                    <span>{new Date(user._creationTime).toLocaleDateString("ko-KR")}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
