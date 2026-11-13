import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Video, 
  Search, 
  MapPin, 
  Mic, 
  MicOff, 
  Upload, 
  Play, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Wrench,
  Globe,
  Radio,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export const AILabStudio: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'image' | 'video' | 'search' | 'maps_grounding'>('image');

  // --- IMAGE GEN & EDIT (gemini-nano-banana-2.1) ---
  const [imagePrompt, setImagePrompt] = useState('Gambar diagram teknis skema lilitan stator 3-fasa 36 slot lap winding dengan kode warna fasa U-V-W dan kawat tembaga Class H 200°C.');
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [uploadedBase64Image, setUploadedBase64Image] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // --- VIDEO ANIMATION (gemini-omni-1.2-flash) ---
  const [videoImageBase64, setVideoImageBase64] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState('Rotasi halus poros rotor motor induksi listrik berkecepatan tinggi dengan hembusan angin pendingin dan kilau presisi bearing.');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // --- SEARCH GROUNDING (gemini-3.8-flash + google_search) ---
  const [searchQuery, setSearchQuery] = useState('Berapa harga kawat tembaga email Helenic dan Supreme per kg terbaru di Indonesia dan standar uji Megger IEEE 43-2000?');
  const [searchResult, setSearchResult] = useState<{ answer: string; sources: any[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // --- MAPS GROUNDING (gemini-3.8-flash + google_maps) ---
  const [mapsQuery, setMapsQuery] = useState('Toko supplier bearing SKF resmi dan distributor kawat tembaga terdekat di area Surabaya dan Sidoarjo');
  const [mapsResult, setMapsResult] = useState<string | null>(null);
  const [isQueryingMaps, setIsQueryingMaps] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  // File upload handler helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Submit Image Generation/Editing
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setImageError(null);

    try {
      const res = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          imageBase64: uploadedBase64Image,
          aspectRatio: imageAspectRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghasilkan gambar');
      setGeneratedImageUrl(data.imageUrl);
    } catch (err: any) {
      setImageError(err.message || 'Terjadi kesalahan saat memproses gambar');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 2. Submit Photo-to-Video Animation
  const handleAnimateVideo = async () => {
    if (!videoImageBase64) {
      setVideoError('Harap unggah foto motor atau komponen terlebih dahulu untuk dianimasikan');
      return;
    }
    setIsGeneratingVideo(true);
    setVideoError(null);

    try {
      const res = await fetch('/api/gemini/animate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: videoImageBase64,
          prompt: videoPrompt,
          aspectRatio: videoAspectRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menganimasikan video');
      setGeneratedVideoUrl(data.videoUrl);
    } catch (err: any) {
      setVideoError(err.message || 'Terjadi kesalahan saat membuat video animasi');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // 3. Submit Google Search Grounding
  const handleSearchGrounding = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch('/api/gemini/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mencari data');
      setSearchResult(data);
    } catch (err: any) {
      setSearchError(err.message || 'Gagal mendapatkan data penelusuran');
    } finally {
      setIsSearching(false);
    }
  };

  // 4. Submit Google Maps Grounding
  const handleMapsGrounding = async () => {
    if (!mapsQuery.trim()) return;
    setIsQueryingMaps(true);
    setMapsError(null);

    try {
      const res = await fetch('/api/gemini/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: mapsQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mencari lokasi Maps');
      setMapsResult(data.answer);
    } catch (err: any) {
      setMapsError(err.message || 'Gagal mendapatkan data Google Maps');
    } finally {
      setIsQueryingMaps(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-amber-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Gemini Multimodal Intelligence Suite</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            AI Engineering & Media Studio Bengkel
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Generasi gambar teknis motor (gemini-nano-banana-2.1), video animasi rotor (gemini-omni-1.2-flash), Search Grounding, & Maps Grounding.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-xs text-amber-400 font-mono font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>@google/genai 2.4.0</span>
          </span>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl">
        <button
          onClick={() => setActiveSubTab('image')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'image'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-amber-600" />
          <span>Buat & Edit Gambar (Nano Banana 2.1)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('video')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'video'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Video className="w-4 h-4 text-indigo-600" />
          <span>Animasi Foto ke Video (Omni Flash)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('search')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'search'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4 text-emerald-600" />
          <span>Search Grounding (Google Search)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('maps_grounding')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeSubTab === 'maps_grounding'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4 text-rose-600" />
          <span>Maps Grounding (Lokasi Supplier)</span>
        </button>
      </div>

      {/* TAB 1: CREATE & EDIT IMAGES WITH GEMINI-NANO-BANANA-2.1 */}
      {activeSubTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Desain & Sunting Gambar Mesin / Skema
                </h3>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-mono font-bold px-2 py-0.5 rounded">
                  gemini-nano-banana-2.1
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Gunakan prompt teks untuk menghasilkan visualisasi motor listrik, stator winding, nameplate, atau unggah foto untuk diedit.
              </p>
            </div>

            {/* Prompt Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Prompt Instruksi:</label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={4}
                className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                placeholder="Deskripsikan gambar atau perubahan gambar yang diinginkan..."
              />
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Aspek Rasio (Aspect Ratio):</label>
              <div className="grid grid-cols-4 gap-2">
                {(['1:1', '16:9', '9:16', '4:3'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setImageAspectRatio(ratio)}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      imageAspectRatio === ratio
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Image Upload for Editing */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Foto Referensi / Gambar yang Ingin Diedit (Opsional):
                </label>
                {uploadedBase64Image && (
                  <button
                    onClick={() => setUploadedBase64Image(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Hapus Foto
                  </button>
                )}
              </div>

              {uploadedBase64Image ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                  <img src={uploadedBase64Image} alt="Reference" className="max-h-full object-contain" />
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-lg cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-medium text-slate-600">Klik untuk unggah foto motor / skema kawat</span>
                  <span className="text-[10px] text-slate-400">PNG, JPG hingga 10MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, setUploadedBase64Image)}
                  />
                </label>
              )}
            </div>

            {imageError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{imageError}</span>
              </div>
            )}

            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || !imagePrompt.trim()}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {isGeneratingImage ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses Gemini Nano Banana 2.1...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{uploadedBase64Image ? 'Edit & Sunting Gambar' : 'Hasilkan Gambar Baru'}</span>
                </>
              )}
            </button>
          </div>

          {/* Right Preview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Hasil Gambar AI (Preview)</h3>
              <div className="w-full h-80 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden relative">
                {generatedImageUrl ? (
                  <img
                    src={generatedImageUrl}
                    alt="AI Generated"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-medium">Gambar hasil olahan AI akan tampil di sini</p>
                    <p className="text-[11px] text-slate-400 mt-1">Ditenagai model visual resolusi tinggi gemini-nano-banana-2.1</p>
                  </div>
                )}
              </div>
            </div>

            {generatedImageUrl && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Gambar Berhasil Dibuat</span>
                </span>
                <a
                  href={generatedImageUrl}
                  download="gemini_nano_banana_motor.png"
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Gambar</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ANIMATE PHOTO INTO VIDEO WITH GEMINI-OMNI-1.2-FLASH */}
      {activeSubTab === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Animasi Foto ke Video (Photo to Video)
                </h3>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono font-bold px-2 py-0.5 rounded">
                  gemini-omni-1.2-flash (Interactions API)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Unggah foto komponen bengkel (motor induksi, stator kawat, atau rotor) untuk dianimasikan menjadi video visual gerak beresolusi tinggi.
              </p>
            </div>

            {/* Upload Starting Frame Image */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Foto Awal (Starting Frame):</label>
              {videoImageBase64 ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                  <img src={videoImageBase64} alt="Frame awal" className="max-h-full object-contain" />
                  <button
                    onClick={() => setVideoImageBase64(null)}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-600 text-white p-1 rounded text-xs transition-colors"
                  >
                    Ganti Foto
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-lg cursor-pointer bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors">
                  <Upload className="w-5 h-5 text-indigo-500 mb-1" />
                  <span className="text-xs font-semibold text-indigo-950">Unggah Foto Motor untuk Dianimasikan</span>
                  <span className="text-[10px] text-slate-400">JPEG, PNG</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, setVideoImageBase64)}
                  />
                </label>
              )}
            </div>

            {/* Motion Prompt */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Instruksi Gerakan (Motion Prompt):</label>
              <textarea
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="Deskripsikan pergerakan kamera, efek cahaya, atau rotasi..."
              />
            </div>

            {/* Aspect Ratio: 16:9 or 9:16 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Format Aspek Rasio Video:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVideoAspectRatio('16:9')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-2 transition-all ${
                    videoAspectRatio === '16:9'
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>16:9 Landscape (Desktop / Display)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoAspectRatio('9:16')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-2 transition-all ${
                    videoAspectRatio === '9:16'
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>9:16 Portrait (Mobile / Reels)</span>
                </button>
              </div>
            </div>

            {videoError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{videoError}</span>
              </div>
            )}

            <button
              onClick={handleAnimateVideo}
              disabled={isGeneratingVideo || !videoImageBase64}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {isGeneratingVideo ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses Gemini Omni 1.2 Flash (Interactions API)...</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Animasikan Foto Menjadi Video</span>
                </>
              )}
            </button>
          </div>

          {/* Right Video Viewport */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Video Hasil Animasi</h3>
              <div className="w-full h-80 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden relative">
                {generatedVideoUrl ? (
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <Video className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p className="text-xs font-medium text-slate-300">Video animasi akan muncul di sini</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Didukung pemrosesan video berkecepatan tinggi gemini-omni-1.2-flash
                    </p>
                  </div>
                )}
              </div>
            </div>

            {generatedVideoUrl && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Video Siap Diputar</span>
                </span>
                <a
                  href={generatedVideoUrl}
                  download="gemini_omni_motor_animation.mp4"
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Video (MP4)</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GOOGLE SEARCH GROUNDING */}
      {activeSubTab === 'search' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Pencarian Terkini dengan Search Grounding (Google Search)</span>
              </h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded">
                gemini-3.8-flash (google_search)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dapatkan informasi web terverifikasi secara real-time mengenai harga kawat tembaga email per kg hari ini, spesifikasi standar IEC motor, atau update regulasi listrik.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchGrounding()}
              className="flex-1 text-xs p-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-sans"
              placeholder="Ketik topik teknis atau pertanyaan harga terkini..."
            />
            <button
              onClick={handleSearchGrounding}
              disabled={isSearching || !searchQuery.trim()}
              className="px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Cari dengan Grounding</span>
            </button>
          </div>

          {searchError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {searchError}
            </div>
          )}

          {searchResult && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-900 block border-b border-slate-200 pb-2">
                Jawaban Terverifikasi Google Search:
              </span>
              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {searchResult.answer}
              </div>

              {searchResult.sources && searchResult.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
                  <span className="font-semibold block text-slate-700">Sumber Rujukan Web:</span>
                  <div className="flex flex-wrap gap-2">
                    {searchResult.sources.map((s, idx) => (
                      <span key={idx} className="bg-white px-2 py-1 rounded border border-slate-200 text-[10px]">
                        {s.title || 'Sumber Terverifikasi'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MAPS GROUNDING */}
      {activeSubTab === 'maps_grounding' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Pencarian Geografis dengan Maps Grounding</span>
              </h3>
              <span className="text-[10px] bg-rose-100 text-rose-800 font-mono font-bold px-2 py-0.5 rounded">
                gemini-3.8-flash (google_maps)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Temukan tempat, alamat bengkel bubut rekanan, distributor bearing, atau toko material listrik terdekat dengan grounding data Google Maps.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={mapsQuery}
              onChange={(e) => setMapsQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleMapsGrounding()}
              className="flex-1 text-xs p-3 rounded-lg border border-slate-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none font-sans"
              placeholder="Contoh: Toko bearing SKF di Surabaya / Supplier vernis bakar di Sidoarjo..."
            />
            <button
              onClick={handleMapsGrounding}
              disabled={isQueryingMaps || !mapsQuery.trim()}
              className="px-5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
            >
              {isQueryingMaps ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              <span>Cari dengan Maps Grounding</span>
            </button>
          </div>

          {mapsError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {mapsError}
            </div>
          )}

          {mapsResult && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 block border-b border-slate-200 pb-2">
                Hasil Tempat & Lokasi Google Maps:
              </span>
              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {mapsResult}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
