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
      <main className="min-h-screen bg-gray-50">
        <DashboardHeader locale={locale} />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader locale={locale} />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your profile, verification, and account access.</p>

        {/* Tabs */}
        <div className="-mx-4 mt-6 flex overflow-x-auto border-b border-gray-200 bg-white px-4 sm:mx-0 sm:rounded-t-xl sm:px-0 sm:pl-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === 'profile' && (
          <Card className="rounded-t-none border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-base">Public Profile</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={(e) => void handleSaveProfile(e)} className="space-y-6">
                {/* Photo */}
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100">
                    {photoUrl ? (
                      <Image src={photoUrl} alt="Profile" fill sizes="96px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <UserRound className="h-10 w-10 text-gray-400" />
                      </div>
                    )}
                    {photoUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Profile photo</p>
                    <p className="mt-0.5 text-xs text-gray-500">JPG, PNG or WEBP. Max 10MB.</p>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      className="mt-2 flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Camera className="h-4 w-4" />
                      {photoUploading ? 'Uploading…' : 'Change photo'}
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handlePhotoUpload(e)}
                    />
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                {/* Email (read-only from Clerk) */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={profile?.email ?? ''}
                    disabled
                    className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">Email is managed by your Clerk account.</p>
                </div>

                {profileMsg && (
                  <p className={`text-sm ${profileMsg.ok ? 'text-teal-700' : 'text-red-600'}`}>{profileMsg.text}</p>
                )}

                <Button type="submit" disabled={profileSaving} className="bg-teal-600 hover:bg-teal-700">
                  {profileSaving ? 'Saving…' : 'Save changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Verification Tab */}
        {tab === 'verification' && (
          <Card className="rounded-t-none border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
                Identity Verification (KYC)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Status banner */}
              {kyc?.isVerified ? (
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-teal-600" />
                  <div>
                    <p className="text-sm font-semibold text-teal-800">Identity verified</p>
                    <p className="text-xs text-teal-600">Your account is fully verified.</p>
                  </div>
                </div>
              ) : kyc?.hasSubmittedKyc ? (
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <Clock className="h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Under review</p>
                    <p className="text-xs text-amber-600">Our team is reviewing your submission. This usually takes 1–2 business days.</p>
                  </div>
                </div>
              ) : (
                <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Submit your details below to verify your identity and unlock full platform access.
                </div>
              )}

              <form onSubmit={(e) => void handleSaveKyc(e)} className="space-y-4">
                <div>
                  <label htmlFor="nationalId" className="mb-1.5 block text-sm font-medium text-gray-700">
                    National ID number
                  </label>
                  <input
                    id="nationalId"
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="e.g. 1 19900101 0 00001 8"
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  {kyc?.nationalIdSubmitted && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-teal-600">
                      <CheckCircle className="h-3 w-3" /> Submitted
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="tin" className="mb-1.5 block text-sm font-medium text-gray-700">
                    TIN number <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="tin"
                    type="text"
                    value={tin}
                    onChange={(e) => setTin(e.target.value)}
                    placeholder="e.g. 101234567"
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  {kyc?.tinSubmitted && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-teal-600">
                      <CheckCircle className="h-3 w-3" /> Submitted
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Company name <span className="text-gray-400">(optional — for business accounts)</span>
                  </label>
                  <input
                    id="company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Kigali Rides Ltd"
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                {kycMsg && (
                  <p className={`text-sm ${kycMsg.ok ? 'text-teal-700' : 'text-red-600'}`}>{kycMsg.text}</p>
                )}

                <Button type="submit" disabled={kycSaving} className="bg-teal-600 hover:bg-teal-700">
                  {kycSaving ? 'Submitting…' : 'Submit for verification'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Roles Tab */}
        {tab === 'roles' && (
          <Card className="rounded-t-none border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-base">Roles &amp; Access</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Your current roles determine what you can do on the platform. You can add roles at any time.
              </p>

              {/* Current roles */}
              <div className="flex flex-wrap gap-2">
                {profile?.roles.map((r) => (
                  <Badge key={r} className="bg-teal-50 text-teal-700 capitalize">
                    {r.replace('_', ' ')}
                  </Badge>
                ))}
              </div>

              {/* Add roles */}
              <div className="mt-6 space-y-3">
                {(['car_owner', 'driver'] as AppRole[]).map((role) => {
                  const hasRole = profile?.roles.includes(role);
                  return (
                    <div
                      key={role}
                      className={`flex items-center justify-between rounded-xl border p-4 ${
                        hasRole ? 'border-teal-200 bg-teal-50/50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-gray-900 capitalize">{role.replace('_', ' ')}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {role === 'car_owner'
                            ? 'List your cars and earn by renting them out.'
                            : 'Offer professional driving services to clients.'}
                        </p>
                      </div>
                      {hasRole ? (
                        <Badge className="shrink-0 bg-teal-100 text-teal-700">Active</Badge>
                      ) : (
                        <button
                          type="button"
                          disabled={roleAdding === role}
                          onClick={() => void handleAddRole(role)}
                          className="shrink-0 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
                        >
                          {roleAdding === role ? 'Adding…' : 'Add role'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {roleMsg && (
                <p className={`text-sm ${roleMsg.ok ? 'text-teal-700' : 'text-red-600'}`}>{roleMsg.text}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
