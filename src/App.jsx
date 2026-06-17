import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase, configured } from "./supabase.js";
import { css } from "./styles.js";
import { ACCENTS, WALLPAPERS, BANNERS, FRAMES, EMOJI, REACTIONS } from "./constants.js";
import { fmtTime, fmtDay, fmtSize, findUrl, isImg, resizeImage, resizeToBlob, fileToB64, loadPrefs, storePrefs } from "./helpers.js";
import { LANGS, makeT } from "./i18n.js";

const EMAIL_DOMAIN = "msgr.example.com";
const FONTS = [
  { id: "system", name: "Системный", css: "-apple-system, 'Segoe UI', Roboto, sans-serif" },
  { id: "inter", name: "Inter", css: "'Inter', sans-serif" },
  { id: "rubik", name: "Rubik", css: "'Rubik', sans-serif" },
  { id: "comfortaa", name: "Comfortaa", css: "'Comfortaa', sans-serif" },
  { id: "mono", name: "Mono", css: "'JetBrains Mono', monospace" },
];
const APP_ICONS = [
  { id: "blue", name: "Классика", file: "/favicon.svg" },
  { id: "violet", name: "Неон", file: "/icon-violet.svg" },
  { id: "mint", name: "Мята", file: "/icon-mint.svg" },
  { id: "dark", name: "Минимал", file: "/icon-dark.svg" },
];
const CallIc = {
  mic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>,
  micOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><line x1="4" y1="4" x2="20" y2="20"/></svg>,
  cam: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="12" height="10" rx="2"/><path d="M15 10.5 21 7v10l-6-3.5"/></svg>,
  camOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="12" height="10" rx="2"/><path d="M15 10.5 21 7v10l-6-3.5"/><line x1="3" y1="3" x2="21" y2="21"/></svg>,
  phone: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h2a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
};
const TURN_URLS = (import.meta.env.VITE_TURN_URL || "").split(",").map((x) => x.trim()).filter(Boolean);
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(TURN_URLS.length ? [{
    urls: TURN_URLS,
    username: import.meta.env.VITE_TURN_USERNAME || "",
    credential: import.meta.env.VITE_TURN_CREDENTIAL || "",
  }] : []),
];
const TEXTURES = [
  // Геометрические (узор задаётся цветом)
  { id: "dots", name: "Точки", kind: "pattern", make: (c) => `radial-gradient(${c} 1.4px, transparent 1.5px) 0 0 / 14px 14px` },
  { id: "grid", name: "Сетка", kind: "pattern", make: (c) => `linear-gradient(${c} 1px, transparent 1px) 0 0 / 20px 20px, linear-gradient(90deg, ${c} 1px, transparent 1px) 0 0 / 20px 20px` },
  { id: "diag", name: "Полоски", kind: "pattern", make: (c) => `repeating-linear-gradient(45deg, ${c} 0 2px, transparent 2px 12px)` },
  { id: "zigzag", name: "Зигзаг", kind: "pattern", make: (c) => `repeating-linear-gradient(135deg, ${c} 0 2px, transparent 2px 9px)` },
  // Материалы (самодостаточные, цвет узора игнорируется)
  { id: "wood", name: "Дерево", kind: "material", make: () =>
    `repeating-linear-gradient(90deg, #6b4423 0 3px, #7a4f29 3px 5px, #5e3b1e 5px 8px, #76492705 8px 26px), repeating-linear-gradient(89deg, #00000018 0 1px, transparent 1px 40px)`,
    base: "#6b4423" },
  { id: "marble", name: "Мрамор", kind: "material", make: () =>
    `radial-gradient(ellipse 60% 40% at 30% 30%, #ffffff35, transparent 60%), radial-gradient(ellipse 50% 30% at 70% 65%, #c8c8d020, transparent 55%), repeating-linear-gradient(48deg, transparent 0 22px, #9aa0b015 22px 23px, transparent 23px 30px), repeating-linear-gradient(-50deg, transparent 0 40px, #88889018 40px 41px, transparent 41px 60px)`,
    base: "#e8eaf0" },
  { id: "stone", name: "Камень", kind: "material", make: () =>
    `radial-gradient(circle at 20% 30%, #00000022 0 2px, transparent 3px), radial-gradient(circle at 60% 70%, #00000018 0 3px, transparent 4px), radial-gradient(circle at 80% 20%, #ffffff10 0 2px, transparent 3px), repeating-conic-gradient(#6e6e6e10 0 8%, transparent 0 16%) 0 0 / 30px 30px`,
    base: "#7d7d7d" },
  { id: "water", name: "Вода", kind: "material", make: () =>
    `radial-gradient(ellipse 70% 50% at 40% 30%, #7fd0ff40, transparent 60%), repeating-linear-gradient(8deg, #2b8fd010 0 6px, #4aa8e818 6px 12px, transparent 12px 22px), repeating-linear-gradient(-6deg, transparent 0 14px, #aee4ff20 14px 16px, transparent 16px 30px)`,
    base: "#2b7fc0" },
  { id: "granite", name: "Гранит", kind: "material", make: () =>
    `radial-gradient(circle at 15% 25%, #ffffff18 0 1.5px, transparent 2px), radial-gradient(circle at 45% 60%, #00000030 0 1.5px, transparent 2px), radial-gradient(circle at 75% 35%, #d0a0a020 0 2px, transparent 3px), radial-gradient(circle at 60% 85%, #ffffff14 0 1px, transparent 2px), repeating-conic-gradient(#55555512 0 10%, transparent 0 20%) 0 0 / 18px 18px`,
    base: "#4a4a52" },
];
const textureCss = (texId, texColor, baseColor) => {
  const t = TEXTURES.find((x) => x.id === texId);
  if (!t) return null;
  if (t.kind === "material") return { backgroundColor: t.base, backgroundImage: t.make(), backgroundSize: "120px 120px, cover" };
  return { backgroundColor: baseColor || "#1d2733", backgroundImage: t.make(texColor || "rgba(255,255,255,0.12)") };
};
const blobToB64 = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
const loginToEmail = (login) => `${login.trim().toLowerCase()}@${EMAIL_DOMAIN}`;

// ============ КОМПОНЕНТЫ ============
function Avatar({ user, size = "", online = false }) {
  const color = ACCENTS[(user?.tag?.length || 0) % ACCENTS.length];
  const frame = user?.frame?.startsWith?.("#") ? { css: user.frame } : (FRAMES.find((f) => f.id === user?.frame) || FRAMES[0]);
  return (
    <div className="ava-frame" style={{ background: frame.css }}>
      <div className={`ava ${size}`} style={{ background: user?.avatar ? "var(--side)" : color }}>
        {user?.avatar ? <img src={user.avatar} alt="" /> : (user?.tag?.[0] || "?").toUpperCase()}
        {size !== "lg" && online && <div className="online-dot" />}
      </div>
    </div>
  );
}
const GroupAvatar = ({ chat, size = "" }) => (
  <Avatar user={{ tag: (chat.title || "Г"), frame: "none", avatar: chat.avatar }} size={size} />
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

function ColorDot({ value, fallback = "#5AABF0", title, onCommit }) {
  const [v, setV] = useState(value || fallback);
  const tRef = useRef(null);
  const inpRef = useRef(null);
  useEffect(() => { if (value) setV(value); }, [value]);
  return (
    <label className={`sw${value ? "" : " sw-pick"}`} title={title}
      style={{ position: "relative", overflow: "hidden", ...(value ? { background: v } : {}) }}
      onClick={() => inpRef.current?.click()}>
      {!value && <span className="pick-plus">＋</span>}
      <input ref={inpRef} type="color" value={v}
        style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer", border: 0, padding: 0 }}
        onChange={(e) => {
          const nv = e.target.value;
          setV(nv);
          clearTimeout(tRef.current);
          tRef.current = setTimeout(() => onCommit(nv), 300);
        }} />
    </label>
  );
}

function CropModal({ src, aspect = 1, round = true, onCancel, onSave }) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [nat, setNat] = useState(null);
  const drag = useRef(null);
  const imgEl = useRef(null);
  let bw = 260, bh = Math.round(260 / aspect);
  if (bh > 300) { bh = 300; bw = Math.round(300 * aspect); }
  const base = nat ? Math.max(bw / nat.w, bh / nat.h) : 1;
  const w = nat ? nat.w * base * zoom : bw;
  const h = nat ? nat.h * base * zoom : bh;
  const clamp = (p) => ({ x: Math.min(0, Math.max(bw - w, p.x)), y: Math.min(0, Math.max(bh - h, p.y)) });
  useEffect(() => { setPos((p) => ({ x: Math.min(0, Math.max(bw - w, p.x)), y: Math.min(0, Math.max(bh - h, p.y)) })); }, [w, h, bw, bh]);
  function down(e) {
    const t = e.touches ? e.touches[0] : e;
    drag.current = { sx: t.clientX, sy: t.clientY, px: pos.x, py: pos.y };
  }
  function move(e) {
    if (!drag.current) return;
    const t = e.touches ? e.touches[0] : e;
    setPos(clamp({ x: drag.current.px + (t.clientX - drag.current.sx), y: drag.current.py + (t.clientY - drag.current.sy) }));
  }
  function up() { drag.current = null; }
  function save() {
    const outW = aspect >= 1 ? 1024 : Math.round(1024 * aspect);
    const outH = Math.round(outW / aspect);
    const c = document.createElement("canvas");
    c.width = outW; c.height = outH;
    const k = outW / bw;
    c.getContext("2d").drawImage(imgEl.current, pos.x * k, pos.y * k, w * k, h * k);
    c.toBlob((b) => b && onSave(b), "image/jpeg", 0.82);
  }
  return (
    <div className="overlay" style={{ zIndex: 80 }} onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-pad">
          <h3 style={{ marginTop: 0 }}>Положение фото</h3>
          <div className="crop-box" style={{ width: bw, height: bh }} onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
            onTouchStart={down} onTouchMove={move} onTouchEnd={up}>
            <img ref={imgEl} src={src} alt="" draggable={false}
              onLoad={(e) => setNat({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
              style={{ position: "absolute", left: pos.x, top: pos.y, width: w, height: h, maxWidth: "none", userSelect: "none", pointerEvents: "none" }} />
            {round && <div className="crop-ring" />}
          </div>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(+e.target.value)} style={{ width: "100%", margin: "12px 0" }} />
          <button className="btn" onClick={save}>Сохранить</button>
          <button className="btn ghost" onClick={onCancel}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

function Bars({ data, lk, vk }) {
  if (!data?.length) return <p className="muted" style={{ fontSize: 13, padding: 6 }}>Данных пока нет</p>;
  const max = Math.max(1, ...data.map((d) => d[vk]));
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-col" key={i} title={`${d[lk]}: ${d[vk]}`}>
          <i>{d[vk]}</i>
          <div className="bar" style={{ height: `${Math.round((d[vk] / max) * 58) + 3}px` }} />
          <span>{d[lk]}</span>
        </div>
      ))}
    </div>
  );
}

function MsgText({ text, query, onMention }) {
  if (query) return <span>{highlight(text, query)}</span>;
  const parts = text.split(/(@[a-zA-Z0-9_]{3,20})/g);
  if (parts.length === 1) return <span>{text}</span>;
  return (
    <span>
      {parts.map((part, i) => /^@[a-zA-Z0-9_]{3,20}$/.test(part)
        ? <span key={i} className="mention" onClick={(e) => { e.stopPropagation(); onMention(part.slice(1)); }}>{part}</span>
        : part)}
    </span>
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

  const [prefs, setPrefs] = useState(() => ({ theme: "dark", accent: "#5AABF0", quickReplies: [], drafts: {}, wallpaper: 0, customWallpaper: null, typeSound: false, muted: [], folders: [], dismissedAnn: 0, font: "system", icon: "blue", nickColor: null, bubbleColor: null, callLog: [], msgSound: true, pinned: [], archived: [], unreadMarks: [], notifMode: {}, uiVars: {}, btnIcons: {}, btnAnim: {}, lang: "ru", stickers: [], chatPins: {}, wpFit: "cover", recentReacts: [], emojiPacks: [], ...loadPrefs() }));
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [menu, setMenu] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [emojiTab, setEmojiTab] = useState("😀");
  const [showProfile, setShowProfile] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [showGroupNew, setShowGroupNew] = useState(false);
  const [groupEdit, setGroupEdit] = useState(false);
  const [mediaTab, setMediaTab] = useState(null);
  const [reactFor, setReactFor] = useState(null);
  const [reactViewer, setReactViewer] = useState(null);
  const [showMember, setShowMember] = useState(null);
  const [friends, setFriends] = useState(new Set());
  const [blocked, setBlocked] = useState(new Set());
  const [crop, setCrop] = useState(null); // { src, kind: 'me' | 'group' }
  const [flashId, setFlashId] = useState(null);
  const [readersFor, setReadersFor] = useState(null);
  const [activeFolder, setActiveFolder] = useState("all");
  const [folderEdit, setFolderEdit] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [folderIds, setFolderIds] = useState(new Set());
  const [appSettings, setAppSettings] = useState({});
  const [annText, setAnnText] = useState("");
  const [newKind, setNewKind] = useState("group"); // group | channel
  const [channelResults, setChannelResults] = useState([]);
  const [pendingMedia, setPendingMedia] = useState(null); // { file, url, kind, orig }
  const [call, setCall] = useState(null); // { peer, dir, status, video, startedAt }
  const [callMuted, setCallMuted] = useState(false);
  const [callCamOff, setCallCamOff] = useState(false);
  const [callNet, setCallNet] = useState("");
  const [callMin, setCallMin] = useState(false);
  const [activePack, setActivePack] = useState(0);
  const [showOnboard, setShowOnboard] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(null);
  const [marketSort, setMarketSort] = useState("likes"); // likes | downloads | new
  const [myLikes, setMyLikes] = useState(new Set());
  const [mySubs, setMySubs] = useState(new Set());
  const [callDiag, setCallDiag] = useState({ ice: "", gather: "", cands: 0, relay: 0, turn: TURN_URLS.length });
  const [, setCallTick] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showCalls, setShowCalls] = useState(false);
  const [statusPick, setStatusPick] = useState(false);
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const [chatMenu, setChatMenu] = useState(null); // { x, y, chat }
  const [chatMenuFolders, setChatMenuFolders] = useState(false);
  const [chatMenuNotif, setChatMenuNotif] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);
  const [statUser, setStatUser] = useState(null);
  const [statUserData, setStatUserData] = useState(null);
  const [statQuery, setStatQuery] = useState("");
  const [statResults, setStatResults] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderEmoji, setBuilderEmoji] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminQuery, setAdminQuery] = useState("");
  const [adminResults, setAdminResults] = useState(null);
  const [adminTarget, setAdminTarget] = useState(null);
  const [adminChats, setAdminChats] = useState([]);
  const [showJump, setShowJump] = useState(false);
  const [activePinIdx, setActivePinIdx] = useState(0);
  const [showPinList, setShowPinList] = useState(false);
  const [feedbackOn, setFeedbackOn] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [themes, setThemes] = useState(null);
  const [profilePreview, setProfilePreview] = useState(false);
  const [marketTab, setMarketTab] = useState("all"); // all | pc | mobile
  const [marketQuery, setMarketQuery] = useState("");
  const [themeOpen, setThemeOpen] = useState(null);
  const [publishForm, setPublishForm] = useState(null); // { title, description, platform, tags, media }
  const [showStickers, setShowStickers] = useState(false);
  const [expireSec, setExpireSec] = useState(0);
  const [lockedOpen, setLockedOpen] = useState(null); // chatId, для которого спрашиваем пин
  const [pinInput, setPinInput] = useState("");
  const [unlocked, setUnlocked] = useState({}); // chatId -> true в текущей сессии
  const [showReports, setShowReports] = useState(false);
  const [reports, setReports] = useState(null);
  const [recoverMode, setRecoverMode] = useState(false);
  const [recCode, setRecCode] = useState("");
  const [recNew, setRecNew] = useState("");
  const [editing, setEditing] = useState(null); // сообщение, которое редактируем
  const [forwarding, setForwarding] = useState(null); // сообщение для пересылки
  const [globalSearch, setGlobalSearch] = useState(null);
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
  const lpChat = useRef(null);
  const suppressClick = useRef(false);
  const builderImgFor = useRef(null);
  const builderImgInp = useRef(null);
  const sideBgInp = useRef(null);
  const emojiPackInp = useRef(null);
  const themeMediaInp = useRef(null);
  const stickerInp = useRef(null);
  const originalRef = useRef(false);
  const msgRefs = useRef({});
  const meBannerInp = useRef(null);
  const groupBannerInp = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const sigChans = useRef({});
  const remoteStreamRef = useRef(null);
  const candQueue = useRef([]);
  const ringRef = useRef(null);
  const callRef = useRef(null);
  const prefsRef = useRef(null);
  const chatsRef = useRef(null);
  const activeIdRef = useRef(null);
  activeIdRef.current = activeId;

  const avatarInp = useRef(null);
  const mediaInp = useRef(null);
  const fileInp = useRef(null);
  const wpInp = useRef(null);
  const groupAvaInp = useRef(null);

  prefsRef.current = prefs;
  chatsRef.current = chats;
  const t = useMemo(() => makeT(prefs.lang || "ru"), [prefs.lang]);
  const meTagRef = useRef(null);
  const meLoginRef = useRef(null);
  meTagRef.current = me?.tag;
  meLoginRef.current = me?.login;
  const activeChat = chats.find((c) => c.id === activeId);
  const isGroup = !!activeChat?.is_group;
  const peerId = activeChat && !isGroup && (activeChat.u1 === me?.id ? activeChat.u2 : activeChat.u1);
  const peer = peerId ? profiles[peerId] : null;
  const activeMsgs = messages[activeId] || [];
  const memberRows = members[activeId] || [];
  const activeMembers = memberRows.map((r) => profiles[r.user_id] && { ...profiles[r.user_id], _role: r.role, _rights: r.rights || {} }).filter(Boolean);
  const myRow = memberRows.find((r) => r.user_id === me?.id);
  const amOwner = isGroup && activeChat?.owner === me?.id;
  const hasRight = (r) => amOwner || (myRow?.role === "admin" && !!myRow?.rights?.[r]);
  const isChannel = !!activeChat?.is_channel;
  const amAppAdmin = !!me?.is_app_admin;
  const amModerator = !!me?.is_moderator;
  const amStaff = amAppAdmin || amModerator;
  const canPost = !isChannel || amOwner || myRow?.role === "admin";

  function notify(text) {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  }
  function tickSound(kindOverride) {
    const kind = kindOverride || (prefs.typeSound === true ? "classic" : prefs.typeSound);
    if (!kind) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const t = ctx.currentTime;
      const tone = (type, freq, dur, vol, t0 = t, slideTo) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t0);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(t0); o.stop(t0 + dur + 0.02);
      };
      if (kind === "classic") tone("sine", 1500 + Math.random() * 600, 0.05, 0.04);
      else if (kind === "soft") tone("sine", 290 + Math.random() * 60, 0.07, 0.06);
      else if (kind === "mech") { tone("square", 2200, 0.018, 0.025); tone("square", 900, 0.03, 0.03, t + 0.012); }
      else if (kind === "bubble") tone("sine", 420, 0.07, 0.06, t, 1300);
      else if (kind === "retro") { tone("square", 1100, 0.03, 0.03); tone("square", 1700, 0.025, 0.022, t + 0.045); }
    } catch {}
  }
  function playMsgSound() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      [880, 1318].forEach((f, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sine"; o.frequency.value = f;
        const t0 = ctx.currentTime + i * 0.09;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        o.connect(g); g.connect(ctx.destination);
        o.start(t0); o.stop(t0 + 0.2);
      });
    } catch {}
  }
  function maybeNotify(m) {
    try {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      if (!document.hidden && activeIdRef.current === m.chat_id) return;
      const ch = (chatsRef.current || []).find((c) => c.id === m.chat_id);
      const sender = profilesRef.current?.[m.sender_id]?.login || "Новое сообщение";
      const title = ch?.is_group ? `${sender} — ${ch.title || "Группа"}` : sender;
      const body = m.type === "text" ? m.content.slice(0, 80)
        : ({ photo: "📷 Фото", video: "🎬 Видео", file: "📎 Файл", voice: "🎤 Голосовое" }[m.type] || "Сообщение");
      // Через Service Worker — показывается даже когда вкладка свёрнута/в фоне
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "notify", title, body, tag: m.chat_id });
        return;
      }
      const ic = (APP_ICONS.find((i) => i.id === prefsRef.current?.icon) || APP_ICONS[0]).file;
      const n = new Notification(title, { body, tag: m.chat_id, icon: ic });
      n.onclick = () => { window.focus(); openChat(m.chat_id); n.close(); };
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
      (allMem || []).forEach((m) => { (membersMap[m.chat_id] ||= []).push({ user_id: m.user_id, role: m.role || "member", rights: m.rights || {} }); });
    }
    setMembers(membersMap);

    const [{ data: fr }, { data: bl }] = await Promise.all([
      supabase.from("friends").select("friend_id").eq("user_id", myId),
      supabase.from("blocks").select("blocked_id").eq("user_id", myId),
    ]);
    setFriends(new Set((fr || []).map((x) => x.friend_id)));
    setBlocked(new Set((bl || []).map((x) => x.blocked_id)));

    const { data: st } = await supabase.from("app_settings").select("*").eq("id", 1).single();
    if (st) setAppSettings(st);

    const pids = new Set();
    cs.forEach((c) => { if (!c.is_group) pids.add(c.u1 === myId ? c.u2 : c.u1); });
    Object.values(membersMap).flat().forEach((m) => pids.add(m.user_id));
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
    supabase.rpc("release_scheduled").then(() => {}).catch(() => {});
    const t = setInterval(() => supabase.rpc("release_scheduled").then(() => {}).catch(() => {}), 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!configured) { setPhase("config"); return; }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setPhase("auth"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (!prof) { setPhase("register"); setRegStep(2); return; }
      if (prof.restrictions?.banned) { setPhase("banned"); return; }
      setMe(prof);
      cacheProfiles([prof]);
      await loadEverything(prof);
      setPhase("main");
      if (!prof.onboarded) setShowOnboard(true);
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
        if (m.sender_id !== me.id) {
          const pr = prefsRef.current || {};
          // автоответчик: только в личке, не чаще раза в 5 минут на чат
          if (me.auto_reply && m.type === "text") {
            supabase.from("chats").select("is_group,is_feedback").eq("id", m.chat_id).maybeSingle().then(({ data }) => {
              if (data && !data.is_group && !data.is_feedback) {
                const key = "ar_" + m.chat_id;
                const last = +(sessionStorage.getItem(key) || 0);
                if (Date.now() - last > 300000) {
                  sessionStorage.setItem(key, Date.now());
                  supabase.from("messages").insert({ chat_id: m.chat_id, sender_id: me.id, type: "text", content: "🤖 " + me.auto_reply, reactions: {} }).then(() => {});
                }
              }
            });
          }
          const mode = (pr.notifMode || {})[m.chat_id] || ((pr.muted || []).includes(m.chat_id) ? "none" : "all");
          const mentioned = (m.type === "text" && meTagRef.current && new RegExp(`@${meTagRef.current}\\b`, "i").test(m.content))
            || (m.reply_to && m.reply_to.name && m.reply_to.name === meLoginRef.current);
          if (mode === "all" || (mode === "mentions" && mentioned)) {
            if (pr.msgSound !== false) playMsgSound();
            maybeNotify(m);
          }
        }
        if (m.scheduled_at && new Date(m.scheduled_at) > new Date() && m.sender_id !== me.id) return;
        setMessages((d) => {
          const list = d[m.chat_id] || [];
          if (list.some((x) => x.id === m.id)) return d;
          return { ...d, [m.chat_id]: [...list, m] };
        });
        if (amAppAdmin && m.sender_id !== me.id) {
          supabase.from("chats").select("is_feedback").eq("id", m.chat_id).maybeSingle().then(({ data }) => {
            if (data?.is_feedback) { setChats((cs) => (cs.some((x) => x.id === m.chat_id) ? cs : cs)); }
          });
        }
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
        if (p.eventType === "DELETE" || !p.new) {
          const oldId = p.old?.id;
          if (oldId) {
            setChats((cs) => cs.filter((x) => x.id !== oldId));
            if (activeIdRef.current === oldId) setActiveId(null);
          }
          return;
        }
        const c = p.new;
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
          const rows = (mm || []).map((m) => ({ user_id: m.user_id, role: m.role || "member", rights: m.rights || {} }));
          setMembers((d) => ({ ...d, [chat.id]: rows }));
          rows.forEach((m) => ensureProfile(m.user_id));
          const { data: msgs } = await supabase.from("messages").select("*").eq("chat_id", chat.id)
            .order("created_at", { ascending: false }).limit(200);
          setMessages((d) => ({ ...d, [chat.id]: (msgs || []).reverse() }));
        } else {
          setMembers((d) => (d[r.chat_id] && !d[r.chat_id].some((m) => m.user_id === r.user_id)
            ? { ...d, [r.chat_id]: [...d[r.chat_id], { user_id: r.user_id, role: r.role || "member", rights: r.rights || {} }] } : d));
          ensureProfile(r.user_id);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_members" }, (p) => {
        const r = p.new;
        setMembers((d) => (d[r.chat_id] ? { ...d, [r.chat_id]: d[r.chat_id].map((m) => (m.user_id === r.user_id ? { ...m, role: r.role, rights: r.rights || {} } : m)) } : d));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_members" }, (p) => {
        const r = p.old;
        if (r.user_id === me.id) {
          setChats((cs) => cs.filter((c) => c.id !== r.chat_id));
          if (activeIdRef.current === r.chat_id) setActiveId(null);
        } else {
          setMembers((d) => (d[r.chat_id] ? { ...d, [r.chat_id]: d[r.chat_id].filter((m) => m.user_id !== r.user_id) } : d));
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_settings" }, (p) => {
        if (p.new) setAppSettings(p.new);
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

  // ---------- OneSignal: привязка подписки к аккаунту ----------
  useEffect(() => {
    if (phase !== "main" || !me) return;
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          await OneSignal.login(me.id); // связываем external_id с нашим id
          const sid = OneSignal.User?.PushSubscription?.id;
          if (sid && sid !== me.push_id) {
            await supabase.from("profiles").update({ push_id: sid }).eq("id", me.id);
          }
        } catch {}
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, me?.id]);

  async function enablePush() {
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal) => {
        await OneSignal.Notifications.requestPermission();
        await OneSignal.login(me.id);
        const sid = OneSignal.User?.PushSubscription?.id;
        if (sid) await supabase.from("profiles").update({ push_id: sid }).eq("id", me.id);
        notify("Push-уведомления подключены ✓");
      });
    } catch { notify("Не удалось подключить push."); }
  }

  // ---------- PWA: клики по фоновым уведомлениям ----------
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    const onMsg = (e) => { if (e.data?.type === "open-chat" && e.data.chatId) openChat(e.data.chatId); };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- ЗВОНКИ: входящие ----------
  useEffect(() => { callRef.current = call; }, [call]);
  useEffect(() => {
    if (phase !== "main" || !me) return;
    const ch = supabase.channel(`call-${me.id}`)
      .on("broadcast", { event: "offer" }, async (p) => {
        const { from, sdp, video, name } = p.payload || {};
        if (!from || from === me.id) return;
        if (callRef.current) { signal(from, "hangup", { busy: true }); return; }
        let u = profiles[from];
        if (!u) {
          const { data } = await supabase.from("profiles").select("*").eq("id", from).single();
          u = data; if (u) cacheProfiles([u]);
        }
        candQueue.current = [];
        ringStart("in");
        setCallMuted(false); setCallCamOff(false); setCallNet("");
        setCall({ peer: u || { id: from, login: name || "Звонок", tag: "?" }, dir: "in", status: "ringing", video: !!video, sdp });
        if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
          try { new Notification("Входящий звонок", { body: (u?.login || name || "") + (video ? " · видео" : ""), tag: "call" }); } catch {}
        }
      })
      .on("broadcast", { event: "answer" }, async (p) => {
        const c = callRef.current;
        if (!c || c.dir !== "out" || !pcRef.current) return;
        try {
          await pcRef.current.setRemoteDescription(p.payload.sdp);
          for (const cand of candQueue.current) { try { await pcRef.current.addIceCandidate(cand); } catch {} }
          candQueue.current = [];
          ringStop();
          setCall({ ...c, status: "active", startedAt: Date.now() });
        } catch {}
      })
      .on("broadcast", { event: "candidate" }, async (p) => {
        const cand = p.payload?.candidate;
        if (!cand) return;
        if (pcRef.current?.remoteDescription) { try { await pcRef.current.addIceCandidate(cand); } catch {} }
        else candQueue.current.push(cand);
      })
      .on("broadcast", { event: "hangup" }, () => {
        if (callRef.current) { notify(callRef.current.status === "ringing" ? "Звонок завершён" : "Собеседник завершил звонок"); endCall(false); }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, me?.id]);
  useEffect(() => {
    if (call) attachStreams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call?.status, call?.video]);
  useEffect(() => {
    if (call?.status !== "active") return;
    const t = setInterval(() => setCallTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [call?.status]);

  useEffect(() => {
    if (!showContacts && !showGroupNew && !reactViewer) return;
    const extra = reactViewer ? Object.values(reactViewer.reactions || {}).flat() : [];
    const missing = [...new Set([...friends, ...extra])].filter((id) => id !== me?.id && !profiles[id]);
    if (!missing.length) return;
    supabase.from("profiles").select("*").in("id", missing).then(({ data }) => data && cacheProfiles(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showContacts, showGroupNew, reactViewer]);

  // ---------- PRESENCE ----------
  useEffect(() => {
    if (phase !== "main" || !me) return;
    const ch = supabase.channel("online", { config: { presence: { key: me.id } } });
    ch.on("presence", { event: "sync" }, () => {
      setOnlineIds(new Set(Object.keys(ch.presenceState())));
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED" && !me.hide_online) await ch.track({ at: Date.now() });
    });
    const beat = setInterval(() => {
      if (!me.hide_online) supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", me.id).then(() => {});
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
    if (myRead < new Date(lastIncoming.created_at).getTime() && !me.hide_read) {
      supabase.from("chat_reads").upsert({ chat_id: activeId, user_id: me.id, read_at: new Date().toISOString() }).then(() => {});
      setReads((d) => ({ ...d, [activeId]: { ...(d[activeId] || {}), [me.id]: Date.now() } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, activeMsgs.length, me?.id]);

  const prevChatRef = useRef(null);
  useEffect(() => {
    const el = msgsRef.current;
    if (!el) return;
    const changed = prevChatRef.current !== activeId;
    prevChatRef.current = activeId;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 700;
    const last = activeMsgs[activeMsgs.length - 1];
    if (changed || near || last?.sender_id === me?.id) el.scrollTop = el.scrollHeight;
    if (changed) setShowJump(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMsgs.length, activeId]);

  // Esc — закрыть окно или выйти из чата; свайп в сторону — выйти из чата (мобильные)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (menu) setMenu(null);
      else if (forwarding) setForwarding(null);
      else if (editing) { setEditing(null); setDraft(""); }
      else if (mentionQuery !== null) setMentionQuery(null);
      else if (chatMenu) setChatMenu(null);
      else if (showPinList) setShowPinList(false);
      else if (showStickers) setShowStickers(false);
      else if (statusPick) setStatusPick(false);
      else if (profilePreview) setProfilePreview(false);
      else if (publishForm) setPublishForm(null);
      else if (themeOpen) setThemeOpen(null);
      else if (showMarket) setShowMarket(false);
      else if (builderEmoji) setBuilderEmoji(null);
      else if (showBuilder) setShowBuilder(false);
      else if (showStats) { if (statUser && amAppAdmin) { setStatUser(null); setStatUserData(null); } else setShowStats(false); }
      else if (showAdmin) { if (adminTarget) setAdminTarget(null); else setShowAdmin(false); }
      else if (showReports) setShowReports(false);
      else if (showContacts) setShowContacts(false);
      else if (showCalls) setShowCalls(false);
      else if (showMenu) setShowMenu(false);
      else if (viewer) setViewer(null);
      else if (reactFor) setReactFor(null);
      else if (showProfile) setShowProfile(false);
      else if (showChatInfo) { setShowChatInfo(false); setMediaTab(null); setGroupEdit(false); }
      else if (showGroupNew) setShowGroupNew(false);
      else if (chatSearch !== null) setChatSearch(null);
      else setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, viewer, reactFor, showProfile, showChatInfo, showGroupNew, chatSearch, showMenu, showContacts, showCalls, statusPick, chatMenu, mentionQuery, showBuilder, builderEmoji, showStats, statUser, showAdmin, adminTarget, showMarket, profilePreview, themeOpen, publishForm, showStickers, showReports, forwarding, editing]);
  useEffect(() => {
    if (!activeId) return;
    const onPaste = (e) => {
      const f = e.clipboardData?.files?.[0];
      if (f) { e.preventDefault(); routeFile(f); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
  const swipe = useRef(null);
  function mainTouchStart(e) { const t = e.touches[0]; swipe.current = { x: t.clientX, y: t.clientY }; }
  function mainTouchEnd(e) {
    if (!swipe.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipe.current.x, dy = t.clientY - swipe.current.y;
    swipe.current = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50 && window.innerWidth <= 720) setActiveId(null);
  }

  // ---------- АВТОРИЗАЦИЯ ----------
  async function doLogin() {
    setErr(""); setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginToEmail(login), password: pass });
    setBusy(false);
    if (error) { setErr("Неверный логин или пароль."); return; }
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    if (!prof) { setPhase("register"); setRegStep(2); return; }
    if (prof.restrictions?.banned) { setPhase("banned"); return; }
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
    setShowOnboard(true);
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
  useUserSearch(addQuery, setAddResults, (u) => !(members[activeId] || []).some((m) => m.user_id === u.id));
  useUserSearch(statQuery, setStatResults);
  useUserSearch(adminQuery, setAdminResults);
  useEffect(() => {
    if (phase !== "main") return;
    const q = userQuery.trim();
    if (q.length < 2 || q.startsWith("@")) { setGlobalSearch(null); return; }
    const t = setTimeout(() => {
      const myChatIds = chats.map((c) => c.id);
      const hits = [];
      for (const cid of myChatIds) {
        for (const m of (messages[cid] || [])) {
          if (m.type === "text" && m.content.toLowerCase().includes(q.toLowerCase())) hits.push(m);
        }
      }
      setGlobalSearch(hits.slice(0, 40));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userQuery, phase, messages]);

  function ForwardPicker() {
    return (
      <div className="overlay" style={{ zIndex: 82 }} onClick={() => setForwarding(null)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-pad">
            <h3 style={{ marginTop: 0 }}>↪ Переслать в чат</h3>
            {sortedChats.map((c) => (
              <div className="member-row" key={c.id} style={{ cursor: "pointer" }} onClick={() => doForward(c.id)}>
                {c.is_group ? <GroupAvatar chat={c} size="sm" /> : <Avatar user={profiles[c.u1 === me.id ? c.u2 : c.u1] || { tag: "?" }} size="sm" />}
                <span className="mr-name">{c.is_group ? (c.is_channel ? "📣 " : "👥 ") : ""}{chatTitle(c)}</span>
              </div>
            ))}
            <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setForwarding(null)}>Отмена</button>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (phase !== "main") return;
    const q = userQuery.trim().replace(/^@/, "");
    if (!q) { setChannelResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("chats").select("*").eq("is_channel", true).ilike("title", `%${q}%`).limit(10);
      setChannelResults(data || []);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userQuery, phase]);

  async function joinChannel(c) {
    const already = chats.some((x) => x.id === c.id) && (members[c.id] || []).some((m) => m.user_id === me.id);
    if (!already) {
      const { error } = await supabase.from("chat_members").insert({ chat_id: c.id, user_id: me.id });
      if (error && error.code !== "23505") { notify(`Не удалось подписаться: ${error.message}`); return; }
      setChats((cs) => (cs.some((x) => x.id === c.id) ? cs : [...cs, c]));
      const { data: mm } = await supabase.from("chat_members").select("*").eq("chat_id", c.id);
      setMembers((d) => ({ ...d, [c.id]: (mm || []).map((m) => ({ user_id: m.user_id, role: m.role || "member", rights: m.rights || {} })) }));
      (mm || []).forEach((m) => ensureProfile(m.user_id));
      const { data: msgs } = await supabase.from("messages").select("*").eq("chat_id", c.id).order("created_at", { ascending: false }).limit(200);
      setMessages((d) => ({ ...d, [c.id]: (msgs || []).reverse() }));
      notify("Вы подписались на канал ✓");
    }
    setUserQuery(""); setSearchResults(null); setChannelResults([]);
    openChat(c.id);
  }
  async function openMainChannel() {
    const id = appSettings.main_channel;
    if (!id) { notify("Главный канал ещё не назначен."); return; }
    const local = chats.find((c) => c.id === id);
    if (local) { openChat(id); return; }
    const { data: c } = await supabase.from("chats").select("*").eq("id", id).single();
    if (!c) { notify("Канал недоступен."); return; }
    await joinChannel(c);
  }

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
    if (newKind !== "channel" && !groupPicks.length) { notify("Добавьте хотя бы одного участника."); return; }
    const { data: chat, error } = await supabase.from("chats")
      .insert({ is_group: true, is_channel: newKind === "channel", title, u1: me.id, u2: null, owner: me.id }).select().single();
    if (error) { console.error(error); notify(`Не удалось создать группу: ${error.message}`); return; }
    const ids = [me.id, ...groupPicks.map((p) => p.id)];
    const { error: e2 } = await supabase.from("chat_members").insert(ids.map((uid) => ({ chat_id: chat.id, user_id: uid })));
    if (e2) { notify("Группа создана, но участники не добавились. Добавьте их в настройках группы."); }
    cacheProfiles(groupPicks);
    setMembers((m) => ({ ...m, [chat.id]: ids.map((uid) => ({ user_id: uid, role: "member", rights: {} })) }));
    setChats((cs) => (cs.some((x) => x.id === chat.id) ? cs : [...cs, chat]));
    setShowGroupNew(false); setGroupTitle(""); setGroupPicks([]); setGroupQuery("");
    openChat(chat.id);
  }
  async function addMember(user) {
    const { error } = await supabase.from("chat_members").insert({ chat_id: activeId, user_id: user.id });
    if (error) { console.error(error); notify(`Не удалось добавить: ${error.message}`); return; }
    cacheProfiles([user]);
    setMembers((m) => ({ ...m, [activeId]: [...(m[activeId] || []).filter((x) => x.user_id !== user.id), { user_id: user.id, role: "member", rights: {} }] }));
    setAddQuery(""); setAddResults(null);
    notify(`${user.login} добавлен(а) ✓`);
  }
  async function leaveGroup(id = activeId) {
    const { error } = await supabase.from("chat_members").delete().eq("chat_id", id).eq("user_id", me.id);
    if (error) { notify("Не удалось выйти."); return; }
    setShowChatInfo(false);
    setChats((cs) => cs.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }
  function setChatPin(id) {
    const cur = (prefs.chatPins || {})[id];
    if (cur) {
      if (window.confirm("Снять пин-код с этого чата?")) {
        const next = { ...(prefs.chatPins || {}) }; delete next[id];
        setPrefsAnd({ chatPins: next });
        notify("Пин-код снят");
      }
      return;
    }
    const pin = window.prompt("Задайте пин-код для чата (4–6 цифр):");
    if (!pin) return;
    if (!/^[0-9]{4,6}$/.test(pin)) { notify("Пин-код — 4–6 цифр."); return; }
    setPrefsAnd({ chatPins: { ...(prefs.chatPins || {}), [id]: pin } });
    setUnlocked((u) => ({ ...u, [id]: true }));
    notify("Чат защищён пин-кодом 🔒");
  }
  const inList = (key, id) => (prefs[key] || []).includes(id);
  const toggleList = (key, id) => setPrefsAnd({ [key]: inList(key, id) ? prefs[key].filter((x) => x !== id) : [...(prefs[key] || []), id] });
  async function clearHistory(c) {
    if (!window.confirm(`Удалить все сообщения в «${chatTitle(c)}» у всех участников? Это необратимо.`)) return;
    const { error } = await supabase.from("messages").delete().eq("chat_id", c.id);
    if (error) { notify(`Не удалось очистить: ${error.message}`); return; }
    setMessages((d) => ({ ...d, [c.id]: [] }));
    notify("История очищена");
  }
  async function deleteDirectChat(c) {
    if (!window.confirm(`Удалить чат с «${chatTitle(c)}» у обоих участников? Это необратимо.`)) return;
    const { error } = await supabase.from("chats").delete().eq("id", c.id);
    if (error) { notify(`Не удалось удалить: ${error.message}`); return; }
    setChats((cs) => cs.filter((x) => x.id !== c.id));
    if (activeId === c.id) setActiveId(null);
  }
  async function kickMember(uid) {
    const { error } = await supabase.from("chat_members").delete().eq("chat_id", activeId).eq("user_id", uid);
    if (error) { notify("Не удалось удалить участника."); return; }
    setMembers((m) => ({ ...m, [activeId]: (m[activeId] || []).filter((x) => x.user_id !== uid) }));
  }

  async function setMemberRole(uid, role, rights) {
    const { error } = await supabase.from("chat_members").update({ role, rights }).eq("chat_id", activeId).eq("user_id", uid);
    if (error) { notify(`Не удалось изменить права: ${error.message}`); return; }
    setMembers((m) => ({ ...m, [activeId]: (m[activeId] || []).map((x) => (x.user_id === uid ? { ...x, role, rights } : x)) }));
  }
  async function saveGroup(patch) {
    const { error } = await supabase.from("chats").update(patch).eq("id", activeId);
    if (error) { notify(`Не удалось сохранить: ${error.message}`); return; }
    setChats((cs) => cs.map((c) => (c.id === activeId ? { ...c, ...patch } : c)));
    notify("Сохранено ✓");
  }

  async function doForward(targetChatId) {
    const m = forwarding;
    setForwarding(null);
    const fwd = { name: senderName(m), from_chat: m.chat_id };
    const base = { chat_id: targetChatId, sender_id: me.id, reactions: {}, forwarded: fwd };
    let row;
    if (m.type === "text") row = { ...base, type: "text", content: m.content };
    else row = { ...base, type: m.type, content: m.content, file_name: m.file_name, file_size: m.file_size, duration: m.duration, waveform: m.waveform };
    const { error } = await supabase.from("messages").insert(row);
    if (error) { notify(`Не удалось переслать: ${error.message}`); return; }
    notify("Переслано ✓");
    openChat(targetChatId);
  }
  async function reportMsg(m) {
    const reason = window.prompt("Причина жалобы (необязательно):", "");
    if (reason === null) return;
    const { error } = await supabase.from("reports").insert({
      reporter: me.id, reporter_login: me.login, target_msg: m.id, target_user: m.sender_id,
      chat_id: m.chat_id, text_snapshot: (m.type === "text" ? m.content : "[" + m.type + "]").slice(0, 200), reason,
    });
    if (error) { notify(`Не удалось отправить жалобу: ${error.message}`); return; }
    notify("Жалоба отправлена администратору ✓");
  }
  async function openReports() {
    setShowMenu(false); setShowReports(true); setReports(null);
    const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) { notify("Жалобы недоступны: выполните миграцию v15."); setReports([]); return; }
    setReports(data || []);
  }
  async function resolveReport(r) {
    await supabase.from("reports").update({ status: "done" }).eq("id", r.id);
    setReports((l) => (l || []).map((x) => x.id === r.id ? { ...x, status: "done" } : x));
  }
  async function openByTag(tag) {
    const lo = tag.toLowerCase();
    let u = Object.values(profiles).find((x) => x.tag?.toLowerCase() === lo) || (me.tag?.toLowerCase() === lo ? me : null);
    if (!u) {
      const { data } = await supabase.from("profiles").select("*").ilike("tag", tag).limit(1).maybeSingle();
      u = data; if (u) cacheProfiles([u]);
    }
    if (u) setShowMember(u); else notify("Пользователь не найден.");
  }
  async function toggleFriend(u) {
    const isFr = friends.has(u.id);
    const { error } = isFr
      ? await supabase.from("friends").delete().eq("user_id", me.id).eq("friend_id", u.id)
      : await supabase.from("friends").insert({ user_id: me.id, friend_id: u.id });
    if (error) { notify(`Не получилось: ${error.message}`); return; }
    setFriends((st) => { const n = new Set(st); isFr ? n.delete(u.id) : n.add(u.id); return n; });
    notify(isFr ? "Удалён из друзей" : "Добавлен в друзья ✓");
  }
  async function toggleBlock(u) {
    const isBl = blocked.has(u.id);
    const { error } = isBl
      ? await supabase.from("blocks").delete().eq("user_id", me.id).eq("blocked_id", u.id)
      : await supabase.from("blocks").insert({ user_id: me.id, blocked_id: u.id });
    if (error) { notify(`Не получилось: ${error.message}`); return; }
    setBlocked((st) => { const n = new Set(st); isBl ? n.delete(u.id) : n.add(u.id); return n; });
    notify(isBl ? "Разблокирован" : "Пользователь заблокирован 🚫");
  }
  async function openFavorites() {
    let fav = chats.find((c) => !c.is_group && c.u1 === me.id && c.u2 === me.id);
    if (!fav) {
      const { data, error } = await supabase.from("chats").insert({ u1: me.id, u2: me.id }).select().single();
      if (error) { notify(`Не удалось открыть Избранное: ${error.message}`); return; }
      fav = data;
      setChats((cs) => (cs.some((x) => x.id === fav.id) ? cs : [...cs, fav]));
    }
    openChat(fav.id);
  }
  // ====== ЗВОНКИ (WebRTC, сигналинг через Supabase Realtime) ======
  function chanFor(uid) {
    if (sigChans.current[uid]) return sigChans.current[uid];
    const ch = supabase.channel(`call-${uid}`);
    const ready = new Promise((res) => ch.subscribe((st) => st === "SUBSCRIBED" && res()));
    sigChans.current[uid] = { ch, ready };
    return sigChans.current[uid];
  }
  async function signal(to, event, payload) {
    const { ch, ready } = chanFor(to);
    await ready;
    ch.send({ type: "broadcast", event, payload: { from: me.id, ...payload } });
  }
  function newPC(peerId) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    setCallDiag({ ice: "new", gather: "new", cands: 0, relay: 0, turn: TURN_URLS.length });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        signal(peerId, "candidate", { candidate: e.candidate.toJSON() });
        const isRelay = (e.candidate.candidate || "").includes(" typ relay");
        setCallDiag((d) => ({ ...d, cands: d.cands + 1, relay: d.relay + (isRelay ? 1 : 0) }));
        console.log("[звонок] кандидат:", e.candidate.type, e.candidate.candidate);
      }
    };
    pc.ontrack = (e) => { remoteStreamRef.current = e.streams[0]; attachStreams(); };
    console.log("[звонок] ICE-серверы:", ICE_SERVERS);
    pc.onicegatheringstatechange = () => setCallDiag((d) => ({ ...d, gather: pc.iceGatheringState }));
    pc.oniceconnectionstatechange = () => {
      console.log("[звонок] ICE:", pc.iceConnectionState);
      setCallDiag((d) => ({ ...d, ice: pc.iceConnectionState }));
    };
    pc.onconnectionstatechange = () => {
      console.log("[звонок] соединение:", pc.connectionState);
      setCallNet(pc.connectionState);
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) endCall(false);
    };
    pcRef.current = pc;
    return pc;
  }
  function attachStreams() {
    const rs = remoteStreamRef.current;
    if (rs) {
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== rs) {
        remoteAudioRef.current.srcObject = rs;
      }
      remoteAudioRef.current?.play?.().catch(() => {});
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== rs) {
        remoteVideoRef.current.srcObject = rs;
        remoteVideoRef.current.play?.().catch(() => {});
      }
    }
    const ls = localStreamRef.current;
    if (ls && localVideoRef.current && localVideoRef.current.srcObject !== ls) {
      localVideoRef.current.srcObject = ls;
    }
  }
  function ringStart(kind) {
    ringStop();
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const beep = (freq, t0, dur, vol) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sine"; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.03);
        g.gain.setValueAtTime(vol, t0 + dur - 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(t0); o.stop(t0 + dur + 0.05);
      };
      const cycle = () => {
        const t = ctx.currentTime + 0.05;
        if (kind === "out") beep(425, t, 1.0, 0.07); // классический гудок ожидания
        else { beep(740, t, 0.45, 0.09); beep(587, t + 0.55, 0.45, 0.09); } // входящая трель
      };
      cycle();
      ringRef.current = setInterval(cycle, kind === "out" ? 4000 : 2200);
    } catch {}
  }
  function ringStop() { clearInterval(ringRef.current); ringRef.current = null; }
  async function startCall(withVideo, target) {
    const to = target || peer;
    if (call) { notify("Звонок уже идёт."); return; }
    if (!to || to.id === me.id) return;
    if (me.restrictions?.no_calls || me.restrictions?.banned) { notify("Звонки ограничены администратором."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
      localStreamRef.current = stream;
      if (withVideo && localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = newPC(to.id);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await signal(to.id, "offer", { sdp: pc.localDescription, video: withVideo, name: me.login });
      setCallMuted(false); setCallCamOff(false); setCallNet("");
      setCall({ peer: to, dir: "out", status: "ringing", video: withVideo });
      ringStart("out");
    } catch {
      notify("Не удалось получить доступ к микрофону/камере.");
    }
  }
  async function acceptCall() {
    const c = callRef.current;
    if (!c?.sdp) return;
    ringStop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: c.video });
      localStreamRef.current = stream;
      if (c.video && localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = newPC(c.peer.id);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(c.sdp);
      for (const cand of candQueue.current) { try { await pc.addIceCandidate(cand); } catch {} }
      candQueue.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await signal(c.peer.id, "answer", { sdp: pc.localDescription });
      setCall({ ...c, status: "active", startedAt: Date.now() });
    } catch {
      notify("Не удалось получить доступ к микрофону/камере.");
      endCall(true);
    }
  }
  function endCall(notifyPeer = true) {
    ringStop();
    const c = callRef.current;
    if (c?.peer?.id) {
      const dur = c.startedAt ? Math.round((Date.now() - c.startedAt) / 1000) : 0;
      const entry = { peerId: c.peer.id, name: c.peer.login, dir: c.dir, video: !!c.video, ts: Date.now(), dur };
      setPrefsAnd({ callLog: [entry, ...(prefs.callLog || [])].slice(0, 30) });
    }
    if (notifyPeer && c) signal(c.peer.id, "hangup", {});
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    candQueue.current = [];
    setCall(null);
    setCallMin(false);
  }
  function toggleCallMute() {
    const tr = localStreamRef.current?.getAudioTracks()?.[0];
    if (tr) { tr.enabled = !tr.enabled; setCallMuted(!tr.enabled); }
  }
  function toggleCallCam() {
    const tr = localStreamRef.current?.getVideoTracks()?.[0];
    if (tr) { tr.enabled = !tr.enabled; setCallCamOff(!tr.enabled); }
  }

  async function loadStats() {
    setShowMenu(false); setShowStats(true); setStatUser(null); setStatUserData(null); setStats(null);
    if (amAppAdmin) {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error || !data) { notify("Статистика недоступна: выполните миграцию v10 в Supabase."); return; }
      setStats(data);
    } else {
      const { data, error } = await supabase.rpc("my_stats");
      if (error || !data) { notify("Статистика недоступна: выполните миграцию v11 в Supabase."); return; }
      setStatUser(me);
      setStatUserData(data);
    }
  }
  async function loadUserStats(u) {
    setStatUser(u); setStatUserData(null); setStatQuery(""); setStatResults(null);
    const { data, error } = await supabase.rpc("admin_user_stats", { uid: u.id });
    if (error || !data) { notify("Не удалось загрузить статистику пользователя."); return; }
    setStatUserData(data);
  }
  async function openFeedback() {
    setShowMenu(false);
    let fb = chats.find((c) => c.is_feedback);
    if (!fb) {
      const { data } = await supabase.from("chats").select("*").eq("is_feedback", true).limit(1).maybeSingle();
      if (!data) { notify("Чат обратной связи не настроен: выполните миграцию v12."); return; }
      fb = data;
      setChats((cs) => (cs.some((x) => x.id === fb.id) ? cs : [...cs, fb]));
    }
    setFeedbackOn(true);
    openChat(fb.id);
    const { data: msgs } = await supabase.from("messages").select("*").eq("chat_id", fb.id)
      .order("created_at", { ascending: false }).limit(200);
    setMessages((d) => ({ ...d, [fb.id]: (msgs || []).reverse() }));
    (msgs || []).forEach((m) => ensureProfile(m.sender_id));
  }
  function stickerPacks() {
    let packs = prefs.stickerPacks;
    if (!packs) {
      // миграция старого формата (plain массив) в один пак
      packs = (prefs.stickers || []).length ? [{ id: "p0", name: "Мои стикеры", items: prefs.stickers }] : [];
    }
    return packs;
  }
  async function addStickerToPack(file, packIdx) {
    if (!file) return;
    try {
      const url = file.type === "image/gif"
        ? await uploadMedia(file, "gif", "image/gif")
        : await uploadMedia(await resizeToBlob(file, 320, 0.85), "png", "image/png");
      const packs = JSON.parse(JSON.stringify(stickerPacks()));
      if (!packs.length) packs.push({ id: "p" + Date.now(), name: "Мои стикеры", items: [] });
      const idx = Math.min(packIdx ?? 0, packs.length - 1);
      packs[idx].items = [...packs[idx].items, url].slice(-120);
      setPrefsAnd({ stickerPacks: packs, stickers: undefined });
    } catch { notify("Не удалось добавить стикер."); }
  }
  function newStickerPack() {
    const name = window.prompt("Название стикерпака:");
    if (!name?.trim()) return;
    const packs = [...stickerPacks(), { id: "p" + Date.now(), name: name.trim().slice(0, 24), items: [] }];
    setPrefsAnd({ stickerPacks: packs });
    setActivePack(packs.length - 1);
  }
  function delStickerPack(idx) {
    if (!window.confirm("Удалить этот стикерпак?")) return;
    const packs = stickerPacks().filter((_, k) => k !== idx);
    setPrefsAnd({ stickerPacks: packs });
    setActivePack(0);
  }
  function delStickerFromPack(packIdx, itemIdx) {
    const packs = JSON.parse(JSON.stringify(stickerPacks()));
    packs[packIdx].items = packs[packIdx].items.filter((_, k) => k !== itemIdx);
    setPrefsAnd({ stickerPacks: packs });
  }
  function sendSticker(url) {
    setShowStickers(false);
    sendMessage({ type: "photo", content: url, file_name: "sticker.png" });
  }
  function currentThemeData() {
    return {
      theme: prefs.theme, accent: prefs.accent, font: prefs.font, icon: prefs.icon,
      nickColor: prefs.nickColor, bubbleColor: prefs.bubbleColor,
      wallpaper: prefs.wallpaper, customWallpaper: prefs.customWallpaper,
      uiVars: prefs.uiVars, btnIcons: prefs.btnIcons, btnAnim: prefs.btnAnim, grad: prefs.grad,
    };
  }
  async function openMarket() {
    setShowMenu(false); setShowMarket(true); setThemeOpen(null); setPublishForm(null); setThemes(null);
    const col = marketSort === "downloads" ? "downloads" : marketSort === "new" ? "created_at" : "likes";
    const { data, error } = await supabase.from("themes").select("*").order(col, { ascending: false }).limit(100);
    if (error) { notify("Маркет недоступен: выполните миграции v12, v13 и v19."); setThemes([]); return; }
    setThemes(data || []);
    const [{ data: likes }, { data: subs }] = await Promise.all([
      supabase.from("theme_likes").select("theme_id").eq("user_id", me.id),
      supabase.from("author_subs").select("author").eq("follower", me.id),
    ]);
    setMyLikes(new Set((likes || []).map((x) => x.theme_id)));
    setMySubs(new Set((subs || []).map((x) => x.author)));
  }
  useEffect(() => { if (showMarket && !themeOpen && !publishForm) openMarket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketSort]);
  async function toggleLike(t) {
    const liked = myLikes.has(t.id);
    setMyLikes((st) => { const n = new Set(st); liked ? n.delete(t.id) : n.add(t.id); return n; });
    setThemes((l) => (l || []).map((x) => x.id === t.id ? { ...x, likes: (x.likes || 0) + (liked ? -1 : 1) } : x));
    const { data } = await supabase.rpc("toggle_theme_like", { tid: t.id });
    if (typeof data === "number") setThemes((l) => (l || []).map((x) => x.id === t.id ? { ...x, likes: data } : x));
  }
  async function toggleSub(authorId, authorLogin) {
    const subbed = mySubs.has(authorId);
    const { error } = subbed
      ? await supabase.from("author_subs").delete().eq("author", authorId).eq("follower", me.id)
      : await supabase.from("author_subs").insert({ author: authorId, follower: me.id });
    if (error) { notify(`Не удалось: ${error.message}`); return; }
    setMySubs((st) => { const n = new Set(st); subbed ? n.delete(authorId) : n.add(authorId); return n; });
    notify(subbed ? "Вы отписались" : `Вы подписались на ${authorLogin || "автора"} ✓`);
  }
  function startPublish() {
    setPublishForm({ title: "", description: "", platform: "both", tags: "", media: [] });
  }
  async function addThemeMedia(file) {
    if (!file) return;
    try {
      let item;
      if (file.type.startsWith("video/")) {
        if (file.size > 25 * 1048576) { notify("Видео до 25 МБ."); return; }
        item = { type: "video", url: await uploadMedia(file, extOf(file.name, "mp4"), file.type || "video/mp4") };
      } else if (file.type.startsWith("image/")) {
        const url = file.type === "image/gif"
          ? await uploadMedia(file, "gif", "image/gif")
          : await uploadMedia(await resizeToBlob(file, 1280, 0.82), "jpg", "image/jpeg");
        item = { type: "image", url };
      } else { notify("Только фото или видео."); return; }
      setPublishForm((f) => ({ ...f, media: [...f.media, item] }));
    } catch { notify("Не удалось загрузить медиа."); }
  }
  async function submitPublish() {
    const f = publishForm;
    if (!f.title.trim()) { notify("Укажите название сборки."); return; }
    const tags = f.tags.split(/[,\s]+/).map((t) => t.replace(/^#/, "").trim()).filter(Boolean).slice(0, 8);
    const { error } = await supabase.from("themes").insert({
      author: me.id, author_login: me.login, title: f.title.trim().slice(0, 40),
      description: f.description.trim().slice(0, 300), platform: f.platform, tags,
      media: f.media, data: currentThemeData(),
    });
    if (error) { notify(`Не удалось опубликовать: ${error.message}`); return; }
    notify("Сборка опубликована ✓");
    setPublishForm(null);
    openMarket();
  }
  async function openAuthor(t) {
    let u = profiles[t.author];
    if (!u) {
      const { data } = await supabase.from("profiles").select("*").eq("id", t.author).maybeSingle();
      u = data; if (u) cacheProfiles([u]);
    }
    if (u) { setShowMarket(false); setThemeOpen(null); setShowMember(u); }
    else notify("Автор не найден.");
  }
  async function applyTheme(t) {
    const d = t.data || {};
    await setPrefsAnd({
      theme: d.theme ?? prefs.theme, accent: d.accent ?? prefs.accent, font: d.font ?? "system",
      icon: d.icon ?? "blue", nickColor: d.nickColor ?? null, bubbleColor: d.bubbleColor ?? null,
      wallpaper: d.wallpaper ?? 0, customWallpaper: d.customWallpaper ?? null,
      uiVars: d.uiVars ?? {}, btnIcons: d.btnIcons ?? {}, btnAnim: d.btnAnim ?? {}, grad: d.grad ?? {},
    });
    supabase.rpc("theme_downloaded", { tid: t.id }).then(() => {});
    setThemes((l) => (l || []).map((x) => x.id === t.id ? { ...x, downloads: x.downloads + 1 } : x));
    notify(`Тема «${t.title}» установлена ✓`);
    setShowMarket(false); setThemeOpen(null);
  }
  async function deleteTheme(t) {
    if (!window.confirm(`Удалить сборку «${t.title}»?`)) return;
    const { error } = await supabase.from("themes").delete().eq("id", t.id);
    if (error) { notify(`Не удалось: ${error.message}`); return; }
    setThemes((l) => (l || []).filter((x) => x.id !== t.id));
    setThemeOpen(null);
  }
  const platLabel = { pc: "💻 ПК", mobile: "📱 Телефон", both: "💻📱 Все" };
  async function openAdmin() {
    setShowMenu(false); setShowAdmin(true); setAdminTarget(null); setAdminQuery(""); setAdminResults(null);
    const { data } = await supabase.rpc("admin_list_chats");
    setAdminChats(data || []);
  }
  async function setRestriction(u, key, val) {
    const r = { ...(u.restrictions || {}) };
    if (val) r[key] = true; else delete r[key];
    const { error } = await supabase.rpc("staff_set_restrictions", { uid: u.id, r });
    if (error) { notify(`Не удалось: ${error.message}`); return; }
    const next = { ...u, restrictions: r };
    cacheProfiles([next]);
    setAdminTarget(next);
    logMod(val ? "restrict" : "unrestrict", u, key);
  }
  async function toggleModerator(u) {
    const val = !u.is_moderator;
    const { error } = await supabase.rpc("admin_set_moderator", { uid: u.id, val });
    if (error) { notify(`Не удалось: ${error.message}`); return; }
    const next = { ...u, is_moderator: val };
    cacheProfiles([next]); setAdminTarget(next);
    notify(val ? `${u.login} — теперь модератор ✓` : `${u.login} снят с модераторов`);
  }
  async function warnUser(u) {
    const msg = window.prompt("Текст предупреждения пользователю:");
    if (!msg?.trim()) return;
    const { error } = await supabase.rpc("staff_warn", { uid: u.id, msg: msg.trim() });
    if (error) { notify(`Не удалось: ${error.message}`); return; }
    const next = { ...u, warnings: (u.warnings || 0) + 1 };
    cacheProfiles([next]); setAdminTarget(next);
    notify("Предупреждение выдано ⚠️");
  }
  async function logMod(action, u, details) {
    await supabase.from("mod_log").insert({
      actor: me.id, actor_login: me.login, action, target_user: u.id, target_login: u.login, details: details || "",
    });
  }
  async function adminDeleteChat(c) {
    if (!window.confirm(`Удалить «${c.title}» безвозвратно вместе со всеми сообщениями?`)) return;
    const { error } = await supabase.from("chats").delete().eq("id", c.id);
    if (error) { notify(`Не удалось: ${error.message}. Возможно, эта группа защищена.`); return; }
    setAdminChats((l) => l.filter((x) => x.id !== c.id));
    setChats((cs) => cs.filter((x) => x.id !== c.id));
    notify("Удалено");
  }
  function openFolderEditor(f) {
    setFolderName(f === "new" ? "" : f.name);
    setFolderIds(new Set(f === "new" ? [] : f.chatIds));
    setFolderEdit(f);
  }
  function saveFolder() {
    const name = folderName.trim();
    if (!name) { notify("Дайте папке название."); return; }
    let folders = [...(prefs.folders || [])];
    if (folderEdit === "new") {
      const f = { id: "f" + Date.now().toString(36), name, chatIds: [...folderIds] };
      folders.push(f);
      setActiveFolder(f.id);
    } else {
      folders = folders.map((x) => (x.id === folderEdit.id ? { ...x, name, chatIds: [...folderIds] } : x));
    }
    setPrefsAnd({ folders });
    setFolderEdit(null);
  }
  function deleteFolder() {
    setPrefsAnd({ folders: (prefs.folders || []).filter((x) => x.id !== folderEdit.id) });
    setActiveFolder("all");
    setFolderEdit(null);
  }
  function scrollToMsg(id) {
    const el = msgRefs.current[id];
    if (!el) { notify("Сообщение не загружено."); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(id);
    setTimeout(() => setFlashId(null), 1600);
  }
  async function cropDone(blob) {
    const kind = crop?.kind;
    setCrop(null);
    try {
      if (kind === "me") await saveProfile({ avatar: await blobToB64(blob) });
      else if (kind === "group") await saveGroup({ avatar: await uploadMedia(blob, "jpg", "image/jpeg") });
      else if (kind === "meBanner") await saveProfile({ banner_img: await uploadMedia(blob, "jpg", "image/jpeg"), banner_color: null });
      else if (kind === "groupBanner") await saveGroup({ banner_img: await uploadMedia(blob, "jpg", "image/jpeg") });
      else if (kind === "wallpaper") await setPrefsAnd({ customWallpaper: await blobToB64(blob), wallpaper: "custom" });
    } catch { notify("Не удалось сохранить изображение."); }
  }

  function openChatUnlocked(id) {
    supabase.rpc("purge_expired").then(() => {});
    if (!chats.find((c) => c.id === id)?.is_feedback) setFeedbackOn(false);
    const patch = {};
    if (activeId) patch.drafts = { ...prefs.drafts, [activeId]: draft };
    if ((prefs.unreadMarks || []).includes(id)) patch.unreadMarks = prefs.unreadMarks.filter((x) => x !== id);
    if (Object.keys(patch).length) setPrefsAnd(patch);
    setActiveId(id);
    setDraft(prefs.drafts?.[id] || "");
    setReplyTo(null); setChatSearch(null); setShowEmoji(false); setShowAttach(false); setShowChatInfo(false); setMentionQuery(null);
  }
  function openChat(id) {
    const pin = (prefs.chatPins || {})[id];
    if (pin && !unlocked[id]) { setLockedOpen(id); setPinInput(""); return; }
    supabase.rpc("purge_expired").then(() => {});
    if (!chats.find((c) => c.id === id)?.is_feedback) setFeedbackOn(false);
    const patch = {};
    if (activeId) patch.drafts = { ...prefs.drafts, [activeId]: draft };
    if ((prefs.unreadMarks || []).includes(id)) patch.unreadMarks = prefs.unreadMarks.filter((x) => x !== id);
    if (Object.keys(patch).length) setPrefsAnd(patch);
    setActiveId(id);
    setDraft(prefs.drafts?.[id] || "");
    setReplyTo(null); setChatSearch(null); setShowEmoji(false); setShowAttach(false); setShowChatInfo(false); setMentionQuery(null);
  }

  // ---------- СООБЩЕНИЯ ----------
  const senderName = (m) => (m.sender_id === me?.id ? "Вы" : profiles[m.sender_id]?.login || "?");
  const senderColor = (id) => prefs.nickColor || ACCENTS[(id?.charCodeAt(2) || 0) % ACCENTS.length];
  const previewOf = (m) => m.type === "text" ? m.content.slice(0, 60) : { photo: "📷 Фото", video: "🎬 Видео", file: "📎 Файл", voice: "🎤 Голосовое" }[m.type] || "";

  async function sendMessage(payload) {
    if (!activeId || !me) return;
    const row = {
      chat_id: activeId, sender_id: me.id, reactions: {},
      reply_to: replyTo ? { id: replyTo.id, name: senderName(replyTo), text: previewOf(replyTo) } : null,
      ...(payload._forwarded ? { forwarded: payload._forwarded } : {}),
      ...(expireSec ? { expires_at: new Date(Date.now() + expireSec * 1000).toISOString() } : {}),
      ...(scheduleAt ? { scheduled_at: scheduleAt } : {}),
      ...payload,
    };
    setReplyTo(null);
    const { error } = await supabase.from("messages").insert(row);
    if (error) notify(
      error.message.includes("row-level security") ? "Сообщение не отправлено: переписка ограничена (блокировка или ограничение администратора)."
      : error.message.includes("too large") ? "Файл слишком большой."
      : "Не удалось отправить, проверьте интернет.");
  }
  async function saveEdit() {
    const t = draft.trim();
    const m = editing;
    setEditing(null); setDraft("");
    if (taRef.current) taRef.current.style.height = "auto";
    if (!t || t === m.content) return;
    const { error } = await supabase.from("messages").update({ content: t, edited_at: new Date().toISOString() }).eq("id", m.id);
    if (error) notify("Не удалось изменить.");
  }
  function sendText(text) {
    if (editing) { saveEdit(); return; }
    const t = (text ?? draft).trim();
    if (!t) return;
    sendMessage({ type: "text", content: t });
    if (text == null) {
      setDraft("");
      setMentionQuery(null);
      if (scheduleAt) { setScheduleAt(null); notify("Сообщение запланировано ✓"); }
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

  function handleMedia(file) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return;
    const orig = originalRef.current; originalRef.current = false;
    setPendingMedia({ file, url: URL.createObjectURL(file), kind: file.type.startsWith("video/") ? "video" : "image", orig });
  }
  function routeFile(f) {
    if (!f) return;
    if (f.type.startsWith("image/") || f.type.startsWith("video/")) handleMedia(f);
    else handleFile(f);
  }
  async function confirmSendMedia() {
    const pm = pendingMedia;
    setPendingMedia(null);
    const file = pm.file;
    try {
      if (file.type.startsWith("image/")) {
        notify("Загружаем фото…");
        const url = (pm.orig || file.type === "image/gif")
          ? await uploadMedia(file, extOf(file.name, "png"), file.type || "image/png")
          : await uploadMedia(await resizeToBlob(file, 1100, 0.78), "jpg", "image/jpeg");
        await sendMessage({ type: "photo", content: url, file_name: file.name });
      } else if (file.type.startsWith("video/")) {
        if (file.size > 25 * 1048576) { notify("Видео больше 25 МБ. Сожмите его или пришлите ссылкой."); return; }
        if (file.size > 12 * 1048576) notify("Большое видео — загрузка может занять время…");
        else notify("Загружаем видео…");
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const mime = window.MediaRecorder?.isTypeSupported?.("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : undefined;
      const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128000 });
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

  function rememberReact(emoji) {
    const rec = [emoji, ...(prefs.recentReacts || []).filter((e) => e !== emoji)].slice(0, 8);
    setPrefsAnd({ recentReacts: rec });
  }
  async function toggleReaction(msg, emoji) {
    rememberReact(emoji);
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
    const cur = activeChat?.pinned_msgs || (activeChat?.pinned_msg ? [activeChat.pinned_msg] : []);
    const has = cur.includes(msg.id);
    const next = has ? cur.filter((x) => x !== msg.id) : [...cur, msg.id];
    const { error } = await supabase.from("chats").update({ pinned_msgs: next, pinned_msg: next[next.length - 1] || null }).eq("id", activeId);
    if (error) notify("Не удалось закрепить.");
    else setChats((cs) => cs.map((c) => (c.id === activeId ? { ...c, pinned_msgs: next, pinned_msg: next[next.length - 1] || null } : c)));
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
  const notifModeOf = (id) => (prefs.notifMode || {})[id] || ((prefs.muted || []).includes(id) ? "none" : "all");
  const isMuted = (id) => notifModeOf(id) === "none";
  const setNotifMode = (id, mode) => setPrefsAnd({
    notifMode: { ...(prefs.notifMode || {}), [id]: mode },
    muted: (prefs.muted || []).filter((x) => x !== id),
  });
  const NOTIF_LABEL = { all: "🔔 Все сообщения", mentions: "＠ Только упоминания", none: "🔕 Без уведомлений" };
  const cycleNotif = (id) => {
    const order = ["all", "mentions", "none"];
    const next = order[(order.indexOf(notifModeOf(id)) + 1) % 3];
    setNotifMode(id, next);
    notify(NOTIF_LABEL[next]);
  };
  const toggleMute = (id) => setNotifMode(id, isMuted(id) ? "all" : "none");
  const AUDIO_RE = /\.(mp3|m4a|wav|ogg|flac)$/i;
  const mediaOf = (type) => {
    const list = messages[activeId] || [];
    if (type === "photo") return list.filter((m) => m.type === "photo" && !/\.gif$/i.test(m.file_name || ""));
    if (type === "video") return list.filter((m) => m.type === "video");
    if (type === "voice") return list.filter((m) => m.type === "voice");
    if (type === "audio") return list.filter((m) => m.type === "file" && AUDIO_RE.test(m.file_name || ""));
    if (type === "file") return list.filter((m) => m.type === "file" && !AUDIO_RE.test(m.file_name || ""));
    if (type === "link") return list.filter((m) => m.type === "text" && findUrl(m.content));
    if (type === "gif") return list.filter((m) => m.type === "photo" && /\.gif$/i.test(m.file_name || ""));
    return [];
  };
  const isOn = (u) => onlineIds.has(u?.id);
  const lastSeenText = (u) => {
    if (u?.hide_online) return "был(а) недавно";
    if (isOn(u)) return "онлайн";
    if (!u?.last_seen) return "был(а) недавно";
    const d = Date.now() - new Date(u.last_seen).getTime();
    if (d < 3600000) return "был(а) недавно";
    if (d < 86400000) return "был(а) сегодня";
    return `был(а) ${new Date(u.last_seen).toLocaleDateString("ru-RU")}`;
  };
  const chatTitle = (c) => {
    if (c.is_feedback) return "Обратная связь";
    return c.is_group ? (c.title || "Группа") : (c.u1 === c.u2 ? "Избранное" : (profiles[c.u1 === me.id ? c.u2 : c.u1]?.login || "…"));
  };

  const themeVars = {
    "--accent": prefs.accent,
    "--accent-dim": prefs.accent + "55",
    "--accent-light": prefs.accent + "33",
    "--app-font": (FONTS.find((f) => f.id === prefs.font) || FONTS[0]).css,
    ...(prefs.bubbleColor ? { "--bub-out": prefs.bubbleColor } : {}),
    ...(prefs.uiVars?.bg ? { "--bg": prefs.uiVars.bg } : {}),
    ...(prefs.uiVars?.side ? { "--side": prefs.uiVars.side } : {}),
    ...(prefs.uiVars?.input ? { "--input": prefs.uiVars.input } : {}),
    ...(prefs.uiVars?.line ? { "--line": prefs.uiVars.line } : {}),
    ...(prefs.uiVars?.hover ? { "--hover": prefs.uiVars.hover } : {}),
  };
  const btnIcon = (id, fallback) => {
    const ic = (prefs.btnIcons || {})[id];
    const anim = (prefs.btnAnim || {})[id];
    const cls = anim && anim !== "none" ? ` anim-${anim}` : "";
    if (ic?.type === "img") return <img src={ic.value} alt="" className={`btn-img${cls}`} />;
    return <span className={`btn-ic${cls}`}>{ic?.value || fallback}</span>;
  };
  const setBtnIcon = (id, icon) => setPrefsAnd({ btnIcons: { ...(prefs.btnIcons || {}), [id]: icon } });
  const setBtnAnim = (id, a) => setPrefsAnd({ btnAnim: { ...(prefs.btnAnim || {}), [id]: a } });
  const resetBtn = (id) => {
    const bi = { ...(prefs.btnIcons || {}) }; delete bi[id];
    const ba = { ...(prefs.btnAnim || {}) }; delete ba[id];
    setPrefsAnd({ btnIcons: bi, btnAnim: ba });
  };
  useEffect(() => {
    const link = document.querySelector("link[rel='icon']");
    const ic = APP_ICONS.find((i) => i.id === prefs.icon) || APP_ICONS[0];
    if (link && ic) link.href = ic.file;
  }, [prefs.icon]);
  const parseFill = (val) => {
    if (typeof val === "string" && val.startsWith("tex:")) {
      const [, id, tc, bc] = val.split("|");
      return textureCss(id, tc, bc);
    }
    return val ? { background: val } : null;
  };
  const bannerCss = (o) => {
    if (o?.banner_img) return { backgroundImage: `url(${o.banner_img})`, backgroundSize: "cover", backgroundPosition: "center" };
    return parseFill(o?.banner_color) || { background: BANNERS[o?.banner] || BANNERS[0] };
  };
  const wpIsImg = prefs.wallpaper === "custom" && prefs.customWallpaper;
  const wpCss = prefs.wallpaper === "custom" ? (prefs.customWallpaper ? `url(${prefs.customWallpaper})` : "") : WALLPAPERS[prefs.wallpaper]?.css || "";
  const wpStyle = wpIsImg
    ? { backgroundImage: `url(${prefs.customWallpaper})`,
        backgroundSize: prefs.wpFit === "stretch" ? "100% 100%" : prefs.wpFit === "tile" ? "auto" : "cover",
        backgroundRepeat: prefs.wpFit === "tile" ? "repeat" : "no-repeat",
        backgroundPosition: "center" }
    : (wpCss ? { background: wpCss } : {});
  const sortedChats = useMemo(() => chats.filter((c) => !c.is_feedback).sort((a, b) => {
    const pa = (prefs.pinned || []).includes(a.id) ? 1 : 0;
    const pb = (prefs.pinned || []).includes(b.id) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    const la = lastMsgOf(a) ? new Date(lastMsgOf(a).created_at).getTime() : new Date(a.created_at).getTime();
    const lb = lastMsgOf(b) ? new Date(lastMsgOf(b).created_at).getTime() : new Date(b.created_at).getTime();
    return lb - la;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [chats, messages, prefs.pinned, amAppAdmin]);

  const folderChats = useMemo(() => {
    const arch = prefs.archived || [];
    if (activeFolder === "__archive") return sortedChats.filter((c) => arch.includes(c.id));
    const base = sortedChats.filter((c) => !arch.includes(c.id));
    if (activeFolder === "all") return base;
    if (activeFolder === "__friends") return base.filter((c) => !c.is_group && c.u1 !== c.u2 && friends.has(c.u1 === me?.id ? c.u2 : c.u1));
    const f = (prefs.folders || []).find((x) => x.id === activeFolder);
    return f ? base.filter((c) => f.chatIds.includes(c.id)) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedChats, activeFolder, friends, prefs.folders, prefs.archived, me?.id]);

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
  if (phase === "banned") {
    return (
      <div className="tg" data-theme={prefs.theme} style={{ ...themeVars, display: "block" }}>
        <style>{css}</style>
        <div className="auth-wrap"><div className="auth-box">
          <h1>🚫 Аккаунт заблокирован</h1>
          <p className="sub">Администратор ограничил доступ к мессенджеру для этого аккаунта.</p>
          <button className="btn" onClick={async () => { await supabase.auth.signOut(); setPhase("auth"); }}>Выйти</button>
        </div></div>
      </div>
    );
  }
  if (phase === "auth" || phase === "register") {
    const isReg = phase === "register";
    return (
      <div className="tg" data-theme={prefs.theme} style={{ ...themeVars, display: "block" }}>
        <style>{css}</style>
        <div className="auth-wrap">
          {recoverMode && (
            <div className="auth-box">
              <h1>Восстановление</h1>
              <p className="sub">Введите свой @тег, резервный код и новый пароль.</p>
              <input className="field" placeholder="@тег" value={tag} onChange={(e) => setTag(e.target.value)} />
              <input className="field" placeholder="Резервный код" value={recCode} onChange={(e) => setRecCode(e.target.value)} />
              <input className="field" type="password" placeholder="Новый пароль (от 6 символов)" value={recNew} onChange={(e) => setRecNew(e.target.value)} />
              {err && <p className="err">{err}</p>}
              <button className="btn" onClick={async () => {
                setErr("");
                const { data, error } = await supabase.rpc("reset_by_code", {
                  p_tag: tag.trim().replace(/^@/, ""), p_code: recCode.trim(), p_new_pass: recNew });
                if (error) { setErr("Ошибка: " + error.message); return; }
                const map = { no_user: "Пользователь не найден.", no_code: "Для аккаунта не задан резервный код.",
                  bad_code: "Неверный резервный код.", weak: "Пароль слишком короткий.", ok: "" };
                if (data !== "ok") { setErr(map[data] || "Не удалось."); return; }
                setRecoverMode(false); setRecCode(""); setRecNew(""); setErr("");
                notify("Пароль изменён — войдите с новым.");
              }}>Сбросить пароль</button>
              <button className="btn ghost" onClick={() => { setRecoverMode(false); setErr(""); }}>Назад ко входу</button>
            </div>
          )}
          {!recoverMode && (
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
              <button className="btn ghost" onClick={() => { setRecoverMode(true); setErr(""); }}>Забыли пароль?</button>
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
          )}
        </div>
      </div>
    );
  }

  const myBanner = me.banner_color || BANNERS[me.banner] || BANNERS[0];

  return (
    <div className={`tg view-${activeId ? "chat" : "list"}`} data-theme={prefs.theme} style={themeVars}
      onClick={() => { menu && setMenu(null); chatMenu && setChatMenu(null); showAttach && setShowAttach(false); }}>
      <style>{css}</style>

      <input ref={avatarInp} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files[0]; e.target.value = "";
        if (!f) return;
        if (f.type === "image/gif") {
          try { const url = await uploadMedia(f, "gif", "image/gif"); await saveProfile({ avatar: url }); }
          catch { notify("Не удалось загрузить GIF."); }
        } else setCrop({ src: URL.createObjectURL(f), kind: "me" });
      }} />
      <input ref={meBannerInp} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files[0]; e.target.value = "";
        if (!f) return;
        if (f.type === "image/gif") {
          try { const url = await uploadMedia(f, "gif", "image/gif"); await saveProfile({ banner_img: url, banner_color: null }); }
          catch { notify("Не удалось загрузить GIF."); }
        } else setCrop({ src: URL.createObjectURL(f), kind: "meBanner" });
      }} />
      <input ref={groupBannerInp} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files[0]; e.target.value = "";
        if (!f) return;
        if (f.type === "image/gif") {
          try { const url = await uploadMedia(f, "gif", "image/gif"); await saveGroup({ banner_img: url }); }
          catch { notify("Не удалось загрузить GIF."); }
        } else setCrop({ src: URL.createObjectURL(f), kind: "groupBanner" });
      }} />
      <input ref={mediaInp} type="file" accept="image/*,video/*" hidden onChange={(e) => { handleMedia(e.target.files[0]); e.target.value = ""; }} />
      <input ref={fileInp} type="file" hidden onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }} />
      <input ref={wpInp} type="file" accept="image/*" hidden onChange={(e) => {
        const f = e.target.files[0]; e.target.value = "";
        if (!f) return;
        if (f.type === "image/gif") {
          if (f.size > 3 * 1048576) { notify("GIF для обоев — до 3 МБ."); return; }
          fileToB64(f).then((b64) => setPrefsAnd({ customWallpaper: b64, wallpaper: "custom" }));
        } else setCrop({ src: URL.createObjectURL(f), kind: "wallpaper" });
      }} />

      <input ref={groupAvaInp} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files[0]; e.target.value = "";
        if (!f) return;
        if (f.type === "image/gif") {
          try { const url = await uploadMedia(f, "gif", "image/gif"); await saveGroup({ avatar: url }); }
          catch { notify("Не удалось загрузить GIF."); }
        } else setCrop({ src: URL.createObjectURL(f), kind: "group" });
      }} />

      <input ref={sideBgInp} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files[0]; e.target.value = "";
        if (!f) return;
        try {
          const b64 = f.type === "image/gif" ? await fileToB64(f) : await blobToB64(await resizeToBlob(f, 900, 0.7));
          setPrefsAnd({ sideBg: b64 });
        } catch { notify("Не удалось загрузить фон."); }
      }} />
      {/* ЛЕВАЯ ПАНЕЛЬ */}
      <div className="side" style={prefs.sideBg ? { backgroundImage: `url(${prefs.sideBg})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
        <div className="side-top">
          <button className="icon-btn" title="Меню" onClick={() => setShowMenu(true)}>{btnIcon("menu", "☰")}</button>
          <input className="search-input" placeholder="Поиск: @тег, канал или сообщение…" value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)} />
          <button className="icon-btn" title="Избранное" onClick={openFavorites}>{btnIcon("fav", "⭐")}</button>
          <button className="icon-btn" title="Создать группу" onClick={() => setShowGroupNew(true)}>{btnIcon("group", "👥")}</button>
        </div>
        {appSettings.announcement && (prefs.dismissedAnn || 0) < new Date(appSettings.announcement_at || 0).getTime() && (
          <div className="ann-bar" onClick={openMainChannel} title="Открыть главный канал">
            📢 <span>{appSettings.announcement}</span>
            <button className="icon-btn" style={{ fontSize: 12, padding: "3px 6px" }}
              onClick={(e) => { e.stopPropagation(); setPrefsAnd({ dismissedAnn: Date.now() }); }}>✕</button>
          </div>
        )}
        <div className="folder-tabs">
          {(() => { const u = chats.reduce((a, c) => a + (isMuted(c.id) ? 0 : unreadCount(c)), 0); return (
            <button className={`ftab${activeFolder === "all" ? " on" : ""}`} onClick={() => setActiveFolder("all")}>Все{u > 0 ? ` ${u}` : ""}</button>
          ); })()}
          {friends.size > 0 && (
            <button className={`ftab${activeFolder === "__friends" ? " on" : ""}`} onClick={() => setActiveFolder("__friends")}>Друзья</button>
          )}
          {(prefs.folders || []).map((f) => {
            const u = (f.chatIds || []).reduce((a, id) => { const c = chats.find((x) => x.id === id); return a + (c && !isMuted(id) ? unreadCount(c) : 0); }, 0);
            return (
              <button key={f.id} className={`ftab${activeFolder === f.id ? " on" : ""}`}
                onClick={() => (activeFolder === f.id ? openFolderEditor(f) : setActiveFolder(f.id))}>
                {f.name}{u > 0 ? ` ${u}` : ""}{activeFolder === f.id ? " ✏️" : ""}
              </button>
            );
          })}
          {(prefs.archived || []).length > 0 && (
            <button className={`ftab${activeFolder === "__archive" ? " on" : ""}`} onClick={() => setActiveFolder("__archive")}>🗄 Архив</button>
          )}
          <button className="ftab" title="Новая папка" onClick={() => openFolderEditor("new")}>＋</button>
        </div>
        <div className="chats">
          {globalSearch && globalSearch.length > 0 && userQuery.trim() && !userQuery.startsWith("@") ? (<>
            <p className="stat" style={{ padding: "8px 14px 2px" }}>Сообщения ({globalSearch.length}):</p>
            {globalSearch.map((m) => {
              const c = chats.find((x) => x.id === m.chat_id);
              return (
                <div className="chat-item" key={m.id} onClick={() => { setUserQuery(""); setGlobalSearch(null); openChat(m.chat_id); setTimeout(() => scrollToMsg(m.id), 400); }}>
                  <div className="ci-body">
                    <div className="ci-row"><span className="ci-name">{c ? (c.is_group ? "👥 " : "") + chatTitle(c) : "Чат"}</span><span className="ci-time">{fmtTime(m.created_at)}</span></div>
                    <div className="ci-last">{highlight(m.content.slice(0, 80), userQuery)}</div>
                  </div>
                </div>
              );
            })}
            {channelResults.length > 0 && <p className="stat" style={{ padding: "8px 14px 2px" }}>Каналы:</p>}
            {channelResults.map((c) => (
              <div className="chat-item" key={c.id} onClick={() => joinChannel(c)}>
                <GroupAvatar chat={c} />
                <div className="ci-body"><div className="ci-row"><span className="ci-name">📣 {c.title}</span></div><div className="ci-last">Канал</div></div>
                <span className="badge">Открыть</span>
              </div>
            ))}
          </>) : (searchResults !== null || channelResults.length > 0) && userQuery.trim() ? (<>
            {channelResults.map((c) => (
              <div className="chat-item" key={c.id} onClick={() => joinChannel(c)}>
                <GroupAvatar chat={c} />
                <div className="ci-body">
                  <div className="ci-row"><span className="ci-name">📣 {c.title}</span></div>
                  <div className="ci-last">Канал{c.description ? ` · ${c.description}` : ""}</div>
                </div>
                <span className="badge">Открыть</span>
              </div>
            ))}
            {(searchResults || []).map((u) => (
              <div className="chat-item" key={u.id} onClick={() => startChat(u)}>
                <Avatar user={u} online={isOn(u)} />
                <div className="ci-body">
                  <div className="ci-row"><span className="ci-name">{u.login}</span></div>
                  <div className="ci-last">@{u.tag}{u.bio ? ` · ${u.bio}` : ""}</div>
                </div>
                <span className="badge">Написать</span>
              </div>
            ))}
            {!channelResults.length && !(searchResults || []).length && (
              <p className="muted" style={{ padding: 20, textAlign: "center", fontSize: 14 }}>Ничего не нашлось. Проверьте @тег или название канала.</p>
            )}
          </>) : folderChats.length ? (
            folderChats.map((c) => {
              const p = c.is_group ? null : profiles[c.u1 === me.id ? c.u2 : c.u1];
              const last = lastMsgOf(c);
              const lockedPreview = (prefs.chatPins || {})[c.id] && !unlocked[c.id];
              const n = unreadCount(c);
              const lastLabel = lockedPreview ? "🔒 Защищено пин-кодом" : last
                ? `${last.sender_id === me.id ? "Вы" : (c.is_group ? (profiles[last.sender_id]?.login || "…") : "")}${last.sender_id === me.id || c.is_group ? ": " : ""}${previewOf(last)}`
                : c.is_group ? "Группа создана" : "Чат создан";
              return (
                <div className={`chat-item${c.id === activeId ? " active" : ""}`} key={c.id}
                  onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } openChat(c.id); }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setChatMenuFolders(false);
                    setChatMenuNotif(false);
                    setChatMenu({ x: Math.min(e.clientX, window.innerWidth - 240), y: Math.min(e.clientY, window.innerHeight - 340), chat: c });
                  }}
                  onTouchStart={(e) => {
                    const t = e.touches[0];
                    lpChat.current = setTimeout(() => {
                      suppressClick.current = true;
                      setChatMenuFolders(false); setChatMenuNotif(false);
                      setChatMenu({ x: Math.min(t.clientX, window.innerWidth - 240), y: Math.min(t.clientY, window.innerHeight - 340), chat: c });
                    }, 450);
                  }}
                  onTouchMove={() => clearTimeout(lpChat.current)}
                  onTouchEnd={() => clearTimeout(lpChat.current)}>
                  {c.is_group ? <GroupAvatar chat={c} /> : c.u1 === c.u2 ? <Avatar user={{ tag: "⭐", frame: "none" }} /> : <Avatar user={p} online={isOn(p)} />}
                  <div className="ci-body">
                    <div className="ci-row">
                      <span className="ci-name">{(prefs.chatPins || {})[c.id] && "🔒 "}{c.is_feedback ? "📮 " : c.is_group ? (c.is_channel ? "📣 " : "👥 ") : ""}{chatTitle(c)}{notifModeOf(c.id) === "none" ? " 🔕" : notifModeOf(c.id) === "mentions" ? " ＠" : ""}</span>
                      <span className="ci-time">{(prefs.pinned || []).includes(c.id) && "📌 "}{last ? fmtTime(last.created_at) : ""}</span>
                    </div>
                    <div className="ci-row">
                      <span className="ci-last">{prefs.drafts?.[c.id] ? `✏️ ${prefs.drafts[c.id].slice(0, 40)}` : lastLabel}</span>
                      {(n > 0 || (prefs.unreadMarks || []).includes(c.id)) && !isMuted(c.id) && <span className="badge">{n > 0 ? n : "•"}</span>}
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
      <div className="main" onTouchStart={mainTouchStart} onTouchEnd={mainTouchEnd}>
        {!activeChat ? (
          <div className="placeholder">Выберите чат</div>
        ) : (<>
          <div className="chat-head">
            <button className="icon-btn back-btn" onClick={() => setActiveId(null)}>{btnIcon("back", "←")}</button>
            <div onClick={() => setShowChatInfo(true)} style={{ cursor: "pointer" }}>
              {isGroup ? <GroupAvatar chat={activeChat} size="sm" /> : <Avatar user={peer} size="sm" />}
            </div>
            <div className="ch-info" onClick={() => setShowChatInfo(true)} title={isGroup ? "Об этой группе" : "Открыть профиль"}>
              <div className="ch-name">
                {activeChat.is_feedback ? "📮 Обратная связь" : chatTitle(activeChat)}{!isGroup && !activeChat.is_feedback && peer?.status_emoji ? ` ${peer.status_emoji}` : ""}
                {!isGroup && <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}> @{peer?.tag}</span>}
              </div>
              <div className={`ch-status${(isGroup ? typingNames.length : (isOn(peer) || typingNames.length)) ? " on" : ""}`}>
                {activeChat.is_feedback
                  ? (amAppAdmin ? "сообщения пользователей" : "пишите — администратор увидит")
                  : typingNames.length
                  ? `${typingNames.join(", ")} печатает…`
                  : isGroup
                    ? `${activeMembers.length} ${isChannel ? "подписчиков" : "участников"}${activeMembers.filter(isOn).length ? ` · ${activeMembers.filter(isOn).length} онлайн` : ""}`
                    : activeChat.u1 === activeChat.u2 ? "ваши заметки" : lastSeenText(peer)}
              </div>
            </div>
            {!isGroup && !activeChat.is_feedback && peer && peer.id !== me.id && (<>
              <button className="icon-btn" title="Аудиозвонок" onClick={() => startCall(false)}>{btnIcon("call", "📞")}</button>
              <button className="icon-btn" title="Видеозвонок" onClick={() => startCall(true)}>{btnIcon("video", "🎥")}</button>
            </>)}
            <button className="icon-btn" title="Поиск по чату" onClick={() => setChatSearch(chatSearch === null ? "" : null)}>{btnIcon("search", "🔍")}</button>
          </div>

          {chatSearch !== null && (
            <div style={{ padding: "6px 14px", background: "var(--side)", borderBottom: "1px solid var(--line)" }}>
              <input className="search-input" style={{ width: "100%" }} placeholder="Поиск по сообщениям…" value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)} autoFocus />
            </div>
          )}

          {(() => {
            const pins = activeChat.pinned_msgs?.length ? activeChat.pinned_msgs : (activeChat.pinned_msg ? [activeChat.pinned_msg] : []);
            if (!pins.length) return null;
            const idx = Math.min(activePinIdx, pins.length - 1);
            const pm = activeMsgs.find((m) => m.id === pins[idx]);
            if (!pm) return null;
            return (
              <div className="pin-bar">
                📌
                <span onClick={() => scrollToMsg(pm.id)} style={{ cursor: "pointer", flex: 1 }} title="Перейти к сообщению">
                  <b style={{ color: "var(--accent)" }}>{senderName(pm)}{pins.length > 1 ? ` · ${idx + 1}/${pins.length}` : ""}:</b> {previewOf(pm)}
                </span>
                {pins.length > 1 && <button className="icon-btn" style={{ fontSize: 14 }} title="Все закреплённые" onClick={() => setShowPinList(true)}>≡</button>}
                <button className="icon-btn" style={{ fontSize: 13 }} title="Открепить" onClick={() => pinMsg(pm)}>✕</button>
              </div>
            );
          })()}

          {!isGroup && peer && peer.id !== me.id && blocked.has(peer.id) && (
            <div className="pin-bar" style={{ borderLeftColor: "#D9534F" }}>🚫 <span>Вы заблокировали этого пользователя — он не сможет вам написать.</span>
              <button className="chip" onClick={() => toggleBlock(peer)}>Разблокировать</button></div>
          )}
          <div className={`msgs${wpCss ? " has-wp" : ""}`} ref={msgsRef} style={wpStyle}
            onScroll={(e) => {
              const el = e.target;
              setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 600);
              const pins = activeChat.pinned_msgs?.length ? activeChat.pinned_msgs : (activeChat.pinned_msg ? [activeChat.pinned_msg] : []);
              if (pins.length > 1) {
                let idx = 0;
                for (let k = 0; k < pins.length; k++) {
                  const el2 = msgRefs.current[pins[k]];
                  if (el2 && el2.offsetTop <= el.scrollTop + 80) idx = k;
                }
                setActivePinIdx(idx);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); routeFile(e.dataTransfer.files?.[0]); }}>
            {(chatSearch ? activeMsgs.filter((m) => m.type === "text" && m.content.toLowerCase().includes(chatSearch.toLowerCase())) : activeMsgs).map((m, i, arr) => {
              const prev = arr[i - 1];
              const ts = new Date(m.created_at).getTime();
              const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
              const out = m.sender_id === me.id;
              const othersRead = Object.entries(reads[activeId] || {}).some(([uid, t]) => uid !== me.id && t >= ts);
              const url = m.type === "text" ? findUrl(m.content) : null;
              const showAsPhoto = m.type === "photo" || (m.type === "file" && isImg(m));
              const isFeed = !!activeChat?.is_feedback;
              const showSender = (isGroup && !isChannel && !out && (!prev || prev.sender_id !== m.sender_id)) || (isFeed && amAppAdmin && !out && (!prev || prev.sender_id !== m.sender_id));
              const showAva = isGroup && !isChannel && !out && (!arr[i + 1] || arr[i + 1].sender_id !== m.sender_id);
              return (
                <div key={m.id} ref={(el) => { if (el) msgRefs.current[m.id] = el; }}>
                  {newDay && <div style={{ display: "flex", justifyContent: "center" }}><span className="day-sep">{fmtDay(m.created_at)}</span></div>}
                  <div className={`bubble-row ${out ? "out" : "in"}`}
                    onTouchStart={(e) => { e.currentTarget._sx = e.touches[0].clientX; }}
                    onTouchEnd={(e) => {
                      const sx = e.currentTarget._sx;
                      if (sx != null && e.changedTouches[0].clientX - sx > 55) { setReplyTo(m); taRef.current?.focus(); }
                    }}>
                    {isGroup && !isChannel && !out && (
                      <div className="msg-ava" onClick={() => profiles[m.sender_id] && setShowMember(profiles[m.sender_id])}>
                        {showAva && <Avatar user={profiles[m.sender_id]} size="xs" />}
                      </div>
                    )}
                    <div className={`bubble ${out ? "out" : "in"}${flashId === m.id ? " flash" : ""}`}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); openMenuAt(e.clientX, e.clientY, m); }}
                      onDoubleClick={() => toggleReaction(m, "❤️")}
                      onTouchStart={(e) => bubbleTouchStart(e, m)}
                      onTouchEnd={bubbleTouchCancel}
                      onTouchMove={bubbleTouchCancel}>
                      {showSender && <div className="b-sender" style={{ color: senderColor(m.sender_id) }}>{profiles[m.sender_id]?.login || "…"}</div>}
                      {m.forwarded && <div className="fwd-label">↪ Переслано от {m.forwarded.name}</div>}
                      {m.reply_to && (
                        <div className="reply-quote" style={{ cursor: "pointer" }} title="Перейти к сообщению"
                          onClick={(e) => { e.stopPropagation(); scrollToMsg(m.reply_to.id); }}>
                          <b>{m.reply_to.name}</b>{m.reply_to.text}
                        </div>
                      )}
                      {m.type === "text" && <MsgText text={m.content} query={chatSearch || ""} onMention={openByTag} />}
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
                            <button key={e} className={`react-chip${ids.includes(me.id) ? " mine" : ""}`}
                              onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } toggleReaction(m, e); }}
                              data-img={e.startsWith("img:") ? "1" : undefined}
                              onContextMenu={(ev) => { ev.preventDefault(); ev.stopPropagation(); setReactViewer(m); }}
                              onTouchStart={(ev) => {
                                ev.stopPropagation();
                                lpChat.current = setTimeout(() => { suppressClick.current = true; setReactViewer(m); }, 450);
                              }}
                              onTouchMove={() => clearTimeout(lpChat.current)}
                              onTouchEnd={() => clearTimeout(lpChat.current)}>
                              {e.startsWith("img:") ? <img src={e.slice(4)} alt="" style={{ width: 16, height: 16, objectFit: "contain", verticalAlign: "middle" }} /> : e} {ids.length}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="b-meta">
                        {m.edited_at && <span style={{ opacity: 0.7, marginRight: 4 }}>изменено</span>}
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

          {showJump && (
            <button className="jump-down" title="Вниз"
              onClick={() => msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: "smooth" })}>⌄</button>
          )}
          {isChannel && !canPost ? (
            <div className="composer" style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
              <span className="muted" style={{ fontSize: 14 }}>📣 Вы подписаны на канал</span>
              <button className="chip" onClick={() => cycleNotif(activeId)}>{NOTIF_LABEL[notifModeOf(activeId)]}</button>
            </div>
          ) : (
          <div className="composer">
            {editing && (
              <div className="reply-bar" style={{ borderLeftColor: "#E0A040" }}>
                <span style={{ color: "#E0A040" }}>✏️ Редактирование</span>
                <button className="icon-btn" style={{ fontSize: 13, marginLeft: "auto" }} onClick={() => { setEditing(null); setDraft(""); }}>✕</button>
              </div>
            )}
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
            {expireSec > 0 && (
              <div className="reply-bar" style={{ borderLeftColor: "#E0A040" }}>
                <span style={{ color: "#E0A040" }}>⏱ Исчезающие сообщения: {expireSec < 60 ? `${expireSec} сек` : expireSec < 3600 ? `${expireSec / 60} мин` : "1 час"}</span>
                <button className="icon-btn" style={{ fontSize: 13, marginLeft: "auto" }} onClick={() => setExpireSec(0)}>✕</button>
              </div>
            )}
            <div className="compose-row" style={{ position: "relative" }}>
              {mentionQuery !== null && isGroup && (() => {
                const list = activeMembers.filter((u) => u.id !== me.id
                  && ((u.tag || "").toLowerCase().startsWith(mentionQuery) || (u.login || "").toLowerCase().startsWith(mentionQuery))).slice(0, 6);
                return list.length ? (
                  <div className="mention-pop">
                    {list.map((u) => (
                      <button key={u.id} onClick={() => {
                        setDraft((d) => d.replace(/@([a-zA-Z0-9_]*)$/, `@${u.tag} `));
                        setMentionQuery(null);
                        taRef.current?.focus();
                      }}>
                        <Avatar user={u} size="xs" /> <b>{u.login}</b> <span className="muted">@{u.tag}</span>
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}
              {showStickers && (() => {
                const packs = stickerPacks();
                const pIdx = Math.min(activePack, Math.max(0, packs.length - 1));
                const pack = packs[pIdx];
                return (
                  <div className="sticker-panel">
                    <div className="sticker-panel-head">
                      <div className="sticker-tabs">
                        {packs.map((pk, i) => (
                          <button key={pk.id} className={`sticker-tab${i === pIdx ? " on" : ""}`} onClick={() => setActivePack(i)}>{pk.name}</button>
                        ))}
                        <button className="sticker-tab" onClick={newStickerPack}>＋ пак</button>
                      </div>
                      <button className="pop-x" style={{ position: "static" }} onClick={() => setShowStickers(false)}>✕</button>
                    </div>
                    <input ref={stickerInp} type="file" accept="image/*" hidden onChange={(e) => { addStickerToPack(e.target.files[0], pIdx); e.target.value = ""; }} />
                    {pack ? (
                      <div className="sticker-grid-big">
                        {pack.items.map((url, i) => (
                          <div className="sticker-cell" key={i}>
                            <img src={url} alt="" onClick={() => sendSticker(url)} />
                            <button className="st-del" onClick={(ev) => { ev.stopPropagation(); delStickerFromPack(pIdx, i); }}>✕</button>
                          </div>
                        ))}
                        <button className="sticker-add" onClick={() => stickerInp.current?.click()}>＋</button>
                      </div>
                    ) : (
                      <div style={{ padding: 24, textAlign: "center" }}>
                        <p className="muted" style={{ fontSize: 13.5 }}>Создайте свой первый стикерпак</p>
                        <button className="btn" style={{ marginTop: 8 }} onClick={newStickerPack}>＋ Новый стикерпак</button>
                      </div>
                    )}
                    {pack && <button className="sticker-pack-del" onClick={() => delStickerPack(pIdx)}>🗑 Удалить пак «{pack.name}»</button>}
                  </div>
                );
              })()}
              {showEmoji && (
                <div className="emoji-pop emoji-pop-wide">
                  <button className="pop-x" onClick={() => setShowEmoji(false)}>✕</button>
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
                  <button onClick={() => { setShowAttach(false); originalRef.current = true; fileInp.current?.click(); }}>🗂 Оригинал (без сжатия)</button>
                  <button onClick={() => { const opts = [0, 5, 30, 300, 3600]; const cur = opts.indexOf(expireSec); setExpireSec(opts[(cur + 1) % opts.length]); }}>
                    ⏱ Исчезающие: {expireSec === 0 ? "выкл" : expireSec < 60 ? `${expireSec} сек` : expireSec < 3600 ? `${expireSec / 60} мин` : "1 час"}
                  </button>
                  <button onClick={() => {
                    setShowAttach(false);
                    const v = window.prompt("Через сколько минут отправить? (например 30, или 0 чтобы отменить):", "30");
                    if (v === null) return;
                    const min = parseInt(v, 10);
                    if (!min) { setScheduleAt(null); notify("Отложенная отправка отключена"); return; }
                    setScheduleAt(new Date(Date.now() + min * 60000).toISOString());
                    notify(`Следующее сообщение уйдёт через ${min} мин`);
                  }}>🕓 Отложить отправку{scheduleAt ? " ✓" : ""}</button>
                  <button onClick={startVoice}>🎤 Голосовое сообщение</button>
                </div>
              )}
              <button className="icon-btn" title="Прикрепить" onClick={(e) => { e.stopPropagation(); setShowAttach(!showAttach); setShowEmoji(false); }}>{btnIcon("attach", "📎")}</button>
              <button className="icon-btn" title="Эмодзи" onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); setShowStickers(false); }}>{btnIcon("emoji", "😊")}</button>
              <button className="icon-btn" title="Стикеры" onClick={() => { setShowStickers(!showStickers); setShowEmoji(false); setShowAttach(false); }}>{btnIcon("sticker", "🌟")}</button>
              {recording ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "0 10px" }}>
                  <span style={{ color: "#E26060" }}>● Запись… {Math.round((Date.now() - recording.start) / 1000)}с</span>
                  <span style={{ flex: 1 }} />
                  <button className="chip" onClick={() => stopVoice(false)}>Отмена</button>
                </div>
              ) : (
                <textarea ref={taRef} rows={1} placeholder={t("Сообщение")} value={draft}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft(v);
                    notifyTyping();
                    const upto = v.slice(0, e.target.selectionStart);
                    const mm = isGroup ? upto.match(/@([a-zA-Z0-9_]*)$/) : null;
                    setMentionQuery(mm ? mm[1].toLowerCase() : null);
                    e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={(e) => { tickSound(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }} />
              )}
              <button className="send-btn" title="Отправить" disabled={!draft.trim() && !recording}
                onClick={() => recording ? stopVoice(true) : sendText()}>{btnIcon("send", "➤")}</button>
            </div>
          </div>
          )}
        </>)}
      </div>

      {/* БОКОВОЕ МЕНЮ */}
      {showMenu && (<>
        <div className="drawer-ov" onClick={() => setShowMenu(false)} />
        <div className="drawer">
          <button className="icon-btn drawer-x" onClick={() => setShowMenu(false)}>✕</button>
          <div className="drawer-head">
            <div onClick={() => { setShowMenu(false); setShowProfile(true); }} style={{ cursor: "pointer", display: "inline-block" }}>
              <Avatar user={me} />
            </div>
            <div className="drawer-name" onClick={() => { setShowMenu(false); setShowProfile(true); }} style={{ cursor: "pointer" }}>
              {me.login}{me.status_emoji ? ` ${me.status_emoji}` : ""} <span className="muted" style={{ marginLeft: "auto", fontSize: 13 }}>▾</span>
            </div>
            <div className="drawer-status" onClick={() => setStatusPick(true)}>Сменить эмодзи-статус</div>
          </div>
          <div className="d-sep" />
          <button className="d-row" onClick={() => { setShowMenu(false); setShowProfile(true); }}><span className="d-ic">👤</span> {t("Профиль")}</button>
          <div className="d-sep" />
          <button className="d-row" onClick={() => { setShowMenu(false); setNewKind("group"); setShowGroupNew(true); }}><span className="d-ic">👥</span> {t("Новая группа")}</button>
          <button className="d-row" onClick={() => { setShowMenu(false); setNewKind("channel"); setShowGroupNew(true); }}><span className="d-ic">📣</span> {t("Новый канал")}</button>
          <button className="d-row" onClick={() => { setShowContacts(true); }}><span className="d-ic">👫</span> {t("Контакты")}</button>
          <button className="d-row" onClick={() => { setShowCalls(true); }}><span className="d-ic">📞</span> {t("Звонки")}</button>
          <button className="d-row" onClick={() => { setShowMenu(false); openFavorites(); }}><span className="d-ic">🔖</span> {t("Избранное")}</button>
          <button className="d-row" onClick={openFeedback}><span className="d-ic">📮</span> {t("Обратная связь")}</button>
          {amStaff && <button className="d-row" onClick={openAdmin}><span className="d-ic">🛡</span> {amAppAdmin ? "Админ-панель" : "Панель модератора"}</button>}
          {amStaff && <button className="d-row" onClick={openReports}><span className="d-ic">🚩</span> Жалобы</button>}
          <button className="d-row" onClick={loadStats}><span className="d-ic">📊</span> {t("Статистика")}</button>
          <button className="d-row" onClick={() => { setShowMenu(false); setShowBuilder(true); }}><span className="d-ic">🎛</span> Конструктор</button>
          <button className="d-row" onClick={openMarket}><span className="d-ic">🛍</span> {t("Маркет тем")}</button>
          <button className="d-row" onClick={() => { setShowMenu(false); setShowProfile(true); }}><span className="d-ic">⚙️</span> {t("Настройки")}</button>
          <button className="d-row" onClick={() => setPrefsAnd({ theme: prefs.theme === "light" ? "dark" : "light" })}>
            <span className="d-ic">🌙</span> {t("Ночной режим")}
            <span className="right"><span className={`toggle${prefs.theme !== "light" ? " on" : ""}`} style={{ display: "inline-block" }} /></span>
          </button>
        </div>
      </>)}

      {/* ЭМОДЗИ-СТАТУС */}
      {statusPick && (
        <div className="overlay" style={{ zIndex: 72 }} onClick={() => setStatusPick(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              <h3 style={{ marginTop: 0 }}>Эмодзи-статус</h3>
              <div className="emoji-tabs">
                {Object.keys(EMOJI).map((t) => <button key={t} className={t === emojiTab ? "sel" : ""} onClick={() => setEmojiTab(t)}>{t}</button>)}
              </div>
              <div className="emoji-grid">
                {EMOJI[emojiTab].map((e) => <button key={e} onClick={() => { saveProfile({ status_emoji: e }); setStatusPick(false); }}>{e}</button>)}
              </div>
              <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => { saveProfile({ status_emoji: null }); setStatusPick(false); }}>Убрать статус</button>
            </div>
          </div>
        </div>
      )}

      {/* КОНТАКТЫ */}
      {showContacts && (
        <div className="overlay" style={{ zIndex: 68 }} onClick={() => setShowContacts(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              <h3 style={{ marginTop: 0 }}>👫 Контакты</h3>
              {[...friends].map((id) => profiles[id]).filter(Boolean).map((u) => (
                <div className="member-row" key={u.id} style={{ cursor: "pointer" }} onClick={() => setShowMember(u)}>
                  <Avatar user={u} size="sm" online={isOn(u)} />
                  <span className="mr-name">{u.login}{u.status_emoji ? ` ${u.status_emoji}` : ""} <span className="muted">@{u.tag}</span></span>
                  <span style={{ fontSize: 12.5, color: isOn(u) ? "var(--accent)" : "var(--muted)" }}>{isOn(u) ? "онлайн" : ""}</span>
                </div>
              ))}
              {friends.size === 0 && <p className="muted" style={{ textAlign: "center", padding: 14 }}>Пока пусто. Добавляйте людей в друзья из их профилей.</p>}
              <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setShowContacts(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* ЖУРНАЛ ЗВОНКОВ */}
      {showCalls && (
        <div className="overlay" style={{ zIndex: 68 }} onClick={() => setShowCalls(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              <h3 style={{ marginTop: 0 }}>📞 Звонки</h3>
              {(prefs.callLog || []).map((en, i) => (
                <div className="member-row" key={i} style={{ cursor: "pointer" }}
                  onClick={async () => {
                    let u = profiles[en.peerId];
                    if (!u) {
                      const { data } = await supabase.from("profiles").select("*").eq("id", en.peerId).single();
                      u = data; if (u) cacheProfiles([u]);
                    }
                    if (u) { setShowCalls(false); setShowMenu(false); startChat(u); }
                  }}>
                  <span style={{ fontSize: 18 }}>{en.video ? "🎥" : "📞"}</span>
                  <span className="mr-name">
                    {en.name || "?"}
                    <div className="muted" style={{ fontSize: 12 }}>
                      {en.dir === "in" ? (en.dur ? "Входящий" : "Пропущенный") : "Исходящий"}
                      {en.dur ? ` · ${Math.floor(en.dur / 60)}:${String(en.dur % 60).padStart(2, "0")}` : ""}
                    </div>
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>{new Date(en.ts).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
              {!(prefs.callLog || []).length && <p className="muted" style={{ textAlign: "center", padding: 14 }}>Журнал пуст. Кнопки звонка — в шапке личного чата.</p>}
              <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setShowCalls(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* МЕНЮ ЧАТА (правый клик по списку) */}
      {chatMenu && (
        <div className="menu" style={{ left: chatMenu.x, top: chatMenu.y, minWidth: 215 }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { toggleList("archived", chatMenu.chat.id); setChatMenu(null); }}>
            🗄 {inList("archived", chatMenu.chat.id) ? "Вернуть из архива" : "Архивировать"}
          </button>
          <button onClick={() => { toggleList("pinned", chatMenu.chat.id); setChatMenu(null); }}>
            📌 {inList("pinned", chatMenu.chat.id) ? "Открепить" : "Закрепить"}
          </button>
          <button onClick={() => setChatMenuNotif(!chatMenuNotif)}>🔔 Уведомления {chatMenuNotif ? "▾" : "›"}</button>
          {chatMenuNotif && ["all", "mentions", "none"].map((mo) => (
            <button key={mo} style={{ paddingLeft: 34 }} onClick={() => { setNotifMode(chatMenu.chat.id, mo); setChatMenu(null); }}>
              {notifModeOf(chatMenu.chat.id) === mo ? "✓ " : "　"}{NOTIF_LABEL[mo]}
            </button>
          ))}
          <button onClick={() => { toggleList("unreadMarks", chatMenu.chat.id); setChatMenu(null); }}>
            💬 {inList("unreadMarks", chatMenu.chat.id) ? "Снять метку" : "Отметить непрочитанным"}
          </button>
          <button onClick={() => setChatMenuFolders(!chatMenuFolders)}>📁 Добавить в папку {chatMenuFolders ? "▾" : "›"}</button>
          {chatMenuFolders && ((prefs.folders || []).length ? (prefs.folders || []).map((f) => (
            <button key={f.id} style={{ paddingLeft: 34 }} onClick={() => {
              const has = f.chatIds.includes(chatMenu.chat.id);
              setPrefsAnd({ folders: prefs.folders.map((x) => x.id === f.id ? { ...x, chatIds: has ? x.chatIds.filter((i) => i !== chatMenu.chat.id) : [...x.chatIds, chatMenu.chat.id] } : x) });
            }}>{f.chatIds.includes(chatMenu.chat.id) ? "✓ " : "　"}{f.name}</button>
          )) : <button style={{ paddingLeft: 34, color: "var(--muted)" }} onClick={() => { setChatMenu(null); openFolderEditor("new"); }}>Создать папку…</button>)}
          <button onClick={() => { const id = chatMenu.chat.id; setChatMenu(null); setChatPin(id); }}>🔒 {(prefs.chatPins || {})[chatMenu.chat.id] ? "Снять пин-код" : "Поставить пин-код"}</button>
          <button onClick={() => { const c = chatMenu.chat; setChatMenu(null); clearHistory(c); }}>🧹 Очистить историю</button>
          {chatMenu.chat.is_group ? (
            <button style={{ color: "#E26060" }} onClick={() => { const c = chatMenu.chat; setChatMenu(null); leaveGroup(c.id); }}>
              🚪 {chatMenu.chat.is_channel ? "Отписаться от канала" : "Покинуть группу"}
            </button>
          ) : chatMenu.chat.u1 !== chatMenu.chat.u2 ? (
            <button style={{ color: "#E26060" }} onClick={() => { const c = chatMenu.chat; setChatMenu(null); deleteDirectChat(c); }}>🗑 Удалить чат</button>
          ) : null}
          <button className="menu-close" onClick={() => setChatMenu(null)}>✕ Закрыть</button>
        </div>
      )}

      {/* КОНТЕКСТНОЕ МЕНЮ */}
      {menu && (
        <div className="menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <div className="rx">
            {[...(prefs.recentReacts || []), ...REACTIONS.filter((e) => !(prefs.recentReacts || []).includes(e))].slice(0, 8).map((e) => <button key={e} onClick={() => toggleReaction(menu.msg, e)}>{e}</button>)}
            <button title="Другая реакция" onClick={() => { const m = menu.msg; setMenu(null); setReactFor(m); }}>＋</button>
          </div>
          <button onClick={() => { setReplyTo(menu.msg); setMenu(null); taRef.current?.focus(); }}>↩ Ответить</button>
          {menu.msg.type === "text" && <button onClick={() => { navigator.clipboard?.writeText(menu.msg.content); setMenu(null); }}>📋 Копировать</button>}
          <button onClick={() => pinMsg(menu.msg)}>📌 {(activeChat?.pinned_msgs || (activeChat?.pinned_msg ? [activeChat.pinned_msg] : [])).includes(menu.msg.id) ? "Открепить" : "Закрепить"}</button>
          {menu.msg.sender_id === me.id && isGroup && <button onClick={() => { const m = menu.msg; setMenu(null); setReadersFor(m); }}>👁 Кто прочитал</button>}
          {Object.keys(menu.msg.reactions || {}).length > 0 && <button onClick={() => { const m = menu.msg; setMenu(null); setReactViewer(m); }}>👀 Кто поставил реакции</button>}
          {menu.msg.sender_id !== me.id && <button onClick={() => { const m = menu.msg; setMenu(null); reportMsg(m); }}>🚩 Пожаловаться</button>}
          {menu.msg.sender_id === me.id && menu.msg.type === "text" && <button onClick={() => { setEditing(menu.msg); setDraft(menu.msg.content); setMenu(null); taRef.current?.focus(); }}>✏️ Изменить</button>}
          <button onClick={() => { const m = menu.msg; setMenu(null); setForwarding(m); }}>↪ Переслать</button>
          {menu.msg.sender_id === me.id && <button style={{ color: "#E26060" }} onClick={() => deleteMsg(menu.msg)}>🗑 Удалить</button>}
          <button className="menu-close" onClick={() => setMenu(null)}>✕ Закрыть</button>
        </div>
      )}

      {/* ВЫБОР ЛЮБОЙ РЕАКЦИИ */}
      {reactFor && (
        <div className="overlay" onClick={() => setReactFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              <h3 style={{ marginTop: 0 }}>Выберите реакцию</h3>
              <div className="emoji-tabs">
                {Object.keys(EMOJI).map((t) => <button key={t} className={t === emojiTab ? "sel" : ""} onClick={() => setEmojiTab(t)}>{t}</button>)}
                {(prefs.emojiPacks || []).length > 0 && <button className={emojiTab === "★" ? "sel" : ""} onClick={() => setEmojiTab("★")}>★</button>}
              </div>
              {emojiTab === "★" ? (
                <div className="emoji-grid">
                  {(prefs.emojiPacks || []).map((url, i) => (
                    <button key={i} onClick={() => { toggleReaction(reactFor, "img:" + url); setReactFor(null); }} style={{ padding: 2 }}>
                      <img src={url} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="emoji-grid">
                  {EMOJI[emojiTab].map((e) => <button key={e} onClick={() => { toggleReaction(reactFor, e); setReactFor(null); }}>{e}</button>)}
                </div>
              )}
            </div>
          </div>
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
              <h3 style={{ marginTop: 0 }}>{newKind === "channel" ? "Новый канал" : "Новая группа"}</h3>
              <div className="theme-row" style={{ marginBottom: 10 }}>
                <button className={`btn${newKind === "group" ? "" : " ghost"}`} style={{ padding: "8px 4px", fontSize: 13 }} onClick={() => setNewKind("group")}>👥 Группа</button>
                <button className={`btn${newKind === "channel" ? "" : " ghost"}`} style={{ padding: "8px 4px", fontSize: 13 }} onClick={() => setNewKind("channel")}>📣 Канал</button>
              </div>
              {newKind === "channel" && <p className="stat" style={{ marginBottom: 8 }}>Публиковать смогут только вы и админы канала. Подписчики найдут канал по названию через поиск.</p>}
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
              {!groupQuery.trim() && friends.size > 0 && <p className="stat" style={{ margin: "2px 0 6px" }}>Ваши контакты:</p>}
              {(groupQuery.trim()
                ? (groupResults || [])
                : [...friends].map((id) => profiles[id]).filter(Boolean).filter((u) => !groupPicks.some((pk) => pk.id === u.id))
              ).map((u) => (
                <div className="member-row" key={u.id} style={{ cursor: "pointer" }}
                  onClick={() => { setGroupPicks([...groupPicks, u]); setGroupQuery(""); }}>
                  <Avatar user={u} size="sm" online={isOn(u)} />
                  <span className="mr-name">{u.login} <span className="muted">@{u.tag}</span></span>
                  <span className="badge">＋</span>
                </div>
              ))}
              <button className="btn" style={{ marginTop: 10 }} onClick={createGroup}
                disabled={!groupTitle.trim() || (newKind !== "channel" && !groupPicks.length)}>{newKind === "channel" ? "Создать канал" : "Создать группу"}</button>
              <button className="btn ghost" onClick={() => setShowGroupNew(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* ИНФО О ЧАТЕ / ПРОФИЛЬ СОБЕСЕДНИКА */}
      {showChatInfo && activeChat && (
        <div className="overlay" onClick={() => { setShowChatInfo(false); setAddQuery(""); setMediaTab(null); setGroupEdit(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {isGroup ? (
              mediaTab ? (
                <div className="modal-pad">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <button className="icon-btn" onClick={() => setMediaTab(null)}>←</button>
                    <h3 style={{ margin: 0 }}>{{ photo: "Фото", video: "Видео", file: "Файлы", audio: "Аудио", voice: "Голосовые", link: "Ссылки", gif: "GIF" }[mediaTab]}</h3>
                  </div>
                  {(mediaTab === "photo" || mediaTab === "gif") ? (
                    <div className="media-grid">
                      {mediaOf(mediaTab).map((m) => <img key={m.id} src={m.content} alt="" onClick={() => setViewer(m.content)} />)}
                    </div>
                  ) : mediaOf(mediaTab).map((m) => (
                    <div className="member-row" key={m.id}>
                      {mediaTab === "video" ? <video src={m.content} controls style={{ maxWidth: 170, borderRadius: 8 }} />
                        : mediaTab === "voice" ? <VoiceBubble msg={m} />
                        : mediaTab === "link" ? <a className="link-card" style={{ flex: 1, wordBreak: "break-all" }} href={findUrl(m.content)} target="_blank" rel="noreferrer">{findUrl(m.content)}</a>
                        : <a className="b-file" href={m.content} download={m.file_name} style={{ color: "var(--text)", textDecoration: "none", flex: 1 }}>
                            <div className="fi">{mediaTab === "audio" ? "🎧" : "📄"}</div>
                            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{m.file_name}</div><div className="muted" style={{ fontSize: 12.5 }}>{fmtSize(m.file_size || 0)}</div></div>
                          </a>}
                      <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>{fmtTime(m.created_at)}</span>
                    </div>
                  ))}
                  {mediaOf(mediaTab).length === 0 && <p className="muted" style={{ textAlign: "center", padding: 16 }}>Пока пусто</p>}
                </div>
              ) : groupEdit ? (
                <div className="modal-pad">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <button className="icon-btn" onClick={() => setGroupEdit(false)}>←</button>
                    <h3 style={{ margin: 0 }}>Управление группой</h3>
                  </div>
                  {hasRight("edit") && (<>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                      <div onClick={() => groupAvaInp.current?.click()} title="Сменить аватар группы" style={{ cursor: "pointer" }}>
                        <GroupAvatar chat={activeChat} size="lg" />
                      </div>
                      <span className="muted" style={{ fontSize: 13 }}>Нажмите на аватар,<br />чтобы сменить</span>
                    </div>
                    <input className="field" placeholder="Название группы" maxLength={50} defaultValue={activeChat.title}
                      onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== activeChat.title && saveGroup({ title: e.target.value.trim() })} />
                    <input className="field" placeholder="Описание группы" maxLength={200} defaultValue={activeChat.description || ""}
                      onBlur={(e) => e.target.value !== (activeChat.description || "") && saveGroup({ description: e.target.value })} />
                    <h3>Баннер</h3>
                    <div className="swatches">
                      {BANNERS.map((b, i) => <div key={i} className={`sw${activeChat.banner === i && !activeChat.banner_img ? " sel" : ""}`} style={{ background: b }} onClick={() => saveGroup({ banner: i, banner_img: null })} />)}
                    </div>
                    <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => groupBannerInp.current?.click()}>🖼 Свой баннер (фото или GIF)</button>
                  </>)}
                  <h3>Участники и права</h3>
                  {activeMembers.map((u) => (
                    <div key={u.id}>
                      <div className="member-row">
                        <Avatar user={u} size="sm" online={isOn(u)} />
                        <span className="mr-name">{u.login} {u.id === activeChat.owner ? "👑" : u._role === "admin" ? "⭐" : ""}</span>
                        {u.id !== activeChat.owner && u.id !== me.id && (<>
                          {hasRight("admins") && (
                            <button className="chip" onClick={() => setMemberRole(u.id, u._role === "admin" ? "member" : "admin", u._role === "admin" ? {} : { kick: true })}>
                              {u._role === "admin" ? "Снять админа" : "Сделать админом"}
                            </button>
                          )}
                          {hasRight("kick") && <button className="icon-btn" title="Исключить из группы" style={{ fontSize: 14 }} onClick={() => kickMember(u.id)}>✕</button>}
                        </>)}
                      </div>
                      {amOwner && u._role === "admin" && u.id !== activeChat.owner && (
                        <div className="rights-row">
                          {[["kick", "исключение участников"], ["admins", "назначение админов"], ["edit", "редактирование профиля"]].map(([k, label]) => (
                            <label key={k} style={{ cursor: "pointer" }}>
                              <input type="checkbox" checked={!!u._rights?.[k]}
                                onChange={(e) => setMemberRole(u.id, "admin", { ...u._rights, [k]: e.target.checked })} /> {label}
                            </label>
                          ))}
                        </div>
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
                  {amOwner && (
                    <button className="btn" style={{ background: "#D9534F", marginTop: 14 }}
                      onClick={async () => {
                        const { error } = await supabase.from("chats").delete().eq("id", activeId);
                        if (error) { notify(`Не удалось удалить: ${error.message}`); return; }
                        notify(isChannel ? "Канал удалён" : "Группа удалена");
                        setShowChatInfo(false); setGroupEdit(false);
                        setChats((cs) => cs.filter((c) => c.id !== activeId));
                        setActiveId(null);
                      }}>🗑 Удалить {isChannel ? "канал" : "группу"} навсегда</button>
                  )}
                </div>
              ) : (<>
                <div className="banner" style={activeChat.banner_img ? bannerCss(activeChat) : { background: BANNERS[activeChat.banner] || BANNERS[7] }}>
                  <GroupAvatar chat={activeChat} size="lg" />
                </div>
                <div className="modal-pad" style={{ paddingTop: 58 }}>
                  <div style={{ fontWeight: 700, fontSize: 19 }}>{activeChat.title}</div>
                  <div className="muted" style={{ fontSize: 14 }}>
                    {activeMembers.length} {isChannel ? "подписчиков" : "участников"}{activeMembers.filter(isOn).length ? ` · ${activeMembers.filter(isOn).length} онлайн` : ""}
                  </div>
                  {activeChat.description && <p style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.4 }}>{activeChat.description}</p>}

                  <div className="ios-actions">
                    <button className="ios-btn" onClick={() => cycleNotif(activeId)} title="Все → Упоминания → Тишина">
                      <span className="ic">{notifModeOf(activeId) === "none" ? "🔕" : notifModeOf(activeId) === "mentions" ? "＠" : "🔔"}</span>
                      {notifModeOf(activeId) === "none" ? "Заглушено" : notifModeOf(activeId) === "mentions" ? "Упоминания" : "Все"}
                    </button>
                    {(amOwner || myRow?.role === "admin") && (
                      <button className="ios-btn" onClick={() => setGroupEdit(true)}><span className="ic">⚙️</span>Управление</button>
                    )}
                    <button className="ios-btn" onClick={() => { setShowChatInfo(false); setChatSearch(""); }}><span className="ic">🔍</span>Поиск</button>
                    <button className="ios-btn" onClick={leaveGroup}><span className="ic">🚪</span>Выйти</button>
                  </div>

                  {amAppAdmin && isChannel && (
                    <button className="btn ghost" style={{ marginBottom: 10 }}
                      onClick={async () => {
                        const { error } = await supabase.from("app_settings").update({ main_channel: activeId }).eq("id", 1);
                        if (error) notify(`Не удалось: ${error.message}`);
                        else { setAppSettings((st) => ({ ...st, main_channel: activeId })); notify("Назначен главным каналом ✓"); }
                      }}>
                      {appSettings.main_channel === activeId ? "⭐ Это главный канал мессенджера" : "📌 Сделать главным каналом мессенджера"}
                    </button>
                  )}
                  <div className="ios-list">
                    {[["photo", "🖼", "фото"], ["video", "🎬", "видео"], ["file", "📄", "файлов"], ["audio", "🎧", "аудио"], ["link", "🔗", "ссылок"], ["voice", "🎤", "голосовых"], ["gif", "🪄", "GIF"]].map(([k, ic, label]) => (
                      <button className="ios-row" key={k} onClick={() => setMediaTab(k)}>
                        <span>{ic}</span> {mediaOf(k).length} {label}
                        <span className="cnt">›</span>
                      </button>
                    ))}
                  </div>

                  {(!isChannel || canPost) && (<>
                  <h3>Участники</h3>
                  {activeMembers.map((u) => (
                    <div className="member-row" key={u.id} style={{ cursor: u.id === me.id ? "default" : "pointer" }}
                      onClick={() => u.id !== me.id && setShowMember(u)}>
                      <Avatar user={u} size="sm" online={isOn(u)} />
                      <span className="mr-name">{u.login} {u.id === activeChat.owner ? "👑" : u._role === "admin" ? "⭐" : ""} {u.id === me.id && <span className="muted">(вы)</span>}</span>
                      <span style={{ fontSize: 12.5, color: isOn(u) ? "var(--accent)" : "var(--muted)" }}>{isOn(u) ? "онлайн" : ""}</span>
                    </div>
                  ))}
                  </>)}
                  <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setShowChatInfo(false)}>Закрыть</button>
                </div>
              </>)
            ) : peer ? (<>
              <div className="banner" style={bannerCss(peer)}>
                <Avatar user={peer} size="lg" />
              </div>
              <div className="modal-pad" style={{ paddingTop: 58, ...(parseFill(peer.profile_bg) || {}) }}>
                <div style={{ fontWeight: 700, fontSize: 19, color: peer.name_color || undefined }}>{peer.login}{peer.status_emoji ? ` ${peer.status_emoji}` : ""}</div>
                <div className="muted" style={{ fontSize: 14 }}>@{peer.tag} · {lastSeenText(peer)}</div>
                {peer.bio && <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.4 }}>{peer.bio}</p>}
                <div className="ios-list" style={{ marginTop: 10 }}>
                  {[["photo", "🖼", "фото"], ["video", "🎬", "видео"], ["file", "📄", "файлов"], ["audio", "🎧", "аудио"], ["link", "🔗", "ссылок"], ["voice", "🎤", "голосовых"]].map(([k, ic, label]) => (
                    <button className="ios-row" key={k} onClick={() => setMediaTab(k)}>
                      <span>{ic}</span> {mediaOf(k).length} {label}<span className="cnt">›</span>
                    </button>
                  ))}
                </div>
                <p className="stat" style={{ marginTop: 10 }}>В мессенджере с {new Date(peer.created_at).toLocaleDateString("ru-RU")}</p>
                {peer.id !== me.id && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="btn ghost" style={{ flex: 1 }} onClick={() => toggleFriend(peer)}>{friends.has(peer.id) ? "✓ В друзьях" : "➕ В друзья"}</button>
                    <button className="btn ghost" style={{ flex: 1, color: "#D9534F" }} onClick={() => toggleBlock(peer)}>{blocked.has(peer.id) ? "Разблокировать" : "🚫 Заблокировать"}</button>
                  </div>
                )}
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
            <div className="banner" style={bannerCss(me)}>
              <div onClick={() => avatarInp.current?.click()} title="Сменить аватар (GIF — анимированный)">
                <Avatar user={me} size="lg" />
              </div>
            </div>
            <div className="modal-pad" style={{ paddingTop: 58, ...(parseFill(me.profile_bg) || {}) }}>
              <div style={{ fontWeight: 700, fontSize: 19, color: me.name_color || undefined }}>{me.login}</div>
              <div className="muted" style={{ fontSize: 14, marginBottom: 10 }}>@{me.tag} · нажмите на аватар, чтобы сменить</div>
              <button className="btn ghost" style={{ marginBottom: 10 }} onClick={() => setProfilePreview(true)}>👁 Предпросмотр профиля</button>

              <div className="sec">
                <h3>Профиль</h3>
                <input className="field" placeholder="О себе (до 200 символов)" maxLength={200} defaultValue={me.bio}
                  onBlur={(e) => e.target.value !== me.bio && saveProfile({ bio: e.target.value })} />
                <h3>Баннер</h3>
                <div className="swatches">
                  {BANNERS.map((b, i) => <div key={i} className={`sw${me.banner === i && !me.banner_color && !me.banner_img ? " sel" : ""}`} style={{ background: b }} onClick={() => saveProfile({ banner: i, banner_color: null, banner_img: null })} />)}
                  <ColorDot value={me.banner_color?.startsWith?.("#") ? me.banner_color : null} title="Свой цвет баннера" onCommit={(v) => saveProfile({ banner_color: v, banner_img: null })} />
                </div>
                <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => meBannerInp.current?.click()}>🖼 Свой баннер (фото или GIF)</button>
                <h3>Рамка аватара</h3>
                <div className="swatches">
                  {FRAMES.map((f) => (
                    <div key={f.id} className={`sw${(me.frame || "none") === f.id ? " sel" : ""}`}
                      style={{ background: f.id === "none" ? "var(--bg)" : f.css }} title={f.name} onClick={() => saveProfile({ frame: f.id })} />
                  ))}
                  <ColorDot value={me.frame?.startsWith?.("#") ? me.frame : null} title="Свой цвет рамки" onCommit={(v) => saveProfile({ frame: v })} />
                </div>
                <h3>Цвета профиля</h3>
                <div className="swatches">
                  <div className="sw sw-auto" title="Сбросить" onClick={() => saveProfile({ profile_bg: null, name_color: null })}>авто</div>
                  <ColorDot value={me.profile_bg?.startsWith?.("#") ? me.profile_bg : null} fallback="#1d2733" title="Цвет фона профиля" onCommit={(v) => saveProfile({ profile_bg: v })} />
                  <ColorDot value={me.name_color} title="Цвет имени" onCommit={(v) => saveProfile({ name_color: v })} />
                </div>
                <h3>Градиент (2–3 цвета)</h3>
                <div className="swatches" style={{ alignItems: "center" }}>
                  <ColorDot value={(prefs.grad || {}).c1 || "#7b2ff7"} title="Цвет 1" onCommit={(v) => setPrefsAnd({ grad: { ...(prefs.grad || {}), c1: v } })} />
                  <ColorDot value={(prefs.grad || {}).c2 || "#f107a3"} title="Цвет 2" onCommit={(v) => setPrefsAnd({ grad: { ...(prefs.grad || {}), c2: v } })} />
                  <ColorDot value={(prefs.grad || {}).c3} fallback="#ffb86c" title="Цвет 3 (по желанию)" onCommit={(v) => setPrefsAnd({ grad: { ...(prefs.grad || {}), c3: v } })} />
                  {(prefs.grad || {}).c3 && <button className="chip" onClick={() => setPrefsAnd({ grad: { ...(prefs.grad || {}), c3: null } })}>убрать 3-й</button>}
                  {[["180deg", "↓"], ["90deg", "→"], ["135deg", "↘"], ["45deg", "↗"]].map(([a, l]) => (
                    <button key={a} className={`chip${((prefs.grad || {}).angle || "135deg") === a ? " chip-on" : ""}`} onClick={() => setPrefsAnd({ grad: { ...(prefs.grad || {}), angle: a } })}>{l}</button>
                  ))}
                </div>
                <h3>Господство цветов</h3>
                <div style={{ padding: "0 2px" }}>
                  {[["w1", "Цвет 1"], ["w2", "Цвет 2"], ...((prefs.grad || {}).c3 ? [["w3", "Цвет 3"]] : [])].map(([wk, label]) => (
                    <div key={wk} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span className="muted" style={{ fontSize: 12, width: 56 }}>{label}</span>
                      <input type="range" min={5} max={95} value={(prefs.grad || {})[wk] ?? 50}
                        onChange={(e) => setPrefsAnd({ grad: { ...(prefs.grad || {}), [wk]: +e.target.value } })} style={{ flex: 1 }} />
                    </div>
                  ))}
                </div>
                {(() => {
                  const g = prefs.grad || {};
                  const a = g.angle || "135deg";
                  const stops = [[g.c1 || "#7b2ff7", g.w1 ?? 50], [g.c2 || "#f107a3", g.w2 ?? 50], ...(g.c3 ? [[g.c3, g.w3 ?? 50]] : [])];
                  const totalW = stops.reduce((s2, [, w]) => s2 + w, 0);
                  let acc = 0;
                  const parts = stops.map(([c, w]) => { const pos = (acc + w / 2) / totalW * 100; acc += w; return `${c} ${Math.round(pos)}%`; });
                  const gcss = `linear-gradient(${a}, ${parts.join(", ")})`;
                  return (<>
                    <div style={{ height: 36, borderRadius: 10, background: gcss, margin: "6px 0 8px" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn ghost" style={{ flex: 1 }} onClick={() => saveProfile({ banner_color: gcss, banner_img: null })}>→ В баннер</button>
                      <button className="btn ghost" style={{ flex: 1 }} onClick={() => saveProfile({ profile_bg: gcss })}>→ В фон профиля</button>
                    </div>
                  </>);
                })()}

                <h3>Текстуры</h3>
                <div className="swatches" style={{ alignItems: "center" }}>
                  <span className="muted" style={{ fontSize: 12, width: 48 }}>цвета:</span>
                  <ColorDot value={(prefs.tex || {}).base || "#1d2733"} title="Фон текстуры" onCommit={(v) => setPrefsAnd({ tex: { ...(prefs.tex || {}), base: v } })} />
                  <ColorDot value={(prefs.tex || {}).color || "#3a4a5a"} title="Цвет узора" onCommit={(v) => setPrefsAnd({ tex: { ...(prefs.tex || {}), color: v } })} />
                </div>
                <div className="tex-grid">
                  {TEXTURES.map((tx) => {
                    const g = prefs.tex || {};
                    const st = textureCss(tx.id, g.color || "#3a4a5a", g.base || "#1d2733");
                    return (
                      <div key={tx.id} className={`tex-cell${(g.id === tx.id) ? " sel" : ""}`}
                        style={st} title={tx.name}
                        onClick={() => setPrefsAnd({ tex: { ...(prefs.tex || {}), id: tx.id } })} />
                    );
                  })}
                </div>
                {(prefs.tex || {}).id && (() => {
                  const g = prefs.tex || {};
                  const val = `tex:|${g.id}|${g.color || "#3a4a5a"}|${g.base || "#1d2733"}`;
                  return (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button className="btn ghost" style={{ flex: 1 }} onClick={() => saveProfile({ banner_color: val, banner_img: null })}>→ В баннер</button>
                      <button className="btn ghost" style={{ flex: 1 }} onClick={() => saveProfile({ profile_bg: val })}>→ В фон профиля</button>
                    </div>
                  );
                })()}
                <p className="stat">Первый кружок — фон карточки под баннером, второй — цвет имени. Это видят все, кто откроет ваш профиль.</p>
                <p className="stat">Чатов: {chats.length} · Регистрация: {me.created_at ? new Date(me.created_at).toLocaleDateString("ru-RU") : "—"}</p>
              </div>

              <div className="sec">
                <h3>Тема приложения</h3>
                <div className="theme-row">
                  {[["light", "Светлая"], ["dark", "Тёмная"], ["amoled", "AMOLED"]].map(([v, l]) => (
                    <button key={v} className={`btn${prefs.theme === v ? "" : " ghost"}`} style={{ padding: "8px 4px", fontSize: 13 }}
                      onClick={() => setPrefsAnd({ theme: v })}>{l}</button>
                  ))}
                </div>
                <h3>Акцентный цвет</h3>
                <div className="swatches">
                  {ACCENTS.map((c) => <div key={c} className={`sw${prefs.accent === c ? " sel" : ""}`} style={{ background: c }} onClick={() => setPrefsAnd({ accent: c })} />)}
                  <ColorDot value={prefs.accent} title="Свой цвет" onCommit={(v) => setPrefsAnd({ accent: v })} />
                </div>
                <h3>Цвет моих сообщений</h3>
                <div className="swatches">
                  <div className={`sw${!prefs.bubbleColor ? " sel" : ""} sw-auto`} onClick={() => setPrefsAnd({ bubbleColor: null })}>авто</div>
                  <ColorDot value={prefs.bubbleColor} fallback="#2B5278" title="Свой цвет пузырей" onCommit={(v) => setPrefsAnd({ bubbleColor: v })} />
                </div>
                <h3>Цвет ников в группах</h3>
                <div className="swatches">
                  <div className={`sw${!prefs.nickColor ? " sel" : ""} sw-auto`} onClick={() => setPrefsAnd({ nickColor: null })}>авто</div>
                  <ColorDot value={prefs.nickColor} title="Свой цвет ников" onCommit={(v) => setPrefsAnd({ nickColor: v })} />
                </div>
                <h3>Шрифт</h3>
                <div className="quick-chips">
                  {FONTS.map((f) => <button key={f.id} className={`chip${prefs.font === f.id ? " chip-on" : ""}`} style={{ fontFamily: f.css }} onClick={() => setPrefsAnd({ font: f.id })}>{f.name}</button>)}
                </div>
                <h3>Иконка приложения</h3>
                <div className="swatches">
                  {APP_ICONS.map((ic) => (
                    <img key={ic.id} src={ic.file} alt={ic.name} title={ic.name} className={`icon-pick${prefs.icon === ic.id ? " sel" : ""}`} onClick={() => setPrefsAnd({ icon: ic.id })} />
                  ))}
                </div>
                <button className="btn" style={{ marginTop: 10 }} onClick={() => { setShowProfile(false); setShowBuilder(true); }}>🎛 Конструктор интерфейса</button>
              </div>

              <div className="sec">
                <h3>Обои чата</h3>
                <div className="wp-grid">
                  {WALLPAPERS.map((w, i) => (
                    <div key={i} className={`wp${prefs.wallpaper === i ? " sel" : ""}`} style={{ background: w.css || "var(--bg)" }}
                      onClick={() => setPrefsAnd({ wallpaper: i })}>{w.name}</div>
                  ))}
                  <div className={`wp${prefs.wallpaper === "custom" ? " sel" : ""}`}
                    style={{ backgroundImage: prefs.customWallpaper ? `url(${prefs.customWallpaper})` : undefined, backgroundSize: "cover" }}
                    onClick={() => wpInp.current?.click()}>Своя 📁</div>
                </div>
                {prefs.wallpaper === "custom" && prefs.customWallpaper && (
                  <div className="theme-row" style={{ marginTop: 8 }}>
                    {[["cover", "Заполнить"], ["stretch", "Растянуть"], ["tile", "Плитка"]].map(([v, l]) => (
                      <button key={v} className={`btn${prefs.wpFit === v ? "" : " ghost"}`} style={{ padding: "7px 4px", fontSize: 12.5 }}
                        onClick={() => setPrefsAnd({ wpFit: v })}>{l}</button>
                    ))}
                  </div>
                )}
                <p className="stat">«Заполнить» — обои подгоняются без искажений (края могут обрезаться), «Растянуть» — точно по экрану, «Плитка» — повтор узора. Картинку можно кадрировать при выборе.</p>
                <h3>⌨️ Звук печати</h3>
                <div className="quick-chips">
                  {[[false, "Выкл"], ["classic", "Классика"], ["soft", "Мягкий"], ["mech", "Механика"], ["bubble", "Пузырёк"], ["retro", "Ретро"]].map(([k, l]) => (
                    <button key={String(k)} className={`chip${(prefs.typeSound === k || (k === "classic" && prefs.typeSound === true)) ? " chip-on" : ""}`}
                      onClick={() => { setPrefsAnd({ typeSound: k }); if (k) tickSound(k); }}>{l}</button>
                  ))}
                </div>
                <div className="toggle-row">
                  <span>💬 Звук новых сообщений</span>
                  <button className={`toggle${prefs.msgSound !== false ? " on" : ""}`} onClick={() => setPrefsAnd({ msgSound: prefs.msgSound === false })} />
                </div>
                <div className="toggle-row">
                  <span>🔔 Уведомления на устройство</span>
                  {notifPerm === "granted" ? <span style={{ color: "var(--accent)", fontSize: 13.5 }}>включены ✓</span>
                    : notifPerm === "denied" ? <span className="muted" style={{ fontSize: 12.5 }}>заблокированы в браузере</span>
                    : notifPerm === "unsupported" ? <span className="muted" style={{ fontSize: 12.5 }}>не поддерживаются</span>
                    : <button className="chip" onClick={async () => { try { setNotifPerm(await Notification.requestPermission()); } catch {} }}>Включить</button>}
                </div>
                <p className="stat">Уведомления и звуки работают, пока сайт открыт — в том числе в фоновой вкладке. Заглушённые чаты (🔕) не шумят.</p>
                <div className="toggle-row">
                  <span>📲 Push при закрытом браузере</span>
                  <button className="chip" onClick={enablePush}>Подключить</button>
                </div>
                <p className="stat">Push-уведомления через OneSignal приходят, даже когда мессенджер полностью закрыт. Нажмите «Подключить» и разрешите уведомления в браузере.</p>
              </div>

              <div className="sec">
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
              </div>

              {amAppAdmin && (
                <div className="sec">
                  <h3>📢 Админ мессенджера</h3>
                  <input className="field" placeholder="Текст объявления" maxLength={120} value={annText}
                    onChange={(e) => setAnnText(e.target.value)} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" style={{ flex: 1 }} disabled={!annText.trim()}
                      onClick={async () => {
                        const ts = new Date().toISOString();
                        const { error } = await supabase.from("app_settings")
                          .update({ announcement: annText.trim(), announcement_at: ts }).eq("id", 1);
                        if (error) notify(`Не удалось: ${error.message}`);
                        else { setAppSettings((st) => ({ ...st, announcement: annText.trim(), announcement_at: ts })); setAnnText(""); notify("Объявление опубликовано ✓"); }
                      }}>Опубликовать</button>
                    <button className="btn ghost" style={{ flex: 1 }}
                      onClick={async () => {
                        const { error } = await supabase.from("app_settings").update({ announcement: null }).eq("id", 1);
                        if (error) notify(`Не удалось: ${error.message}`);
                        else { setAppSettings((st) => ({ ...st, announcement: null })); notify("Объявление снято"); }
                      }}>Убрать</button>
                  </div>
                  <p className="stat">Объявление видят все; клик по нему открывает главный канал. Назначить главный канал: откройте канал → шапка → «📌 Сделать главным…».</p>
                </div>
              )}

              <div className="sec">
                <h3>🕶 Приватность</h3>
                <div className="toggle-row">
                  <span>Скрывать мой онлайн и «был(а)»</span>
                  <button className={`toggle${me.hide_online ? " on" : ""}`} onClick={() => saveProfile({ hide_online: !me.hide_online })} />
                </div>
                <div className="toggle-row">
                  <span>Скрытое прочтение (не слать галочки)</span>
                  <button className={`toggle${me.hide_read ? " on" : ""}`} onClick={() => saveProfile({ hide_read: !me.hide_read })} />
                </div>
                <p className="stat">Невидимка прячет ваш статус от других. Скрытое прочтение — собеседник не увидит вторую галочку, но и вы перестанете видеть прочтение в ответ.</p>
                <h3>🤖 Автоответчик</h3>
                <input className="field" placeholder="Текст автоответа (пусто — выключен)" maxLength={200} defaultValue={me.auto_reply || ""}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v !== (me.auto_reply || "")) saveProfile({ auto_reply: v || null }); }} />
                <p className="stat">Автоматически отвечает на первое сообщение в личке, не чаще раза в 5 минут на чат.</p>
                <h3>😎 Свои эмодзи для реакций</h3>
                <input ref={emojiPackInp} type="file" accept="image/*" hidden onChange={async (e) => {
                  const f = e.target.files[0]; e.target.value = "";
                  if (!f) return;
                  try {
                    const url = f.type === "image/gif" ? await uploadMedia(f, "gif", "image/gif") : await uploadMedia(await resizeToBlob(f, 96, 0.85), "png", "image/png");
                    setPrefsAnd({ emojiPacks: [...(prefs.emojiPacks || []), url].slice(-40) });
                  } catch { notify("Не удалось добавить."); }
                }} />
                <div className="swatches">
                  {(prefs.emojiPacks || []).map((url, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={url} alt="" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 6 }} />
                      <button className="st-del" style={{ opacity: 1 }} onClick={() => setPrefsAnd({ emojiPacks: prefs.emojiPacks.filter((_, k) => k !== i) })}>✕</button>
                    </div>
                  ))}
                  <button className="sticker-add" style={{ width: 32, height: 32, fontSize: 18 }} onClick={() => emojiPackInp.current?.click()}>＋</button>
                </div>
                <p className="stat">Свои картинки можно ставить как реакции (кнопка ＋ в меню реакций → вкладка ★).</p>
                <h3>🌐 Язык интерфейса</h3>
                <div className="quick-chips">
                  {LANGS.map((l) => <button key={l.id} className={`chip${(prefs.lang || "ru") === l.id ? " chip-on" : ""}`} onClick={() => setPrefsAnd({ lang: l.id })}>{l.name}</button>)}
                </div>
                <p className="stat">Перевод охватывает основные элементы интерфейса; будет дополняться.</p>
              </div>

              <div className="sec">
                <h3>Аккаунт</h3>
                <input className="field" placeholder="Отображаемое имя" maxLength={24} defaultValue={me.login}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== me.login) saveProfile({ login: v }); }} />
                <input className="field" placeholder="Сменить @тег" defaultValue={me.tag}
                  onBlur={async (e) => {
                    const t = e.target.value.trim().replace(/^@/, "");
                    if (!t || t === me.tag) return;
                    if (!/^[a-zA-Z0-9_]{3,20}$/.test(t)) { notify("Тег: 3–20 символов, латиница, цифры, _"); return; }
                    const { error } = await supabase.from("profiles").update({ tag: t }).eq("id", me.id);
                    if (error) { notify(error.code === "23505" ? "Этот тег уже занят." : `Не удалось: ${error.message}`); return; }
                    const next = { ...me, tag: t }; setMe(next); cacheProfiles([next]); notify("Тег обновлён ✓");
                  }} />
                <input className="field" type="password" placeholder="Новый пароль — введите и нажмите Enter"
                  onKeyDown={async (e) => {
                    if (e.key !== "Enter") return;
                    const v = e.target.value;
                    if (v.length < 6) { notify("Пароль — минимум 6 символов."); return; }
                    const { error } = await supabase.auth.updateUser({ password: v });
                    if (error) { notify(`Не удалось сменить пароль: ${error.message}`); return; }
                    e.target.value = ""; notify("Пароль изменён ✓");
                  }} />
                <p className="stat">Имя и @тег меняются сразу. Логин для входа остаётся прежним.</p>
                <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                  <a href="/privacy.html" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontSize: 13 }}>Политика конфиденциальности</a>
                  <a href="/terms.html" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontSize: 13 }}>Условия использования</a>
                </div>
                <h3>🔑 Резервный код</h3>
                <button className="btn ghost" onClick={async () => {
                  const code = Math.random().toString(36).slice(2, 8).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
                  const { error } = await supabase.rpc("set_recovery", { p_code: code });
                  if (error) { notify(`Не удалось: ${error.message}`); return; }
                  window.prompt("Сохраните этот код в надёжном месте. По нему можно сбросить пароль (показывается один раз):", code);
                  notify("Резервный код сохранён ✓");
                }}>Сгенерировать резервный код</button>
                <p className="stat">Понадобится, если забудете пароль. Запишите и храните отдельно — мы видим только его зашифрованный отпечаток.</p>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn ghost" onClick={exportData}>⬇ Экспорт данных</button>
                <button className="btn" style={{ background: "#D9534F" }} onClick={logout}>Выйти</button>
              </div>
              <button className="btn ghost" style={{ marginTop: 10, color: "#D9534F", width: "100%" }}
                onClick={async () => {
                  if (!window.confirm("Удалить аккаунт навсегда? Все ваши сообщения, чаты и темы будут удалены без возможности восстановления.")) return;
                  if (!window.confirm("Это действие необратимо. Точно удалить аккаунт?")) return;
                  const { error } = await supabase.rpc("delete_my_account");
                  if (error) { notify(`Не удалось удалить: ${error.message}`); return; }
                  await supabase.auth.signOut();
                  setMe(null); setPhase("auth");
                }}>🗑 Удалить аккаунт навсегда</button>
            </div>
          </div>
        </div>
      )}

      {/* ПРОФИЛЬ УЧАСТНИКА ГРУППЫ */}
      {showMember && (
        <div className="overlay" style={{ zIndex: 70 }} onClick={() => setShowMember(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="banner" style={bannerCss(showMember)}>
              <Avatar user={showMember} size="lg" />
            </div>
            <div className="modal-pad" style={{ paddingTop: 58, ...(parseFill(showMember.profile_bg) || {}) }}>
              <div style={{ fontWeight: 700, fontSize: 19, color: showMember.name_color || undefined }}>{showMember.login}</div>
              <div className="muted" style={{ fontSize: 14 }}>@{showMember.tag} · {lastSeenText(showMember)}</div>
              {showMember.bio && <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.4 }}>{showMember.bio}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn" style={{ flex: 1 }} onClick={() => { const u = showMember; setShowMember(null); setShowChatInfo(false); startChat(u); }}>✉️ Написать</button>
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => toggleFriend(showMember)}>
                  {friends.has(showMember.id) ? "✓ В друзьях" : "➕ В друзья"}
                </button>
              </div>
              <button className="btn ghost" style={{ marginTop: 8, color: "#D9534F" }} onClick={() => toggleBlock(showMember)}>
                {blocked.has(showMember.id) ? "Разблокировать" : "🚫 Заблокировать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* КТО ПРОЧИТАЛ */}
      {readersFor && (
        <div className="overlay" style={{ zIndex: 70 }} onClick={() => setReadersFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              <h3 style={{ marginTop: 0 }}>👁 Кто прочитал</h3>
              {activeMembers.filter((u) => u.id !== me.id).map((u) => {
                const ok = (reads[activeId]?.[u.id] || 0) >= new Date(readersFor.created_at).getTime();
                return (
                  <div className="member-row" key={u.id}>
                    <Avatar user={u} size="sm" online={isOn(u)} />
                    <span className="mr-name">{u.login}</span>
                    <span style={{ fontSize: 13, color: ok ? "var(--accent)" : "var(--muted)" }}>{ok ? "✓✓ прочитано" : "—"}</span>
                  </div>
                );
              })}
              <button className="btn ghost" onClick={() => setReadersFor(null)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* КТО ПОСТАВИЛ РЕАКЦИИ */}
      {reactViewer && (() => {
        const live = (messages[reactViewer.chat_id] || []).find((x) => x.id === reactViewer.id) || reactViewer;
        return (
          <div className="overlay" style={{ zIndex: 70 }} onClick={() => setReactViewer(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-pad">
                <h3 style={{ marginTop: 0 }}>👀 Реакции</h3>
                {Object.entries(live.reactions || {}).map(([emo, ids]) => (
                  <div key={emo} style={{ marginBottom: 8 }}>
                    {ids.map((uid) => {
                      const u = uid === me.id ? me : profiles[uid];
                      return (
                        <div className="member-row" key={uid} style={{ cursor: u && uid !== me.id ? "pointer" : "default" }}
                          onClick={() => u && uid !== me.id && setShowMember(u)}>
                          <span style={{ fontSize: 20, width: 26, textAlign: "center" }}>{emo}</span>
                          <Avatar user={u || { tag: "?" }} size="sm" online={isOn(u)} />
                          <span className="mr-name">{u?.login || "…"} {uid === me.id && <span className="muted">(вы)</span>}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {!Object.keys(live.reactions || {}).length && <p className="muted" style={{ textAlign: "center", padding: 12 }}>Реакций больше нет</p>}
                <button className="btn ghost" onClick={() => setReactViewer(null)}>Закрыть</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ПАПКИ */}
      {folderEdit && (
        <div className="overlay" onClick={() => setFolderEdit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              <h3 style={{ marginTop: 0 }}>{folderEdit === "new" ? "Новая папка" : "Папка"}</h3>
              <input className="field" placeholder="Название папки" maxLength={20} autoFocus
                value={folderName} onChange={(e) => setFolderName(e.target.value)} />
              <h3>Чаты в папке</h3>
              {sortedChats.map((c) => (
                <label className="member-row" key={c.id} style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={folderIds.has(c.id)}
                    onChange={(e) => setFolderIds((st) => { const n = new Set(st); e.target.checked ? n.add(c.id) : n.delete(c.id); return n; })} />
                  <span className="mr-name">{c.is_group ? "👥 " : ""}{chatTitle(c)}</span>
                </label>
              ))}
              <button className="btn" style={{ marginTop: 10 }} onClick={saveFolder}>Сохранить</button>
              {folderEdit !== "new" && <button className="btn" style={{ background: "#D9534F", marginTop: 8 }} onClick={deleteFolder}>Удалить папку</button>}
              <button className="btn ghost" onClick={() => setFolderEdit(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* МЕДИАТЕКА ЛИЧНОГО ЧАТА */}
      {mediaTab && !isGroup && activeChat && (
        <div className="overlay" style={{ zIndex: 71 }} onClick={() => setMediaTab(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <button className="icon-btn" onClick={() => setMediaTab(null)}>←</button>
                <h3 style={{ margin: 0 }}>{{ photo: "Фото", video: "Видео", file: "Файлы", audio: "Аудио", voice: "Голосовые", link: "Ссылки" }[mediaTab]}</h3>
              </div>
              {mediaTab === "photo" ? (
                <div className="media-grid">{mediaOf("photo").map((m) => <img key={m.id} src={m.content} alt="" onClick={() => setViewer(m.content)} />)}</div>
              ) : mediaOf(mediaTab).map((m) => (
                <div className="member-row" key={m.id}>
                  {mediaTab === "video" ? <video src={m.content} controls style={{ maxWidth: 170, borderRadius: 8 }} />
                    : mediaTab === "voice" ? <VoiceBubble msg={m} />
                    : mediaTab === "link" ? <a className="link-card" style={{ flex: 1, wordBreak: "break-all" }} href={findUrl(m.content)} target="_blank" rel="noreferrer">{findUrl(m.content)}</a>
                    : <a className="b-file" href={m.content} download={m.file_name} style={{ color: "var(--text)", textDecoration: "none", flex: 1 }}>
                        <div className="fi">{mediaTab === "audio" ? "🎧" : "📄"}</div>
                        <div><div style={{ fontWeight: 600, fontSize: 14 }}>{m.file_name}</div><div className="muted" style={{ fontSize: 12.5 }}>{fmtSize(m.file_size || 0)}</div></div>
                      </a>}
                  <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>{fmtTime(m.created_at)}</span>
                </div>
              ))}
              {mediaOf(mediaTab).length === 0 && <p className="muted" style={{ textAlign: "center", padding: 16 }}>Пока пусто</p>}
            </div>
          </div>
        </div>
      )}

      {/* ВВОД ПИН-КОДА */}
      {lockedOpen && (
        <div className="overlay" style={{ zIndex: 82 }} onClick={() => { setLockedOpen(null); setPinInput(""); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad" style={{ textAlign: "center" }}>
              <h3 style={{ marginTop: 0 }}>🔒 Чат защищён</h3>
              <p className="muted" style={{ fontSize: 14 }}>Введите пин-код, чтобы открыть.</p>
              <input className="field" type="password" inputMode="numeric" autoFocus
                style={{ textAlign: "center", fontSize: 22, letterSpacing: 6 }}
                value={pinInput} maxLength={6}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setPinInput(v);
                  if (v === (prefs.chatPins || {})[lockedOpen]) {
                    const id = lockedOpen;
                    setUnlocked((u) => ({ ...u, [id]: true }));
                    setLockedOpen(null); setPinInput("");
                    setUnlocked((u) => { openChatUnlocked(id); return { ...u, [id]: true }; });
                  }
                }} />
              <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => { setLockedOpen(null); setPinInput(""); }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* СПИСОК ЗАКРЕПЛЁННЫХ */}
      {showPinList && activeChat && (() => {
        const pins = activeChat.pinned_msgs?.length ? activeChat.pinned_msgs : (activeChat.pinned_msg ? [activeChat.pinned_msg] : []);
        return (
          <div className="overlay" style={{ zIndex: 72 }} onClick={() => setShowPinList(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-pad">
                <h3 style={{ marginTop: 0 }}>📌 Закреплённые ({pins.length})</h3>
                {pins.map((pid) => {
                  const pm = activeMsgs.find((m) => m.id === pid);
                  if (!pm) return null;
                  return (
                    <div className="member-row" key={pid} style={{ cursor: "pointer" }}
                      onClick={() => { setShowPinList(false); scrollToMsg(pm.id); }}>
                      <span className="mr-name"><b style={{ color: "var(--accent)" }}>{senderName(pm)}:</b> {previewOf(pm)}</span>
                      <button className="icon-btn" style={{ fontSize: 13 }} onClick={(e) => { e.stopPropagation(); pinMsg(pm); }}>✕</button>
                    </div>
                  );
                })}
                <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setShowPinList(false)}>Закрыть</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ПРЕДПРОСМОТР ПЕРЕД ОТПРАВКОЙ */}
      {pendingMedia && (
        <div className="overlay" style={{ zIndex: 75 }} onClick={() => setPendingMedia(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              <h3 style={{ marginTop: 0 }}>Отправить {pendingMedia.kind === "video" ? "видео" : "фото"}{pendingMedia.orig ? " (оригинал)" : ""}?</h3>
              {pendingMedia.kind === "video"
                ? <video src={pendingMedia.url} controls style={{ width: "100%", maxHeight: 320, borderRadius: 10 }} />
                : <img src={pendingMedia.url} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 10 }} />}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn" style={{ flex: 1 }} onClick={confirmSendMedia}>➤ Отправить</button>
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => setPendingMedia(null)}>Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ЗВОНОК */}
      <audio ref={remoteAudioRef} autoPlay />
      {call && callMin && (
        <div className="call-mini" onClick={() => setCallMin(false)}>
          <Avatar user={call.peer} size="sm" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{call.peer?.login}</div>
            <div style={{ fontSize: 12, color: "var(--accent)" }}>
              {call.status === "active"
                ? (() => { const d = Math.floor((Date.now() - call.startedAt) / 1000); return `${String(Math.floor(d/60)).padStart(2,"0")}:${String(d%60).padStart(2,"0")}`; })()
                : "Звонок…"}
            </div>
          </div>
          <button className="call-mini-btn" onClick={(e) => { e.stopPropagation(); toggleCallMute(); }}>{callMuted ? "🔇" : "🎙"}</button>
          <button className="call-mini-btn hang" onClick={(e) => { e.stopPropagation(); endCall(true); }}>📵</button>
        </div>
      )}
      {call && !callMin && (
        <div className="call-screen" style={bannerCss(call.peer)}>
          <div className="call-shade" />
          {call.video && call.status === "active" && (
            <video ref={remoteVideoRef} autoPlay playsInline className="call-remote" />
          )}
          <button className="call-minimize" onClick={() => setCallMin(true)} title="Свернуть звонок">⌄</button>
          <div className="call-top">
            <Avatar user={call.peer} size="lg" />
            <div className="call-name">{call.peer?.login}</div>
            <div className="call-status">
              {call.status === "ringing"
                ? (call.dir === "in" ? `Входящий ${call.video ? "видео" : "аудио"}звонок…` : "Звоним…")
                : !["connected", "completed"].includes(callNet)
                  ? `Соединяем… (${callNet || "старт"})`
                  : (() => { const d = Math.floor((Date.now() - call.startedAt) / 1000); return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`; })()}
            </div>
            {!TURN_URLS.length && (
              <div className="call-warn">⚠️ TURN-сервер не подключён: между разными сетями связь не встанет.<br />Добавьте VITE_TURN_* в Vercel и сделайте Redeploy (см. ИНСТРУКЦИЯ-ЗВОНКИ.md)</div>
            )}
            {TURN_URLS.length > 0 && callNet && !["connected", "completed"].includes(callNet) && callDiag.cands > 4 && callDiag.relay === 0 && (
              <div className="call-warn">⚠️ TURN-ключи заданы, но ретранслятор не отвечает (нет relay-кандидатов).<br />Скорее всего ключи устарели — обновите их в кабинете Metered.</div>
            )}
            <div className="call-diag">
              сеть: {callNet || "—"} · ICE: {callDiag.ice || "—"} · сбор: {callDiag.gather || "—"} · кандидатов: {callDiag.cands} (через TURN: {callDiag.relay}) · TURN-серверов: {callDiag.turn}
            </div>
          </div>
          {call.video && <video ref={localVideoRef} autoPlay playsInline muted className="call-local" />}
          <div className="call-btns">
            {call.status === "active" && (
              <div className="call-btn-wrap">
                <button className={`call-btn${callMuted ? " active-w" : ""}`} onClick={toggleCallMute}>{callMuted ? CallIc.micOff : CallIc.mic}</button>
                <span className="call-lbl">звук</span>
              </div>
            )}
            {call.status === "active" && call.video && (
              <div className="call-btn-wrap">
                <button className={`call-btn${callCamOff ? " active-w" : ""}`} onClick={toggleCallCam}>{callCamOff ? CallIc.camOff : CallIc.cam}</button>
                <span className="call-lbl">камера</span>
              </div>
            )}
            {call.dir === "in" && call.status === "ringing" && (
              <div className="call-btn-wrap">
                <button className="call-btn accept" onClick={acceptCall}>{CallIc.phone}</button>
                <span className="call-lbl">ответить</span>
              </div>
            )}
            <div className="call-btn-wrap">
              <button className="call-btn hang" onClick={() => endCall(true)}><span style={{ display: "inline-flex", transform: "rotate(135deg)" }}>{CallIc.phone}</span></button>
              <span className="call-lbl">завершить</span>
            </div>
          </div>
        </div>
      )}

      {/* КАДРИРОВАНИЕ АВАТАРА */}
      {crop && <CropModal src={crop.src}
        aspect={crop.kind.includes("Banner") ? 4.4 : crop.kind === "wallpaper" ? 0.62 : 1}
        round={crop.kind === "me" || crop.kind === "group"}
        onCancel={() => setCrop(null)} onSave={cropDone} />}

      {/* ПРЕДПРОСМОТР ПРОФИЛЯ (как видят другие) */}
      {profilePreview && (
        <div className="overlay" style={{ zIndex: 78 }} onClick={() => setProfilePreview(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="banner" style={bannerCss(me)}>
              <Avatar user={me} size="lg" />
            </div>
            <div className="modal-pad" style={{ paddingTop: 58, ...(parseFill(me.profile_bg) || {}) }}>
              <div style={{ fontWeight: 700, fontSize: 19, color: me.name_color || undefined }}>{me.login}{me.status_emoji ? ` ${me.status_emoji}` : ""}</div>
              <div className="muted" style={{ fontSize: 14 }}>@{me.tag} · {lastSeenText(me)}</div>
              {me.bio && <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.4 }}>{me.bio}</p>}
              <p className="stat" style={{ marginTop: 10 }}>В мессенджере с {me.created_at ? new Date(me.created_at).toLocaleDateString("ru-RU") : "—"}</p>
              <p className="stat">Так ваш профиль видят другие пользователи.</p>
              <button className="btn" style={{ marginTop: 8 }} onClick={() => setProfilePreview(false)}>Закрыть предпросмотр</button>
            </div>
          </div>
        </div>
      )}

      {/* МАРКЕТ ТЕМ — мини-приложение */}
      <input ref={themeMediaInp} type="file" accept="image/*,video/*" hidden
        onChange={(e) => { addThemeMedia(e.target.files[0]); e.target.value = ""; }} />
      {showMarket && (
        <div className="overlay" style={{ zIndex: 72 }} onClick={() => setShowMarket(false)}>
          <div className="modal market-app fullscreen" onClick={(e) => e.stopPropagation()}>

            {/* === Публикация === */}
            {publishForm ? (
              <div className="modal-pad">
                <div className="market-head">
                  <button className="icon-btn" onClick={() => setPublishForm(null)}>←</button>
                  <h3 style={{ margin: 0 }}>Новая сборка</h3>
                </div>
                <input className="field" placeholder="Название" maxLength={40}
                  value={publishForm.title} onChange={(e) => setPublishForm((f) => ({ ...f, title: e.target.value }))} />
                <textarea className="field" placeholder="Описание сборки" maxLength={300} rows={3}
                  value={publishForm.description} onChange={(e) => setPublishForm((f) => ({ ...f, description: e.target.value }))} />
                <h3>Для какой платформы</h3>
                <div className="theme-row">
                  {[["both", "💻📱 Все"], ["pc", "💻 ПК"], ["mobile", "📱 Телефон"]].map(([v, l]) => (
                    <button key={v} className={`btn${publishForm.platform === v ? "" : " ghost"}`} style={{ padding: "8px 4px", fontSize: 13 }}
                      onClick={() => setPublishForm((f) => ({ ...f, platform: v }))}>{l}</button>
                  ))}
                </div>
                <input className="field" placeholder="Теги через запятую: тёмная, неон, минимализм"
                  value={publishForm.tags} onChange={(e) => setPublishForm((f) => ({ ...f, tags: e.target.value }))} />
                <h3>Фото и видео <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(первое — обложка)</span></h3>
                <div className="media-grid">
                  {publishForm.media.map((m, idx) => (
                    <div key={idx} className="pub-media">
                      {m.type === "video" ? <video src={m.url} /> : <img src={m.url} alt="" />}
                      {idx === 0 && <span className="cover-badge">обложка</span>}
                      <button className="pm-del" onClick={() => setPublishForm((f) => ({ ...f, media: f.media.filter((_, k) => k !== idx) }))}>✕</button>
                    </div>
                  ))}
                  <button className="pub-add" onClick={() => themeMediaInp.current?.click()}>＋</button>
                </div>
                <p className="stat">Публикуется ваш текущий вид мессенджера: цвета, шрифт, обои, иконки кнопок и градиент.</p>
                <button className="btn" onClick={submitPublish}>Опубликовать сборку</button>
                <button className="btn ghost" onClick={() => setPublishForm(null)}>Отмена</button>
              </div>

            /* === Страница темы === */
            ) : themeOpen ? (() => {
              const t = themeOpen;
              const media = t.media || [];
              return (
                <div className="modal-pad">
                  <div className="market-head">
                    <button className="icon-btn" onClick={() => setThemeOpen(null)}>←</button>
                    <h3 style={{ margin: 0, flex: 1 }}>{t.title}</h3>
                    {(t.author === me.id || amAppAdmin) && <button className="icon-btn" style={{ color: "#E26060" }} onClick={() => deleteTheme(t)}>🗑</button>}
                  </div>
                  {media.length > 0 && (
                    <div className="theme-gallery">
                      {media.map((m, idx) => m.type === "video"
                        ? <video key={idx} src={m.url} controls playsInline />
                        : <img key={idx} src={m.url} alt="" onClick={() => setViewer(m.url)} />)}
                    </div>
                  )}
                  <div className="member-row" style={{ padding: "8px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }} onClick={() => openAuthor(t)}>
                      <Avatar user={profiles[t.author] || { tag: t.author_login || "?" }} size="sm" />
                      <span className="mr-name">от <b>{t.author_login || "?"}</b><div className="muted" style={{ fontSize: 12 }}>открыть профиль →</div></span>
                    </div>
                    {t.author !== me.id && (
                      <button className={`chip${mySubs.has(t.author) ? " chip-on" : ""}`} onClick={() => toggleSub(t.author, t.author_login)}>
                        {mySubs.has(t.author) ? "✓ Вы подписаны" : "+ Подписаться"}
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 6 }}>
                    <button className="chip" onClick={() => toggleLike(t)} style={myLikes.has(t.id) ? { background: "#e0245e", color: "#fff" } : {}}>
                      {myLikes.has(t.id) ? "❤" : "🤍"} {t.likes || 0}
                    </button>
                    <span className="muted" style={{ fontSize: 13 }}>⬇ {t.downloads} установок</span>
                  </div>
                  <span className="plat-chip">{platLabel[t.platform] || platLabel.both}</span>
                  {t.description && <p style={{ fontSize: 14.5, lineHeight: 1.45, marginTop: 10 }}>{t.description}</p>}
                  {(t.tags || []).length > 0 && (
                    <div className="quick-chips" style={{ marginTop: 8 }}>
                      {t.tags.map((tg) => <span key={tg} className="chip" style={{ cursor: "default" }}>#{tg}</span>)}
                    </div>
                  )}
                  <button className="btn" style={{ marginTop: 14 }} onClick={() => applyTheme(t)}>⬇ Установить тему</button>
                </div>
              );
            })()

            /* === Витрина === */
            : (
              <div className="modal-pad">
                <div className="market-head">
                  <h3 style={{ margin: 0, flex: 1 }}>🛍 Маркет тем</h3>
                  <button className="chip chip-on" onClick={startPublish}>＋ Выложить</button>
                </div>
                <div className="folder-tabs" style={{ padding: "0 0 8px" }}>
                  {[["all", "Все"], ["pc", "💻 ПК"], ["mobile", "📱 Телефон"]].map(([v, l]) => (
                    <button key={v} className={`ftab${marketTab === v ? " on" : ""}`} onClick={() => setMarketTab(v)}>{l}</button>
                  ))}
                </div>
                <div className="folder-tabs" style={{ padding: "0 0 8px" }}>
                  {[["likes", "🔥 Популярные"], ["new", "🆕 Новые"], ["downloads", "⬇ Загружаемые"]].map(([v, l]) => (
                    <button key={v} className={`ftab${marketSort === v ? " on" : ""}`} onClick={() => setMarketSort(v)}>{l}</button>
                  ))}
                </div>
                <input className="field" placeholder="Поиск по названию и тегам…" value={marketQuery} onChange={(e) => setMarketQuery(e.target.value)} />
                {themes === null ? <p className="muted" style={{ textAlign: "center", padding: 14 }}>Загрузка…</p>
                  : (() => {
                    const q = marketQuery.trim().toLowerCase();
                    const list = (themes || []).filter((t) =>
                      (marketTab === "all" || t.platform === marketTab || t.platform === "both")
                      && (!q || t.title.toLowerCase().includes(q) || (t.tags || []).some((tg) => tg.toLowerCase().includes(q))));
                    if (!list.length) return <p className="muted" style={{ textAlign: "center", padding: 14 }}>Ничего не найдено. Будьте первым — нажмите «Выложить»!</p>;
                    return (
                      <div className="theme-cards">
                        {list.map((t) => {
                          const cover = (t.media || [])[0];
                          const d = t.data || {};
                          const g = d.grad || {};
                          const fallback = g.c1 ? `linear-gradient(135deg, ${g.c1}, ${g.c2 || g.c1}${g.c3 ? `, ${g.c3}` : ""})` : (d.uiVars?.side || (d.theme === "light" ? "#F5F7FA" : "#0E1621"));
                          return (
                            <div className="theme-card" key={t.id} onClick={() => setThemeOpen(t)}>
                              <div className="tc-cover" style={cover ? {} : { background: fallback }}>
                                {cover && (cover.type === "video"
                                  ? <video src={cover.url} muted />
                                  : <img src={cover.url} alt="" />)}
                                <span className="tc-plat">{platLabel[t.platform] || platLabel.both}</span>
                              </div>
                              <div className="tc-info">
                                <b>{t.title}</b>
                                <div className="muted" style={{ fontSize: 12 }}>{t.author_login || "?"} · ⬇ {t.downloads} · ❤ {t.likes || 0}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setShowMarket(false)}>Закрыть</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ЖАЛОБЫ (админ) */}
      {showReports && (
        <div className="overlay" style={{ zIndex: 72 }} onClick={() => setShowReports(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              <h3 style={{ marginTop: 0 }}>🚩 Жалобы</h3>
              {reports === null ? <p className="muted" style={{ textAlign: "center", padding: 14 }}>Загрузка…</p>
                : !reports.length ? <p className="muted" style={{ textAlign: "center", padding: 14 }}>Жалоб нет 🎉</p>
                : reports.map((r) => (
                  <div key={r.id} className={`report-card${r.status === "done" ? " done" : ""}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <b style={{ fontSize: 13.5 }}>от {r.reporter_login || "?"}</b>
                      <span className="muted" style={{ fontSize: 11.5 }}>{new Date(r.created_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {r.reason && <div style={{ fontSize: 13.5, marginTop: 4 }}>Причина: {r.reason}</div>}
                    <div className="muted" style={{ fontSize: 13, marginTop: 4, fontStyle: "italic" }}>«{r.text_snapshot}»</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      {r.target_user && (
                        <button className="chip" onClick={async () => {
                          const { data } = await supabase.from("profiles").select("*").eq("id", r.target_user).maybeSingle();
                          if (data) { cacheProfiles([data]); setShowReports(false); setShowAdmin(true); setAdminTarget(data); }
                        }}>К нарушителю →</button>
                      )}
                      {r.status !== "done" && <button className="chip chip-on" onClick={() => resolveReport(r)}>✓ Решено</button>}
                    </div>
                  </div>
                ))}
              <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setShowReports(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* АДМИН-ПАНЕЛЬ */}
      {showAdmin && (
        <div className="overlay" style={{ zIndex: 72 }} onClick={() => setShowAdmin(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              {!adminTarget ? (<>
                <h3 style={{ marginTop: 0 }}>🛡 {amAppAdmin ? "Админ-панель" : "Панель модератора"}</h3>
                <h3>Пользователи</h3>
                <input className="field" placeholder="Поиск по @тегу или имени…" value={adminQuery} onChange={(e) => setAdminQuery(e.target.value)} />
                {(adminResults || []).map((u) => (
                  <div className="member-row" key={u.id} style={{ cursor: "pointer" }} onClick={() => setAdminTarget(u)}>
                    <Avatar user={u} size="sm" online={isOn(u)} />
                    <span className="mr-name">{u.login} <span className="muted">@{u.tag}</span></span>
                    <span>{u.is_app_admin ? "👑" : u.is_moderator ? "★" : ""} {u.restrictions?.banned ? "🚫" : Object.keys(u.restrictions || {}).length ? "⚠️" : ""}</span>
                  </div>
                ))}
                <h3>Группы и каналы ({adminChats.length})</h3>
                {adminChats.map((c) => (
                  <div className="member-row" key={c.id}>
                    <span style={{ fontSize: 17 }}>{c.is_channel ? "📣" : "👥"}</span>
                    <span className="mr-name">{c.title}
                      <div className="muted" style={{ fontSize: 12 }}>владелец: {c.owner_login || "?"} · {c.members} уч.</div>
                    </span>
                    <button className="icon-btn" title="Удалить безвозвратно" style={{ color: "#E26060" }} onClick={() => adminDeleteChat(c)}>🗑</button>
                  </div>
                ))}
                <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setShowAdmin(false)}>Закрыть</button>
              </>) : (<>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <button className="icon-btn" onClick={() => setAdminTarget(null)}>←</button>
                  <Avatar user={adminTarget} size="sm" />
                  <h3 style={{ margin: 0 }}>{adminTarget.login} <span className="muted">@{adminTarget.tag}</span></h3>
                </div>
                {[["banned", "🚫 Полная блокировка (бан)"],
                  ["no_messages", "💬 Запрет отправки сообщений"],
                  ["no_media", "🖼 Запрет фото, видео и файлов"],
                  ["no_calls", "📞 Запрет звонков"],
                  ["no_create", "👥 Запрет создания групп и каналов"]].map(([k, label]) => (
                  <div className="toggle-row" key={k}>
                    <span>{label}</span>
                    <button className={`toggle${adminTarget.restrictions?.[k] ? " on" : ""}`}
                      onClick={() => setRestriction(adminTarget, k, !adminTarget.restrictions?.[k])} />
                  </div>
                ))}
                <p className="stat">Запреты сообщений, медиа и создания групп работают на уровне базы — обойти их нельзя. Запрет звонков действует в приложении. Бан скрывает мессенджер при следующем входе пользователя.</p>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="btn ghost" style={{ flex: 1 }} onClick={() => warnUser(adminTarget)}>⚠️ Предупредить{adminTarget.warnings ? ` (${adminTarget.warnings})` : ""}</button>
                  {amAppAdmin && <button className={`btn${adminTarget.is_moderator ? "" : " ghost"}`} style={{ flex: 1 }} onClick={() => toggleModerator(adminTarget)}>{adminTarget.is_moderator ? "★ Снять модератора" : "☆ Сделать модератором"}</button>}
                </div>
                <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setAdminTarget(null)}>← Назад</button>
              </>)}
            </div>
          </div>
        </div>
      )}

      {/* СТАТИСТИКА (только админ) */}
      {showStats && (
        <div className="overlay" style={{ zIndex: 72 }} onClick={() => setShowStats(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              {!statUser ? (<>
                <h3 style={{ marginTop: 0 }}>📊 Статистика мессенджера</h3>
                {!stats ? <p className="muted" style={{ padding: 14, textAlign: "center" }}>Загрузка…</p> : (<>
                  <div className="stat-grid">
                    <div className="stat-card"><b>{stats.users}</b><span>пользователей</span></div>
                    <div className="stat-card"><b>{onlineIds.size}</b><span>сейчас онлайн</span></div>
                    <div className="stat-card"><b>{stats.messages}</b><span>сообщений</span></div>
                    <div className="stat-card"><b>{stats.directs}</b><span>личных чатов</span></div>
                    <div className="stat-card"><b>{stats.groups}</b><span>групп</span></div>
                    <div className="stat-card"><b>{stats.channels}</b><span>каналов</span></div>
                  </div>
                  <h3>Сообщения по дням (14 дней)</h3>
                  <Bars data={stats.by_day} lk="d" vk="c" />
                  <h3>Активность по часам суток (МСК)</h3>
                  <Bars data={stats.by_hour} lk="h" vk="c" />
                  <p className="stat">Часы активности — оценка «когда обычно онлайн» по времени отправки сообщений. Отдельный журнал входов пока не ведётся.</p>
                  <h3>Новые пользователи (14 дней)</h3>
                  <Bars data={stats.new_users} lk="d" vk="c" />
                  <h3>Топ-10 по сообщениям</h3>
                  {(stats.top_users || []).map((u, i) => (
                    <div className="member-row" key={u.id} style={{ cursor: "pointer" }} onClick={() => loadUserStats(u)}>
                      <span className="muted" style={{ width: 20 }}>{i + 1}.</span>
                      <span className="mr-name"><b>{u.login}</b> <span className="muted">@{u.tag}</span></span>
                      <span style={{ color: "var(--accent)", fontWeight: 600 }}>{u.c}</span>
                    </div>
                  ))}
                  <h3>Найти пользователя</h3>
                  <input className="field" placeholder="Поиск по @тегу или имени…" value={statQuery} onChange={(e) => setStatQuery(e.target.value)} />
                  {(statResults || []).map((u) => (
                    <div className="member-row" key={u.id} style={{ cursor: "pointer" }} onClick={() => loadUserStats(u)}>
                      <Avatar user={u} size="sm" online={isOn(u)} />
                      <span className="mr-name">{u.login} <span className="muted">@{u.tag}</span></span>
                    </div>
                  ))}
                </>)}
                <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setShowStats(false)}>Закрыть</button>
              </>) : (<>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <button className="icon-btn" onClick={() => { if (amAppAdmin) { setStatUser(null); setStatUserData(null); } else setShowStats(false); }}>{amAppAdmin ? "←" : "✕"}</button>
                  <h3 style={{ margin: 0 }}>{!amAppAdmin ? "📊 Моя статистика" : <>Статистика: {statUser.login} <span className="muted">@{statUser.tag}</span></>}</h3>
                </div>
                {!statUserData ? <p className="muted" style={{ padding: 14, textAlign: "center" }}>Загрузка…</p> : (<>
                  <div className="stat-grid">
                    <div className="stat-card"><b>{statUserData.total}</b><span>сообщений</span></div>
                    <div className="stat-card"><b>{statUserData.avg_len}</b><span>симв. в среднем</span></div>
                    <div className="stat-card"><b>{statUserData.groups}</b><span>групп/каналов</span></div>
                    <div className="stat-card"><b>{statUser.last_seen ? new Date(statUser.last_seen).toLocaleDateString("ru-RU") : "—"}</b><span>был(а)</span></div>
                  </div>
                  <h3>Сообщения по дням (14 дней)</h3>
                  <Bars data={statUserData.by_day} lk="d" vk="c" />
                  <h3>Когда обычно активен (часы, МСК)</h3>
                  <Bars data={statUserData.by_hour} lk="h" vk="c" />
                  <h3>Типы сообщений</h3>
                  {(statUserData.types || []).map((t) => (
                    <div className="member-row" key={t.type}>
                      <span className="mr-name">{({ text: "💬 Текст", photo: "📷 Фото", video: "🎬 Видео", file: "📎 Файлы", voice: "🎤 Голосовые" })[t.type] || t.type}</span>
                      <span style={{ color: "var(--accent)", fontWeight: 600 }}>{t.c}</span>
                    </div>
                  ))}
                </>)}
                <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => { if (amAppAdmin) { setStatUser(null); setStatUserData(null); } else setShowStats(false); }}>{amAppAdmin ? "← Назад к общей" : "Закрыть"}</button>
              </>)}
            </div>
          </div>
        </div>
      )}

      {/* КОНСТРУКТОР ИНТЕРФЕЙСА */}
      <input ref={builderImgInp} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files[0]; e.target.value = "";
        const id = builderImgFor.current;
        if (!f || !id) return;
        try {
          if (f.type === "image/gif") {
            if (f.size > 300 * 1024) { notify("GIF для кнопки — до 300 КБ."); return; }
            setBtnIcon(id, { type: "img", value: await fileToB64(f) });
          } else {
            setBtnIcon(id, { type: "img", value: await blobToB64(await resizeToBlob(f, 96, 0.85)) });
          }
        } catch { notify("Не удалось обработать картинку."); }
      }} />
      {showBuilder && (
        <div className="overlay" style={{ zIndex: 72 }} onClick={() => setShowBuilder(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              <h3 style={{ marginTop: 0 }}>🎛 Конструктор интерфейса</h3>

              <p className="stat" style={{ marginTop: 0 }}>Предпросмотр — наведите или нажмите на кнопки, чтобы увидеть анимацию:</p>
              <div className="bld-preview">
                <div className="bp-head">
                  <button className="icon-btn">{btnIcon("back", "←")}</button>
                  <b style={{ fontSize: 14 }}>Аня</b>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                    <button className="icon-btn">{btnIcon("call", "📞")}</button>
                    <button className="icon-btn">{btnIcon("search", "🔍")}</button>
                  </span>
                </div>
                <div className="bp-msgs">
                  <div className="bubble in" style={{ maxWidth: "75%" }}>Привет! Как тебе новый вид? <span className="b-meta">12:00</span></div>
                  <div className="bubble out" style={{ maxWidth: "75%", marginLeft: "auto" }}>Сейчас настрою 🎨 <span className="b-meta">12:01</span></div>
                </div>
                <div className="bp-comp">
                  <button className="icon-btn">{btnIcon("attach", "📎")}</button>
                  <button className="icon-btn">{btnIcon("emoji", "😊")}</button>
                  <span className="bp-input muted">Сообщение</span>
                  <button className="send-btn" style={{ width: 34, height: 34, fontSize: 14 }}>{btnIcon("send", "➤")}</button>
                </div>
              </div>

              <div className="sec">
                <h3>Цвета панелей</h3>
                <div className="swatches" style={{ alignItems: "center" }}>
                  <ColorDot value={prefs.uiVars?.bg} fallback="#17212B" title="Фон чата" onCommit={(v) => setPrefsAnd({ uiVars: { ...(prefs.uiVars || {}), bg: v } })} />
                  <ColorDot value={prefs.uiVars?.side} fallback="#0E1621" title="Боковая панель и шапки" onCommit={(v) => setPrefsAnd({ uiVars: { ...(prefs.uiVars || {}), side: v } })} />
                  <ColorDot value={prefs.uiVars?.input} fallback="#242F3D" title="Поля и блоки" onCommit={(v) => setPrefsAnd({ uiVars: { ...(prefs.uiVars || {}), input: v } })} />
                  <ColorDot value={prefs.uiVars?.line} fallback="#101921" title="Линии и разделители" onCommit={(v) => setPrefsAnd({ uiVars: { ...(prefs.uiVars || {}), line: v } })} />
                  <button className="chip" onClick={() => setPrefsAnd({ uiVars: {} })}>↺ Сбросить цвета</button>
                </div>
                <p className="stat">Слева направо: фон чата · панели и шапки · поля · разделители.</p>
                <h3>Фон списка чатов</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn ghost" style={{ flex: 1 }} onClick={() => sideBgInp.current?.click()}>🖼 Своё изображение</button>
                  {prefs.sideBg && <button className="btn ghost" style={{ flex: 1 }} onClick={() => setPrefsAnd({ sideBg: null })}>Убрать</button>}
                </div>
              </div>

              <div className="sec">
                <h3>Кнопки: эмодзи, картинки и анимации</h3>
                {[["menu", "☰", "Меню"], ["back", "←", "Назад"], ["search", "🔍", "Поиск"], ["call", "📞", "Звонок"], ["video", "🎥", "Видеозвонок"], ["fav", "⭐", "Избранное"], ["group", "👥", "Группы"], ["attach", "📎", "Скрепка"], ["emoji", "😊", "Эмодзи"], ["sticker", "🌟", "Стикеры"], ["send", "➤", "Отправить"]].map(([id, fb, label]) => (
                  <div key={id} className="bld-row">
                    <button className="icon-btn" style={{ fontSize: 18 }}>{btnIcon(id, fb)}</button>
                    <span className="mr-name">{label}</span>
                    <button className="chip" title="Поставить эмодзи" onClick={() => setBuilderEmoji(id)}>😀</button>
                    <button className="chip" title="Поставить картинку или GIF" onClick={() => { builderImgFor.current = id; builderImgInp.current?.click(); }}>🖼</button>
                    <button className="chip" title="Сбросить" onClick={() => resetBtn(id)}>↺</button>
                    <div className="bld-anims">
                      {[["none", "—"], ["pulse", "Пульс"], ["spin", "Вращение"], ["bounce", "Прыжок"], ["shake", "Тряска"]].map(([a, al]) => (
                        <button key={a} className={`chip${((prefs.btnAnim || {})[id] || "none") === a ? " chip-on" : ""}`} onClick={() => setBtnAnim(id, a)}>{al}</button>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="stat">Анимация проигрывается при наведении мыши и при нажатии (на телефоне — при касании).</p>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => setPrefsAnd({ uiVars: {}, btnIcons: {}, btnAnim: {} })}>↺ Сбросить всё</button>
                <button className="btn" style={{ flex: 1 }} onClick={() => setShowBuilder(false)}>Готово</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ЭМОДЗИ ДЛЯ КНОПКИ */}
      {builderEmoji && (
        <div className="overlay" style={{ zIndex: 80 }} onClick={() => setBuilderEmoji(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad">
              <h3 style={{ marginTop: 0 }}>Эмодзи для кнопки</h3>
              <div className="emoji-tabs">
                {Object.keys(EMOJI).map((t) => <button key={t} className={t === emojiTab ? "sel" : ""} onClick={() => setEmojiTab(t)}>{t}</button>)}
              </div>
              <div className="emoji-grid">
                {EMOJI[emojiTab].map((e) => <button key={e} onClick={() => { setBtnIcon(builderEmoji, { type: "emoji", value: e }); setBuilderEmoji(null); }}>{e}</button>)}
              </div>
              <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setBuilderEmoji(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {forwarding && <ForwardPicker />}

      {/* ОНБОРДИНГ */}
      {showOnboard && (
        <div className="overlay" style={{ zIndex: 95 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pad" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 6 }}>👋</div>
              <h3 style={{ marginTop: 0 }}>Добро пожаловать!</h3>
              <div style={{ textAlign: "left", fontSize: 14.5, lineHeight: 1.7, margin: "10px 0" }}>
                <p>🔍 <b>Поиск сверху</b> — найдите друзей по @тегу или каналы по названию.</p>
                <p>☰ <b>Меню слева</b> — группы, каналы, контакты, звонки, настройки.</p>
                <p>🎛 <b>Конструктор</b> — настройте мессенджер под себя: цвета, шрифты, иконки.</p>
                <p>🛍 <b>Маркет тем</b> — установите готовое оформление или выложите своё.</p>
                <p>⚙️ Не забудьте задать <b>резервный код</b> в настройках — пригодится, если забудете пароль.</p>
              </div>
              <button className="btn" onClick={async () => {
                setShowOnboard(false);
                await supabase.from("profiles").update({ onboarded: true }).eq("id", me.id);
                setMe((m) => ({ ...m, onboarded: true }));
              }}>Начать общение</button>
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
