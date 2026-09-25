'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rentingi/ui';
import { Check, Copy, Share2 } from 'lucide-react';
import { useEffect, useState, type MouseEvent, type PointerEvent } from 'react';

type ShareMenuProps = {
  url: string;
  title: string;
  text?: string;
  className?: string;
};

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
}

function toAbsoluteUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (typeof window === 'undefined') return url;
  return new URL(url, window.location.origin).toString();
}

export function ShareMenu({ url, title, text, className }: ShareMenuProps) {
  const [copied, setCopied] = useState<'link' | 'instagram' | 'tiktok' | null>(null);
  const [absoluteUrl, setAbsoluteUrl] = useState(url);

  useEffect(() => {
    setAbsoluteUrl(toAbsoluteUrl(url));
  }, [url]);

  const shareBody = text ? `${text}\n${absoluteUrl}` : `${title}\n${absoluteUrl}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareBody)}`;

  function markCopied(kind: 'link' | 'instagram' | 'tiktok') {
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 2000);
  }

  function stopCardNavigation(event: MouseEvent | PointerEvent) {
    event.stopPropagation();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={stopCardNavigation}
          onPointerDown={stopCardNavigation}
          className={
            className ??
            'rounded-md border border-border bg-card p-1.5 text-brand shadow-sm transition hover:bg-brand-soft'
          }
          aria-label="Share"
        >
          {copied ? <Check className="h-4 w-4 text-brand" /> : <Share2 className="h-4 w-4" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 border border-border bg-card p-1 shadow-sm"
        onClick={stopCardNavigation}
      >
        <DropdownMenuItem asChild>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="cursor-pointer rounded px-2 py-1.5 text-sm font-bold text-foreground"
          >
            WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer rounded px-2 py-1.5 text-sm font-bold text-foreground"
          onSelect={async () => {
            await copyText(absoluteUrl);
            markCopied('instagram');
          }}
        >
          {copied === 'instagram' ? 'Copied. Paste in Instagram' : 'Instagram'}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer rounded px-2 py-1.5 text-sm font-bold text-foreground"
          onSelect={async () => {
            await copyText(absoluteUrl);
            markCopied('tiktok');
          }}
        >
          {copied === 'tiktok' ? 'Copied. Paste in TikTok' : 'TikTok'}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer rounded px-2 py-1.5 text-sm font-bold text-foreground"
          onSelect={async () => {
            await copyText(absoluteUrl);
            markCopied('link');
          }}
        >
          {copied === 'link' ? (
            <span className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5" /> Link copied
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Copy className="h-3.5 w-3.5" /> Copy link
            </span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
