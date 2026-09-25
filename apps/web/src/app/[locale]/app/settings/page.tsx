'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { Camera } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { isSupportedLocale, type SupportedLocale } from '@/i18n/routing';
import {
  getMe,
  updateMe,
  uploadImageFile,
  type MeResponse,
} from '@/lib/api';
import { DashboardHeader } from '@/components/web/dashboard-header';
import { ImageCropDialog } from '@/components/web/image-crop-dialog';
import { InitialsAvatar } from '@/components/web/initials-avatar';

export default function SettingsPage() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const params = useParams();
  const rawLocale = Array.isArray(params.locale) ? params.locale[0] : params.locale;
  const locale: SupportedLocale = isSupportedLocale(rawLocale ?? '') ? (rawLocale as SupportedLocale) : 'en';

  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const token = await getToken();
      if (!token) return;
      const me = await getMe(token);
      setProfile(me);
      setFullName(me?.fullName ?? '');
      setPhotoUrl(me?.profilePhotoUrl ?? clerkUser?.imageUrl ?? '');
      setLoading(false);
    })();
  }, [getToken, clerkUser]);

  async function handleCroppedPhoto(file: File) {
    setPendingPhoto(null);
    const token = await getToken();
    if (!token) return;
    setPhotoUploading(true);
    try {
      const url = await uploadImageFile(token, file, 'renting-rw/profiles');
      setPhotoUrl(url);
    } catch {
      setProfileMsg({ ok: false, text: 'Photo upload failed. Please try again.' });
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const token = await getToken();
    if (!token) return;
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const updated = await updateMe(token, { fullName, profilePhotoUrl: photoUrl || undefined });
      setProfile(updated);
      setProfileMsg({ ok: true, text: 'Profile updated successfully.' });
    } catch {
      setProfileMsg({ ok: false, text: 'Failed to save profile.' });
    } finally {
      setProfileSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <DashboardHeader locale={locale} />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-md border-4 border-border border-t-transparent" />
        </div>
      </main>
    );
  }

  const inputClass = 'h-10 w-full rounded-xl border border-border bg-white px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-muted disabled:text-muted-foreground';
  const labelClass = 'mb-1.5 block text-xs font-black uppercase tracking-wide text-muted-foreground';
  const joinLinks = [
    { href: `/${locale}/onboard/hoster`, label: 'Become a Hoster', desc: 'List cars and earn from rentals.' },
    { href: `/${locale}/onboard/driver`, label: 'Become a Driver', desc: 'Offer professional driving services.' },
    { href: `/${locale}/onboard/taxi`, label: 'Become a Taxi Driver', desc: 'Get discovered for instant taxi calls.' },
  ];

  return (
    <main className="min-h-screen bg-background">
      <DashboardHeader locale={locale} />

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Settings</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">Manage your public profile.</p>
        </div>

        <div className="border border-border bg-card shadow-card">
          <div className="border-b-2 border-border px-6 py-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-foreground">Public Profile</h2>
          </div>
          <div className="p-6">
            <form onSubmit={(e) => void handleSaveProfile(e)} className="space-y-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="relative">
                  <InitialsAvatar name={fullName || 'You'} src={photoUrl || null} size={96} />
                  {photoUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">Profile photo</p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">Crop before upload. Initials show if you skip a photo.</p>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    className="mt-2 flex items-center gap-1.5 rounded border-2 border-border bg-card px-3 py-1.5 text-xs font-black uppercase tracking-wide text-foreground shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" />
                    {photoUploading ? 'Uploading…' : 'Change photo'}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="pointer-events-none absolute h-px w-px opacity-0"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) setPendingPhoto(file);
                    }}
                  />
                </div>
              </div>
              {pendingPhoto ? (
                <ImageCropDialog
                  file={pendingPhoto}
                  aspect={1}
                  title="Crop profile photo"
                  onCancel={() => setPendingPhoto(null)}
                  onCropped={(file) => void handleCroppedPhoto(file)}
                />
              ) : null}

              <div>
                <label htmlFor="fullName" className={labelClass}>Full name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={profile?.email ?? ''}
                  disabled
                  className={inputClass}
                />
                <p className="mt-1 text-xs font-medium text-muted-foreground">Email is managed by your Clerk account.</p>
              </div>

              {profileMsg && (
                <p className={`rounded border-2 px-3 py-2 text-sm font-semibold ${profileMsg.ok ? 'border-brand bg-brand-soft text-brand' : 'border-red-600 bg-red-50 text-red-700'}`}>
                  {profileMsg.text}
                </p>
              )}

              <button
                type="submit"
                disabled={profileSaving}
                className="rounded border-2 border-brand-strong bg-brand px-5 py-2 text-sm font-black uppercase tracking-wide text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-50"
              >
                {profileSaving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>
        </div>

        <div className="border border-border bg-card shadow-card">
          <div className="border-b-2 border-border px-6 py-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-foreground">Join as</h2>
          </div>
          <div className="space-y-3 p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Hosting, driving, and taxi work use their own onboarding — not a role switch in Settings.
            </p>
            {joinLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
              >
                <div>
                  <p className="font-black text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">{item.desc}</p>
                </div>
                <span className="text-sm font-black text-brand">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
