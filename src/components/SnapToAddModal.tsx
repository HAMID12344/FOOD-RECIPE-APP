import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { CULINARY_ASSETS } from '../assets/culinaryAssets';

interface RecognizedIngredient {
  id: string;
  name: string;
  category: string;
  selected: boolean;
}

interface SnapToAddModalProps {
  onClose: () => void;
  onAddRecognizedItems: (names: string[]) => void;
}

function resizeDataUrl(
  dataUrl: string,
  maxWidth = 1024
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Failed to load captured photo for scanning.'));
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ base64: dataUrl, mimeType: 'image/jpeg' });
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', 0.84);
      resolve({ base64: compressed, mimeType: 'image/jpeg' });
    };
    img.src = dataUrl;
  });
}

export const SnapToAddModal: React.FC<SnapToAddModalProps> = ({
  onClose,
  onAddRecognizedItems,
}) => {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [autoPopulateOnScan, setAutoPopulateOnScan] = useState(true);

  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [recognized, setRecognized] = useState<RecognizedIngredient[]>([]);
  const [autoAddedCount, setAutoAddedCount] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      stopCamera();
      setCameraError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Live browser camera access is unavailable in this context. Upload a photo or use your device camera roll below.'
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
      } catch {
        setCameraError(
          'Browser camera permission was declined or no camera was detected. Upload a photo below or test with our kitchen sample.'
        );
      }
    },
    [stopCamera]
  );

  useEffect(() => {
    if (!capturedPreview) {
      startCamera(facingMode);
    }
    return () => {
      stopCamera();
    };
  }, [facingMode, capturedPreview, startCamera, stopCamera]);

  const analyzeImageSource = async (sourceUrl: string) => {
    stopCamera();
    setCapturedPreview(sourceUrl);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setRecognized([]);
    setSummary('');
    setAutoAddedCount(null);

    try {
      const { base64, mimeType } = await resizeDataUrl(sourceUrl, 1024);
      const response = await fetch('/api/groceries/snap-recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
        }),
      });

      const payload = (await response.json()) as {
        summary?: string;
        items?: Array<{ name: string; category: string }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Groq Vision ingredient scan failed.');
      }

      const items = (payload.items ?? []).map((item, idx) => ({
        id: `snap-${idx}-${Date.now()}`,
        name: item.name.trim(),
        category: item.category || 'Produce',
        selected: true,
      }));

      setSummary(payload.summary || `Detected ${items.length} grocery items.`);
      setRecognized(items);

      // Immediately auto-populate the Grocery List when autoPopulateOnScan is enabled
      if (autoPopulateOnScan && items.length > 0) {
        const names = items.map((i) => i.name).filter((n) => n.length > 0);
        onAddRecognizedItems(names);
        setAutoAddedCount(names.length);
      }
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : 'Unable to scan ingredients from photo.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShutterCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frameDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    analyzeImageSource(frameDataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        analyzeImageSource(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    setRecognized([]);
    setAnalysisError(null);
    setSummary('');
    setAutoAddedCount(null);
  };

  const toggleItemSelection = (id: string) => {
    setRecognized((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const updateItemName = (id: string, newName: string) => {
    setRecognized((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item))
    );
  };

  const selectedItems = recognized.filter((i) => i.selected && i.name.trim().length > 0);

  const handleManualConfirmAdd = () => {
    if (selectedItems.length === 0) return;
    onAddRecognizedItems(selectedItems.map((i) => i.name.trim()));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Snap to Add Ingredients"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl border border-zinc-200 overflow-hidden flex flex-col"
      >
        <div className="sm:hidden w-10 h-1.5 bg-zinc-300 rounded-full mx-auto mt-2.5 shrink-0" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Snap to Add Groceries</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Scan ingredients with your camera via Groq Vision to populate your list
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Snap to Add"
            className="min-w-[44px] min-h-[44px] rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-600 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Auto-populate preference row */}
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
            <span className="text-xs font-medium text-zinc-700">
              Auto-populate Grocery List immediately after scan
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={autoPopulateOnScan}
              onClick={() => setAutoPopulateOnScan((v) => !v)}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                autoPopulateOnScan ? 'bg-emerald-700' : 'bg-zinc-300'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  autoPopulateOnScan ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {!capturedPreview ? (
            /* Live Browser Camera Viewfinder + Fallback Actions */
            <div className="space-y-4">
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />

                {cameraActive && (
                  <div className="pointer-events-none absolute inset-6 border border-white/30 rounded-2xl" />
                )}

                {!cameraActive && (
                  <div className="p-6 text-center max-w-sm space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-emerald-400 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {cameraError ?? 'Requesting browser camera access…'}
                    </p>
                  </div>
                )}

                {cameraActive && (
                  <button
                    type="button"
                    onClick={() =>
                      setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                    }
                    aria-label="Flip camera"
                    className="absolute top-3.5 right-3.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-black/55 hover:bg-black/75 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Flip</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={!cameraActive}
                  onClick={handleShutterCapture}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-45 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap &amp; Scan</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ImagePlus className="w-4 h-4 text-emerald-700" />
                  <span>Upload Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => analyzeImageSource(CULINARY_ASSETS.heroMealPrep)}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Scan Sample Photo</span>
                </button>
              </div>
            </div>
          ) : (
            /* Captured Image Preview + Groq Vision Results */
            <div className="space-y-5">
              <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-200">
                <img
                  src={capturedPreview}
                  alt="Captured ingredients snapshot"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-white truncate">
                    {isAnalyzing
                      ? 'Scanning ingredients with Groq Vision…'
                      : summary || 'Snapshot scanned'}
                  </span>
                  <button
                    type="button"
                    onClick={handleRetake}
                    disabled={isAnalyzing}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-zinc-900 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Scan Another</span>
                  </button>
                </div>
              </div>

              {isAnalyzing && (
                <div className="py-10 text-center space-y-2.5">
                  <Loader2 className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-zinc-800">
                    Recognizing ingredients via Groq Vision…
                  </p>
                </div>
              )}

              {analysisError && (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 space-y-3">
                  <p>{analysisError}</p>
                  <button
                    type="button"
                    onClick={() => analyzeImageSource(capturedPreview)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-red-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Retry Scan
                  </button>
                </div>
              )}

              {autoAddedCount !== null && !isAnalyzing && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between gap-3 text-xs text-emerald-900">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      Auto-populated{' '}
                      <strong className="font-mono tabular-nums">{autoAddedCount}</strong>{' '}
                      recognized ingredients into your Grocery List.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[34px] px-3 py-1 rounded-lg bg-emerald-700 text-white font-semibold whitespace-nowrap cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}

              {!isAnalyzing && !analysisError && recognized.length === 0 && (
                <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-6 text-center space-y-2">
                  <p className="text-sm font-medium text-zinc-900">
                    No distinct grocery ingredients spotted
                  </p>
                  <p className="text-xs text-zinc-500">
                    Try framing the ingredients closer in clear lighting and scan again.
                  </p>
                </div>
              )}

              {!isAnalyzing && recognized.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span>
                      {autoAddedCount !== null
                        ? 'Added items:'
                        : 'Select & edit recognized items to add:'}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-emerald-800">
                      {recognized.length} detected
                    </span>
                  </div>

                  <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-2xl overflow-hidden bg-white">
                    {recognized.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-zinc-50/70"
                      >
                        {autoAddedCount === null ? (
                          <button
                            type="button"
                            onClick={() => toggleItemSelection(item.id)}
                            aria-label={`Select ${item.name}`}
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                          >
                            <span
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                item.selected
                                  ? 'bg-emerald-700 border-emerald-700 text-white'
                                  : 'bg-white border-zinc-300'
                              }`}
                            >
                              {item.selected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                            </span>
                          </button>
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 ml-1">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </span>
                        )}

                        <div className="flex-1 min-w-0">
                          {autoAddedCount === null ? (
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateItemName(item.id, e.target.value)}
                              className="w-full text-sm font-medium text-zinc-900 bg-transparent focus:outline-none focus:underline"
                            />
                          ) : (
                            <div className="text-sm font-medium text-zinc-900">{item.name}</div>
                          )}
                          <div className="text-[11px] text-zinc-500">{item.category}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Review Footer (shown when Auto-populate switch is turned off) */}
        {capturedPreview && !isAnalyzing && recognized.length > 0 && autoAddedCount === null && (
          <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-100 cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedItems.length === 0}
              onClick={handleManualConfirmAdd}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              Add {selectedItems.length} {selectedItems.length === 1 ? 'Item' : 'Items'} to
              Groceries
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
