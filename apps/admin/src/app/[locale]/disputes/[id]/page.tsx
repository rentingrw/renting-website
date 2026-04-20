'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { getAdminDispute, escalateDispute, type AdminDisputeDetail } from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';

const AUTH_ERROR_MSG =
  'Session not ready. Please refresh the page or sign out and sign in again.';

export default function AdminDisputeDetailPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const params = useParams<{ locale?: string; id?: string }>();
  const locale = params.locale ?? 'en';
  const disputeId = params.id ?? '';
  const [dispute, setDispute] = useState<AdminDisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [escalating, setEscalating] = useState(false);

  const loadDispute = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !disputeId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const data = await getAdminDispute(token, disputeId);
      setDispute(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dispute detail.');
    } finally {
      setLoading(false);
    }
  }, [disputeId, fetchToken, isLoaded, isSignedIn]);

  useEffect(() => {
    void loadDispute();
  }, [loadDispute]);

  const handleEscalate = async () => {
    if (!disputeId) return;
    setEscalating(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await escalateDispute(token, disputeId);
      await loadDispute();
    } catch (escalateError) {
      setError(escalateError instanceof Error ? escalateError.message : 'Failed to escalate dispute.');
    } finally {
      setEscalating(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dispute detail</h1>
          <p className="text-sm text-muted-foreground">Review booking context, parties, and chat evidence.</p>
        </div>
        <div className="flex gap-2">
          {dispute && !['resolved', 'rejected', 'escalated'].includes(dispute.status) && (
            <button
              type="button"
              onClick={() => void handleEscalate()}
              disabled={escalating}
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              {escalating ? 'Escalating...' : 'Escalate'}
            </button>
          )}
          {dispute?.status === 'escalated' && (
            <span className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
              ⚠ Escalated
            </span>
          )}
          <Link href={`/${locale}/disputes`} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
            Back to disputes
          </Link>
        </div>
      </header>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadDispute()}
            className="rounded border border-red-400 bg-white px-3 py-1.5 font-medium hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">Loading dispute details...</div>
      ) : dispute ? (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border p-4">
              <h2 className="font-semibold">Opened by</h2>
              <p className="mt-2 text-sm">{dispute.openedBy.fullName}</p>
              <p className="text-xs text-muted-foreground">{dispute.openedBy.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Trust: {dispute.openedBy.trustScore}</p>
            </article>
            <article className="rounded-xl border p-4">
              <h2 className="font-semibold">Against</h2>
              <p className="mt-2 text-sm">{dispute.againstUser.fullName}</p>
              <p className="text-xs text-muted-foreground">{dispute.againstUser.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Trust: {dispute.againstUser.trustScore}</p>
            </article>
          </section>

          <section className="rounded-xl border p-4">
            <h2 className="font-semibold">Case summary</h2>
            <div className="mt-2 space-y-1 text-sm">
              <p>
                <span className="font-medium">Reason:</span> {dispute.reason}
              </p>
              <p>
                <span className="font-medium">Status:</span> {dispute.status}
              </p>
              <p>
                <span className="font-medium">Description:</span> {dispute.description || 'No description provided'}
              </p>
              <p>
                <span className="font-medium">Resolution note:</span> {dispute.resolutionNote || 'Not resolved yet'}
              </p>
            </div>
          </section>

          <section className="rounded-xl border">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Chat log evidence</h2>
            </div>
            <div className="max-h-[460px] overflow-auto p-4">
              {dispute.chatLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No chat history linked to this dispute.</p>
              ) : (
                <div className="space-y-3">
                  {dispute.chatLog.map((message) => (
                    <article key={message.id} className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">
                        {message.sender.fullName} → {message.receiver.fullName}
                      </p>
                      <p className="mt-1 text-sm">{message.content}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
