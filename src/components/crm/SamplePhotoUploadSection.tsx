import React, { useRef } from 'react';
import { Camera, Upload, X, Image as ImageIcon, Plus } from 'lucide-react';

export interface SamplePhoto {
  id: string;
  name: string;
  url: string; // base64 data url
  size?: number;
  date?: string;
}

interface SamplePhotoUploadSectionProps {
  photos: SamplePhoto[];
  onChange: (photos: SamplePhoto[]) => void;
  disabled?: boolean;
  maxPhotos?: number;
}

export const SamplePhotoUploadSection: React.FC<SamplePhotoUploadSectionProps> = ({
  photos,
  onChange,
  disabled = false,
  maxPhotos = 10
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawResult = e.target?.result as string;
        if (!rawResult) {
          resolve('');
          return;
        }

        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1600;
          let width = img.width;
          let height = img.height;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } else {
            resolve(rawResult);
          }
        };
        img.onerror = () => resolve(rawResult);
        img.src = rawResult;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    const newPhotos: SamplePhoto[] = [];
    for (const file of validFiles) {
      if (photos.length + newPhotos.length >= maxPhotos) break;
      const base64Url = await compressImage(file);
      if (base64Url) {
        newPhotos.push({
          id: 'photo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          name: file.name,
          url: base64Url,
          size: file.size,
          date: new Date().toISOString()
        });
      }
    }

    if (newPhotos.length > 0) {
      onChange([...photos, ...newPhotos]);
    }
  };

  const handleRemove = (id: string) => {
    onChange(photos.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-secondary flex items-center gap-1.5">
          <Camera size={13} className="text-amber-500" />
          Sample Inspection Photos ({photos.length})
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="text-[11px] font-bold text-rex-600 hover:text-rex-500 flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50"
        >
          <Plus size={12} /> Add Photos
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {photos.length === 0 ? (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed border-theme-subtle hover:border-amber-500/60 bg-surface/50 hover:bg-amber-500/5 transition-all p-3 text-center rounded-none cursor-pointer flex flex-col items-center justify-center gap-1 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Upload size={18} className="text-muted" />
          <p className="text-xs font-semibold text-primary">
            Upload sample photos (Single or Multiple)
          </p>
          <p className="text-[10px] text-muted">
            Attach drawings, component condition, stamped markings, or dimensional photos
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {photos.map(p => (
              <div 
                key={p.id} 
                className="relative group aspect-square rounded-none overflow-hidden border border-theme-subtle bg-surface"
              >
                <img
                  src={p.url}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(p.id);
                    }}
                    className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-none transition-colors cursor-pointer"
                    title="Remove photo"
                  >
                    <X size={11} />
                  </button>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 text-[9px] text-white truncate font-mono">
                  {p.name}
                </div>
              </div>
            ))}

            {!disabled && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border border-dashed border-theme-subtle hover:border-amber-500 flex flex-col items-center justify-center gap-1 text-muted hover:text-amber-600 transition-colors bg-surface/30 cursor-pointer"
                title="Add more photos"
              >
                <Plus size={16} />
                <span className="text-[9px] font-bold">Add Photo</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
