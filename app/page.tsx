'use client';

import * as chrono from 'chrono-node';
import { useAction, useQuery } from 'convex/react';
import { Loader } from 'lucide-react';
import { generate } from 'random-words';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Drawer } from 'vaul';

import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';

type Email = {
  _id: Id<'emails'>;
  _creationTime: number;
  email: string;
  expiry?: number;
  comment?: string;
  cloudflareRuleId?: string;
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);
  const isFuture = diff > 0;

  const minutes = Math.floor(absDiff / (1000 * 60));
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return isFuture ? 'in a moment' : 'just now';
  if (minutes < 60) return isFuture ? `in ${minutes}m` : `${minutes}m ago`;
  if (hours < 24) return isFuture ? `in ${hours}h` : `${hours}h ago`;
  if (days === 1) return isFuture ? 'tomorrow' : 'yesterday';
  if (days < 7) return isFuture ? `in ${days} days` : `${days} days ago`;

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatFullDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function parseExpiry(input: string): number | undefined {
  const trimmed = input.trim();
  if (!trimmed || trimmed === 'never') return undefined;
  return chrono.parseDate(trimmed)?.getTime();
}

export default function Home() {
  const emailsData = useQuery(api.emails.getEmails);
  const emails = emailsData
    ?.slice()
    .sort((a, b) => b._creationTime - a._creationTime);
  const createEmailRoute = useAction(api.emails.createEmailRoute);
  const deleteEmail = useAction(api.emails.deleteEmail);
  const updateEmail = useAction(api.emails.updateEmail);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const [generateDrawerOpen, setGenerateDrawerOpen] = useState(false);
  const [expiryInput, setExpiryInput] = useState('');
  const [parsedExpiry, setParsedExpiry] = useState<number | undefined>(
    undefined,
  );
  const [isParsingExpiry, setIsParsingExpiry] = useState(false);
  const [comment, setComment] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<Email | null>(null);
  const [editExpiryInput, setEditExpiryInput] = useState('');
  const [editParsedExpiry, setEditParsedExpiry] = useState<number | undefined>(
    undefined,
  );
  const [isParsingEditExpiry, setIsParsingEditExpiry] = useState(false);
  const [editComment, setEditComment] = useState('');
  const [editCopied, setEditCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const editDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const expiryInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (id: string, email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1000);
  };

  const toggleDateExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpiryChange = useCallback((value: string) => {
    setExpiryInput(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (value.trim()) {
      setIsParsingExpiry(true);
    }
    debounceRef.current = setTimeout(() => {
      setParsedExpiry(parseExpiry(value));
      setIsParsingExpiry(false);
    }, 300);
  }, []);

  const handleEditExpiryChange = useCallback((value: string) => {
    setEditExpiryInput(value);
    if (editDebounceRef.current) {
      clearTimeout(editDebounceRef.current);
    }
    if (value.trim()) {
      setIsParsingEditExpiry(true);
    }
    editDebounceRef.current = setTimeout(() => {
      setEditParsedExpiry(parseExpiry(value));
      setIsParsingEditExpiry(false);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (editDebounceRef.current) clearTimeout(editDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !generateDrawerOpen && !editDrawerOpen) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        setGenerateDrawerOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [generateDrawerOpen, editDrawerOpen]);

  useEffect(() => {
    if (generateDrawerOpen) {
      setTimeout(() => expiryInputRef.current?.focus(), 100);
    }
  }, [generateDrawerOpen]);

  const handleExpiryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commentInputRef.current?.focus();
    }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  const generateRandomEmail = () => {
    const words = generate({ exactly: 2, maxLength: 8 }) as string[];
    const randomNum = Math.floor(Math.random() * 900) + 100;
    return `${words[0]}_${words[1]}${randomNum}`;
  };

  const handleConfirm = async () => {
    setIsGenerating(true);
    try {
      const randomEmail = generateRandomEmail();
      const result = await createEmailRoute({
        email: randomEmail,
        expiry: parsedExpiry,
        comment: comment || undefined,
      });

      if (result?.result?.matchers?.[0]?.value) {
        await navigator.clipboard.writeText(result.result.matchers[0].value);
      }

      setGenerateDrawerOpen(false);
      setExpiryInput('');
      setParsedExpiry(undefined);
      setComment('');
    } finally {
      setIsGenerating(false);
    }
  };

  const openEditDrawer = (email: Email) => {
    setEditingEmail(email);
    setEditExpiryInput('');
    setEditParsedExpiry(email.expiry);
    setEditComment(email.comment || '');
    setEditCopied(false);
    setEditDrawerOpen(true);
  };

  const handleEditCopy = () => {
    if (editingEmail) {
      navigator.clipboard.writeText(editingEmail.email);
      setEditCopied(true);
      setTimeout(() => setEditCopied(false), 1500);
    }
  };

  const handleEditDelete = async () => {
    if (!editingEmail) return;
    setIsDeleting(true);
    try {
      await deleteEmail({ id: editingEmail._id });
      setEditDrawerOpen(false);
      setEditingEmail(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingEmail) return;
    setIsSaving(true);
    try {
      await updateEmail({
        id: editingEmail._id,
        expiry: editParsedExpiry,
        comment: editComment || undefined,
      });
      setEditDrawerOpen(false);
      setEditingEmail(null);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = editingEmail
    ? editParsedExpiry !== editingEmail.expiry ||
      editComment !== (editingEmail.comment || '')
    : false;

  return (
    <>
      <Drawer.Root
        open={generateDrawerOpen}
        onOpenChange={setGenerateDrawerOpen}
        shouldScaleBackground
      >
        <main className="h-screen bg-background flex flex-col">
          <div className="px-6 pt-12 md:px-12 lg:px-24">
            <div className="mx-auto max-w-2xl">
              <h1 className="flex items-center gap-3 text-2xl font-medium tracking-tight text-foreground">
                vanish
                {!emails && (
                  <Loader className="h-4 w-4 animate-spin text-muted-foreground translate-y-0.5" />
                )}
              </h1>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div className="absolute inset-0 overflow-y-auto px-6 md:px-12 lg:px-24 py-8">
              <div className="mx-auto max-w-2xl">
                {emails && emails.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No emails yet
                  </div>
                ) : emails ? (
                  <ul className="space-y-4 pb-8">
                    {emails.map((email, index) => (
                      <li
                        key={email._id}
                        className="group flex flex-col gap-1 border-b border-border pb-4 last:border-0 animate-in fade-in slide-in-from-bottom-1 cursor-pointer"
                        style={{
                          animationDelay: `${index * 0.02}s`,
                          animationFillMode: 'backwards',
                        }}
                        onClick={() => openEditDrawer(email)}
                      >
                        <div className="flex gap-2 md:flex-row flex-col md:items-center items-start">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(email._id, email.email);
                            }}
                            className="w-fit cursor-pointer text-left text-regular text-foreground hover:opacity-70 transition-opacity leading-none"
                            style={{
                              fontFamily: 'var(--font-pp-supply-mono)',
                              fontWeight: 340,
                            }}
                          >
                            {copiedId === email._id ? (
                              <span className="text-blue-700 leading-none">
                                [copied]
                              </span>
                            ) : (
                              email.email
                            )}
                          </button>
                          {email.expiry && copiedId !== email._id && (
                            <button
                              type="button"
                              className="text-blue-700 text-[14px] font-medium opacity-80 cursor-pointer hover:opacity-100"
                              style={{
                                fontFamily: 'var(--font-jetbrains-mono)',
                              }}
                              onClick={(e) => toggleDateExpand(email._id, e)}
                            >
                              [
                              {expandedDates.has(email._id)
                                ? formatFullDateTime(email.expiry)
                                : formatRelativeTime(email.expiry)}
                              ]
                            </button>
                          )}
                        </div>
                        {email.comment && (
                          <span
                            className="text-[13px] text-muted-foreground"
                            style={{ fontFamily: 'var(--font-inter)' }}
                          >
                            {email.comment}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            <div className="bottom-scroll-mask z-10 translate-y-1.5" />
          </div>

          <div className="px-6 pb-6 md:px-12 lg:px-24">
            <div className="mx-auto max-w-2xl">
              <Drawer.Trigger asChild>
                <button
                  type="button"
                  className="button-3 w-full py-3 text-sm font-semibold"
                  onMouseDown={() => setGenerateDrawerOpen(true)}
                >
                  Generate
                </button>
              </Drawer.Trigger>
            </div>
          </div>
        </main>

        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-background rounded-t-[10px] flex flex-col">
            <div className="p-4 pb-8 mx-auto w-full max-w-md">
              <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-muted mb-6" />
              <Drawer.Title className="text-lg font-medium mb-4">
                Generate Email
              </Drawer.Title>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="expiry"
                    className="flex text-sm text-muted-foreground mb-1 items-center justify-between"
                  >
                    <p>{parsedExpiry ? 'Expires:' : 'Expiry'}</p>
                    {parsedExpiry && (
                      <p className="text-sm text-muted-foreground font-medium">
                        {formatFullDateTime(parsedExpiry)}
                      </p>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      ref={expiryInputRef}
                      id="expiry"
                      type="text"
                      spellCheck={false}
                      autoCorrect="off"
                      value={expiryInput}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      onKeyDown={handleExpiryKeyDown}
                      placeholder="Optional"
                      className="w-full px-3 py-2 pr-9 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {isParsingExpiry && (
                      <Loader className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="comment"
                    className="block text-sm text-muted-foreground mb-1"
                  >
                    Comment
                  </label>
                  <input
                    ref={commentInputRef}
                    id="comment"
                    type="text"
                    spellCheck={false}
                    autoCorrect="off"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={handleCommentKeyDown}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <button
                  type="button"
                  className="button-3 w-full h-11 text-sm font-semibold flex items-center justify-center"
                  onMouseDown={handleConfirm}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <Drawer.Root
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        shouldScaleBackground
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-background rounded-t-[10px] flex flex-col">
            <div className="p-4 pb-8 mx-auto w-full max-w-md">
              <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-muted mb-6" />
              <Drawer.Title className="sr-only">Edit Email</Drawer.Title>

              {editingEmail && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleEditCopy}
                    className="w-full text-left text-foreground hover:opacity-70 transition-opacity"
                    style={{
                      fontFamily: 'var(--font-pp-supply-mono)',
                      fontWeight: 340,
                    }}
                  >
                    {editCopied ? (
                      <span className="text-blue-700">[copied]</span>
                    ) : (
                      editingEmail.email
                    )}
                  </button>

                  <div>
                    <label
                      htmlFor="edit-expiry"
                      className="flex text-sm text-muted-foreground mb-1 items-center justify-between"
                    >
                      <p>{editParsedExpiry ? 'Expires:' : 'Expiry'}</p>
                      {editParsedExpiry && (
                        <p className="text-sm text-muted-foreground font-medium">
                          {formatFullDateTime(editParsedExpiry)}
                        </p>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        id="edit-expiry"
                        type="text"
                        spellCheck={false}
                        autoCorrect="off"
                        value={editExpiryInput}
                        onChange={(e) => handleEditExpiryChange(e.target.value)}
                        placeholder={
                          editingEmail.expiry
                            ? formatFullDateTime(editingEmail.expiry)
                            : 'No expiry set'
                        }
                        className="w-full px-3 py-2 pr-9 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {isParsingEditExpiry && (
                        <Loader className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-comment"
                      className="block text-sm text-muted-foreground mb-1"
                    >
                      Comment
                    </label>
                    <input
                      id="edit-comment"
                      type="text"
                      spellCheck={false}
                      autoCorrect="off"
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="button-delete flex-1 h-11 text-sm font-semibold flex items-center justify-center"
                      onClick={handleEditDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        'Delete'
                      )}
                    </button>
                    <button
                      type="button"
                      className="button-3 flex-1 h-11 text-sm font-semibold flex items-center justify-center"
                      onClick={
                        hasChanges
                          ? handleEditSave
                          : () => setEditDrawerOpen(false)
                      }
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : hasChanges ? (
                        'Save'
                      ) : (
                        'Cancel'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
