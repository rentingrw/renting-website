'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@rentingi/ui';
import { Camera, CheckCircle, Clock, ShieldCheck, UserRound } from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { isSupportedLocale, type SupportedLocale } from '@/i18n/routing';
import {
  addRole,
  getCarUploadUrl,
  getKycStatus,
  getMe,
  submitKyc,
  updateMe,
  type AppRole,
  type KycStatus,
  type MeResponse,
} from '@/lib/api';
import { DashboardHeader } from '@/components/web/dashboard-header';

type Tab = 'profile' | 'verification' | 'roles';

export default function SettingsPage() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const params = useParams();
  const rawLocale = Array.isArray(params.locale) ? params.locale[0] : params.locale;
  const locale: SupportedLocale = isSupportedLocale(rawLocale ?? '') ? (rawLocale as SupportedLocale) : 'en';

  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // KYC fields
  const [nationalId, setNationalId] = useState('');
  const [tin, setTin] = useState('');
  const [company, setCompany] = useState('');
  const [kycSaving, setKycSaving] = useState(false);
  const [kycMsg, setKycMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Role
  const [roleAdding, setRoleAdding] = useState<AppRole | null>(null);
  const [roleMsg, setRoleMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void (async () => {
      const token = await getToken();
      if (!token) return;
      const [me, kycStatus] = await Promise.all([getMe(token), getKycStatus(token)]);
      setProfile(me);
      setKyc(kycStatus);
      setFullName(me.fullName ?? '');
      setPhotoUrl(me.profilePhotoUrl ?? clerkUser?.imageUrl ?? '');
      setLoading(false);
    })();
  }, [getToken, clerkUser]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = await getToken();
    if (!token) return;
    setPhotoUploading(true);
    try {
      const { uploadUrl, fields } = await getCarUploadUrl(token, 'renting-rw/profiles');
      const form = new FormData();
      Object.entries(fields).forEach(([k, v]) => form.append(k, String(v)));
      form.append('file', file);
      const res = await fetch(uploadUrl, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload failed');
      // Cloudinary returns the URL in the response XML
      const text = await res.text();
      const match = text.match(/<secure_url>(.*?)<\/secure_url>/);
      const url = match?.[1];
      if (url) setPhotoUrl(url);
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

  async function handleSaveKyc(e: React.FormEvent) {
    e.preventDefault();
    const token = await getToken();
    if (!token) return;
    setKycSaving(true);
    setKycMsg(null);
    try {
      await submitKyc(token, {
        nationalIdNumber: nationalId || undefined,
        tinNumber: tin || undefined,
        companyName: company || undefined,
      });
      const updated = await getKycStatus(token);
      setKyc(updated);
      setKycMsg({ ok: true, text: 'Verification info submitted. Our team will review it shortly.' });
    } catch {
      setKycMsg({ ok: false, text: 'Failed to submit verification info.' });
    } finally {
      setKycSaving(false);
    }
  }

  async function handleAddRole(role: AppRole) {
    const token = await getToken();
    if (!token) return;
    setRoleAdding(role);
    setRoleMsg(null);
    try {
      await addRole(token, role);
      const updated = await getMe(token);
      setProfile(updated);
      setRoleMsg({ ok: true, text: `Role "${role.replace('_', ' ')}" added to your account.` });
    } catch {
      setRoleMsg({ ok: false, text: 'Failed to add role.' });
    } finally {
      setRoleAdding(null);
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'verification', label: 'Verification / KYC' },
    { id: 'roles', label: 'Roles & Access' },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f0e8]">
        <DashboardHeader locale={locale} />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-md border-4 border-neutral-900 border-t-transparent" />
        </div>
      </main>
    );
  }

  const inputClass = 'h-10 w-full rounded border-2 border-neutral-900 bg-white px-3 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-neutral-100 disabled:text-neutral-400';
  const labelClass = 'mb-1.5 block text-xs font-black uppercase tracking-wide text-neutral-600';

  return (
    <main className="min-h-screen bg-[#f5f0e8]">
      <DashboardHeader locale={locale} />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-black text-neutral-900">Settings</h1>
        <p className="mt-1 text-sm font-medium text-neutral-500">Manage your profile, verification, and account access.</p>

        {/* Tabs */}
        <div className="-mx-4 mt-6 flex overflow-x-auto border-b-2 border-neutral-900 bg-white px-4 sm:mx-0 sm:px-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 -mb-px border-b-2 px-4 py-3 text-xs font-black uppercase tracking-wide transition ${
                tab === t.id
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="border-2 border-t-0 border-neutral-900 bg-white shadow-brutal">
            <div className="border-b-2 border-neutral-900 px-6 py-4">
              <h2 className="text-sm font-black uppercase tracking-wide text-neutral-900">Public Profile</h2>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => void handleSaveProfile(e)} className="space-y-6">
                {/* Photo */}
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-neutral-900 bg-neutral-100">
                    {photoUrl ? (
                      <Image src={photoUrl} alt="Profile" fill sizes="96px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <UserRound className="h-10 w-10 text-neutral-400" />
                      </div>
                    )}
                    {photoUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black text-neutral-900">Profile photo</p>
                    <p className="mt-0.5 text-xs font-medium text-neutral-500">JPG, PNG or WEBP. Max 10MB.</p>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      className="mt-2 flex items-center gap-1.5 rounded border-2 border-neutral-900 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-50"
                    >
                      <Camera className="h-4 w-4" />
                      {photoUploading ? 'Uploading…' : 'Change photo'}
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="absolute opacity-0 w-px h-px pointer-events-none"
                      onChange={(e) => void handlePhotoUpload(e)}
                    />
                  </div>
                </div>

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
                  <p className="mt-1 text-xs font-medium text-neutral-400">Email is managed by your Clerk account.</p>
                </div>

                {profileMsg && (
                  <p className={`rounded border-2 px-3 py-2 text-sm font-semibold ${profileMsg.ok ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-red-600 bg-red-50 text-red-700'}`}>
                    {profileMsg.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="rounded border-2 border-teal-800 bg-teal-600 px-5 py-2 text-sm font-black uppercase tracking-wide text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-50"
                >
                  {profileSaving ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Verification Tab */}
        {tab === 'verification' && (
          <div className="border-2 border-t-0 border-neutral-900 bg-white shadow-brutal">
            <div className="flex items-center gap-2 border-b-2 border-neutral-900 px-6 py-4">
              <ShieldCheck className="h-5 w-5 text-teal-600" />
              <h2 className="text-sm font-black uppercase tracking-wide text-neutral-900">Identity Verification (KYC)</h2>
            </div>
            <div className="p-6">
              {kyc?.isVerified ? (
                <div className="mb-6 flex items-center gap-3 rounded border-2 border-teal-600 bg-teal-50 px-4 py-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-teal-600" />
                  <div>
                    <p className="text-sm font-black text-teal-800">Identity verified</p>
                    <p className="text-xs font-medium text-teal-600">Your account is fully verified.</p>
                  </div>
                </div>
              ) : kyc?.hasSubmittedKyc ? (
                <div className="mb-6 flex items-center gap-3 rounded border-2 border-amber-500 bg-amber-50 px-4 py-3">
                  <Clock className="h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-black text-amber-800">Under review</p>
                    <p className="text-xs font-medium text-amber-600">Our team is reviewing your submission. This usually takes 1–2 business days.</p>
                  </div>
                </div>
              ) : (
                <div className="mb-6 rounded border-2 border-neutral-300 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-600">
                  Submit your details below to verify your identity and unlock full platform access.
                </div>
              )}

              <form onSubmit={(e) => void handleSaveKyc(e)} className="space-y-4">
                <div>
                  <label htmlFor="nationalId" className={labelClass}>National ID number</label>
                  <input
                    id="nationalId"
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="e.g. 1 19900101 0 00001 8"
                    className={inputClass}
                  />
                  {kyc?.nationalIdSubmitted && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-teal-600">
                      <CheckCircle className="h-3 w-3" /> Submitted
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="tin" className={labelClass}>
                    TIN number <span className="font-medium normal-case text-neutral-400">(optional)</span>
                  </label>
                  <input
                    id="tin"
                    type="text"
                    value={tin}
                    onChange={(e) => setTin(e.target.value)}
                    placeholder="e.g. 101234567"
                    className={inputClass}
                  />
                  {kyc?.tinSubmitted && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-teal-600">
                      <CheckCircle className="h-3 w-3" /> Submitted
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="company" className={labelClass}>
                    Company name <span className="font-medium normal-case text-neutral-400">(optional — for business accounts)</span>
                  </label>
                  <input
                    id="company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Kigali Rides Ltd"
                    className={inputClass}
                  />
                </div>

                {kycMsg && (
                  <p className={`rounded border-2 px-3 py-2 text-sm font-semibold ${kycMsg.ok ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-red-600 bg-red-50 text-red-700'}`}>
                    {kycMsg.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={kycSaving}
                  className="rounded border-2 border-teal-800 bg-teal-600 px-5 py-2 text-sm font-black uppercase tracking-wide text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-50"
                >
                  {kycSaving ? 'Submitting…' : 'Submit for verification'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Roles Tab */}
        {tab === 'roles' && (
          <div className="border-2 border-t-0 border-neutral-900 bg-white shadow-brutal">
            <div className="border-b-2 border-neutral-900 px-6 py-4">
              <h2 className="text-sm font-black uppercase tracking-wide text-neutral-900">Roles &amp; Access</h2>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm font-medium text-neutral-500">
                Your current roles determine what you can do on the platform. You can add roles at any time.
              </p>

              <div className="flex flex-wrap gap-2">
                {profile?.roles.map((r) => (
                  <span key={r} className="rounded border-2 border-teal-600 bg-teal-50 px-2.5 py-0.5 text-xs font-black capitalize text-teal-700">
                    {r.replace('_', ' ')}
                  </span>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {(['car_owner', 'driver'] as AppRole[]).map((role) => {
                  const hasRole = profile?.roles.includes(role);
                  return (
                    <div
                      key={role}
                      className={`flex items-center justify-between rounded border-2 p-4 ${
                        hasRole ? 'border-teal-600 bg-teal-50' : 'border-neutral-900 bg-white shadow-brutal-xs'
                      }`}
                    >
                      <div>
                        <p className="font-black capitalize text-neutral-900">{role.replace('_', ' ')}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500">
                          {role === 'car_owner'
                            ? 'List your cars and earn by renting them out.'
                            : 'Offer professional driving services to clients.'}
                        </p>
                      </div>
                      {hasRole ? (
                        <span className="rounded border-2 border-teal-600 bg-teal-50 px-2.5 py-0.5 text-xs font-black text-teal-700">Active</span>
                      ) : (
                        <button
                          type="button"
                          disabled={roleAdding === role}
                          onClick={() => void handleAddRole(role)}
                          className="rounded border-2 border-teal-800 bg-teal-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-50"
                        >
                          {roleAdding === role ? 'Adding…' : 'Add role'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {roleMsg && (
                <p className={`rounded border-2 px-3 py-2 text-sm font-semibold ${roleMsg.ok ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-red-600 bg-red-50 text-red-700'}`}>
                  {roleMsg.text}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
