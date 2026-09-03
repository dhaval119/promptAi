import { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  listConversations,
  getConversation,
  upsertConversation,
  deleteConversation,
} from '../lib/chatStorage';
import { useAuth } from '../lib/AuthContext';
import NavPill from '../components/NavPill';
import {
  DAILY_FREE_LIMIT,
  getTodayUsage,
  incrementTodayUsage,
  isOverLimit,
} from '../lib/usage';

function getDateLabel(ts) {
  if (!ts) return 'Recent';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'Recent';

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const day = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );

  if (day.getTime() === today.getTime()) return 'Today';
  if (day.getTime() === yesterday.getTime()) return 'Yesterday';

  return 'Earlier';
}

function groupChatsByDate(chats) {
  const groups = {
    Today: [],
    Yesterday: [],
    Earlier: [],
    Recent: [],
  };

  (chats || []).forEach((c) => {
    const ts =
      c.updatedAt ||
      c.createdAt ||
      c.timestamp ||
      c.date ||
      null;

    const label = getDateLabel(ts);

    if (!groups[label]) {
      groups[label] = [];
    }

    groups[label].push(c);
  });

  const totalDated =
    groups.Today.length +
    groups.Yesterday.length +
    groups.Earlier.length;

  if (
    totalDated === 0 &&
    groups.Recent.length === 0 &&
    chats?.length
  ) {
    groups.Recent = [...chats];
  }

  return groups;
}

function getRelativeTime(ts) {
  if (!ts) return 'Just now';

  const date = new Date(ts);

  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  if (diffSeconds < 60) {
    return 'Just now';
  }

  const minutes = Math.floor(diffSeconds / 60);

  if (minutes < 60) {
    return `${minutes} ${
      minutes === 1 ? 'minute' : 'minutes'
    } ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${
      hours === 1 ? 'hour' : 'hours'
    } ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} ${
      days === 1 ? 'day' : 'days'
    } ago`;
  }

  const weeks = Math.floor(days / 7);

  if (weeks < 5) {
    return `${weeks} ${
      weeks === 1 ? 'week' : 'weeks'
    } ago`;
  }

  const months = Math.floor(days / 30);

  if (months < 12) {
    return `${months} ${
      months === 1 ? 'month' : 'months'
    } ago`;
  }

  const years = Math.floor(days / 365);

  return `${years} ${
    years === 1 ? 'year' : 'years'
  } ago`;
}

function normalizeMessages(conv) {
  if (!conv) return [];

  let msgs = Array.isArray(conv.messages)
    ? conv.messages.filter(Boolean)
    : [];

  msgs = msgs
    .filter((m) => m && m.sender)
    .map((m) => ({
      sender:
        m.sender === 'user'
          ? 'user'
          : 'ai',
      text:
        typeof m.text === 'string'
          ? m.text
          : '',
    }));

  const request =
    (
      conv.request ||
      conv.title ||
      ''
    ).trim();

  const response =
    (
      conv.response ||
      ''
    ).trim();

  const hasUser = msgs.some(
    (m) =>
      m.sender === 'user' &&
      m.text.trim()
  );

  const hasAi = msgs.some(
    (m) =>
      m.sender === 'ai' &&
      m.text.trim()
  );

  if (!hasUser && request) {
    msgs = [
      {
        sender: 'user',
        text: request,
      },
      ...msgs.filter(
        (m) => m.sender !== 'user'
      ),
    ];
  }

  if (!hasAi && response) {
    msgs = [
      ...msgs.filter(
        (m) => m.sender !== 'ai'
      ),
      {
        sender: 'ai',
        text: response,
      },
    ];
  }

  if (msgs.length === 0 && request) {
    msgs = [
      {
        sender: 'user',
        text: request,
      },
      ...(response
        ? [
            {
              sender: 'ai',
              text: response,
            },
          ]
        : []),
    ];
  }

  return msgs.filter(
    (m) =>
      m.sender === 'user' ||
      (m.text && m.text.length > 0) ||
      m.sender === 'ai'
  );
}

async function typeWriter(
  fullText,
  onUpdate,
  signal
) {
  if (
    typeof document !== 'undefined' &&
    document.hidden
  ) {
    onUpdate(fullText);
    return;
  }

  const chunkSize = 12;

  let current = '';

  for (
    let i = 0;
    i < fullText.length;
    i += chunkSize
  ) {
    if (signal?.aborted) return;

    if (
      typeof document !== 'undefined' &&
      document.hidden
    ) {
      onUpdate(fullText);
      return;
    }

    current = fullText.slice(
      0,
      i + chunkSize
    );

    onUpdate(current);

    await new Promise((resolve) =>
      setTimeout(resolve, 4)
    );
  }

  onUpdate(fullText);
}

function PinIcon({
  size = 14,
  filled = false,
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={
        filled
          ? 'currentColor'
          : 'none'
      }
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        flexShrink: 0,
      }}
    >
      <path d="M12 17v5" />

      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
  );
}

export default function Chat() {
  const router = useRouter();

  const {
    user,
    profile,
    loading: authLoading,
    refreshProfile,
  } = useAuth();

  const uid = user?.uid ?? null;
  const email = user?.email ?? null;

  const isPremium = !!(
    profile?.is_premium ||
    profile?.isPremium
  );

  const isBlocked = !!(
    profile?.is_blocked ||
    profile?.isBlocked ||
    profile?.soft_deleted ||
    profile?.softDeleted
  );

  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] =
    useState(0);

  const [messages, setMessages] =
    useState([]);

  const [displayRequest, setDisplayRequest] =
    useState('');

  const [input, setInput] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [sidebarHidden, setSidebarHidden] =
    useState(false);

  const [copiedIdx, setCopiedIdx] =
    useState(-1);

  const [copiedUserIdx, setCopiedUserIdx] =
    useState(-1);

  const [chatsReady, setChatsReady] =
    useState(false);

  const [showLimitModal, setShowLimitModal] =
    useState(false);

  const [showContactPopup, setShowContactPopup] =
    useState(false);

  const [todayUsage, setTodayUsage] =
    useState(0);

  const [kbOffset, setKbOffset] =
    useState(0);

  const [sharedIdx, setSharedIdx] =
    useState(-1);

  const [menuOpenId, setMenuOpenId] =
    useState(null);

  const [renamingId, setRenamingId] =
    useState(null);

  const [renameValue, setRenameValue] =
    useState('');

  const [pinnedIds, setPinnedIds] =
    useState(() => {
      if (
        typeof window === 'undefined'
      ) {
        return [];
      }

      try {
        return JSON.parse(
          localStorage.getItem(
            'chat_pinned'
          ) || '[]'
        );
      } catch {
        return [];
      }
    });

  const threadRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const menuRef = useRef(null);

  const skipNextLoadRef =
    useRef(false);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !window.visualViewport
    ) {
      return;
    }

    const vv = window.visualViewport;

    const update = () => {
      const offset = Math.max(
        0,
        window.innerHeight -
          vv.height -
          (vv.offsetTop || 0)
      );

      setKbOffset(
        offset > 40 ? offset : 0
      );
    };

    vv.addEventListener(
      'resize',
      update
    );

    vv.addEventListener(
      'scroll',
      update
    );

    update();

    return () => {
      vv.removeEventListener(
        'resize',
        update
      );

      vv.removeEventListener(
        'scroll',
        update
      );
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    (async () => {
      const count =
        await getTodayUsage(uid);

      if (!cancelled) {
        setTodayUsage(count);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, authLoading]);

  useEffect(() => {
    if (
      typeof window === 'undefined'
    ) {
      return;
    }

    const onFocus = () => {
      refreshProfile().catch(
        () => {}
      );
    };

    window.addEventListener(
      'focus',
      onFocus
    );

    return () => {
      window.removeEventListener(
        'focus',
        onFocus
      );
    };
  }, [refreshProfile]);

  const refreshChats =
    useCallback(async () => {
      try {
        const list =
          await listConversations(
            uid,
            email
          );

        setChats(
          Array.isArray(list)
            ? list
            : []
        );
      } catch (err) {
        console.error(
          '[chat] listConversations failed',
          err
        );

        setChats([]);
      } finally {
        setChatsReady(true);
      }
    }, [uid, email]);

  useEffect(() => {
    if (authLoading) return;

    refreshChats();

    if (
      typeof window !== 'undefined' &&
      window.innerWidth <= 900
    ) {
      setSidebarHidden(true);
    }
  }, [
    authLoading,
    refreshChats,
  ]);

  useEffect(() => {
    if (
      !router.isReady ||
      authLoading
    ) {
      return;
    }

    const idParam =
      router.query.chat_id;

    if (!idParam) {
      setCurrentChatId(0);
      setMessages([]);
      setDisplayRequest('');
      return;
    }

    if (
      skipNextLoadRef.current
    ) {
      skipNextLoadRef.current =
        false;
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const conv =
          await getConversation(
            uid,
            idParam,
            email
          );

        if (cancelled) return;

        if (!conv) {
          setCurrentChatId(0);
          setMessages([]);
          return;
        }

        setCurrentChatId(conv.id);

        const normalized =
          normalizeMessages(conv);

        const reqText = (
          conv.request ||
          conv.title ||
          (
            normalized.find(
              (m) =>
                m.sender === 'user'
            ) || {}
          ).text ||
          ''
        ).trim();

        setDisplayRequest(reqText);

        try {
          if (
            typeof window !==
              'undefined' &&
            conv.id &&
            reqText
          ) {
            window.sessionStorage.setItem(
              'pa_req_' + conv.id,
              reqText
            );
          }
        } catch (e) {}

        let finalMsgs =
          normalized;

        if (
          reqText &&
          !finalMsgs.some(
            (m) =>
              m.sender === 'user' &&
              (m.text || '').trim()
          )
        ) {
          finalMsgs = [
            {
              sender: 'user',
              text: reqText,
            },
            ...finalMsgs,
          ];
        }

        if (
          reqText &&
          finalMsgs.some(
            (m) =>
              m.sender === 'user' &&
              !(m.text || '').trim()
          )
        ) {
          finalMsgs =
            finalMsgs.map(
              (m) =>
                m.sender === 'user' &&
                !(m.text || '').trim()
                  ? {
                      ...m,
                      text: reqText,
                    }
                  : m
            );
        }

        setMessages(finalMsgs);
      } catch (err) {
        console.error(
          '[chat] getConversation failed',
          err
        );

        setMessages([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    router.isReady,
    router.query.chat_id,
    uid,
    email,
    authLoading,
  ]);

  useEffect(() => {
    if (
      threadRef.current
    ) {
      threadRef.current.scrollTop =
        threadRef.current.scrollHeight;
    }
  }, [
    messages,
    loading,
  ]);

  useEffect(() => {
    if (showLimitModal) {
      inputRef.current?.blur();
      setKbOffset(0);
    }
  }, [showLimitModal]);

  useEffect(() => {
    if (
      (
        displayRequest || ''
      ).trim()
    ) {
      return;
    }

    if (!currentChatId) {
      return;
    }

    const fromSidebar =
      (chats || []).find(
        (c) =>
          String(c.id) ===
          String(currentChatId)
      );

    const t = (
      fromSidebar?.request ||
      fromSidebar?.title ||
      ''
    ).trim();

    if (t) {
      setDisplayRequest(t);
    }
  }, [
    chats,
    currentChatId,
    displayRequest,
  ]);

  useEffect(() => {
    function handleClick(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          e.target
        )
      ) {
        setMenuOpenId(null);
      }
    }

    document.addEventListener(
      'mousedown',
      handleClick
    );

    return () =>
      document.removeEventListener(
        'mousedown',
        handleClick
      );
  }, []);

  function startNewChat() {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    setCurrentChatId(0);
    setMessages([]);
    setDisplayRequest('');
    setMenuOpenId(null);

    router.replace(
      '/chat',
      undefined,
      {
        shallow: true,
      }
    );

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }

  async function openChat(id) {
    try {
      const conv =
        await getConversation(
          uid,
          id,
          email
        );

      if (!conv) return;

      setCurrentChatId(
        conv.id
      );

      setMenuOpenId(null);

      const fromList =
        (chats || []).find(
          (c) =>
            String(c.id) ===
            String(conv.id)
        );

      const normalized =
        normalizeMessages({
          ...conv,
          request:
            conv.request ||
            fromList?.request ||
            '',
          title:
            conv.title ||
            fromList?.title ||
            '',
          response:
            conv.response ||
            fromList?.response ||
            '',
        });

      const reqText = (
        conv.request ||
        fromList?.request ||
        conv.title ||
        fromList?.title ||
        ''
      ).trim();

      setDisplayRequest(
        reqText
      );

      try {
        if (
          typeof window !==
            'undefined' &&
          conv.id &&
          reqText
        ) {
          window.sessionStorage.setItem(
            'pa_req_' + conv.id,
            reqText
          );
        }
      } catch (e) {}

      let finalMsgs =
        normalized;

      if (
        reqText &&
        !finalMsgs.some(
          (m) =>
            m.sender === 'user' &&
            (m.text || '').trim()
        )
      ) {
        finalMsgs = [
          {
            sender: 'user',
            text: reqText,
          },
          ...finalMsgs,
        ];
      }

      setMessages(finalMsgs);

      router.replace(
        `/chat?chat_id=${conv.id}`,
        undefined,
        {
          shallow: true,
        }
      );
    } catch (err) {
      console.error(
        '[chat] openChat failed',
        err
      );
    }
  }

  async function handleDeleteChat(
    id
  ) {
    setMenuOpenId(null);

    if (
      !window.confirm(
        'Delete this chat?'
      )
    ) {
      return;
    }

    try {
      await deleteConversation(
        uid,
        id,
        email
      );

      if (
        String(currentChatId) ===
        String(id)
      ) {
        startNewChat();
      }

      await refreshChats();
    } catch (err) {
      console.error(
        '[chat] delete failed',
        err
      );
    }
  }

  function handleOpenNewTab(
    id
  ) {
    setMenuOpenId(null);

    window.open(
      `/chat?chat_id=${id}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function handleStartRename(
    c
  ) {
    setMenuOpenId(null);
    setRenamingId(c.id);
    setRenameValue(
      c.title || ''
    );
  }

  async function handleFinishRename(
    id
  ) {
    const title =
      renameValue
        .trim()
        .slice(0, 60);

    setRenamingId(null);

    if (!title) return;

    try {
      await upsertConversation(
        uid,
        {
          id,
          title,
        },
        email
      );

      await refreshChats();
    } catch (err) {
      console.error(
        '[chat] rename failed',
        err
      );
    }
  }

  function handlePin(id) {
    setMenuOpenId(null);

    setPinnedIds((prev) => {
      const next =
        prev.includes(id)
          ? prev.filter(
              (x) => x !== id
            )
          : [
              ...prev,
              id,
            ];

      try {
        localStorage.setItem(
          'chat_pinned',
          JSON.stringify(next)
        );
      } catch {}

      return next;
    });
  }

  function sharePrompt(
    text,
    idx
  ) {
    const url =
      typeof window !==
      'undefined'
        ? `${window.location.origin}/chat?chat_id=${
            currentChatId || ''
          }`
        : '';

    const shareText =
      (text || '').trim() +
      (
        url
          ? `\n\n${url}`
          : ''
      );

    const doClipboard =
      () => {
        navigator.clipboard
          .writeText(shareText)
          .then(() => {
            setSharedIdx(idx);

            setTimeout(
              () =>
                setSharedIdx(-1),
              2000
            );
          })
          .catch(() => {});
      };

    if (
      typeof navigator !==
        'undefined' &&
      navigator.share
    ) {
      navigator
        .share({
          title:
            'PromptAI',
          text:
            shareText,
        })
        .then(() => {
          setSharedIdx(idx);

          setTimeout(
            () =>
              setSharedIdx(-1),
            2000
          );
        })
        .catch((err) => {
          if (
            err &&
            err.name !==
              'AbortError'
          ) {
            doClipboard();
          }
        });
    } else {
      doClipboard();
    }
  }

  const MAX_MESSAGE_LENGTH =
    8000;

  async function sendMessage(
    overrideText
  ) {
    const text = (
      overrideText ??
      input
    )
      .trim()
      .slice(
        0,
        MAX_MESSAGE_LENGTH
      );

    if (
      !text ||
      loading
    ) {
      return;
    }

    let latest = profile;

    try {
      const fresh =
        await refreshProfile();

      if (fresh) {
        latest = fresh;
      }
    } catch {}

    const blockedNow = !!(
      latest?.is_blocked ||
      latest?.isBlocked ||
      latest?.soft_deleted ||
      latest?.softDeleted
    );

    if (blockedNow) {
      alert(
        'Your account is blocked or deleted. Contact support.'
      );
      return;
    }

    const premiumNow = !!(
      latest?.is_premium ||
      latest?.isPremium
    );

    const skipUsageIncrement =
      premiumNow;

    if (!premiumNow) {
      const used =
        await getTodayUsage(
          uid
        );

      setTodayUsage(
        used
      );

      if (
        isOverLimit(used)
      ) {
        inputRef.current?.blur();
        setShowLimitModal(
          true
        );
        return;
      }
    }

    const prevMessagesSnapshot =
      messages;

    setMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text,
      },
    ]);

    setDisplayRequest(text);

    try {
      if (
        typeof window !==
        'undefined'
      ) {
        window.sessionStorage.setItem(
          'pa_req_pending',
          text
        );
      }
    } catch (e) {}

    setInput('');

    if (inputRef.current) {
      inputRef.current.style.height =
        '';
    }

    setLoading(true);

    inputRef.current?.blur();

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller =
      new AbortController();

    abortRef.current =
      controller;

    let resolvedAiText =
      null;

    const onVisibility =
      () => {
        if (
          document.hidden &&
          resolvedAiText &&
          !controller.signal
            .aborted
        ) {
          setMessages((prev) => {
            const next = [
              ...prev,
            ];

            const last =
              next[
                next.length -
                  1
              ];

            if (
              last &&
              last.sender ===
                'ai'
            ) {
              next[
                next.length - 1
              ] = {
                ...last,
                text:
                  resolvedAiText,
              };
            }

            return next;
          });
        }
      };

    if (
      typeof document !==
      'undefined'
    ) {
      document.addEventListener(
        'visibilitychange',
        onVisibility
      );
    }

    try {
      const res =
        await fetch(
          '/api/chat',
          {
            method:
              'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                msg: text,
              }),
            signal:
              controller.signal,
          }
        );

      const data =
        await res.json();

      const aiText =
        data.text ||
        'Something went wrong. Please try again.';

      resolvedAiText =
        aiText;

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '',
        },
      ]);

      setLoading(false);

      await typeWriter(
        aiText,
        (partial) => {
          setMessages(
            (prev) => {
              const next =
                [...prev];

              const last =
                next[
                  next.length -
                    1
                ];

              if (
                last &&
                last.sender ===
                  'ai'
              ) {
                next[
                  next.length - 1
                ] = {
                  ...last,
                  text:
                    partial,
                };
              }

              return next;
            }
          );
        },
        controller.signal
      );

      if (
        controller.signal
          .aborted
      ) {
        return;
      }

      if (
        !skipUsageIncrement
      ) {
        const newCount =
          await incrementTodayUsage(
            uid
          );

        setTodayUsage(
          newCount
        );
      }

      const finalMessages =
        [
          ...prevMessagesSnapshot,
          {
            sender: 'user',
            text,
          },
          {
            sender: 'ai',
            text: aiText,
          },
        ];

      const saved =
        await upsertConversation(
          uid,
          {
            id:
              currentChatId ||
              null,
            title:
              data.title ||
              text.slice(0, 45),
            request:
              text,
            response:
              aiText,
            messages:
              finalMessages,
          },
          email
        );

      setMessages(
        finalMessages
      );

      setDisplayRequest(
        text
      );

      setCurrentChatId(
        saved.id
      );

      try {
        if (
          typeof window !==
            'undefined' &&
          saved.id
        ) {
          window.sessionStorage.setItem(
            'pa_req_' +
              saved.id,
            text
          );
        }
      } catch (e) {}

      skipNextLoadRef.current =
        true;

      await refreshChats();

      router.replace(
        `/chat?chat_id=${saved.id}`,
        undefined,
        {
          shallow: true,
        }
      );
    } catch (err) {
      if (
        err.name ===
        'AbortError'
      ) {
        return;
      }

      console.error(
        '[chat] sendMessage failed',
        err
      );

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text:
            'Network error. Please try again.',
        },
      ]);

      setLoading(false);
    } finally {
      if (
        typeof document !==
        'undefined'
      ) {
        document.removeEventListener(
          'visibilitychange',
          onVisibility
        );
      }
    }
  }

  function copyPrompt(
    text,
    idx
  ) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedIdx(idx);

        setTimeout(
          () =>
            setCopiedIdx(-1),
          2000
        );
      });
  }

  function copyUserRequest(
    text,
    idx
  ) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedUserIdx(
          idx
        );

        setTimeout(
          () =>
            setCopiedUserIdx(
              -1
            ),
          2000
        );
      });
  }

  function editUserRequest(
    text
  ) {
    setInput(
      text || ''
    );

    setTimeout(() => {
      const el =
        inputRef.current;

      if (!el) return;

      el.focus();

      el.style.height =
        'auto';

      const next =
        Math.min(
          el.scrollHeight,
          160
        );

      el.style.height =
        `${Math.max(
          next,
          50
        )}px`;

      el.setSelectionRange(
        el.value.length,
        el.value.length
      );
    }, 0);
  }

  const getCurrentChatUpdatedAt =
    useCallback(
      () => {
        const current =
          (chats || []).find(
            (c) =>
              String(c.id) ===
              String(
                currentChatId
              )
          );

        return (
          current?.updatedAt ||
          current?.createdAt ||
          current?.timestamp ||
          current?.date ||
          null
        );
      },
      [
        chats,
        currentChatId,
      ]
    );

  const isLanding =
    messages.length === 0;

  const sortedChats =
    [...chats].sort(
      (a, b) => {
        const ap =
          pinnedIds.includes(
            a.id
          )
            ? 0
            : 1;

        const bp =
          pinnedIds.includes(
            b.id
          )
            ? 0
            : 1;

        if (ap !== bp) {
          return ap - bp;
        }

        return 0;
      }
    );

  const grouped =
    groupChatsByDate(
      sortedChats
    );

  return (
    <>
      <Head>
        <title>
          PromptAI – Chat
        </title>

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />

        <meta
          name="theme-color"
          content="#020202"
        />

        <link
          rel="manifest"
          href="/manifest.json"
        />
      </Head>

      <div className="desktop">
        <div className="nav-desktop-only">
          <NavPill />
        </div>

        <img
          src="/assets/ailogo.png"
          alt="AI Logo"
          className="logo-main"
          onClick={() =>
            setSidebarHidden(
              (h) => !h
            )
          }
        />

        <img
          src="/assets/login.png"
          alt="Profile"
          className="login-icon-mobile"
          onClick={() =>
            router.push(
              '/details'
            )
          }
        />

        <aside
          className={`sidebar ${
            sidebarHidden
              ? 'hide'
              : ''
          }`}
        >
          <button
            className="sidebar-collapse-btn"
            onClick={() =>
              setSidebarHidden(
                true
              )
            }
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            «
          </button>

          <nav className="sidebar-nav">
            <button
              className="new-chat"
              onClick={
                startNewChat
              }
            >
              New chat
            </button>

            {!chatsReady ? (
              <p className="sidebar-item empty">
                Loading...
              </p>
            ) : chats.length ===
              0 ? (
              <p className="sidebar-item empty">
                No recent chats
              </p>
            ) : (
              [
                'Today',
                'Yesterday',
                'Earlier',
                'Recent',
              ].map(
                (label) => {
                  const items =
                    grouped[
                      label
                    ] || [];

                  if (
                    items.length ===
                    0
                  ) {
                    return null;
                  }

                  return (
                    <div
                      key={label}
                      className="sidebar-group"
                    >
                      <h2 className="chats-heading">
                        {label}
                      </h2>

                      <ul className="sidebar-list">
                        {items.map(
                          (c) => (
                            <li
                              className="sidebar-item"
                              key={
                                c.id
                              }
                            >
                              {renamingId ===
                              c.id ? (
                                <input
                                  className="sidebar-rename-input"
                                  value={
                                    renameValue
                                  }
                                  autoFocus
                                  onChange={(
                                    e
                                  ) =>
                                    setRenameValue(
                                      e
                                        .target
                                        .value
                                    )
                                  }
                                  onBlur={() =>
                                    handleFinishRename(
                                      c.id
                                    )
                                  }
                                  onKeyDown={(
                                    e
                                  ) => {
                                    if (
                                      e.key ===
                                      'Enter'
                                    ) {
                                      handleFinishRename(
                                        c.id
                                      );
                                    }

                                    if (
                                      e.key ===
                                      'Escape'
                                    ) {
                                      setRenamingId(
                                        null
                                      );
                                    }
                                  }}
                                />
                              ) : (
                                <div
                                  className={`sidebar-link-wrap ${
                                    String(
                                      currentChatId
                                    ) ===
                                    String(
                                      c.id
                                    )
                                      ? 'active'
                                      : ''
                                  }`}
                                >
                                  <a
                                    className="sidebar-link"
                                    onClick={(
                                      e
                                    ) => {
                                      e.preventDefault();
                                      openChat(
                                        c.id
                                      );
                                    }}
                                    href={`/chat?chat_id=${c.id}`}
                                  >
                                    {pinnedIds.includes(
                                      c.id
                                    ) && (
                                      <span className="pin-mark">
                                        <PinIcon
                                          size={
                                            12
                                          }
                                          filled
                                        />
                                      </span>
                                    )}

                                    <span className="sidebar-title">
                                      {
                                        c.title
                                      }
                                    </span>
                                  </a>

                                  <button
                                    className="sidebar-more"
                                    onClick={(
                                      e
                                    ) => {
                                      e.preventDefault();
                                      e.stopPropagation();

                                      setMenuOpenId(
                                        menuOpenId ===
                                          c.id
                                          ? null
                                          : c.id
                                      );
                                    }}
                                    title="More"
                                  >
                                    ···
                                  </button>

                                  {menuOpenId ===
                                    c.id && (
                                    <div
                                      className="sidebar-menu"
                                      ref={
                                        menuRef
                                      }
                                    >
                                      <button
                                        onClick={() =>
                                          handleOpenNewTab(
                                            c.id
                                          )
                                        }
                                      >
                                        <span className="menu-icon">
                                          ↗
                                        </span>

                                        Open new
                                        tab
                                      </button>

                                      <button
                                        onClick={() =>
                                          handleStartRename(
                                            c
                                          )
                                        }
                                      >
                                        <span className="menu-icon">
                                          ✎
                                        </span>

                                        Rename
                                      </button>

                                      <button
                                        onClick={() =>
                                          handlePin(
                                            c.id
                                          )
                                        }
                                      >
                                        <span className="menu-icon">
                                          <PinIcon
                                            size={
                                              14
                                            }
                                            filled={pinnedIds.includes(
                                              c.id
                                            )}
                                          />
                                        </span>

                                        {pinnedIds.includes(
                                          c.id
                                        )
                                          ? 'Unpin'
                                          : 'Pin'}
                                      </button>

                                      <button
                                        className="menu-delete"
                                        onClick={() =>
                                          handleDeleteChat(
                                            c.id
                                          )
                                        }
                                      >
                                        <span className="menu-icon">
                                          🗑
                                        </span>

                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  );
                }
              )
            )}
          </nav>
        </aside>

        <main
          className={`main-content ${
            isLanding
              ? 'view-landing'
              : 'view-chat'
          } ${
            sidebarHidden
              ? 'no-sidebar'
              : ''
          }`}
        >
          <div className="landing-content">
            <h1 className="main-heading">
              Where should we begin?
            </h1>

            <div className="suggestion-buttons">
              <button
                className="suggestion-button"
                onClick={() =>
                  sendMessage(
                    'Leave application email'
                  )
                }
              >
                <span>
                  Leave application email
                </span>

                <img
                  src="/assets/arrow2.png"
                  className="suggestion-arrow arrow-normal"
                  alt=""
                />

                <img
                  src="/assets/arrow.png"
                  className="suggestion-arrow arrow-hover"
                  alt=""
                />
              </button>

              <button
                className="suggestion-button suggestion-middle"
                onClick={() =>
                  sendMessage(
                    'Professional resume for'
                  )
                }
              >
                <span>
                  Professional resume for
                </span>

                <img
                  src="/assets/arrow2.png"
                  className="suggestion-arrow arrow-normal"
                  alt=""
                />

                <img
                  src="/assets/arrow.png"
                  className="suggestion-arrow arrow-hover"
                  alt=""
                />
              </button>

              <button
                className="suggestion-button"
                onClick={() =>
                  sendMessage(
                    'Make website for Store'
                  )
                }
              >
                <span>
                  Make website for Store
                </span>

                <img
                  src="/assets/arrow2.png"
                  className="suggestion-arrow arrow-normal"
                  alt=""
                />

                <img
                  src="/assets/arrow.png"
                  className="suggestion-arrow arrow-hover"
                  alt=""
                />
              </button>
            </div>
          </div>

          <article
            className="conversation-thread"
            ref={threadRef}
          >
            {messages.map(
              (m, i) =>
                m.sender ===
                'user' ? (
                  (m.text || '')
                    .trim() ? (
                    <div
                      className="user-message-wrap"
                      key={`u-${i}`}
                    >
                      <div className="user-message">
                        {
                          m.text
                        }
                      </div>

                      <div
                        className="user-action-row"
                        aria-label="Request actions"
                      >
                        <span className="user-request-time">
                          {getRelativeTime(
                            getCurrentChatUpdatedAt()
                          )}
                        </span>

                        <button
                          className="user-action-btn"
                          type="button"
                          title="Retry request"
                          aria-label="Retry request"
                          onClick={() =>
                            sendMessage(
                              m.text
                            )
                          }
                          disabled={
                            loading
                          }
                        >
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path d="M20 11a8 8 0 1 0 2 5.3" />
                            <path d="M20 4v7h-7" />
                          </svg>
                        </button>

                        <button
                          className="user-action-btn"
                          type="button"
                          title="Edit request"
                          aria-label="Edit request"
                          onClick={() =>
                            editUserRequest(
                              m.text
                            )
                          }
                        >
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                            <path d="M13.5 6.5l4 4" />
                          </svg>
                        </button>

                        <button
                          className="user-action-btn"
                          type="button"
                          title="Copy request"
                          aria-label="Copy request"
                          onClick={() =>
                            copyUserRequest(
                              m.text,
                              i
                            )
                          }
                        >
                          {copiedUserIdx ===
                          i ? (
                            <span className="user-copy-done">
                              Copied!
                            </span>
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <rect
                                x="8"
                                y="8"
                                width="11"
                                height="11"
                                rx="1.5"
                              />

                              <path d="M5 16H4.5A1.5 1.5 0 0 1 3 14.5v-10A1.5 1.5 0 0 1 4.5 3h10A1.5 1.5 0 0 1 16 4.5V5" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : null
                ) : (
                  <section
                    className="ai-group"
                    key={`a-${i}`}
                  >
                    <h2 className="ai-heading">
                      Generated Prompt:
                    </h2>

                    <p className="ai-prompt">
                      {
                        m.text ||
                        ''
                      }
                    </p>

                    {m.text ? (
                      <div className="action-row">
                        <button
                          className="action-btn"
                          onClick={() =>
                            copyPrompt(
                              m.text,
                              i
                            )
                          }
                          title="Copy Prompt"
                        >
                          <span className="action-text">
                            {copiedIdx ===
                            i
                              ? 'Copied!'
                              : 'copy'}
                          </span>

                          <img
                            src="/assets/copy.png"
                            className="action-icon"
                            alt="copy"
                          />
                        </button>

                        <button
                          className="action-btn"
                          title="Share prompt"
                          onClick={() =>
                            sharePrompt(
                              m.text,
                              i
                            )
                          }
                        >
                          <span className="action-text">
                            {sharedIdx ===
                            i
                              ? 'Shared!'
                              : 'share'}
                          </span>

                          <svg
                            className="action-icon share-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle
                              cx="18"
                              cy="5"
                              r="3"
                            />

                            <circle
                              cx="6"
                              cy="12"
                              r="3"
                            />

                            <circle
                              cx="18"
                              cy="19"
                              r="3"
                            />

                            <line
                              x1="8.59"
                              y1="13.51"
                              x2="15.42"
                              y2="17.49"
                            />

                            <line
                              x1="15.41"
                              y1="6.51"
                              x2="8.59"
                              y2="10.49"
                            />
                          </svg>
                        </button>

                        <button
                          className="action-btn"
                          title="Open in ChatGPT"
                          onClick={() => {
                            navigator.clipboard
                              .writeText(
                                m.text
                              )
                              .then(() => {
                                const url =
                                  'https://chatgpt.com/?q=' +
                                  encodeURIComponent(
                                    m.text
                                  );

                                window.open(
                                  url,
                                  '_blank',
                                  'noopener,noreferrer'
                                );
                              });
                          }}
                        >
                          <span className="action-text">
                            Open in
                          </span>

                          <img
                            src="/assets/chatgpt.png"
                            className="action-icon"
                            alt="ChatGPT"
                          />
                        </button>
                      </div>
                    ) : null}
                  </section>
                )
            )}

            {loading ? (
              <div className="ai-group skeleton-group">
                <div className="skeleton-line sk-title" />

                <div className="skeleton-box">
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line sk-short" />
                </div>
              </div>
            ) : null}
          </article>

          <div
            className="chat-input-form"
            style={
              kbOffset > 0
                ? {
                    bottom: `${
                      kbOffset +
                      6
                    }px`,
                    top: 'auto',
                  }
                : undefined
            }
          >
            <div className="chat-input-wrapper">
              <textarea
                className="chat-input"
                placeholder="Ask anything..."
                autoComplete="off"
                ref={inputRef}
                value={input}
                maxLength={
                  MAX_MESSAGE_LENGTH
                }
                rows={1}
                onChange={(e) => {
                  setInput(
                    e.target.value
                  );

                  const el =
                    e.target;

                  el.style.height =
                    'auto';

                  const next =
                    Math.min(
                      el.scrollHeight,
                      160
                    );

                  el.style.height =
                    `${Math.max(
                      next,
                      50
                    )}px`;
                }}
                onKeyDown={(e) => {
                  if (
                    e.key ===
                      'Enter' &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();

                    sendMessage();
                  }
                }}
                disabled={loading}
              />

              <button
                className="chat-submit-button"
                onClick={() =>
                  sendMessage()
                }
                type="button"
              >
                <img
                  src="/assets/send.png"
                  alt="Send"
                  className="chat-submit-icon"
                />
              </button>
            </div>
          </div>
        </main>

        {showLimitModal && (
          <div className="limit-fullscreen">
            <button
              className="limit-close-btn"
              onClick={() =>
                setShowLimitModal(
                  false
                )
              }
              aria-label="Close"
            >
              ×
            </button>

            <div className="limit-badge">
              <span className="limit-red-dot" />

              <span className="limit-badge-text">
                Free Limit Exhausted (
                {
                  DAILY_FREE_LIMIT
                }
                /
                {
                  DAILY_FREE_LIMIT
                }
                )
              </span>
            </div>

            <div className="limit-content limit-content-desktop">
              <div className="limit-left">
                <img
                  src="/assets/dog1.png"
                  alt="Doge"
                  className="limit-dog"
                />
              </div>

              <div className="limit-right">
                <h1 className="limit-title">
                  Wow. Much Limit.
                  <br />
                  Very Exhausted.
                </h1>

                <p className="limit-desc">
                  Limit Reached! Much sad. Ready to upgrade? Well,
                  joke&apos;s on you! The developer spent all his time
                  making this UI look pixel-perfect and completely
                  forgot to build a payment gateway. The &apos;Premium&apos;
                  version is still cooking.
                </p>

                <p className="limit-hint">
                  Patience is a virtue. But if you have zero patience,
                  <br />
                  go bother the dev for a bypass code.
                </p>

                <button
                  className="limit-btn"
                  onClick={() =>
                    setShowContactPopup(
                      true
                    )
                  }
                >
                  Wake the Dev
                </button>
              </div>
            </div>

            <div className="limit-content-mobile">
              <div className="limit-mobile-inner">
                <div className="limit-mobile-img-wrap">
                  <img
                    src="/assets/dog1.png"
                    alt="Doge"
                    className="limit-mobile-dog"
                  />
                </div>

                <h1 className="limit-mobile-title">
                  Wow. Much Limit.
                  <br />
                  Very Exhausted.
                </h1>

                <p className="limit-mobile-desc">
                  Limit Reached! Much sad. Ready to upgrade? Well, joke&apos;s
                  on you! The developer spent all his time making this UI look
                  pixel-perfect and completely forgot to build a payment
                  gateway. The &apos;Premium&apos; version is still cooking.
                </p>

                <p className="limit-mobile-hint">
                  Patience is a virtue. But if you have zero patience,
                  <br />
                  go bother the dev for a bypass code.
                </p>

                <button
                  className="limit-mobile-btn"
                  onClick={() =>
                    setShowContactPopup(
                      true
                    )
                  }
                >
                  Wake the Dev
                </button>
              </div>
            </div>

            {showContactPopup && (
              <div
                className="contact-popup-overlay"
                onClick={() =>
                  setShowContactPopup(
                    false
                  )
                }
              >
                <div
                  className="contact-popup"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >
                  <button
                    className="contact-popup-close"
                    onClick={() =>
                      setShowContactPopup(
                        false
                      )
                    }
                    aria-label="Close"
                  >
                    ×
                  </button>

                  <p className="contact-popup-title">
                    Contact Dev
                  </p>

                  <button
                    type="button"
                    className="contact-popup-item"
                    onClick={() => {
                      const name =
                        [
                          profile?.firstName,
                          profile?.lastName,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(' ')
                          .trim() ||
                        user?.displayName ||
                        'User';

                      const method =
                        profile?.signupMethod ||
                        profile?.signup_method ||
                        (
                          user
                            ?.providerData?.[0]
                            ?.providerId ===
                          'google.com'
                            ? 'google'
                            : 'email'
                        ) ||
                        'unknown';

                      const body =
                        [
                          `User ID: ${
                            user?.uid ||
                            'guest'
                          }`,
                          `Name: ${name}`,
                          `Email: ${
                            user?.email ||
                            email ||
                            'n/a'
                          }`,
                          `Signup method: ${method}`,
                        ].join(
                          '\n'
                        );

                      const mailto =
                        'mailto:sonidhaval2468@gmail.com' +
                        '?subject=' +
                        encodeURIComponent(
                          'user from promptai'
                        ) +
                        '&body=' +
                        encodeURIComponent(
                          body
                        );

                      window.location.href =
                        mailto;
                    }}
                  >
                    📧 Email

                    <span className="contact-popup-sub">
                      sonidhaval2468@gmail.com
                    </span>
                  </button>

                  <a
                    className="contact-popup-item"
                    href="https://www.instagram.com/dhaval._.119?igsh=dW9kMDE3Z2NqMmFx"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📸 Instagram

                    <span className="contact-popup-sub">
                      @dhaval._.119
                    </span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        html,
        body {
          background: #000;
          overflow: hidden;
          margin: 0;
          padding: 0;
        }
      `}</style>

      <style jsx>{`
        .desktop {
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          background: #000;
          overflow: hidden;
        }

        .nav-desktop-only {
          display: block;
        }

        .logo-main {
          height: 50px;
          width: 50px;
          display: block;
          position: fixed;
          left: 26px;
          top: 23px;
          z-index: 100;
          cursor: pointer;
        }

        .login-icon-mobile {
          display: none;
        }

        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 250px;
          height: 100%;
          background: #0e0e0e;
          transition: transform 0.4s ease;
          z-index: 30;
        }

        .sidebar.hide {
          transform: translateX(-250px);
        }

        .sidebar-collapse-btn {
          position: absolute;
          top: 22px;
          right: 16px;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 22px;
          font-weight: 300;
          line-height: 1;
          cursor: pointer;
          padding: 4px 8px;
          z-index: 10;
          opacity: 0.7;
          transition: opacity 0.2s,
            color 0.2s;
        }

        .sidebar-collapse-btn:hover {
          opacity: 1;
          color: #fff;
        }

        .sidebar-nav {
          position: absolute;
          top: 120px;
          left: 18px;
          right: 8px;
          bottom: 20px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .new-chat {
          color: #fff;
          font-weight: 700;
          font-size: 18px;
          background: none;
          border: none;
          cursor: pointer;
          margin-bottom: 28px;
          text-align: left;
          padding: 0;
        }

        .sidebar-group {
          margin-bottom: 18px;
        }

        .chats-heading {
          color: #fff;
          opacity: 0.55;
          font-weight: 600;
          font-size: 13px;
          margin: 0 0 10px 2px;
          letter-spacing: 0.3px;
        }

        .sidebar-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .sidebar-item {
          margin-bottom: 4px;
          position: relative;
        }

        .sidebar-item.empty {
          opacity: 0.5;
          color: #fff;
          font-size: 14px;
        }

        .sidebar-link-wrap {
          display: flex;
          align-items: center;
          border-radius: 8px;
          padding: 6px 6px 6px 8px;
          transition: background 0.15s;
          position: relative;
        }

        .sidebar-link-wrap:hover,
        .sidebar-link-wrap.active {
          background: #1a1a1a;
        }

        .sidebar-link {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #fff;
          font-weight: 500;
          font-size: 14px;
          text-decoration: none;
          opacity: 0.8;
          min-width: 0;
          overflow: hidden;
        }

        .sidebar-link-wrap.active .sidebar-link {
          opacity: 1;
          font-weight: 600;
        }

        .sidebar-title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pin-mark {
          display: flex;
          align-items: center;
          color: #a78bfa;
          flex-shrink: 0;
        }

        .sidebar-more {
          flex-shrink: 0;
          background: transparent;
          border: none;
          color: #888;
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 6px;
          opacity: 0;
          transition: opacity 0.15s,
            background 0.15s,
            color 0.15s;
        }

        .sidebar-link-wrap:hover
          .sidebar-more,
        .sidebar-link-wrap.active
          .sidebar-more {
          opacity: 1;
        }

        .sidebar-more:hover {
          background: #2a2a2a;
          color: #fff;
        }

        .sidebar-menu {
          position: absolute;
          right: 4px;
          top: 100%;
          margin-top: 4px;
          background: #2a2a2a;
          border: 1px solid #3a3a3a;
          border-radius: 10px;
          padding: 6px;
          min-width: 160px;
          z-index: 50;
          box-shadow: 0 8px 24px
            rgba(0, 0, 0, 0.5);
        }

        .sidebar-menu button {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          background: transparent;
          border: none;
          color: #e0e0e0;
          font-size: 13px;
          padding: 8px 10px;
          border-radius: 6px;
          cursor: pointer;
          text-align: left;
        }

        .sidebar-menu
          button:hover {
          background: #3a3a3a;
        }

        .sidebar-menu
          .menu-delete {
          color: #ff6b6b;
        }

        .sidebar-menu
          .menu-delete:hover {
          background:
            rgba(
              255,
              80,
              80,
              0.15
            );
        }

        .menu-icon {
          width: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          opacity: 0.9;
        }

        .sidebar-rename-input {
          width: 100%;
          background: #1a1a1a;
          border: 1px solid #444;
          border-radius: 6px;
          color: #fff;
          font-size: 14px;
          padding: 6px 8px;
          outline: none;
        }

        .main-content {
          position: fixed;
          top: 0;
          left: 0;
          width: calc(100% - 250px);
          height: 100vh;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          transition: transform 0.4s ease,
            width 0.4s ease;
          transform: translateX(250px);
          background: #000;
          overflow: hidden;
          z-index: 1;
        }

        .main-content.no-sidebar {
          transform: translateX(0);
          width: 100%;
        }

        .view-landing
          .conversation-thread {
          display: none;
        }

        .view-landing
          .chat-input-form {
          position: absolute;
          top: 58%;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          max-width: 90%;
          z-index: 30;
          pointer-events: auto;
          bottom: auto;
        }

        .view-landing
          .landing-content {
          display: block;
        }

        .view-chat
          .conversation-thread {
          display: flex;
        }

        .view-chat
          .chat-input-form {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          width: 750px;
          max-width: 90%;
          z-index: 40;
        }

        .main-content:not(
            .no-sidebar
          )
          .view-chat
          .chat-input-form {
          left: calc(50% + 125px);
          transform: translateX(-50%);
        }

        .main-content.no-sidebar
          .view-chat
          .chat-input-form {
          left: 50%;
          transform: translateX(-50%);
        }

        .view-chat
          .landing-content {
          display: none;
        }

        .landing-content {
          position: absolute;
          top: 42%;
          left: 50%;
          transform: translate(
            -50%,
            -50%
          );
          width: 700px;
          max-width: 90%;
          text-align: center;
          z-index: 20;
          pointer-events: auto;
        }

        .main-heading {
          color: #fff;
          font-weight: 700;
          font-size: 40px;
          margin-bottom: 30px;
          white-space: nowrap;
        }

        .suggestion-buttons {
          display: flex;
          gap: 30px;
          width: 100%;
          justify-content: space-between;
          margin-bottom: 30px;
        }

        .suggestion-button {
          width: 32%;
          max-width: 220px;
          height: 32px;
          background: #000;
          border: 1px solid #fff;
          border-radius: 50px;
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          padding-left: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
        }

        .suggestion-button:hover {
          background: #fff;
          color: #000;
        }

        .suggestion-button span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 80%;
        }

        .suggestion-button
          :global(
            .suggestion-arrow
          ) {
          position: absolute;
          right: 10px;
          width: 10px;
          height: 9px;
          transition: opacity
            0.3s ease;
        }

        .suggestion-button
          :global(.arrow-normal) {
          opacity: 1;
        }

        .suggestion-button
          :global(.arrow-hover) {
          opacity: 0;
          position: absolute;
          top: 50%;
          right: 10px;
          transform: translateY(
            -50%
          );
        }

        .suggestion-button:hover
          :global(.arrow-normal) {
          opacity: 0;
        }

        .suggestion-button:hover
          :global(.arrow-hover) {
          opacity: 1;
        }

        .conversation-thread {
          flex: 1;
          width: 100%;
          max-width: 100%;
          padding: 120px 40px
            140px 40px;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          display: flex;
          flex-direction: column;
          gap: 50px;
          background: #000;
          box-sizing: border-box;
        }

        .user-message-wrap,
        .ai-group {
          max-width: 750px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }

        /* Claude-style user request */
        .user-message-wrap {
          align-self: center;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          min-width: 0;
        }

        .user-message {
          align-self: flex-end;
          width: fit-content;
          max-width: min(
            100%,
            620px
          );

          margin: 0;
          padding: 16px 18px;
          box-sizing: border-box;

          direction: ltr;
          text-align: left;
          unicode-bidi: plaintext;

          font-weight: 500;
          color: #ffffff !important;
          font-size: 15px;
          line-height: 1.5;

          background: #2b2b2b;
          border: 0;
          border-radius: 12px;

          overflow-wrap: anywhere;
          word-wrap: break-word;
          word-break: break-word;

          white-space: pre-wrap;

          overflow-x: hidden;
          overflow-y: visible;

          letter-spacing: normal;
          word-spacing: normal;

          display: block;

          opacity: 1;
          visibility: visible;

          min-width: 0;
          hyphens: none;
        }

        .user-action-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          min-height: 18px;

          opacity: 0;
          visibility: hidden;
          pointer-events: none;

          transition:
            opacity 0.15s ease,
            visibility 0.15s ease;
        }

        .user-message-wrap:hover
          .user-action-row,
        .user-message-wrap:focus-within
          .user-action-row {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .user-request-time {
          color: #8a8a8a;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }

        .user-action-btn {
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          background: transparent;
          color: #8a8a8a;
          cursor: pointer;
          border-radius: 5px;
          transition:
            color 0.15s ease,
            background 0.15s ease;
        }

        .user-action-btn:hover:not(
            :disabled
          ) {
          color: #fff;
          background: #171717;
        }

        .user-action-btn:disabled {
          cursor: default;
          opacity: 0.4;
        }

        .user-action-btn svg {
          width: 15px;
          height: 15px;
          display: block;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.9;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .user-copy-done {
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }

        .ai-group {
          align-self: center;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-sizing: border-box;
        }

        .ai-heading {
          font-weight: 700;
          color: #fff;
          font-size: 16px;
          white-space: nowrap;
          margin-bottom: 5px;
        }

        .ai-prompt {
          font-weight: 400;
          color: #ececec;
          font-size: 15px;
          line-height: 1.5;
          background-color: #111;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #222;
          white-space: pre-wrap;
          direction: ltr;
          text-align: left;
          unicode-bidi: plaintext;
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: break-word;
          min-height: 24px;
          max-width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
          letter-spacing: normal;
          word-spacing: normal;
        }

        .action-row {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
          margin-top: 10px;

          opacity: 0;
          visibility: hidden;
          pointer-events: none;

          transition:
            opacity 0.15s ease,
            visibility 0.15s ease;
        }

        .ai-group:hover
          .action-row,
        .ai-group:focus-within
          .action-row {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          user-select: none;
          background: transparent;
          border: none;
          padding: 0;
          outline: none;
        }

        .action-text {
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          opacity: 0.7;
          transition: opacity
            0.2s ease;
          font-family: inherit;
        }

        .action-icon {
          width: 16px;
          height: 16px;
          object-fit: contain;
          border-radius: 3px;
          opacity: 0.85;
        }

        .share-icon {
          color: #fff;
          opacity: 0.85;
        }

        .action-btn:hover
          .action-text,
        .action-btn:hover
          .action-icon,
        .action-btn:hover
          .share-icon {
          opacity: 1;
        }

        .skeleton-group {
          gap: 12px;
        }

        .skeleton-box {
          background: #111;
          border: 1px solid #222;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skeleton-line {
          height: 14px;
          border-radius: 6px;
          background: linear-gradient(
            90deg,
            #1a1a1a 25%,
            #2a2a2a 50%,
            #1a1a1a 75%
          );
          background-size: 200% 100%;
          animation: skeletonShimmer
            1.4s ease-in-out
            infinite;
        }

        .skeleton-line.sk-title {
          width: 140px;
          height: 16px;
          margin-bottom: 4px;
        }

        .skeleton-line.sk-short {
          width: 55%;
        }

        @keyframes skeletonShimmer {
          0% {
            background-position: 200%
              0;
          }

          100% {
            background-position: -200%
              0;
          }
        }

        .chat-input-form {
          z-index: 40;
          transition: bottom
            0.12s ease;
        }

        .chat-input-wrapper {
          position: relative;
          width: 100%;
        }

        .chat-input {
          width: 100%;
          min-height: 50px;
          height: 50px;
          max-height: 160px;
          background: #0e0e0e;
          border-radius: 25px;
          border: none;
          padding: 14px 65px
            14px 35px;
          font-size: 18px;
          line-height: 1.35;
          color: #fff;
          outline: none;
          resize: none;
          overflow-y: auto;
          overflow-x: hidden;
          font-family: inherit;
          box-sizing: border-box;
          vertical-align: middle;
          scrollbar-width: none;
          -ms-overflow-style: none;
          direction: ltr;
          text-align: left;
          unicode-bidi: plaintext;
          letter-spacing: normal;
          word-spacing: normal;
          white-space: pre-wrap;
          overflow-wrap: break-word;
          word-break: break-word;
        }

        .chat-input::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        .chat-input::placeholder {
          color: #a2a2a2;
        }

        .chat-submit-button {
          position: absolute;
          bottom: 4px;
          right: 10px;
          width: 42px;
          height: 42px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-submit-icon {
          width: 30px;
          height: 30px;
        }

        .limit-fullscreen {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          height: 100dvh;
          background: #000000;
          z-index: 99999;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .limit-close-btn {
          position: absolute;
          top: 22px;
          left: 28px;
          background: transparent;
          border: none;
          color: #888;
          font-size: 38px;
          line-height: 1;
          cursor: pointer;
          z-index: 20;
          padding: 0;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }

        .limit-close-btn:hover {
          color: #ffffff;
        }

        .limit-badge {
          position: absolute;
          top: 36px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1.5px solid #ffffff;
          border-radius: 100px;
          padding: 10px 22px 10px 16px;
          background: rgba(
            0,
            0,
            0,
            0.6
          );
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(
            6px
          );
          white-space: nowrap;
          z-index: 15;
        }

        .limit-red-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ff2d2d;
          flex-shrink: 0;
          animation: redDotBlink
            2.4s ease-in-out
            infinite;
        }

        @keyframes redDotBlink {
          0%,
          100% {
            opacity: 1;
            box-shadow: 0 0 0 0
              rgba(
                255,
                45,
                45,
                0.55
              );
          }

          50% {
            opacity: 0.25;
            box-shadow: 0 0 0 8px
              rgba(
                255,
                45,
                45,
                0
              );
          }
        }

        .limit-badge-text {
          color: #ffffff;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.2px;
        }

        .limit-content-desktop {
          width: 100%;
          max-width: 1200px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 60px;
          box-sizing: border-box;
        }

        .limit-left {
          flex: 0 0 46%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          height: 100%;
        }

        .limit-dog {
          width: 100%;
          max-width: 520px;
          height: auto;
          max-height: 75vh;
          object-fit: contain;
          object-position: center bottom;
          display: block;
          user-select: none;
          pointer-events: none;
        }

        .limit-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-left: 40px;
          max-width: 520px;
        }

        .limit-title {
          color: #ffffff;
          font-size: 38px;
          font-weight: 700;
          line-height: 1.2;
          margin: 0 0 22px 0;
        }

        .limit-desc {
          color: #e8e8e8;
          font-size: 15px;
          line-height: 1.55;
          margin: 0 0 18px 0;
        }

        .limit-hint {
          color: #c8c8c8;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 32px 0;
        }

        .limit-btn {
          align-self: flex-start;
          background: #d0d0d0;
          color: #111;
          border: none;
          border-radius: 100px;
          padding: 14px 36px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.22s ease;
        }

        .limit-btn:hover {
          background: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px
            rgba(
              255,
              255,
              255,
              0.15
            );
        }

        .limit-btn:active {
          transform: translateY(0);
        }

        .limit-content-mobile {
          display: none;
        }

        .contact-popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(
            0,
            0,
            0,
            0.65
          );
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .contact-popup {
          position: relative;
          width: 100%;
          max-width: 320px;
          background: #121212;
          border: 1px solid #2a2a2a;
          border-radius: 16px;
          padding: 22px 18px 16px;
          box-shadow: 0 16px 40px
            rgba(
              0,
              0,
              0,
              0.55
            );
        }

        .contact-popup-close {
          position: absolute;
          top: 8px;
          right: 10px;
          background: transparent;
          border: none;
          color: #888;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          padding: 4px 8px;
        }

        .contact-popup-title {
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 14px;
          text-align: center;
        }

        .contact-popup-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          width: 100%;
          text-align: left;
          background: #1a1a1a;
          border: 1px solid #2e2e2e;
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          padding: 12px 14px;
          margin-bottom: 10px;
          cursor: pointer;
          text-decoration: none;
          font-family: inherit;
          box-sizing: border-box;
        }

        .contact-popup-item:last-child {
          margin-bottom: 0;
        }

        .contact-popup-item:hover {
          border-color: #555;
          background: #222;
        }

        .contact-popup-sub {
          font-size: 12px;
          font-weight: 400;
          color: #9a9a9a;
          word-break: break-all;
        }

        @media (max-width: 900px) {
          .nav-desktop-only {
            display: none !important;
          }

          .logo-main {
            left: 16px;
            top: 16px;
            width: 40px;
            height: 40px;
            z-index: 100;
          }

          .login-icon-mobile {
            display: block;
            position: fixed;
            right: 16px;
            top: 16px;
            width: 36px;
            height: 36px;
            object-fit: contain;
            z-index: 100;
            cursor: pointer;
          }

          .sidebar {
            width: 82vw;
            max-width: 300px;
            box-shadow: 4px 0 30px
              rgba(
                0,
                0,
                0,
                0.6
              );
            z-index: 90;
          }

          .sidebar.hide {
            transform: translateX(
              -105%
            );
          }

          .sidebar-collapse-btn {
            top: 16px;
            right: 14px;
            font-size: 20px;
          }

          .sidebar-more {
            opacity: 0.8;
          }

          .main-content {
            width: 100% !important;
            transform: translateX(
              0
            ) !important;
            left: 0 !important;
          }

          .main-content:not(
              .no-sidebar
            )
            .view-chat
            .chat-input-form {
            left: 50%;
          }

          .landing-content {
            position: absolute;
            top: 42%;
            left: 50%;
            transform: translate(
              -50%,
              -50%
            );
            width: 100%;
            max-width: 100%;
            padding: 0 20px;
            box-sizing: border-box;
            text-align: center;
            z-index: 20;
          }

          .main-heading {
            font-size: 24px;
            font-weight: 700;
            white-space: normal;
            margin-bottom: 16px;
            padding: 0;
            line-height: 1.3;
          }

          .suggestion-buttons {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            justify-content: center;
            align-items: center;
            gap: 10px;
            width: 100%;
            margin-bottom: 0;
            max-width: 100%;
          }

          .suggestion-middle {
            display: none !important;
          }

          .suggestion-button {
            flex: 1;
            width: auto;
            max-width: none;
            height: auto;
            min-height: 36px;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 600;
            justify-content: center;
            gap: 6px;
            box-shadow: 0px 4px
              4px #00000040;
            border-radius: 50px;
          }

          .suggestion-button span {
            max-width: none;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 11px;
            font-weight: 600;
          }

          .suggestion-button
            :global(
              .suggestion-arrow
            ) {
            position: static;
            width: 10px;
            height: 8px;
            transform: none;
            top: auto;
            right: auto;
            flex-shrink: 0;
          }

          .suggestion-button
            :global(
              .arrow-hover
            ) {
            display: none;
          }

          .suggestion-button:hover {
            background: #000;
            color: #fff;
          }

          .view-landing
            .chat-input-form {
            position: absolute;
            top: calc(
              42% + 78px
            );
            left: 50%;
            transform: translateX(
              -50%
            );
            width: calc(
              100% - 40px
            );
            max-width: 100%;
            z-index: 30;
            bottom: auto;
          }

          .view-landing
            .chat-input-form[style*='bottom'] {
            top: auto !important;
          }

          .view-landing
            .chat-input {
            min-height: 46px;
            height: 46px;
            max-height: 140px;
            padding: 12px 48px
              12px 18px;
            font-size: 16px;
            border-radius: 23px;
          }

          .view-landing
            .chat-submit-button {
            width: 40px;
            height: 40px;
            right: 4px;
            bottom: 3px;
            top: auto;
            transform: none;
          }

          .view-landing
            .chat-submit-icon {
            width: 24px;
            height: 24px;
          }

          .view-chat
            .chat-input-form {
            position: fixed;
            bottom: calc(
              12px +
                env(
                  safe-area-inset-bottom,
                  0px
                )
            );
            left: 50%;
            transform: translateX(
              -50%
            );
            width: calc(
              100% - 24px
            );
            max-width: 100%;
            z-index: 50;
          }

          .conversation-thread {
            padding: 80px 14px
              100px;
            overflow-x: hidden;
          }

          .user-message-wrap,
          .ai-group {
            max-width: 100%;
            width: 100%;
          }

          .user-message-wrap {
            align-self: center;
            align-items: flex-end;
            gap: 8px;
          }

          .user-message {
            align-self: flex-end;
            width: fit-content;
            max-width: min(
              100%,
              92%
            );
            font-size: 14px;
            direction: ltr;
            text-align: left;
            overflow-wrap: anywhere;
            word-break: break-word;
            white-space: pre-wrap;
            overflow-x: hidden;
            overflow-y: visible;
            min-width: 0;
            padding: 14px 16px;
            background: #2b2b2b;
            border: 0;
            border-radius: 12px;
            box-sizing: border-box;
          }

          .user-action-row {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
            justify-content: flex-end;
            gap: 9px;
          }

          .ai-heading {
            font-size: 15px;
          }

          .ai-prompt {
            font-size: 14px;
            line-height: 1.55;
            padding: 16px;
            overflow-wrap: anywhere;
            word-break: break-word;
            overflow-x: hidden;
          }

          .action-row {
            flex-wrap: wrap;
            gap: 14px;
          }

          .action-icon {
            width: 15px;
            height: 15px;
          }

          .chat-input-wrapper {
            padding: 0;
          }

          .chat-input {
            font-size: 16px;
            min-height: 48px;
            height: 48px;
            max-height: 140px;
            padding: 12px 55px
              12px 18px;
          }

          .limit-close-btn {
            top: 14px;
            left: 14px;
            font-size: 30px;
            color: #aaa;
          }

          .limit-badge {
            top: 48px;
            padding: 7px 14px
              7px 11px;
          }

          .limit-badge-text {
            font-size: 12px;
          }

          .limit-red-dot {
            width: 8px;
            height: 8px;
          }

          .limit-content-desktop {
            display: none !important;
          }

          .limit-content-mobile {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            max-height: 100dvh;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
            background: #000000;
            padding: 80px 0 20px;
            box-sizing: border-box;
          }

          .limit-mobile-inner {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            padding: 0 22px
              16px;
            box-sizing: border-box;
          }

          .limit-mobile-img-wrap {
            position: relative;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 8px;
          }

          .limit-mobile-dog {
            width: 72%;
            max-width: 280px;
            height: auto;
            max-height: 38vh;
            object-fit: contain;
            object-position: center;
            display: block;
            user-select: none;
            pointer-events: none;
          }

          .limit-mobile-title {
            color: #ffffff;
            font-size: 22px;
            font-weight: 700;
            line-height: 1.25;
            margin: 6px 0 12px 0;
            text-align: left;
            width: 100%;
            max-width: 320px;
          }

          .limit-mobile-desc {
            color: #e0e0e0;
            font-size: 13px;
            line-height: 1.5;
            margin: 0 0 10px 0;
            text-align: left;
            width: 100%;
            max-width: 320px;
          }

          .limit-mobile-hint {
            color: #b0b0b0;
            font-size: 12px;
            line-height: 1.45;
            margin: 0 0 22px 0;
            text-align: left;
            width: 100%;
            max-width: 320px;
          }

          .limit-mobile-btn {
            width: 100%;
            max-width: 320px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #d9d9d9;
            color: #000;
            border: none;
            border-radius: 100px;
            padding: 13px 24px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .main-heading {
            font-size: 22px;
          }

          .suggestion-button {
            padding: 7px 10px;
            min-height: 34px;
          }

          .suggestion-button span {
            font-size: 10px;
          }

          .action-text {
            font-size: 11px;
          }

          .conversation-thread {
            padding: 72px 12px
              90px;
          }

          .limit-mobile-dog {
            max-height: 34vh;
            max-width: 240px;
          }

          .limit-mobile-title {
            font-size: 20px;
          }

          .limit-mobile-desc {
            font-size: 12.5px;
          }

          .limit-mobile-hint {
            font-size: 11.5px;
          }
        }
      `}</style>
    </>
  );
}