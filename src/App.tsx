import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { useState, useEffect } from "react";
import { AnimeList } from "./components/AnimeList";
import { AnimeDetail } from "./components/AnimeDetail";
import { VideoPlayer } from "./components/VideoPlayer";
import { AdminPanel } from "./components/AdminPanel";
import { AgeVerificationModal } from "./components/AgeVerificationModal";
import { SettingsPage } from "./components/SettingsPage";
import { Id } from "../convex/_generated/dataModel";

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "detail" | "player" | "admin" | "settings">("home");
  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<Id<"episodes"> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const preferences = useQuery(api.userPreferences.getPreferences);
  const allAnime = useQuery(api.anime.listAnime);
  const allEpisodes = useQuery(api.episodes.listAllEpisodes);
  const checkAndUpdateAge = useMutation(api.userPreferences.checkAndUpdateAge);
  const isAdmin = loggedInUser?.email === "Ivyee0601";
  const showAgeVerification = loggedInUser && preferences && !preferences.ageVerified;

  // Check and update age on mount
  useEffect(() => {
    if (loggedInUser && preferences) {
      checkAndUpdateAge().catch(console.error);
    }
  }, [loggedInUser, preferences]);

  // URL routing - parse URL on mount
  useEffect(() => {
    if (!allAnime || !allEpisodes || !isInitialLoad) return;
    
    const path = window.location.pathname;
    if (path === '/' || path === '') {
      setIsInitialLoad(false);
      return;
    }

    const parts = path.split('/').filter(p => p);
    if (parts.length === 0) {
      setIsInitialLoad(false);
      return;
    }

    // Decode anime title from URL
    const animeTitle = decodeURIComponent(parts[0]);
    const anime = allAnime.find(a => a.title === animeTitle);
    
    if (!anime) {
      console.log('Anime not found:', animeTitle);
      setIsInitialLoad(false);
      return;
    }

    setSelectedAnimeId(anime._id);

    // Check if there's an episode part (e.g., "ep1")
    if (parts.length > 1 && parts[1].startsWith('ep')) {
      const episodeNum = parseInt(parts[1].substring(2));
      const episode = allEpisodes.find(
        e => e.animeId === anime._id && e.episodeNumber === episodeNum
      );
      
      if (episode) {
        setSelectedEpisodeId(episode._id);
        setCurrentView('player');
      } else {
        setCurrentView('detail');
      }
    } else {
      setCurrentView('detail');
    }
    
    setIsInitialLoad(false);
  }, [allAnime, allEpisodes, isInitialLoad]);

  // Update URL when navigation changes (but not on initial load)
  useEffect(() => {
    if (!allAnime || !allEpisodes || isInitialLoad) return;

    if (currentView === 'home') {
      window.history.pushState({}, '', '/');
    } else if (currentView === 'detail' && selectedAnimeId) {
      const anime = allAnime.find(a => a._id === selectedAnimeId);
      if (anime) {
        window.history.pushState({}, '', `/${encodeURIComponent(anime.title)}`);
      }
    } else if (currentView === 'player' && selectedAnimeId && selectedEpisodeId) {
      const anime = allAnime.find(a => a._id === selectedAnimeId);
      const episode = allEpisodes.find(e => e._id === selectedEpisodeId);
      if (anime && episode) {
        window.history.pushState(
          {}, 
          '', 
          `/${encodeURIComponent(anime.title)}/ep${episode.episodeNumber}`
        );
      }
    }
  }, [currentView, selectedAnimeId, selectedEpisodeId, allAnime, allEpisodes, isInitialLoad]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setIsInitialLoad(true);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleAnimeClick = (animeId: Id<"anime">) => {
    setSelectedAnimeId(animeId);
    setCurrentView("detail");
  };

  const handleEpisodeClick = (episodeId: Id<"episodes">) => {
    setSelectedEpisodeId(episodeId);
    setCurrentView("player");
  };

  const handleNextEpisode = (episodeId: Id<"episodes">) => {
    setSelectedEpisodeId(episodeId);
    // Stay in player view
  };

  const handleBackToHome = () => {
    setCurrentView("home");
    setSelectedAnimeId(null);
    setSelectedEpisodeId(null);
  };

  const handleBackToDetail = () => {
    setCurrentView("detail");
    setSelectedEpisodeId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <header className={`sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 ${currentView === "player" ? "hidden" : ""}`}>
        <div className="container mx-auto px-3 sm:px-4 h-16 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-6 flex-1 min-w-0">
            <h1 
              className="text-lg sm:text-2xl font-bold text-red-500 cursor-pointer hover:text-red-400 transition-colors whitespace-nowrap"
              onClick={handleBackToHome}
            >
              이비FLIX
            </h1>
            
            {currentView === "home" && (
              <div className="relative flex-1 max-w-xs sm:max-w-md">
                <input
                  type="text"
                  placeholder="검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <Unauthenticated>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-3 sm:px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium whitespace-nowrap"
              >
                로그인
              </button>
            </Unauthenticated>
            <Authenticated>
              {isAdmin && (
                <button
                  onClick={() => setCurrentView("admin")}
                  className="px-3 sm:px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium whitespace-nowrap"
                >
                  관리자
                </button>
              )}
              <button
                onClick={() => setCurrentView("settings")}
                className="px-3 sm:px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium whitespace-nowrap"
              >
                설정
              </button>
              <SignOutButton />
            </Authenticated>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Unauthenticated>
          <div className="container mx-auto px-4 py-12">
            <AnimeList 
              searchTerm={searchTerm}
              onAnimeClick={handleAnimeClick}
              showAuthPrompt={true}
            />
          </div>
        </Unauthenticated>

        <Authenticated>
          {currentView === "home" && (
            <div className="container mx-auto px-4 py-8">
              <AnimeList 
                searchTerm={searchTerm}
                onAnimeClick={handleAnimeClick}
                showAuthPrompt={false}
              />
            </div>
          )}

          {currentView === "detail" && selectedAnimeId && (
            <AnimeDetail
              animeId={selectedAnimeId}
              onBack={handleBackToHome}
              onEpisodeClick={handleEpisodeClick}
            />
          )}

          {currentView === "player" && selectedEpisodeId && selectedAnimeId && (
            <VideoPlayer
              episodeId={selectedEpisodeId}
              animeId={selectedAnimeId}
              onBack={handleBackToDetail}
              onNextEpisode={handleNextEpisode}
            />
          )}

          {currentView === "admin" && isAdmin && (
            <AdminPanel onBack={handleBackToHome} />
          )}

          {currentView === "settings" && (
            <SettingsPage onBack={handleBackToHome} />
          )}
        </Authenticated>
      </main>

      <Toaster theme="dark" />

      {/* Age Verification Modal */}
      {showAgeVerification && <AgeVerificationModal />}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold mb-6">로그인</h2>
            <SignInForm />
          </div>
        </div>
      )}
    </div>
  );
}
