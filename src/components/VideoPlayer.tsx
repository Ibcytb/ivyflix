import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { VolumeControl } from "./VolumeControl";
import { SpeedControl } from "./SpeedControl";
import { QualityControl } from "./QualityControl";
import { SubtitleControl } from "./SubtitleControl";

interface VideoPlayerProps {
  episodeId: Id<"episodes">;
  animeId: Id<"anime">;
  onBack: () => void;
  onNextEpisode?: (episodeId: Id<"episodes">) => void;
}

export function VideoPlayer({ episodeId, animeId, onBack, onNextEpisode }: VideoPlayerProps) {
  const episode = useQuery(api.episodes.getEpisodeWithVideo, { episodeId });
  const anime = useQuery(api.anime.getAnime, episode ? { animeId: episode.animeId } : "skip");
  const subtitles = useQuery(api.subtitles.listSubtitles, { episodeId });
  const ecchiSkips = useQuery(api.ecchiSkips.listEcchiSkips, { episodeId });
  const watchProgress = useQuery(api.watchHistory.getWatchProgress, { episodeId });
  const nextEpisode = useQuery(api.episodes.getNextEpisode, { episodeId });
  const prevEpisode = useQuery(api.episodes.getPreviousEpisode, { episodeId });
  const updateProgress = useMutation(api.watchHistory.updateWatchProgress);
  const preferences = useQuery(api.userPreferences.getPreferences);
  const bnviitFontUrl = useQuery(api.userPreferences.getBnviitFontUrl);
  const updatePreferences = useMutation(api.userPreferences.updatePreferences);
  const generateFontUploadUrl = useMutation(api.userPreferences.generateFontUploadUrl);
  const saveCustomFont = useMutation(api.userPreferences.saveCustomFont);
  const deleteCustomFont = useMutation(api.userPreferences.deleteCustomFont);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [extractedM3u8Url, setExtractedM3u8Url] = useState<string | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
  const [subtitleOffset, setSubtitleOffset] = useState(0);
  const [currentSubtitleText, setCurrentSubtitleText] = useState("");
  const [parsedSubtitles, setParsedSubtitles] = useState<Array<{
    start: number;
    end: number;
    text: string;
    styles?: { color?: string; fontName?: string };
  }>>([]);
  
  const [showSkipButton, setShowSkipButton] = useState<{
    type: "opening" | "ending" | "ecchi";
    data?: any;
  } | null>(null);
  const [showEcchiSummary, setShowEcchiSummary] = useState<string | null>(null);
  const [showEcchiWarning, setShowEcchiWarning] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isUploadingFont, setIsUploadingFont] = useState(false);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const [seekIndicator, setSeekIndicator] = useState<{ direction: 'forward' | 'backward', amount: number } | null>(null);
  const [seekIndicatorFading, setSeekIndicatorFading] = useState(false);
  const lastTapRef = useRef<{ time: number, x: number } | null>(null);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const hasTriedFullscreenRef = useRef(false);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const CONTROLS_HIDE_DELAY = 3000; // 3 seconds

  // Build HLS playlist from server-extracted files
  useEffect(() => {
    if (!episode?.hlsFiles || episode.hlsFiles.length === 0) return;
    console.log('🎬 Building HLS playlist, files:', episode.hlsFiles.length);
    const playlistFile = episode.hlsFiles.find(f => f.isPlaylist);
    if (!playlistFile?.url) {
      console.error('❌ No playlist file found');
      return;
    }
    fetch(playlistFile.url).then(r => r.text()).then(c => {
      console.log('📄 Original playlist preview:', c.substring(0, 300));
      let modified = c;
      episode.hlsFiles.forEach(f => {
        if (!f.isPlaylist && f.url) {
          const filenameOnly = f.filename.split('/').pop() || f.filename;
          modified = modified.replace(new RegExp(filenameOnly, 'g'), f.url);
          modified = modified.replace(new RegExp(f.filename, 'g'), f.url);
        }
      });
      console.log('📄 Modified playlist preview:', modified.substring(0, 300));
      const url = URL.createObjectURL(new Blob([modified], { type: 'application/vnd.apple.mpegurl' }));
      console.log('🎥 M3U8 ready');
      setExtractedM3u8Url(url);
    }).catch(e => console.error('❌ Error loading playlist:', e));
  }, [episode?.hlsFiles]);

  // Auto-enter fullscreen on mobile when component mounts
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent) && !/Edge|Edg/i.test(navigator.userAgent);
    const isSamsung = /SamsungBrowser/i.test(navigator.userAgent);
    
    if (isMobile && !document.fullscreenElement) {
      // All mobile browsers require user gesture for fullscreen
      setShowFullscreenPrompt(true);
      console.log('📱 Mobile detected - showing fullscreen prompt');
      console.log('🔍 Browser:', { isChrome, isSamsung });
    }
  }, []);

  // Lock screen orientation to landscape on mobile when in fullscreen
  useEffect(() => {
    const handleFSChange = () => {
      const isFS = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFS);
      try {
        const s = screen as any;
        if (isFS && s.orientation?.lock) s.orientation.lock('landscape');
        else if (!isFS && s.orientation?.unlock) s.orientation.unlock();
      } catch {}
    };

    document.addEventListener('fullscreenchange', handleFSChange);
    document.addEventListener('webkitfullscreenchange', handleFSChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
      document.removeEventListener('webkitfullscreenchange', handleFSChange);
    };
  }, []);

  // Initialize HLS
  useEffect(() => {
    if (!extractedM3u8Url || !videoRef.current) return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        maxFragLookUpTolerance: 0.25,
        progressive: false,
        debug: false,
        xhrSetup: (xhr: any) => {
          xhr.withCredentials = false;
        },
      });
      
      hlsRef.current = hls;
      hls.loadSource(extractedM3u8Url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest loaded successfully');
        
        if (videoRef.current && videoRef.current.paused) {
          videoRef.current.play().catch(e => console.log('Autoplay prevented:', e));
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error, trying to recover...');
              if (data.details === 'bufferAddCodecError') {
                console.error('Codec not supported. Re-encode with: ffmpeg -i input.mp4 -c:v libx264 -c:a aac -f hls output.m3u8');
                setPlaybackError('비디오 코덱이 지원되지 않습니다. 관리자에게 문의하세요.');
              }
              try {
                hls.recoverMediaError();
              } catch (e) {
                console.error('Recovery failed:', e);
              }
              break;
            default:
              console.error('Fatal error, cannot recover:', data);
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = extractedM3u8Url;
      const handleLoadedMetadata = () => {
        if (videoRef.current && videoRef.current.paused) {
          videoRef.current.play().catch(e => console.log('Autoplay prevented:', e));
        }
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [extractedM3u8Url]);

  // Track if this is an auto-play transition or manual navigation
  const isAutoPlayRef = useRef(false);
  const skipProgressRestoreRef = useRef(false);
  const shouldRestoreProgressRef = useRef(true); // Only restore on initial load

  // Reset progress restoration and subtitles when episode changes
  useEffect(() => {
    setHasRestoredProgress(false);
    setSelectedSubtitle(null);
    setParsedSubtitles([]);
    setCurrentSubtitleText("");
    setSubtitleOffset(0);
    // Don't reset skipProgressRestoreRef here - it's set before navigation
    console.log('🔄 Episode changed, reset progress restoration flag and subtitles');
  }, [episodeId]);

  // Load saved progress (only once when video is ready)
  useEffect(() => {
    if (!watchProgress || !videoRef.current || hasRestoredProgress) return;
    
    // Skip progress restoration if this is an auto-play transition or manual navigation
    if (isAutoPlayRef.current || skipProgressRestoreRef.current) {
      console.log('⏭️ Skip progress restore (navigation button clicked), starting from 0s');
      setHasRestoredProgress(true);
      isAutoPlayRef.current = false;
      skipProgressRestoreRef.current = false;
      return;
    }
    
    const video = videoRef.current;
    const targetTime = watchProgress.timestamp;
    
    const attemptRestore = () => {
      if (video.readyState >= 2 && video.duration > 0 && !hasRestoredProgress) {
        console.log(`✅ Restoring to ${targetTime.toFixed(2)}s (duration: ${video.duration.toFixed(2)}s)`);
        video.currentTime = targetTime;
        setHasRestoredProgress(true);
        return true;
      }
      return false;
    };
    
    if (!attemptRestore()) {
      const handleCanPlay = () => attemptRestore();
      video.addEventListener('canplay', handleCanPlay);
      return () => video.removeEventListener('canplay', handleCanPlay);
    }
  }, [watchProgress, hasRestoredProgress]);



  // Load preferences and fonts
  useEffect(() => {
    if (preferences && videoRef.current) {
      videoRef.current.playbackRate = preferences.playbackSpeed;
      setPlaybackRate(preferences.playbackSpeed);
      videoRef.current.volume = volume;
    }

    // Load selected font
    if (preferences?.selectedFontId && !loadedFonts.has(preferences.selectedFontId)) {
      if (preferences.selectedFontId === 'bnviit' && bnviitFontUrl) {
        // Load BnviitLasik font from storage
        const fontFace = new FontFace('BnviitLasik', `url(${bnviitFontUrl})`);
        fontFace.load().then((loadedFont) => {
          document.fonts.add(loadedFont);
          setLoadedFonts(prev => new Set(prev).add('bnviit'));
          console.log('✅ 비앤빛 라식체 loaded');
        }).catch((error) => {
          console.error('❌ Failed to load 비앤빛 라식체:', error);
        });
      } else if (preferences.selectedFontId !== 'default') {
        // Load custom font
        const customFont = preferences.customFonts?.find(f => f._id === preferences.selectedFontId);
        if (customFont?.url) {
          const fontFace = new FontFace(customFont.name, `url(${customFont.url})`);
          fontFace.load().then((loadedFont) => {
            document.fonts.add(loadedFont);
            setLoadedFonts(prev => new Set(prev).add(preferences.selectedFontId!));
            console.log(`✅ Custom font ${customFont.name} loaded`);
          }).catch((error) => {
            console.error(`❌ Failed to load custom font ${customFont.name}:`, error);
          });
        }
      }
    }
  }, [preferences, bnviitFontUrl, loadedFonts]);

  // Save progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused && videoRef.current.duration > 0) {
        const timestamp = videoRef.current.currentTime;
        console.log(`💾 Saving progress: ${timestamp.toFixed(2)}s`);
        updateProgress({
          episodeId,
          animeId,
          timestamp,
        }).catch((err) => {
          console.log('Failed to save progress:', err);
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [episodeId, animeId, updateProgress]);

  // Reset progress when leaving within 5 seconds of video end
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.duration > 0) {
        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        const timeRemaining = duration - currentTime;
        
        if (timeRemaining <= 5 && timeRemaining >= 0) {
          console.log('🔄 Resetting progress (within 5s of end)');
          updateProgress({
            episodeId,
            animeId,
            timestamp: 0,
          }).catch((err) => {
            console.log('Failed to reset progress:', err);
          });
        }
      }
    };
  }, [episodeId, animeId, updateProgress]);

  // Parse subtitles
  useEffect(() => {
    if (!selectedSubtitle || !subtitles) return;

    const subtitle = subtitles.find((s) => s._id === selectedSubtitle);
    if (!subtitle || !subtitle.url) return;

    console.log('📖 Loading subtitle:', subtitle.format, subtitle.label);
    fetch(subtitle.url)
      .then((res) => res.text())
      .then((text) => {
        console.log('📄 Subtitle content length:', text.length);
        console.log('📄 First 1000 chars:', text.substring(0, 1000));
        if (subtitle.format === "smi") {
          const parsed = parseSMI(text);
          console.log('✅ Parsed SMI subtitles:', parsed.length);
          if (parsed.length > 0) {
            console.log('📝 First 5 subtitles:', parsed.slice(0, 5));
          }
          setParsedSubtitles(parsed);
        } else if (subtitle.format === "srt") {
          setParsedSubtitles(parseSRT(text));
        } else if (subtitle.format === "vtt") {
          setParsedSubtitles(parseVTT(text));
        }
      })
      .catch((err) => console.error("Failed to load subtitle:", err));
  }, [selectedSubtitle, subtitles]);

  // Update current subtitle text - support multiple simultaneous subtitles
  useEffect(() => {
    if (parsedSubtitles.length === 0) {
      setCurrentSubtitleText("");
      return;
    }

    const adjustedTime = currentTime + subtitleOffset;
    
    // Find ALL current subtitles by checking if current time is within range
    const currentSubs = [];
    for (let i = 0; i < parsedSubtitles.length; i++) {
      const sub = parsedSubtitles[i];
      if (adjustedTime >= sub.start && adjustedTime < sub.end) {
        currentSubs.push(sub);
      }
    }

    // Join multiple subtitles with line breaks and convert \n to <br>
    const newText = currentSubs.map(s => s.text.replace(/\\n/g, '<br/>').replace(/\n/g, '<br/>')).join('<br/>');
    if (newText !== currentSubtitleText) {
      if (newText) {
        console.log('🎬 Subtitle at', adjustedTime.toFixed(2), 's:', newText.substring(0, 50));
      }
      setCurrentSubtitleText(newText);
    }
  }, [currentTime, parsedSubtitles, subtitleOffset, currentSubtitleText]);

  // Check for skip buttons
  useEffect(() => {
    if (!episode || !preferences) return;

    const time = currentTime;

    // Check opening skip
    if (
      episode.openingStart !== undefined &&
      episode.openingEnd !== undefined &&
      time >= episode.openingStart &&
      time < episode.openingEnd
    ) {
      const openingMode = preferences.openingSkipMode || "button";
      if (openingMode === "auto" && videoRef.current) {
        videoRef.current.currentTime = episode.openingEnd;
      }
      setShowSkipButton(openingMode === "button" ? { type: "opening" } : null);
      setShowEcchiWarning(null);
      return;
    }

    // Check ending skip
    if (
      episode.endingStart !== undefined &&
      episode.endingEnd !== undefined &&
      time >= episode.endingStart &&
      time < episode.endingEnd
    ) {
      const endingMode = preferences.endingSkipMode || "button";
      if (endingMode === "auto" && videoRef.current) {
        videoRef.current.currentTime = episode.endingEnd;
      }
      setShowSkipButton(endingMode === "button" ? { type: "ending" } : null);
      setShowEcchiWarning(null);
      return;
    }

    // Check ecchi skips and warnings
    if (ecchiSkips) {
      const ecchiMode = preferences.ecchiSkipMode || "button";
      
      for (const skip of ecchiSkips) {
        if (time >= skip.startTime && time < skip.endTime) {
          if (ecchiMode === "auto" && videoRef.current) {
            videoRef.current.currentTime = skip.endTime;
            setShowEcchiSummary(skip.summary);
            setTimeout(() => setShowEcchiSummary(null), 5000);
          } else if (ecchiMode === "button") {
            setShowSkipButton({ type: "ecchi", data: skip });
          }
          setShowEcchiWarning(null);
          return;
        }
        
        if (ecchiMode !== "off") {
          const timeUntil = skip.startTime - time;
          if (timeUntil > 0 && timeUntil <= 5) {
            setShowEcchiWarning(Math.ceil(timeUntil));
            setShowSkipButton(null);
            return;
          }
        }
      }
    }

    setShowSkipButton(null);
    setShowEcchiWarning(null);
  }, [currentTime, episode, ecchiSkips, preferences]);

  // Auto-play next episode when current episode ends
  useEffect(() => {
    if (!videoRef.current) return;
    
    const handleEnded = () => {
      console.log('🎬 Episode ended');
      if (preferences?.autoPlayNext && nextEpisode && onNextEpisode) {
        console.log('▶️ Auto-play next episode - will start from 0s');
        isAutoPlayRef.current = true; // Mark as auto-play transition
        onNextEpisode(nextEpisode._id);
      }
    };
    
    const video = videoRef.current;
    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [preferences?.autoPlayNext, nextEpisode, onNextEpisode]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(5);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration]);

  const handleSeek = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    
    // Hide controls during seek
    setShowControls(false);
    
    setSeekIndicator({ direction: seconds > 0 ? 'forward' : 'backward', amount: Math.abs(seconds) });
    setSeekIndicatorFading(false);
    setTimeout(() => {
      setSeekIndicatorFading(true);
      setTimeout(() => {
        setSeekIndicator(null);
        setSeekIndicatorFading(false);
      }, 500); // Match fade-out animation duration
    }, 1500);
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(e => console.log('Play failed:', e));
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleSkip = () => {
    if (!videoRef.current || !showSkipButton) return;

    if (showSkipButton.type === "opening" && episode?.openingEnd) {
      videoRef.current.currentTime = episode.openingEnd;
    } else if (showSkipButton.type === "ending" && episode?.endingEnd) {
      videoRef.current.currentTime = episode.endingEnd;
    } else if (showSkipButton.type === "ecchi" && showSkipButton.data) {
      videoRef.current.currentTime = showSkipButton.data.endTime;
      setShowEcchiSummary(showSkipButton.data.summary);
      setTimeout(() => setShowEcchiSummary(null), 5000);
    }
  };

  const handleScreenshot = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screenshot-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handlePictureInPicture = async () => {
    if (!videoRef.current) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PIP error:', err);
    }
  };

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
    // Quality selection is display-only, actual quality is always auto
  };

  const handlePreviousEpisode = () => {
    if (prevEpisode && onNextEpisode) {
      console.log('⏮️ Previous button clicked - will start from 0s');
      skipProgressRestoreRef.current = true;
      onNextEpisode(prevEpisode._id);
    }
  };

  const handleNextEpisodeClick = () => {
    if (nextEpisode && onNextEpisode) {
      console.log('⏭️ Next button clicked - will start from 0s');
      skipProgressRestoreRef.current = true;
      onNextEpisode(nextEpisode._id);
    }
  };

  const handleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;

    try {
      const isFS = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      
      if (!isFS) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
        else if ((el as any).mozRequestFullScreen) await (el as any).mozRequestFullScreen();
        setIsFullscreen(true);
        setShowFullscreenPrompt(false);
        hasTriedFullscreenRef.current = true;
        try {
          const s = screen as any;
          if (s.orientation?.lock) {
            await s.orientation.lock('landscape').catch((e: any) => {
              console.log('⚠️ Orientation lock failed:', e);
            });
          }
        } catch (e) {
          console.log('⚠️ Orientation API not supported:', e);
        }
        
        console.log('✅ Fullscreen entered');
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('❌ Fullscreen error:', err);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    
    // Clear controls timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Set new timeout for controls only
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettings) {
        setShowControls(false);
      }
    }, CONTROLS_HIDE_DELAY);
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    // If fullscreen prompt is showing, enter fullscreen on first click
    if (showFullscreenPrompt && !hasTriedFullscreenRef.current) {
      handleFullscreen();
      return;
    }

    const video = e.currentTarget;
    const rect = video.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;
    const now = Date.now();

    // Check if click is in letterbox (black bars)
    const videoAspectRatio = video.videoWidth / video.videoHeight;
    const containerAspectRatio = width / height;
    let isInBlackArea = false;
    
    if (containerAspectRatio > videoAspectRatio) {
      const videoWidth = height * videoAspectRatio;
      const videoLeft = (width - videoWidth) / 2;
      isInBlackArea = x < videoLeft || x > videoLeft + videoWidth;
    } else {
      const videoHeight = width / videoAspectRatio;
      const videoTop = (height - videoHeight) / 2;
      isInBlackArea = y < videoTop || y > videoTop + videoHeight;
    }
    
    if (isInBlackArea) {
      setShowControls(!showControls);
      return;
    }

    if (lastTapRef.current && now - lastTapRef.current.time < 300) {
      if (x < width / 3) {
        handleSeek(-5);
      } else if (x > (2 * width) / 3) {
        handleSeek(5);
      } else {
        handlePlayPause();
      }
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, x };
      setTimeout(() => {
        if (lastTapRef.current && lastTapRef.current.time === now) {
          handlePlayPause();
          lastTapRef.current = null;
        }
      }, 300);
    }
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
      alert('지원되는 폰트 형식: TTF, OTF, WOFF, WOFF2');
      return;
    }
    setIsUploadingFont(true);
    try {
      const url = await generateFontUploadUrl();
      const res = await fetch(url, { method: "POST", body: file });
      const json = await res.json();
      const fontName = file.name.replace(/\.[^/.]+$/, "");
      await saveCustomFont({ name: fontName, storageId: json.storageId });
      alert('커스텀 폰트가 업로드되었습니다!');
    } catch {
      alert('폰트 업로드에 실패했습니다.');
    } finally {
      setIsUploadingFont(false);
    }
  };

  const getSubtitleFontFamily = () => {
    if (!preferences?.selectedFontId || preferences.selectedFontId === 'default') {
      return preferences?.subtitleFontFamily || "Arial";
    }
    if (preferences.selectedFontId === 'bnviit') {
      return 'BnviitLasik, Arial';
    }
    const customFont = preferences.customFonts?.find(f => f._id === preferences.selectedFontId);
    return customFont ? `${customFont.name}, Arial` : "Arial";
  };

  if (!episode) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only toggle controls visibility on black areas, don't pause
    if (e.target === containerRef.current) {
      if (showControls) {
        setShowControls(false);
      } else {
        setShowControls(true);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && !showSettings && setShowControls(false)}
      onClick={handleContainerClick}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={handleVideoClick}
      />

      {/* Fullscreen Prompt for Mobile */}
      {showFullscreenPrompt && !hasTriedFullscreenRef.current && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-50 p-4">
          <div className="text-center max-w-sm">
            <div className="mb-8">
              <svg className="w-24 h-24 mx-auto text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">가로 모드로 시청하기</h2>
            <p className="text-gray-300 mb-2 text-lg">최적의 시청 경험을 위해</p>
            <p className="text-gray-400 mb-8">전체화면 가로 모드를 권장합니다</p>
            <button
              onClick={handleFullscreen}
              className="w-full px-8 py-5 bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl text-white font-bold text-xl transition-colors shadow-lg"
            >
              전체화면으로 시청하기
            </button>
            <p className="text-gray-500 text-sm mt-4">화면 아무 곳이나 탭해도 시작됩니다</p>
          </div>
        </div>
      )}

      {/* Top Bar with Back Button and Episode Info */}
      {showControls && anime && episode && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-6 z-40">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="hover:text-red-500 transition-colors flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{anime.title}</h2>
              <p className="text-sm text-gray-300 truncate">
                {episode.episodeNumber}화 - {episode.title}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Seek Indicator */}
      {seekIndicator && (
        <div className={`absolute top-1/2 ${seekIndicator.direction === 'backward' ? 'left-12' : 'right-12'} transform -translate-y-1/2 z-50 ${seekIndicatorFading ? 'animate-fade-out' : ''}`}>
          <div className="bg-black/25 rounded-full p-3">
            <div className="flex items-center gap-1 text-white">
              {seekIndicator.direction === 'backward' ? (
                <>
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-lg font-bold">{seekIndicator.amount}초</span>
                </>
              ) : (
                <>
                  <span className="text-lg font-bold">{seekIndicator.amount}초</span>
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subtitle Display */}
      {currentSubtitleText && (() => {
        const isSkip = (episode?.openingStart !== undefined && currentTime >= episode.openingStart && currentTime < (episode.openingEnd || 0)) ||
          (episode?.endingStart !== undefined && currentTime >= episode.endingStart && currentTime < (episode.endingEnd || 0));
        let leftPad = '1rem';
        if (isSkip && videoRef.current) {
          const v = videoRef.current;
          const cw = v.clientWidth, ch = v.clientHeight;
          const vr = v.videoWidth / v.videoHeight, cr = cw / ch;
          if (cr > vr) leftPad = `${((cw - ch * vr) / 2) + 16}px`;
        }
        return (
        <div
          className="absolute bottom-8 left-0 right-0 flex px-4 pointer-events-none"
          style={{
            fontSize: `${preferences?.subtitleFontSize || 24}px`,
            fontFamily: getSubtitleFontFamily(),
            textShadow: "2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)",
            color: "white",
            lineHeight: "1.3",
            justifyContent: isSkip ? 'flex-start' : 'center',
            paddingLeft: isSkip ? leftPad : undefined,
          }}
        >
          <div
            className={`max-w-4xl subtitle-content ${isSkip ? 'text-left' : 'text-center'}`}
            dangerouslySetInnerHTML={{ __html: currentSubtitleText }}
          />
        </div>
        );
      })()}

      {/* Ecchi Warning - Below skip button */}
      {showEcchiWarning && (
        <div className="absolute bottom-24 right-8 z-40 animate-fade-in">
          <p className="text-sm text-white/80">
            {showEcchiWarning}초 후 엣찌 장면
          </p>
        </div>
      )}

      {/* Skip Buttons - Netflix Style (Always visible when active) */}
      {showSkipButton && (
        <div className="absolute bottom-32 right-8 z-40 animate-fade-in">
          <button
            onClick={handleSkip}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 rounded text-white font-semibold transition-all shadow-lg hover:scale-105"
          >
            {showSkipButton.type === "opening" && "오프닝 건너뛰기"}
            {showSkipButton.type === "ending" && "엔딩 건너뛰기"}
            {showSkipButton.type === "ecchi" && "엣찌 건너뛰기"}
          </button>
        </div>
      )}

      {/* Ecchi Summary */}
      {showEcchiSummary && (
        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-40 max-w-2xl px-4">
          <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-4 shadow-xl">
            <p className="text-sm text-gray-300">{showEcchiSummary}</p>
          </div>
        </div>
      )}

      {/* Playback Error */}
      {playbackError && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 max-w-md px-4">
          <div className="bg-red-900/95 border border-red-700 rounded-lg p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-2">재생 오류</h3>
            <p className="text-sm text-gray-200 mb-4">{playbackError}</p>
            <button
              onClick={onBack}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              돌아가기
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress Bar */}
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={(e) => {
            if (videoRef.current) {
              videoRef.current.currentTime = Number(e.target.value);
            }
          }}
          className="w-full mb-4 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-600"
          style={{
            background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`,
          }}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={handlePreviousEpisode} 
              disabled={!prevEpisode}
              className="hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="이전 에피소드"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
              </svg>
            </button>

            <button onClick={handlePlayPause} className="hover:text-red-500 transition-colors">
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            <button 
              onClick={handleNextEpisodeClick} 
              disabled={!nextEpisode}
              className="hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="다음 에피소드"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}
              </span>
              <span className="text-gray-400">/</span>
              <span className="text-sm text-gray-400">
                {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
              </span>
            </div>

            <SpeedControl
              playbackRate={playbackRate}
              onSpeedChange={(rate) => {
                setPlaybackRate(rate);
                if (videoRef.current) {
                  videoRef.current.playbackRate = rate;
                }
              }}
            />

            <QualityControl
              selectedQuality={selectedQuality}
              onQualityChange={handleQualityChange}
            />
          </div>

          <div className="flex items-center gap-4">
            <SubtitleControl
              subtitles={subtitles || []}
              selectedSubtitle={selectedSubtitle}
              onSubtitleChange={setSelectedSubtitle}
              subtitleOffset={subtitleOffset}
              onOffsetChange={setSubtitleOffset}
            />

            <VolumeControl
              volume={volume}
              onVolumeChange={(newVolume) => {
                setVolume(newVolume);
                if (videoRef.current) {
                  videoRef.current.volume = newVolume;
                }
              }}
            />

            <button
              onClick={handleScreenshot}
              className="hover:text-red-500 transition-colors"
              title="스크린샷"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button
              onClick={handlePictureInPicture}
              className="hover:text-red-500 transition-colors"
              title="PIP"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/>
              </svg>
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="hover:text-red-500 transition-colors"
              title="설정"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button onClick={handleFullscreen} className="hover:text-red-500 transition-colors" title="전체화면">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute bottom-24 right-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-80 z-50 max-h-96 overflow-y-auto shadow-2xl">
          <h3 className="text-lg font-bold mb-4 text-white">설정</h3>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.autoPlayNext ?? true}
                  onChange={(e) => {
                    updatePreferences({ autoPlayNext: e.target.checked });
                  }}
                  className="w-4 h-4 accent-red-600"
                />
                <span className="text-sm text-white/90">다음 에피소드 자동 재생</span>
              </label>
            </div>
            
            <hr className="border-white/20" />
            
            <h4 className="text-md font-semibold text-white">스킵 설정</h4>
            <div>
              <label className="block text-sm mb-1 text-white/80">오프닝 스킵</label>
              <select
                value={preferences?.openingSkipMode || "button"}
                onChange={(e) => updatePreferences({ openingSkipMode: e.target.value as any })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-red-500 text-white backdrop-blur-sm"
              >
                <option value="auto">자동</option>
                <option value="button">선택</option>
                <option value="off">끄기</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1 text-white/80">엔딩 스킵</label>
              <select
                value={preferences?.endingSkipMode || "button"}
                onChange={(e) => updatePreferences({ endingSkipMode: e.target.value as any })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-red-500 text-white backdrop-blur-sm"
              >
                <option value="auto">자동</option>
                <option value="button">선택</option>
                <option value="off">끄기</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1 text-white/80">엣찌 스킵</label>
              <select
                value={preferences?.ecchiSkipMode || "button"}
                onChange={(e) => updatePreferences({ ecchiSkipMode: e.target.value as any })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-red-500 text-white backdrop-blur-sm"
              >
                <option value="auto">자동</option>
                <option value="button">선택</option>
                <option value="off">끄기</option>
              </select>
            </div>
            
            <hr className="border-white/20" />
            
            <h4 className="text-md font-semibold text-white">자막 설정</h4>
            <div>
              <label className="block text-sm mb-1 text-white/80">자막 크기</label>
              <input
                type="range"
                min="12"
                max="48"
                value={preferences?.subtitleFontSize || 24}
                onChange={(e) => {
                  updatePreferences({ subtitleFontSize: Number(e.target.value) });
                }}
                className="w-full"
              />
              <span className="text-xs text-white/70 font-medium">{preferences?.subtitleFontSize || 24}px</span>
            </div>

            <div>
              <label className="block text-sm mb-2 text-white/80">자막 폰트</label>
              <select
                value={preferences?.selectedFontId || "default"}
                onChange={(e) => {
                  updatePreferences({ selectedFontId: e.target.value });
                  setLoadedFonts(new Set()); // Reset to trigger reload
                }}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-red-500 text-white backdrop-blur-sm"
              >
                <option value="default">기본 폰트</option>
                <option value="bnviit">비앤빛 라식체</option>
                {preferences?.customFonts?.map((font) => (
                  <option key={font._id} value={font._id}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2 text-white/80">커스텀 폰트 업로드</label>
              <input
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleFontUpload}
                disabled={isUploadingFont}
                className="w-full text-sm text-white/70 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer file:backdrop-blur-sm"
              />
              <p className="text-xs text-white/60 mt-1">TTF, OTF, WOFF, WOFF2 지원</p>
              {isUploadingFont && <p className="text-xs text-blue-400 mt-1">업로드 중...</p>}
            </div>

            {preferences?.customFonts && preferences.customFonts.length > 0 && (
              <div>
                <label className="block text-sm mb-2 text-white/80">업로드된 폰트</label>
                <div className="space-y-2">
                  {preferences.customFonts.map((font) => (
                    <div key={font._id} className="flex items-center justify-between bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/10">
                      <span className="text-sm text-white/90">{font.name}</span>
                      <button
                        onClick={() => deleteCustomFont({ fontId: font._id })}
                        className="text-red-500 hover:text-red-400 text-xs"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// SMI Parser - Completely rewritten
function parseSMI(smiText: string) {
  const subtitles: Array<{
    start: number;
    end: number;
    text: string;
    styles?: { color?: string; fontName?: string };
  }> = [];

  console.log('🔍 Parsing SMI, length:', smiText.length);
  
  // Remove comments and normalize line endings
  let content = smiText
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  
  console.log('📄 SMI sample (first 800 chars):', content.substring(0, 800));

  // Extract all SYNC blocks with their timestamps
  const syncRegex = /<SYNC\s+Start\s*=\s*(\d+)[^>]*>/gi;
  const syncPoints: Array<{ time: number; index: number }> = [];
  
  let match;
  while ((match = syncRegex.exec(content)) !== null) {
    syncPoints.push({
      time: parseInt(match[1]),
      index: match.index,
    });
  }

  console.log('📝 Found', syncPoints.length, 'SYNC points');

  // Process each SYNC block
  for (let i = 0; i < syncPoints.length; i++) {
    const current = syncPoints[i];
    const next = syncPoints[i + 1];

    // Extract content between current SYNC and next SYNC
    const startIdx = current.index;
    const endIdx = next ? next.index : content.length;
    const blockContent = content.substring(startIdx, endIdx);
    
    // Extract P tag content
    const pRegex = /<P[^>]*>([\s\S]*?)(?:<\/P>|$)/i;
    const pMatch = blockContent.match(pRegex);
    
    if (!pMatch || !pMatch[1]) continue;

    let text = pMatch[1].trim();
    
    // Skip empty entries
    if (!text || text === '&nbsp;' || text.replace(/\s/g, '') === '') continue;

    // Process FONT tags and preserve colors
    text = text.replace(
      /<FONT([^>]*)>([\s\S]*?)(?:<\/FONT>|$)/gi,
      (fullMatch, attributes, content) => {
        const colorMatch = attributes.match(/color\s*=\s*["']?\s*#?([0-9A-Fa-f]{6})\s*["']?/i);
        if (colorMatch) {
          return `<span style="color: #${colorMatch[1]};">${content}</span>`;
        }
        return content;
      }
    );

    // Process <ruby> tags - convert to vertical layout with smaller furigana
    text = text.replace(
      /<ruby>([\s\S]*?)<\/ruby>/gi,
      (fullMatch, content) => {
        // Extract base text and rt (furigana) text
        const rtMatch = content.match(/([\s\S]*?)<rt>([\s\S]*?)<\/rt>/i);
        if (rtMatch) {
          const baseText = rtMatch[1].trim();
          const furigana = rtMatch[2].trim();
          return `<span style="display: inline-block; position: relative; padding-top: 0.4em;">${baseText}<span style="position: absolute; top: -0.1em; left: 50%; transform: translateX(-50%); font-size: 50%; white-space: nowrap; line-height: 1;">${furigana}</span></span>`;
        }
        return content;
      }
    );
    
    // Process standalone <rt> tags (fallback)
    text = text.replace(
      /<rt>([\s\S]*?)(?:<\/rt>|$)/gi,
      (fullMatch, content) => {
        return `<span style="font-size: 50%;">${content}</span>`;
      }
    );

    // Convert <br> tags to temporary marker before removing other HTML tags
    text = text.replace(/<br\s*\/?>/gi, '___LINEBREAK___');
    
    // Remove remaining HTML tags except span tags with style attribute
    text = text.replace(/<(?!\/?span(?:\s+style="[^"]*")?)[^>]+>/gi, "");

    // Convert actual newlines to temporary marker
    text = text.replace(/\n/g, '___LINEBREAK___');
    
    // Replace &nbsp; with space
    text = text.replace(/&nbsp;/gi, ' ');
    
    // Convert all line break markers to <br/>
    text = text.split('___LINEBREAK___').map(l => l.trim()).filter(l => l).join('<br/>');

    if (text.length > 0) {
      const startTime = current.time / 1000;
      const endTime = next ? next.time / 1000 : startTime + 5;
      
      subtitles.push({ 
        start: startTime, 
        end: endTime, 
        text 
      });
      
      if (subtitles.length <= 5) {
        console.log(`📝 Sub #${subtitles.length}: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s: "${text.substring(0, 50)}"`);
      }
    }
  }

  console.log('✅ Parsed', subtitles.length, 'subtitle entries');
  if (subtitles.length > 0) {
    console.log('📊 Time range:', subtitles[0].start.toFixed(2), '-', subtitles[subtitles.length - 1].end.toFixed(2));
  }

  return subtitles;
}

// SRT Parser
function parseSRT(srtText: string) {
  const subtitles: Array<{
    start: number;
    end: number;
    text: string;
  }> = [];

  const blocks = srtText.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 3) continue;

    const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!timeMatch) continue;

    const start =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000;

    const end =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000;

    const text = lines.slice(2).join("\n");

    subtitles.push({ start, end, text });
  }

  return subtitles;
}

// VTT Parser
function parseVTT(vttText: string) {
  const subtitles: Array<{
    start: number;
    end: number;
    text: string;
  }> = [];

  const lines = vttText.split("\n");
  let i = 0;

  // Skip WEBVTT header
  while (i < lines.length && !lines[i].includes("-->")) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.includes("-->")) {
      const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
      if (timeMatch) {
        const start =
          parseInt(timeMatch[1]) * 3600 +
          parseInt(timeMatch[2]) * 60 +
          parseInt(timeMatch[3]) +
          parseInt(timeMatch[4]) / 1000;

        const end =
          parseInt(timeMatch[5]) * 3600 +
          parseInt(timeMatch[6]) * 60 +
          parseInt(timeMatch[7]) +
          parseInt(timeMatch[8]) / 1000;

        i++;
        const textLines: string[] = [];
        while (i < lines.length && lines[i].trim() !== "") {
          textLines.push(lines[i]);
          i++;
        }

        const text = textLines.join("\n");
        subtitles.push({ start, end, text });
      }
    }
    i++;
  }

  return subtitles;
}
