import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase, configured } from "./supabase.js";
import { css } from "./styles.js";
import { ACCENTS, WALLPAPERS, BANNERS, FRAMES, EMOJI, REACTIONS } from "./constants.js";
import { fmtTime, fmtDay, fmtSize, findUrl, isImg, resizeImage, resizeToBlob, fileToB64, loadPrefs, storePrefs } from "./helpers.js";

const EMAIL_DOMAIN = "msgr.example.com";
const loginToEmail = (login) => `${login.trim().toLowerCase()}@${EMAIL_DOMAIN}`;

// ============ КОМПОНЕНТЫ ============
function Avatar({ user, size = "", online = false }) {
  const color = ACCENTS[(user?.tag?.length || 0) % ACCENTS.length];
  const frame = FRAMES.find((f) => f.id === user?.frame) || FRAMES[0];
  return (
    <div className="ava-frame" style={{ background: frame.css }}>
      <div className={`ava ${size}`} style={{ background: user?.avatar ? "var(--side)" : color }}>
        {user?.avatar ? <img src={user.avatar} alt="" /> : (user?.tag?.[0] || "?").toUpperCase()}
        {size === "" && online && <div className="online-dot" />}
      </div>
    </div>
  );
}
const GroupAvatar = ({ chat, size = "" }) => (
  <Avatar user={{ tag: (chat.title || "Г"), frame: "none" }} size={size} />
);

function Waveform({ bars, progress = 0 }) {
  return (
    <div className="wave">
      {(bars || []).map((h, i) => <i key={i} style={{ height: `${h}px` }} className={i / bars.length < progress ? "played" : ""} />)}
    </div>
  );
}

function VoiceBubble({ msg }) {
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const audioRef = useRef(null);
  function toggle() {
    if (!audioRef.current) {
      audioRef.current = new Audio(msg.content);
      audioRef.current.ontimeupdate = () => setProg(audioRef.current.currentTime / (audioRef.current.duration || 1));
      audioRef.current.onended = () => { setPlaying(false); setProg(0); };
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setPlaying(true); }
  }
  return (
    <div className="b-voice">
      <button className="send-btn" style={{ width: 36, height: 36, fontSize: 14 }} onClick={toggle}>
        {playing ? "⏸" : "▶"}
      </button>
      <Waveform bars={msg.waveform || []} progress={prog} />
      <span className="muted" style={{ fontSize: 12 }}>{msg.duration}с</span>
    </div>
  );
}

function highlight(text, q) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

// ============ ПРИЛОЖЕНИЕ ============
export default function App() {
  const [phase, setPhase] = useState("loading");
  const [me, setMe] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [chats, setChats] = useState([]);
  const [members, setMembers] = useState({});   // chatId -> [userId] (для групп)
  const [messages, setMessages] = useState({});
  const [reads, setReads] = useState({});
  const [onlineIds, setOnlineIds] = useState(new Set());
  const [typingMap, setTypingMap] = useState({}); // chatId -> { userId: ts }
  const [activeId, setActiveId] = useState(null);

  const [prefs, setPrefs] = useState(() => ({ theme: "dark", accent: "#5AABF0", quickReplies: [], drafts: {}, wallpaper: 0, customWallpaper: null, typeSound: false, ...loadPrefs() }));
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [menu, setMenu] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [emojiTab, setEmojiTab] = useState("😀");
  const [showProfile, setShowProfile] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [showGroupNew, setShowGroupNew] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupPicks, setGroupPicks] = useState([]);
  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState([]);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [chatSearch, setChatSearch] = useState(null);
  const [recording, setRecording] = useState(null);
  const [, setRecTick] = useState(0);
  const [viewer, setViewer] = useState(null);
  const [toast, setToast] = useState(null);

  const [login, setLogin] = useState(""); const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState(""); const [tag, setTag] = useState("");
  const [showPw, setShowPw] = useState(false); const [err, setErr] = useState("");
  const [regStep, setRegStep] = useState(1); const [busy, setBusy] = useState(false);

  const msgsRef = useRef(null);
  const taRef = useRef(null);
  const audioCtxRef = useRef(null);
  const lastTypingSend = useRef(0);
  const chatChannelRef = useRef(null);
  const lpTimer = useRef(null);
  const activeIdRef = useRef(null);
  activeIdRef.current = activeId;

  const avatarInp = useRef(null);
  const mediaInp = useRef(null);
  const fileInp = useRef(null);
  const wpInp = useRef(null);

  const activeChat = chats.find((c) => c.id === activeId);
  const isGroup = !!activeChat?.is_group;
  const peerId = activeChat && !isGroup && (activeChat.u1 === me?.id ? activeChat.u2 : activeChat.u1);
  const peer = peerId ? profiles[peerId] : null;
  const activeMsgs = messages[activeId] || [];
  const activeMembers = (members[activeId] || []).map((id) => profiles[id]).filter(Boolean);

  function notify(text) {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  }
  function tickSound() {
    if (!prefs.typeSound) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 1500 + Math.random() * 600;
      g.gain.setValueAtTime(0.04, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.06);
    } catch {}
  }
  async function setPrefsAnd(patch) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    storePrefs(next);
  }

  // ---------- профили ----------
  const cacheProfiles = useCallback((list) => {
    setProfiles((p) => {
      const next = { ...p };
      list.forEach((u) => { if (u) next[u.id] = u; });
      return next;
    });
  }, []);
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const ensureProfile = useCallback(async (id) => {
    if (!id || profilesRef.current[id]) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (data) cacheProfiles([data]);
  }, [cacheProfiles]);

  // ---------- ЗАГРУЗКА ----------
  const loadEverything = useCallback(async (myProfile) => {
    const myId = myProfile.id;
    const { data: mem } = await supabase.from("chat_members").select("chat_id").eq("user_id", myId);
    const memIds = (mem || []).map((m) => m.chat_id);
    let orExpr = `u1.eq.${myId},u2.eq.${myId}`;
    if (memIds.length) orExpr += `,id.in.(${memIds.join(",")})`;
    const { data: chatList } = await supabase.from("chats").select("*").or(orExpr);
    const cs = chatList || [];
    setChats(cs);

    const gids = cs.filter((c) => c.is_group).map((c) => c.id);
    const membersMap = {};
    if (gids.length) {
      const { data: allMem } = await supabase.from("chat_members").select("*").in("chat_id", gids);
      (allMem || []).forEach((m) => { (membersMap[m.chat_id] ||= []).push(m.user_id); });
    }
    setMembers(membersMap);

    const pids = new Set();
    cs.forEach((c) => { if (!c.is_group) pids.add(c.u1 === myId ? c.u2 : c.u1); });
    Object.values(membersMap).flat().forEach((id) => pids.add(id));
    pids.delete(myId); pids.delete(null); pids.delete(undefined);
    if (pids.size) {
      const { data: peers } = await supabase.from("profiles").select("*").in("id", [...pids]);
      cacheProfiles(peers || []);
    }

    if (cs.length) {
      const ids = cs.map((c) => c.id);
      const { data: msgs } = await supabase.from("messages").select("*")
        .in("chat_id", ids).order("created_at", { ascending: false }).limit(800);
      const byChat = {};
      (msgs || []).reverse().forEach((m) => { (byChat[m.chat_id] ||= []).push(m); });
      setMessages(byChat);

      const { data: rd } = await supabase.from("chat_reads").select("*").in("chat_id", ids);
      const rmap = {};
      (rd || []).forEach((r) => { (rmap[r.chat_id] ||= {})[r.user_id] = new Date(r.read_at).getTime(); });
      setReads(rmap);
    }
  }, [cacheProfiles]);

  // ---------- СТАРТ ----------
  useEffect(() => {
    if (!configured) { setPhase("config"); return; }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setPhase("auth"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (!prof) { setPhase("register"); setRegStep(2); return; }
      setMe(prof);
      cacheProfiles([prof]);
      await loadEverything(prof);
      setPhase("main");
    })();
  }, [loadEverything, cacheProfiles]);

  // ---------- REALTIME ----------
  useEffect(() => {
    if (phase !== "main" || !me) return;
    const ch = supabase
      .channel("db-stream")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        const m = p.new;
        ensureProfile(m.sender_id);
        setMessages((d) => {
          const list = d[m.chat_id] || [];
          if (list.some((x) => x.id === m.id)) return d;
          return { ...d, [m.chat_id]: [...list, m] };
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (p) => {
        const m = p.new;
        setMessages((d) => ({ ...d, [m.chat_id]: (d[m.chat_id] || []).map((x) => (x.id === m.id ? m : x)) }));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (p) => {
        const id = p.old.id;
        setMessages((d) => {
          const next = {};
          for (const k of Object.keys(d)) next[k] = d[k].filter((x) => x.id !== id);
          return next;
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, (p) => {
        const c = p.new;
        if (!c) return;
        setChats((cs) => (cs.some((x) => x.id === c.id) ? cs.map((x) => (x.id === c.id ? c : x)) : cs));
        if (!c.is_group && (c.u1 === me.id || c.u2 === me.id)) {
          setChats((cs) => (cs.some((x) => x.id === c.id) ? cs : [...cs, c]));
          ensureProfile(c.u1 === me.id ? c.u2 : c.u1);
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_members" }, async (p) => {
        const r = p.new;
        if (r.user_id === me.id) {
          // меня добавили в группу — подтягиваем её целиком
          const { data: chat } = await supabase.from("chats").select("*").eq("id", r.chat_id).single();
          if (!chat) return;
          setChats((cs) => (cs.some((x) => x.id === chat.id) ? cs : [...cs, chat]));
          const { data: mm } = await supabase.from("chat_members").select("*").eq("chat_id", chat.id);
          const ids = (mm || []).map((m) => m.user_id);
          setMembers((d) => ({ ...d, [chat.id]: ids }));
          ids.forEach(ensureProfile);
          const { data: msgs } = await supabase.from("messages").select("*").eq("chat_id", chat.id)
            .order("created_at", { ascending: false }).limit(200);
          setMessages((d) => ({ ...d, [chat.id]: (msgs || []).reverse() }));
        } else {
          setMembers((d) => (d[r.chat_id] ? { ...d, [r.chat_id]: [...new Set([...d[r.chat_id], r.user_id])] } : d));
          ensureProfile(r.user_id);
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_members" }, (p) => {
        const r = p.old;
        if (r.user_id === me.id) {
          setChats((cs) => cs.filter((c) => c.id !== r.chat_id));
          if (activeIdRef.current === r.chat_id) setActiveId(null);
        } else {
          setMembers((d) => (d[r.chat_id] ? { ...d, [r.chat_id]: d[r.chat_id].filter((x) => x !== r.user_id) } : d));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reads" }, (p) => {
        const r = p.new;
        if (!r) return;
        setReads((d) => ({ ...d, [r.chat_id]: { ...(d[r.chat_id] || {}), [r.user_id]: new Date(r.read_at).getTime() } }));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, me?.id]);

  // ---------- PRESENCE ----------
  useEffect(() => {
    if (phase !== "main" || !me) return;
    const ch = supabase.channel("online", { config: { presence: { key: me.id } } });
    ch.on("presence", { event: "sync" }, () => {
      setOnlineIds(new Set(Object.keys(ch.presenceState())));
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
    });
    const beat = setInterval(() => {
      supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", me.id).then(() => {});
    }, 120000);
    return () => { clearInterval(beat); supabase.removeChannel(ch); };
  }, [phase, me?.id]);

  // ---------- "печатает" в активном чате ----------
  useEffect(() => {
    if (phase !== "main" || !activeId || !me) return;
    const ch = supabase.channel(`chat-${activeId}`);
    ch.on("broadcast", { event: "typing" }, (p) => {
      const uid = p.payload?.user;
      if (uid && uid !== me.id) {
        setTypingMap((t) => ({ ...t, [activeId]: { ...(t[activeId] || {}), [uid]: Date.now() } }));
        ensureProfile(uid);
      }
    }).subscribe();
    chatChannelRef.current = ch;
    return () => { chatChannelRef.current = null; supabase.removeChannel(ch); };
  }, [phase, activeId, me?.id, ensureProfile]);

  function notifyTyping() {
    if (!chatChannelRef.current || Date.now() - lastTypingSend.current < 2500) return;
    lastTypingSend.current = Date.now();
    chatChannelRef.current.send({ type: "broadcast", event: "typing", payload: { user: me.id } });
  }
  const typingNames = Object.entries(typingMap[activeId] || {})
    .filter(([, ts]) => ts > Date.now() - 5000)
    .map(([uid]) => profiles[uid]?.login)
    .filter(Boolean);

  // ---------- прочитанность ----------
  useEffect(() => {
    if (!activeId || !me) return;
    const lastIncoming = [...activeMsgs].reverse().find((m) => m.sender_id !== me.id);
    if (!lastIncoming) return;
    const myRead = reads[activeId]?.[me.id] || 0;
    if (myRead < new Date(lastIncoming.created_at).getTime()) {
      supabase.from("chat_reads").upsert({ chat_id: activeId, user_id: me.id, read_at: new Date().toISOString() }).then(() => {});
      setReads((d) => ({ ...d, [activeId]: { ...(d[activeId] || {}), [me.id]: Date.now() } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, activeMsgs.length, me?.id]);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [activeMsgs.length, activeId]);

  // ---------- АВТОРИЗАЦИЯ ----------
  async function doLogin() {
    setErr(""); setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginToEmail(login), password: pass });
    setBusy(false);
    if (error) { setErr("Неверный логин или пароль."); return; }
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    if (!prof) { setPhase("register"); setRegStep(2); return; }
    setMe(prof); cacheProfiles([prof]);
    await loadEverything(prof);
    setPhase("main"); setPass("");
  }
  async function doRegisterStep1() {
    setErr("");
    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(login.trim())) { setErr("Логин: 3–24 символа, латиница, цифры, _ . -"); return; }
    if (pass.length < 6) { setErr("Пароль — минимум 6 символов (требование Supabase)."); return; }
    if (pass !== pass2) { setErr("Пароли не совпадают."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email: loginToEmail(login), password: pass });
    setBusy(false);
    if (error) {
      setErr(error.message.includes("already registered") ? "Этот логин уже занят." : `Не удалось создать аккаунт: ${error.message}`);
      return;
    }
    setRegStep(2);
  }
  async function doRegisterFinish() {
    setErr("");
    const t = tag.trim().replace(/^@/, "");
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(t)) { setErr("Тег: 3–20 символов, только латиница, цифры и _."); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); setErr("Сессия потерялась, войдите заново."); setPhase("auth"); return; }
    const profile = { id: user.id, login: login.trim() || user.email.split("@")[0], tag: t, bio: "", banner: 0, frame: "none" };
    const { error } = await supabase.from("profiles").insert(profile);
    setBusy(false);
    if (error) {
      setErr(error.code === "23505" ? "Этот тег уже занят, придумайте другой." : `Не удалось сохранить: ${error.message}`);
      return;
    }
    const meNow = { ...profile, created_at: new Date().toISOString() };
    setMe(meNow); cacheProfiles([meNow]);
    await loadEverything(meNow);
    setPhase("main"); setPass(""); setPass2("");
  }
  async function logout() {
    await supabase.auth.signOut();
    setMe(null); setActiveId(null); setShowProfile(false);
    setChats([]); setMessages({}); setMembers({}); setLogin(""); setPass("");
    setPhase("auth");
  }

  // ---------- ПОИСК ЛЮДЕЙ ----------
  function useUserSearch(query, setResults, extraFilter) {
    useEffect(() => {
      if (phase !== "main") return;
      const q = query.trim().replace(/^@/, "");
      if (!q) { setResults(query === "" ? null : []); return; }
      const t = setTimeout(async () => {
        const { data } = await supabase.from("profiles").select("*")
          .or(`tag.ilike.%${q}%,login.ilike.%${q}%`).neq("id", me.id).limit(15);
        setResults((data || []).filter(extraFilter || (() => true)));
      }, 350);
      return () => clearTimeout(t);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, phase]);
  }
  useUserSearch(userQuery, setSearchResults);
  useUserSearch(groupQuery, setGroupResults, (u) => !groupPicks.some((p) => p.id === u.id));
  useUserSearch(addQuery, setAddResults, (u) => !(members[activeId] || []).includes(u.id));

  async function startChat(user) {
    cacheProfiles([user]);
    let chat = chats.find((c) => !c.is_group && (c.u1 === user.id || c.u2 === user.id));
    if (!chat) {
      const [a, b] = [me.id, user.id].sort();
      const { data, error } = await supabase.from("chats").insert({ u1: a, u2: b }).select().single();
      if (error) {
        const { data: existing } = await supabase.from("chats").select("*")
          .or(`and(u1.eq.${a},u2.eq.${b}),and(u1.eq.${b},u2.eq.${a})`).limit(1).single();
        if (!existing) { notify("Не удалось создать чат."); return; }
        chat = existing;
      } else chat = data;
      setChats((cs) => (cs.some((x) => x.id === chat.id) ? cs : [...cs, chat]));
    }
    setUserQuery(""); setSearchResults(null);
    openChat(chat.id);
  }

  // ---------- ГРУППЫ ----------
  async function createGroup() {
    const title = groupTitle.trim();
    if (!title) { notify("Дайте группе название."); return; }
    if (!groupPicks.length) { notify("Добавьте хотя бы одного участника."); return; }
    const { data: chat, error } = await supabase.from("chats")
      .insert({ is_group: true, title, u1: me.id, owner: me.id }).select().single();
    if (error) { notify("Не удалось создать группу."); return; }
    const ids = [me.id, ...groupPicks.map((p) => p.id)];
    const { error: e2 } = await supabase.from("chat_members").insert(ids.map((uid) => ({ chat_id: chat.id, user_id: uid })));
    if (e2) { notify("Группа создана, но участники не добавились. Добавьте их в настройках группы."); }
    cacheProfiles(groupPicks);
    setMembers((m) => ({ ...m, [chat.id]: ids }));
    setChats((cs) => (cs.some((x) => x.id === chat.id) ? cs : [...cs, chat]));
    setShowGroupNew(false); setGroupTitle(""); setGroupPicks([]); setGroupQuery("");
    openChat(chat.id);
  }
  async function addMember(user) {
    const { error } = await supabase.from("chat_members").insert({ chat_id: activeId, user_id: user.id });
    if (error) { notify("Не удалось добавить."); return; }
    cacheProfiles([user]);
    setMembers((m) => ({ ...m, [activeId]: [...new Set([...(m[activeId] || []), user.id])] }));
    setAddQuery(""); setAddResults(null);
    notify(`${user.login} добавлен(а) ✓`);
  }
  async function leaveGroup() {
    const { error } = await supabase.from("chat_members").delete().eq("chat_id", activeId).eq("user_id", me.id);
    if (error) { notify("Не удалось выйти."); return; }
    setShowChatInfo(false);
    setChats((cs) => cs.filter((c) => c.id !== activeId));
    setActiveId(null);
  }
  async function kickMember(uid) {
    const { error } = await supabase.from("chat_members").delete().eq("chat_id", activeId).eq("user_id", uid);
    if (error) { notify("Не удалось удалить участника."); return; }
    setMembers((m) => ({ ...m, [activeId]: (m[activeId] || []).filter((x) => x !== uid) }));
  }

  function openChat(id) {
    if (activeId) setPrefsAnd({ drafts: { ...prefs.drafts, [activeId]: draft } });
    setActiveId(id);
    setDraft(prefs.drafts?.[id] || "");
    setReplyTo(null); setChatSearch(null); setShowEmoji(false); setShowAttach(false); setShowChatInfo(false);
  }

  // ---------- СООБЩЕНИЯ ----------
  const senderName = (m) => (m.sender_id === me?.id ? "Вы" : profiles[m.sender_id]?.login || "?");
  const senderColor = (id) => ACCENTS[(id?.charCodeAt(2) || 0) % ACCENTS.length];
  const previewOf = (m) => m.type === "text" ? m.content.slice(0, 60) : { photo: "📷 Фото", video: "🎬 Видео", file: "📎 Файл", voice: "🎤 Голосовое" }[m.type] || "";

  async function sendMessage(payload) {
    if (!activeId || !me) return;
    const row = {
      chat_id: activeId, sender_id: me.id, reactions: {},
      reply_to: replyTo ? { id: replyTo.id, name: senderName(replyTo), text: previewOf(replyTo) } : null,
      ...payload,
    };
    setReplyTo(null);
    const { error } = await supabase.from("messages").insert(row);
    if (error) notify(error.message.includes("too large") ? "Файл слишком большой." : "Не удалось отправить, проверьте интернет.");
  }
  function sendText(text) {
    const t = (text ?? draft).trim();
    if (!t) return;
    sendMessage({ type: "text", content: t });
    if (text == null) {
      setDraft("");
      if (taRef.current) taRef.current.style.height = "auto";
      setPrefsAnd({ drafts: { ...prefs.drafts, [activeId]: "" } });
    }
  }
  // Загрузка медиа в Storage: в сообщении хранится лишь ссылка,
  // поэтому realtime доставляет его мгновенно независимо от размера файла
  async function uploadMedia(blob, ext, contentType) {
    const path = `${me.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, blob, { contentType, upsert: false });
    if (error) throw error;
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }
  const extOf = (name, fallback) => (name?.includes(".") ? name.split(".").pop().slice(0, 8) : fallback);

  async function handleMedia(file) {
    if (!file) return;
    try {
      if (file.type.startsWith("image/")) {
        notify("Загружаем фото…");
        const blob = await resizeToBlob(file, 1100, 0.78);
        const url = await uploadMedia(blob, "jpg", "image/jpeg");
        await sendMessage({ type: "photo", content: url, file_name: file.name });
      } else if (file.type.startsWith("video/")) {
        if (file.size > 25 * 1048576) { notify("Видео больше 25 МБ — не поместится."); return; }
        notify("Загружаем видео…");
        const url = await uploadMedia(file, extOf(file.name, "mp4"), file.type || "video/mp4");
        await sendMessage({ type: "video", content: url, file_name: file.name, file_size: file.size });
      }
    } catch (e) {
      console.error(e);
      notify(String(e?.message || "").includes("Bucket not found")
        ? "Хранилище медиа не настроено: выполните миграцию из supabase-migration-groups.sql."
        : "Не удалось загрузить файл.");
    }
  }
  async function handleFile(file) {
    if (!file) return;
    try {
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) { await handleMedia(file); return; }
      if (file.size > 25 * 1048576) { notify("Файл больше 25 МБ — не поместится."); return; }
      notify("Загружаем файл…");
      const url = await uploadMedia(file, extOf(file.name, "bin"), file.type || "application/octet-stream");
      await sendMessage({ type: "file", content: url, file_name: file.name, file_size: file.size });
    } catch (e) {
      console.error(e);
      notify(String(e?.message || "").includes("Bucket not found")
        ? "Хранилище медиа не настроено: выполните миграцию из supabase-migration-groups.sql."
        : "Не удалось загрузить файл.");
    }
  }
  async function startVoice() {
    setShowAttach(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      const startTs = Date.now();
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!rec._send) return;
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (blob.size > 15 * 1048576) { notify("Запись слишком длинная."); return; }
        try {
          const url = await uploadMedia(blob, "webm", rec.mimeType || "audio/webm");
          const dur = Math.max(1, Math.round((Date.now() - startTs) / 1000));
          await sendMessage({ type: "voice", content: url, duration: dur, waveform: Array.from({ length: 28 }, () => 5 + Math.round(Math.random() * 16)) });
        } catch (e) { console.error(e); notify("Не удалось загрузить голосовое."); }
      };
      rec.start();
      setRecording({ recorder: rec, start: startTs });
    } catch {
      notify("Браузер не дал доступ к микрофону. Разрешите его в настройках сайта.");
    }
  }
  function stopVoice(send) {
    if (!recording) return;
    recording.recorder._send = send;
    recording.recorder.stop();
    setRecording(null);
  }
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setRecTick((x) => x + 1), 500);
    return () => clearInterval(t);
  }, [recording]);

  async function toggleReaction(msg, emoji) {
    const r = { ...(msg.reactions || {}) };
    const list = r[emoji] || [];
    r[emoji] = list.includes(me.id) ? list.filter((x) => x !== me.id) : [...list, me.id];
    if (!r[emoji].length) delete r[emoji];
    setMenu(null);
    // мгновенно показываем локально, сервер догонит
    setMessages((d) => ({ ...d, [msg.chat_id]: (d[msg.chat_id] || []).map((x) => (x.id === msg.id ? { ...x, reactions: r } : x)) }));
    const { error } = await supabase.from("messages").update({ reactions: r }).eq("id", msg.id);
    if (error) notify("Не удалось поставить реакцию.");
  }
  async function deleteMsg(msg) {
    setMenu(null);
    const { error } = await supabase.from("messages").delete().eq("id", msg.id);
    if (error) notify("Не удалось удалить.");
  }
  async function pinMsg(msg) {
    setMenu(null);
    const next = activeChat?.pinned_msg === msg.id ? null : msg.id;
    const { error } = await supabase.from("chats").update({ pinned_msg: next }).eq("id", activeId);
    if (error) notify("Не удалось закрепить.");
    else setChats((cs) => cs.map((c) => (c.id === activeId ? { ...c, pinned_msg: next } : c)));
  }
  function openMenuAt(x, y, m) {
    setMenu({ x: Math.min(x, window.innerWidth - 190), y: Math.min(y, window.innerHeight - 290), msg: m });
  }
  function bubbleTouchStart(e, m) {
    const t = e.touches[0];
    lpTimer.current = setTimeout(() => openMenuAt(t.clientX, t.clientY, m), 450);
  }
  function bubbleTouchCancel() { clearTimeout(lpTimer.current); }

  // ---------- ПРОФИЛЬ ----------
  async function saveProfile(patch) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", me.id);
    if (error) { notify("Не удалось сохранить."); return; }
    const next = { ...me, ...patch };
    setMe(next); cacheProfiles([next]);
    notify("Сохранено ✓");
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ me: { ...me }, chats, messages }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "messenger-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const unreadCount = (c) => {
    const myRead = reads[c.id]?.[me.id] || 0;
    return (messages[c.id] || []).filter((m) => m.sender_id !== me.id && new Date(m.created_at).getTime() > myRead).length;
  };
  const lastMsgOf = (c) => (messages[c.id] || []).slice(-1)[0];
  const isOn = (u) => onlineIds.has(u?.id);
  const lastSeenText = (u) => {
    if (isOn(u)) return "онлайн";
    if (!u?.last_seen) return "был(а) недавно";
    const d = Date.now() - new Date(u.last_seen).getTime();
    if (d < 3600000) return "был(а) недавно";
    if (d < 86400000) return "был(а) сегодня";
    return `был(а) ${new Date(u.last_seen).toLocaleDateString("ru-RU")}`;
  };
  const chatTitle = (c) => c.is_group ? (c.title || "Группа") : (profiles[c.u1 === me.id ? c.u2 : c.u1]?.login || "…");

  const themeVars = {
    "--accent": prefs.accent,
    "--accent-dim": prefs.accent + "55",
    "--accent-light": prefs.accent + "33",
  };
  const wpCss = prefs.wallpaper === "custom" ? (prefs.customWallpaper ? `url(${prefs.customWallpaper})` : "") : WALLPAPERS[prefs.wallpaper]?.css || "";
  const sortedChats = useMemo(() => [...chats].sort((a, b) => {
    const la = lastMsgOf(a) ? new Date(lastMsgOf(a).created_at).getTime() : new Date(a.created_at).getTime();
    const lb = lastMsgOf(b) ? new Date(lastMsgOf(b).created_at).getTime() : new Date(b.created_at).getTime();
    return lb - la;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [chats, messages]);

  // ============ РЕНДЕР ============
  if (phase === "config") {
    return (
      <div className="tg" data-theme="dark" style={{ ...themeVars, display: "block" }}>
        <style>{css}</style>
        <div className="auth-wrap"><div className="auth-box">
          <h1>Почти готово</h1>
          <p className="sub">Приложение не подключено к базе. Добавьте переменные VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в настройках Vercel и пересоберите проект (Redeploy).</p>
        </div></div>
      </div>
    );
  }
  if (phase === "loading") {
    return (
      <div className="tg" data-theme={prefs.theme} style={{ ...themeVars, display: "block" }}>
        <style>{css}</style>
        <div className="auth-wrap"><span className="muted">Загрузка…</span></div>
      </div>
    );
  }
  if (phase === "auth" || phase === "register") {
    const isReg = phase === "register";
    return (
      <div className="tg" data-theme={prefs.theme} style={{ ...themeVars, display: "block" }}>
        <style>{css}</style>
        <div className="auth-wrap">
          <div className="auth-box">
            <h1>Мессенджер</h1>
            <p className="sub">{isReg ? (regStep === 1 ? "Создание аккаунта" : "Выберите ваш @тег") : "Войдите, чтобы продолжить"}</p>
            {!isReg && (<>
              <input className="field" placeholder="Логин" value={login} onChange={(e) => setLogin(e.target.value)} />
              <div className="pw-wrap">
                <input className="field" type={showPw ? "text" : "password"} placeholder="Пароль" value={pass}
                  onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLogin()} />
                <button onClick={() => setShowPw(!showPw)}>{showPw ? "🙈" : "👁"}</button>
              </div>
              {err && <p className="err">{err}</p>}
              <button className="btn" onClick={doLogin} disabled={!login || !pass || busy}>{busy ? "Входим…" : "Войти"}</button>
              <button className="btn ghost" onClick={() => { setPhase("register"); setErr(""); setRegStep(1); }}>Нет аккаунта? Зарегистрироваться</button>
            </>)}
            {isReg && regStep === 1 && (<>
              <input className="field" placeholder="Логин" value={login} onChange={(e) => setLogin(e.target.value)} />
              <div className="pw-wrap">
                <input className="field" type={showPw ? "text" : "password"} placeholder="Пароль (от 6 символов)" value={pass} onChange={(e) => setPass(e.target.value)} />
                <button onClick={() => setShowPw(!showPw)}>{showPw ? "🙈" : "👁"}</button>
              </div>
              <input className="field" type={showPw ? "text" : "password"} placeholder="Подтверждение пароля" value={pass2} onChange={(e) => setPass2(e.target.value)} />
              {err && <p className="err">{err}</p>}
              <button className="btn" onClick={doRegisterStep1} disabled={busy}>{busy ? "Создаём…" : "Далее"}</button>
              <button className="btn ghost" onClick={() => { setPhase("auth"); setErr(""); }}>Назад ко входу</button>
            </>)}
            {isReg && regStep === 2 && (<>
              <input className="field" placeholder="@твой_тег" value={tag}
                onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doRegisterFinish()} autoFocus />
              {err && <p className="err">{err}</p>}
              <button className="btn" onClick={doRegisterFinish} disabled={busy}>{busy ? "Сохраняем…" : "Завершить регистрацию"}</button>
            </>)}
          </div>
        </div>
      </div>
    );
  }

  const myBanner = BANNERS[me.banner] || BANNERS[0];

  return (
    <div className={`tg view-${activeId ? "chat" : "list"}`} data-theme={prefs.theme} style={themeVars}
      onClick={() => { menu && setMenu(null); showAttach && setShowAttach(false); }}>
      <style>{css}</style>

      <input ref={avatarInp} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files[0]; e.target.value = "";
        if (!f) return;
        try { await saveProfile({ avatar: await resizeImage(f, 128, 0.8) }); }
        catch { notify("Не удалось обработать изображение."); }
      }} />
      <input ref={mediaInp} type="file" accept="image/*,video/*" hidden onChange={(e) => { handleMedia(e.target.files[0]); e.target.value = ""; }} />
      <input ref={fileInp} type="file" hidden onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }} />
      <input ref={wpInp} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files[0]; e.target.value = "";
        if (!f) return;
        try {
          const data = await resizeImage(f, 1280, 0.6);
          await setPrefsAnd({ customWallpaper: data, wallpaper: "custom" });
        } catch { notify("Не удалось обработать изображение."); }
      }} />

      {/* ЛЕВАЯ ПАНЕЛЬ */}
      <div className="side">
        <div className="side-top">
          <button className="icon-btn" title="Профиль и настройки" onClick={() => setShowProfile(true)}>☰</button>
          <input className="search-input" placeholder="Найти по @тегу…" value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)} />
          <button className="icon-btn" title="Создать группу" onClick={() => setShowGroupNew(true)}>👥</button>
        </div>
        <div className="chats">
          {searchResults !== null && userQuery.trim() ? (
            searchResults.length ? searchResults.map((u) => (
              <div className="chat-item" key={u.id} onClick={() => startChat(u)}>
                <Avatar user={u} online={isOn(u)} />
                <div className="ci-body">
                  <div className="ci-row"><span className="ci-name">{u.login}</span></div>
                  <div className="ci-last">@{u.tag}{u.bio ? ` · ${u.bio}` : ""}</div>
                </div>
                <span className="badge">Написать</span>
              </div>
            )) : <p className="muted" style={{ padding: 20, textAlign: "center", fontSize: 14 }}>Никого не нашлось. Проверьте @тег.</p>
          ) : sortedChats.length ? (
            sortedChats.map((c) => {
              const p = c.is_group ? null : profiles[c.u1 === me.id ? c.u2 : c.u1];
              const last = lastMsgOf(c);
              const n = unreadCount(c);
              const lastLabel = last
                ? `${last.sender_id === me.id ? "Вы" : (c.is_group ? (profiles[last.sender_id]?.login || "…") : "")}${last.sender_id === me.id || c.is_group ? ": " : ""}${previewOf(last)}`
                : c.is_group ? "Группа создана" : "Чат создан";
              return (
                <div className={`chat-item${c.id === activeId ? " active" : ""}`} key={c.id} onClick={() => openChat(c.id)}>
                  {c.is_group ? <GroupAvatar chat={c} /> : <Avatar user={p} online={isOn(p)} />}
                  <div className="ci-body">
                    <div className="ci-row">
                      <span className="ci-name">{c.is_group && "👥 "}{chatTitle(c)}</span>
                      <span className="ci-time">{last ? fmtTime(last.created_at) : ""}</span>
                    </div>
                    <div className="ci-row">
                      <span className="ci-last">{prefs.drafts?.[c.id] ? `✏️ ${prefs.drafts[c.id].slice(0, 40)}` : lastLabel}</span>
                      {n > 0 && <span className="badge">{n}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="muted" style={{ padding: 24, textAlign: "center", fontSize: 14 }}>
              Чатов пока нет.<br />Найдите собеседника по @тегу или создайте группу (👥).
            </p>
          )}
        </div>
      </div>

      {/* ПРАВАЯ ПАНЕЛЬ */}
      <div className="main">
        {!activeChat ? (
          <div className="placeholder">Выберите чат</div>
        ) : (<>
          <div className="chat-head">
            <button className="icon-btn back-btn" onClick={() => setActiveId(null)}>←</button>
            <div onClick={() => setShowChatInfo(true)} style={{ cursor: "pointer" }}>
              {isGroup ? <GroupAvatar chat={activeChat} size="sm" /> : <Avatar user={peer} size="sm" />}
            </div>
            <div className="ch-info" onClick={() => setShowChatInfo(true)} title={isGroup ? "Об этой группе" : "Открыть профиль"}>
              <div className="ch-name">
                {chatTitle(activeChat)}
                {!isGroup && <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}> @{peer?.tag}</span>}
              </div>
              <div className={`ch-status${(isGroup ? typingNames.length : (isOn(peer) || typingNames.length)) ? " on" : ""}`}>
                {typingNames.length
                  ? `${typingNames.join(", ")} печатает…`
                  : isGroup
                    ? `${activeMembers.length} участников${activeMembers.filter(isOn).length ? ` · ${activeMembers.filter(isOn).length} онлайн` : ""}`
                    : lastSeenText(peer)}
              </div>
            </div>
            <button className="icon-btn" title="Поиск по чату" onClick={() => setChatSearch(chatSearch === null ? "" : null)}>🔍</button>
          </div>

          {chatSearch !== null && (
            <div style={{ padding: "6px 14px", background: "var(--side)", borderBottom: "1px solid var(--line)" }}>
              <input className="search-input" style={{ width: "100%" }} placeholder="Поиск по сообщениям…" value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)} autoFocus />
            </div>
          )}

          {activeChat.pinned_msg && (() => {
            const pm = activeMsgs.find((m) => m.id === activeChat.pinned_msg);
            return pm ? (
              <div className="pin-bar">📌 <span><b style={{ color: "var(--accent)" }}>{senderName(pm)}:</b> {previewOf(pm)}</span>
                <button className="icon-btn" style={{ fontSize: 13 }} onClick={() => pinMsg(pm)}>✕</button></div>
            ) : null;
          })()}

          <div className={`msgs${wpCss ? " has-wp" : ""}`} ref={msgsRef} style={{ background: wpCss || undefined }}>
            {(chatSearch ? activeMsgs.filter((m) => m.type === "text" && m.content.toLowerCase().includes(chatSearch.toLowerCase())) : activeMsgs).map((m, i, arr) => {
              const prev = arr[i - 1];
              const ts = new Date(m.created_at).getTime();
              const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
              const out = m.sender_id === me.id;
              const othersRead = Object.entries(reads[activeId] || {}).some(([uid, t]) => uid !== me.id && t >= ts);
              const url = m.type === "text" ? findUrl(m.content) : null;
              const showAsPhoto = m.type === "photo" || (m.type === "file" && isImg(m));
              const showSender = isGroup && !out && (!prev || prev.sender_id !== m.sender_id);
              return (
                <div key={m.id}>
                  {newDay && <div style={{ display: "flex", justifyContent: "center" }}><span className="day-sep">{fmtDay(m.created_at)}</span></div>}
                  <div className={`bubble-row ${out ? "out" : "in"}`}>
                    <div className={`bubble ${out ? "out" : "in"}`}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); openMenuAt(e.clientX, e.clientY, m); }}
                      onDoubleClick={() => toggleReaction(m, "❤️")}
                      onTouchStart={(e) => bubbleTouchStart(e, m)}
                      onTouchEnd={bubbleTouchCancel}
                      onTouchMove={bubbleTouchCancel}>
                      {showSender && <div className="b-sender" style={{ color: senderColor(m.sender_id) }}>{profiles[m.sender_id]?.login || "…"}</div>}
                      {m.reply_to && <div className="reply-quote"><b>{m.reply_to.name}</b>{m.reply_to.text}</div>}
                      {m.type === "text" && <span>{highlight(m.content, chatSearch || "")}</span>}
                      {showAsPhoto && <img className="b-img" src={m.content} alt="" onClick={() => setViewer(m.content)} />}
                      {m.type === "video" && <video className="b-img" src={m.content} controls style={{ maxHeight: 280 }} />}
                      {m.type === "file" && !showAsPhoto && (
                        <a className="b-file" href={m.content} download={m.file_name} style={{ color: "var(--text)", textDecoration: "none" }}>
                          <div className="fi">📄</div>
                          <div><div style={{ fontWeight: 600, fontSize: 14 }}>{m.file_name}</div><div className="muted" style={{ fontSize: 12.5 }}>{fmtSize(m.file_size || 0)}</div></div>
                        </a>
                      )}
                      {m.type === "voice" && <VoiceBubble msg={m} />}
                      {url && <a className="link-card" href={url} target="_blank" rel="noreferrer">🔗 {(() => { try { return new URL(url).hostname; } catch { return url; } })()}</a>}
                      {Object.keys(m.reactions || {}).length > 0 && (
                        <div className="reacts">
                          {Object.entries(m.reactions).map(([e, ids]) => (
                            <button key={e} className={`react-chip${ids.includes(me.id) ? " mine" : ""}`} onClick={() => toggleReaction(m, e)}>
                              {e} {ids.length}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="b-meta">
                        {fmtTime(m.created_at)}
                        {out && <span className={`ticks${othersRead ? " read" : ""}`}>✓✓</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {activeMsgs.length === 0 && <div className="placeholder" style={{ minHeight: 200 }}>Напишите первое сообщение</div>}
          </div>

          <div className="composer">
            {replyTo && (
              <div className="reply-bar">
                <span style={{ color: "var(--accent)" }}>↩ {senderName(replyTo)}:</span>
                <span className="muted" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewOf(replyTo)}</span>
                <button className="icon-btn" style={{ fontSize: 13 }} onClick={() => setReplyTo(null)}>✕</button>
              </div>
            )}
            {prefs.quickReplies?.length > 0 && !recording && (
              <div className="quick-chips">
                {prefs.quickReplies.map((q, i) => <button key={i} className="chip" title="Отправить сразу" onClick={() => sendText(q)}>⚡ {q}</button>)}
              </div>
            )}
            <div className="compose-row" style={{ position: "relative" }}>
              {showEmoji && (
                <div className="emoji-pop">
                  <div className="emoji-tabs">
                    {Object.keys(EMOJI).map((t) => <button key={t} className={t === emojiTab ? "sel" : ""} onClick={() => setEmojiTab(t)}>{t}</button>)}
                  </div>
                  <div className="emoji-grid">
                    {EMOJI[emojiTab].map((e) => <button key={e} onClick={() => { setDraft((d) => d + e); taRef.current?.focus(); }}>{e}</button>)}
                  </div>
                </div>
              )}
              {showAttach && (
                <div className="attach-pop" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setShowAttach(false); mediaInp.current?.click(); }}>🖼 Фото или видео</button>
                  <button onClick={() => { setShowAttach(false); fileInp.current?.click(); }}>📄 Документ</button>
                  <button onClick={startVoice}>🎤 Голосовое сообщение</button>
                </div>
              )}
              <button className="icon-btn" title="Прикрепить" onClick={(e) => { e.stopPropagation(); setShowAttach(!showAttach); setShowEmoji(false); }}>📎</button>
              <button className="icon-btn" title="Эмодзи" onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}>😊</button>
              {recording ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "0 10px" }}>
                  <span style={{ color: "#E26060" }}>● Запись… {Math.round((Date.now() - recording.start) / 1000)}с</span>
                  <span style={{ flex: 1 }} />
                  <button className="chip" onClick={() => stopVoice(false)}>Отмена</button>
                </div>
              ) : (
                <textarea ref={taRef} rows={1} placeholder="Сообщение" value={draft}
                  onChange={(e) => { setDraft(e.target.value); notifyTyping(); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                  onKeyDown={(e) => { tickSound(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }} />
              )}
              <button className="send-btn" title="Отправить" disabled={!draft.trim() && !recording}
                onClick={() => recording ? stopVoice(true) : sendText()}>➤</button>
            </div>
          </div>
        </>)}
      </div>

      {/* КОНТЕКСТНОЕ МЕНЮ */}
      {menu && (
        <div className="menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <div className="rx">
            {REACTIONS.map((e) => <button key={e} onClick={() => toggleReaction(menu.msg, e)}>{e}</button>)}
          </div>
          <button onClick={() => { setReplyTo(menu.msg); setMenu(null); taRef.current?.focus(); }}>↩ Ответить</button>
          {menu.msg.type === "text" && <button onClick={() => { navigator.clipboard?.writeText(menu.msg.content); setMenu(null); }}>📋 Копировать</button>}
          <button onClick={() => pinMsg(menu.msg)}>📌 {activeChat?.pinned_msg === menu.msg.id ? "Открепить" : "Закрепить"}</button>
          {menu.msg.sender_id === me.id && <button style={{ color: "#E26060" }} onClick={() => deleteMsg(menu.msg)}>🗑 Удалить</button>}
        </div>
      )}

      {/* ПРОСМОТР ФОТО */}
      {viewer && (
        <div className="overlay" onClick={() => setViewer(null)}>
          <img src={viewer} alt="" style={{ maxWidth: "95%", maxHeight: "95%", borderRadius: 8 }} />
        </div>
      )}

      {/* СОЗДАНИЕ ГРУППЫ */}
      {showGroupNew && (
        <div className="overlay" onClick={() => setShowGroupNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              <h3 style={{ marginTop: 0 }}>Новая группа</h3>
              <input className="field" placeholder="Название группы" maxLength={50} value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)} autoFocus />
              {groupPicks.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {groupPicks.map((p) => (
                    <button key={p.id} className="pick-chip" onClick={() => setGroupPicks(groupPicks.filter((x) => x.id !== p.id))}>
                      {p.login} ✕
                    </button>
                  ))}
                </div>
              )}
              <input className="field" placeholder="Найти участника по @тегу…" value={groupQuery}
                onChange={(e) => setGroupQuery(e.target.value)} />
              {(groupResults || []).map((u) => (
                <div className="member-row" key={u.id} style={{ cursor: "pointer" }}
                  onClick={() => { setGroupPicks([...groupPicks, u]); setGroupQuery(""); }}>
                  <Avatar user={u} size="sm" online={isOn(u)} />
                  <span className="mr-name">{u.login} <span className="muted">@{u.tag}</span></span>
                  <span className="badge">＋</span>
                </div>
              ))}
              <button className="btn" style={{ marginTop: 10 }} onClick={createGroup}
                disabled={!groupTitle.trim() || !groupPicks.length}>Создать группу</button>
              <button className="btn ghost" onClick={() => setShowGroupNew(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* ИНФО О ЧАТЕ / ПРОФИЛЬ СОБЕСЕДНИКА */}
      {showChatInfo && activeChat && (
        <div className="overlay" onClick={() => { setShowChatInfo(false); setAddQuery(""); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {isGroup ? (
              <div className="modal-pad">
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                  <GroupAvatar chat={activeChat} size="lg" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 19 }}>{activeChat.title}</div>
                    <div className="muted" style={{ fontSize: 14 }}>{activeMembers.length} участников</div>
                  </div>
                </div>
                <h3>Участники</h3>
                {activeMembers.map((u) => (
                  <div className="member-row" key={u.id}>
                    <Avatar user={u} size="sm" online={isOn(u)} />
                    <span className="mr-name">
                      {u.login} {u.id === activeChat.owner && "👑"} {u.id === me.id && <span className="muted">(вы)</span>}
                    </span>
                    {activeChat.owner === me.id && u.id !== me.id && (
                      <button className="icon-btn" title="Удалить из группы" style={{ fontSize: 14 }} onClick={() => kickMember(u.id)}>✕</button>
                    )}
                  </div>
                ))}
                <h3>Добавить участника</h3>
                <input className="field" placeholder="Поиск по @тегу…" value={addQuery} onChange={(e) => setAddQuery(e.target.value)} />
                {(addResults || []).map((u) => (
                  <div className="member-row" key={u.id} style={{ cursor: "pointer" }} onClick={() => addMember(u)}>
                    <Avatar user={u} size="sm" online={isOn(u)} />
                    <span className="mr-name">{u.login} <span className="muted">@{u.tag}</span></span>
                    <span className="badge">＋</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button className="btn" style={{ background: "#D9534F" }} onClick={leaveGroup}>Покинуть группу</button>
                  <button className="btn ghost" onClick={() => setShowChatInfo(false)}>Закрыть</button>
                </div>
              </div>
            ) : peer ? (<>
              <div className="banner" style={{ background: BANNERS[peer.banner] || BANNERS[0] }}>
                <Avatar user={peer} size="lg" />
              </div>
              <div className="modal-pad" style={{ paddingTop: 58 }}>
                <div style={{ fontWeight: 700, fontSize: 19 }}>{peer.login}</div>
                <div className="muted" style={{ fontSize: 14 }}>@{peer.tag} · {lastSeenText(peer)}</div>
                {peer.bio && <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.4 }}>{peer.bio}</p>}
                <p className="stat" style={{ marginTop: 10 }}>В мессенджере с {new Date(peer.created_at).toLocaleDateString("ru-RU")}</p>
                <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setShowChatInfo(false)}>Закрыть</button>
              </div>
            </>) : null}
          </div>
        </div>
      )}

      {/* СВОЙ ПРОФИЛЬ И НАСТРОЙКИ */}
      {showProfile && (
        <div className="overlay" onClick={() => setShowProfile(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="banner" style={{ background: myBanner }}>
              <div onClick={() => avatarInp.current?.click()} title="Сменить аватар">
                <Avatar user={me} size="lg" />
              </div>
            </div>
            <div className="modal-pad" style={{ paddingTop: 58 }}>
              <div style={{ fontWeight: 700, fontSize: 19 }}>{me.login}</div>
              <div className="muted" style={{ fontSize: 14, marginBottom: 10 }}>@{me.tag} · нажмите на аватар, чтобы сменить</div>
              <input className="field" placeholder="О себе (до 200 символов)" maxLength={200} defaultValue={me.bio}
                onBlur={(e) => e.target.value !== me.bio && saveProfile({ bio: e.target.value })} />
              <p className="stat">Чатов: {chats.length} · Регистрация: {me.created_at ? new Date(me.created_at).toLocaleDateString("ru-RU") : "—"}</p>

              <h3>Баннер профиля</h3>
              <div className="swatches">
                {BANNERS.map((b, i) => <div key={i} className={`sw${me.banner === i ? " sel" : ""}`} style={{ background: b }} onClick={() => saveProfile({ banner: i })} />)}
              </div>

              <h3>Рамка аватара</h3>
              <div className="swatches">
                {FRAMES.map((f) => (
                  <div key={f.id} className={`sw${(me.frame || "none") === f.id ? " sel" : ""}`}
                    style={{ background: f.id === "none" ? "var(--input)" : f.css }} title={f.name} onClick={() => saveProfile({ frame: f.id })} />
                ))}
              </div>

              <h3>Тема</h3>
              <div className="theme-row">
                {[["light", "Светлая"], ["dark", "Тёмная"], ["amoled", "AMOLED"]].map(([v, l]) => (
                  <button key={v} className={`btn${prefs.theme === v ? "" : " ghost"}`} style={{ padding: "8px 4px", fontSize: 13 }}
                    onClick={() => setPrefsAnd({ theme: v })}>{l}</button>
                ))}
              </div>
              <h3>Акцентный цвет</h3>
              <div className="swatches">
                {ACCENTS.map((c) => <div key={c} className={`sw${prefs.accent === c ? " sel" : ""}`} style={{ background: c }} onClick={() => setPrefsAnd({ accent: c })} />)}
              </div>

              <h3>Обои чата</h3>
              <div className="wp-grid">
                {WALLPAPERS.map((w, i) => (
                  <div key={i} className={`wp${prefs.wallpaper === i ? " sel" : ""}`} style={{ background: w.css || "var(--input)" }}
                    onClick={() => setPrefsAnd({ wallpaper: i })}>{w.name}</div>
                ))}
                <div className={`wp${prefs.wallpaper === "custom" ? " sel" : ""}`}
                  style={{ backgroundImage: prefs.customWallpaper ? `url(${prefs.customWallpaper})` : undefined }}
                  onClick={() => wpInp.current?.click()}>Своя 📁</div>
              </div>

              <div className="toggle-row" style={{ marginTop: 12 }}>
                <span>🔊 Звук при печати</span>
                <button className={`toggle${prefs.typeSound ? " on" : ""}`} onClick={() => setPrefsAnd({ typeSound: !prefs.typeSound })} />
              </div>

              <h3>Быстрые ответы (до 5, отправляются в один клик)</h3>
              {Array.from({ length: 5 }).map((_, i) => (
                <input key={i} className="field" style={{ marginBottom: 6, padding: "8px 12px" }} placeholder={`Фраза ${i + 1}`}
                  defaultValue={prefs.quickReplies?.[i] || ""}
                  onBlur={(e) => {
                    const qr = [...(prefs.quickReplies || [])];
                    qr[i] = e.target.value;
                    setPrefsAnd({ quickReplies: qr.filter(Boolean).slice(0, 5) });
                  }} />
              ))}

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn ghost" onClick={exportData}>⬇ Экспорт данных</button>
                <button className="btn" style={{ background: "#D9534F" }} onClick={logout}>Выйти</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ТОСТ */}
      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "var(--side)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 18px", fontSize: 14, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
