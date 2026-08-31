import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadDropzone({ file, onFileChange }) {
  const [dragging, setDragging] = useState(false);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const handleFiles = useCallback(
    (fileList) => {
      const picked = fileList?.[0];
      if (picked && picked.type.startsWith("image/")) onFileChange(picked);
    },
    [onFileChange]
  );

  if (file) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-border bg-surface-sunken">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Selected prescription" className="max-h-80 w-full object-contain" />
        <button
          type="button"
          onClick={() => onFileChange(null)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-white transition-colors hover:bg-ink"
          aria-label="Remove photo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center gap-4 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
        dragging ? "border-brand bg-brand-soft" : "border-border bg-surface-raised"
      )}
    >
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
        aria-label="Take a photo"
      >
        <Camera className="h-8 w-8" strokeWidth={1.75} />
      </button>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-ink">Take a photo of the prescription</p>
        <p className="text-sm text-ink-muted">
          or{" "}
          <button type="button" onClick={() => fileInputRef.current?.click()} className="font-medium text-brand underline underline-offset-2">
            choose a photo
          </button>{" "}
          — or drag one in
        </p>
      </div>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <span className="flex items-center gap-1.5 text-xs text-ink-faint">
        <ImagePlus className="h-3.5 w-3.5" /> JPG or PNG, one prescription per photo
      </span>
    </div>
  );
}
