'use client';

import { Camera } from 'lucide-react';
import { useRef, useState } from 'react';

import { ImageCropDialog } from '@/components/web/image-crop-dialog';
import { InitialsAvatar } from '@/components/web/initials-avatar';
import { uploadImageFile } from '@/lib/api';

type CroppedPhotoPickerProps = {
  label: string;
  value?: string | null;
  folder: string;
  aspect?: number;
  round?: boolean;
  nameForInitials?: string;
  getToken: () => Promise<string | null>;
  onUploaded: (url: string) => void;
};

export function CroppedPhotoPicker({
  label,
  value,
  folder,
  aspect = 1,
  round = false,
  nameForInitials,
  getToken,
  onUploaded,
}: CroppedPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleCropped(file: File) {
    setPendingFile(null);
    setUploading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to upload.');
      const url = await uploadImageFile(token, file, folder);
      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/60 p-4 text-left transition hover:border-brand"
      >
        {round ? (
          <InitialsAvatar name={nameForInitials || 'Photo'} src={value} size={72} />
        ) : value ? (
          <div className="relative h-16 w-24 overflow-hidden rounded-md border border-border bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-16 w-24 items-center justify-center rounded-md border border-border bg-muted">
            <Camera className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="text-sm font-bold text-foreground">{uploading ? 'Uploading…' : value ? 'Change photo' : 'Add photo'}</p>
          <p className="text-xs text-muted-foreground">You can crop before it uploads.</p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) setPendingFile(file);
        }}
      />
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {pendingFile ? (
        <ImageCropDialog
          file={pendingFile}
          aspect={aspect}
          onCancel={() => setPendingFile(null)}
          onCropped={(file) => void handleCropped(file)}
        />
      ) : null}
    </div>
  );
}
