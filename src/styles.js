export const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Rubik:wght@400;600&family=Comfortaa:wght@400;600&family=JetBrains+Mono:wght@400;600&display=swap');
* { box-sizing: border-box; margin: 0; }
.tg { height: 100vh; display: flex; font-family: var(--app-font, -apple-system, 'Segoe UI', Roboto, sans-serif);
  background: var(--bg); color: var(--text); overflow: hidden; }
.tg[data-theme="dark"]  { --bg:#17212B; --side:#0E1621; --bub-out:color-mix(in srgb, var(--accent) 42%, #121b24); --bub-in:#182533; --text:#fff; --muted:#8DA8C2; --line:#101921; --hover:#202B36; --input:#242F3D; }
.tg[data-theme="amoled"]{ --bg:#000; --side:#000; --bub-out:color-mix(in srgb, var(--accent) 40%, #000); --bub-in:#111; --text:#fff; --muted:#7A8A9A; --line:#1a1a1a; --hover:#151515; --input:#161616; }
.tg[data-theme="light"] { --bg:#fff; --side:#F5F7FA; --bub-out:color-mix(in srgb, var(--accent) 24%, #fff); --bub-in:#F0F2F5; --text:#1a2230; --muted:#70808F; --line:#E4E8EC; --hover:#EDF1F5; --input:#EDF1F5; }

button { transition: transform 90ms ease, filter 90ms ease; }
button:active { transform: scale(0.88); }
.btn:active, .chip:active { transform: scale(0.96); }

.side { width: 340px; min-width: 280px; background: var(--side); border-right: 1px solid var(--line);
  display: flex; flex-direction: column; }
.side-top { padding: 10px 12px; display: flex; gap: 8px; align-items: center; }
.search-input { flex: 1; background: var(--input); border: none; border-radius: 18px;
  padding: 9px 14px; color: var(--text); font-size: 14px; outline: none; min-width: 0; }
.icon-btn { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 18px;
  padding: 7px 9px; border-radius: 50%; line-height: 1; }
.icon-btn:hover { background: var(--hover); }

.chats { flex: 1; overflow-y: auto; }
.chat-item { display: flex; gap: 10px; padding: 9px 12px; cursor: pointer; align-items: center;
  transition: background 120ms; }
.chat-item:hover { background: var(--hover); }
.chat-item.active { background: var(--accent); color: #fff; }
.chat-item.active .muted, .chat-item.active .ci-time, .chat-item.active .ci-last { color: rgba(255,255,255,0.85); }
.ava-frame { border-radius: 50%; padding: 2.5px; flex-shrink: 0; }
.ava { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-weight: 600; font-size: 19px; color: #fff; overflow: hidden; position: relative; }
.ava img { width: 100%; height: 100%; object-fit: cover; }
.ava.sm { width: 36px; height: 36px; font-size: 15px; }
.ava.lg { width: 80px; height: 80px; font-size: 30px; }
.online-dot { position: absolute; bottom: 1px; right: 1px; width: 12px; height: 12px;
  background: #4CAF7D; border-radius: 50%; border: 2px solid var(--side); }
.ci-body { flex: 1; min-width: 0; }
.ci-row { display: flex; justify-content: space-between; gap: 6px; }
.ci-name { font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ci-time { font-size: 12px; color: var(--muted); flex-shrink: 0; }
.ci-last { font-size: 13px; color: var(--muted); white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; margin-top: 2px; }
.badge { background: var(--accent); color: #fff; border-radius: 12px; font-size: 12px;
  padding: 1px 7px; font-weight: 600; flex-shrink: 0; }
.muted { color: var(--muted); }

.main { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--bg); }
.placeholder { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--muted); }
.chat-head { padding: 8px 14px; border-bottom: 1px solid var(--line); display: flex; gap: 10px;
  align-items: center; background: var(--side); }
.ch-info { flex: 1; min-width: 0; cursor: pointer; border-radius: 8px; padding: 2px 6px; }
.ch-info:hover { background: var(--hover); }
.ch-name { font-weight: 600; font-size: 15px; }
.ch-status { font-size: 12.5px; color: var(--muted); }
.ch-status.on { color: var(--accent); }

.pin-bar { padding: 6px 14px; background: var(--side); border-bottom: 1px solid var(--line);
  font-size: 13px; display: flex; gap: 8px; align-items: center; border-left: 3px solid var(--accent); }
.pin-bar span { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--muted); }

.msgs { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 3px;
  background-size: cover; background-position: center; }
.day-sep { align-self: center; font-size: 12.5px; color: #fff; background: rgba(0,0,0,0.35);
  padding: 3px 12px; border-radius: 12px; margin: 8px 0; backdrop-filter: blur(4px); }
.tg[data-theme="light"] .msgs:not(.has-wp) .day-sep { color: var(--muted); background: var(--side); }
.bubble-row { display: flex; }
.bubble-row.out { justify-content: flex-end; }
.bubble { max-width: min(72%, 440px); padding: 7px 11px 6px; border-radius: 18px; font-size: 14.5px;
  line-height: 1.35; position: relative; animation: popIn 160ms cubic-bezier(0.34,1.4,0.64,1);
  word-break: break-word; box-shadow: 0 1px 2px rgba(0,0,0,0.18); }
@keyframes popIn { from { transform: translateY(10px) scale(0.96); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .bubble { animation: none; } button { transition: none; } }
.bubble.in { background: var(--bub-in); border-bottom-left-radius: 5px; }
.bubble.out { background: var(--bub-out); border-bottom-right-radius: 5px; }
.b-meta { font-size: 11px; color: var(--muted); display: flex; gap: 4px; justify-content: flex-end;
  margin-top: 2px; align-items: center; }
.bubble.out .b-meta { color: rgba(255,255,255,0.75); }
.tg[data-theme="light"] .bubble.out .b-meta { color: var(--muted); }
.ticks { letter-spacing: -2px; }
.ticks.read { color: var(--accent); font-weight: 700; }
.reply-quote { border-left: 2.5px solid var(--accent); padding: 2px 8px; margin-bottom: 4px;
  font-size: 13px; border-radius: 4px; background: rgba(128,128,128,0.12); }
.reply-quote b { color: var(--accent); display: block; font-size: 12.5px; }
.b-img { max-width: 100%; border-radius: 10px; display: block; margin-bottom: 4px; cursor: pointer; }
.b-file { display: flex; gap: 10px; align-items: center; padding: 4px 0; }
.b-file .fi { width: 40px; height: 40px; border-radius: 50%; background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
.b-voice { display: flex; gap: 10px; align-items: center; min-width: 180px; }
.wave { display: flex; gap: 2px; align-items: center; height: 24px; flex: 1; }
.wave i { width: 3px; background: var(--accent); border-radius: 2px; opacity: 0.55; }
.wave i.played { opacity: 1; }
.reacts { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
.react-chip { background: rgba(128,128,128,0.18); border-radius: 12px; padding: 1px 8px;
  font-size: 13px; cursor: pointer; border: none; color: var(--text); }
.react-chip.mine { background: var(--accent); color: #fff; }
.link-card { display: block; border-left: 2.5px solid var(--accent); padding: 4px 8px; margin-top: 4px;
  font-size: 13px; color: var(--accent); text-decoration: none; background: rgba(128,128,128,0.1); border-radius: 4px; }
mark { background: var(--accent); color: #fff; border-radius: 3px; padding: 0 2px; }

.composer { padding: 8px 12px; background: var(--side); border-top: 1px solid var(--line); }
.reply-bar { display: flex; gap: 8px; padding: 4px 6px 8px; font-size: 13px; align-items: center; }
.compose-row { display: flex; gap: 6px; align-items: flex-end; }
.compose-row textarea { flex: 1; background: var(--input); border: none; border-radius: 18px;
  padding: 10px 14px; color: var(--text); font-size: 14.5px; resize: none; outline: none;
  max-height: 120px; font-family: inherit; line-height: 1.35; min-width: 0; }
.send-btn { background: var(--accent); border: none; color: #fff; width: 42px; height: 42px;
  border-radius: 50%; font-size: 17px; cursor: pointer; flex-shrink: 0; }
.send-btn:disabled { opacity: 0.35; cursor: default; }
.send-btn:not(:disabled):active { transform: scale(0.8); }
.quick-chips { display: flex; gap: 6px; flex-wrap: wrap; padding: 6px 2px 2px; }
.chip { background: var(--input); border: 1px solid var(--line); border-radius: 14px; padding: 4px 12px;
  font-size: 13px; cursor: pointer; color: var(--text); }

.menu { position: fixed; background: var(--side); border: 1px solid var(--line); border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.35); z-index: 60; overflow: hidden; min-width: 170px; animation: popIn 100ms; }
.menu button { display: block; width: 100%; text-align: left; background: none; border: none;
  color: var(--text); padding: 9px 14px; font-size: 14px; cursor: pointer; }
.menu button:hover { background: var(--hover); }
.menu .rx { display: flex; padding: 6px 8px; gap: 2px; border-bottom: 1px solid var(--line); }
.menu .rx button { padding: 4px 6px; font-size: 18px; width: auto; border-radius: 8px; }

.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 50; display: flex;
  align-items: center; justify-content: center; padding: 16px; }
.modal { background: var(--side); border-radius: 14px; width: 100%; max-width: 420px; padding: 0;
  max-height: 92vh; overflow-y: auto; color: var(--text); animation: popIn 150ms; }
.modal-pad { padding: 18px 20px; }
.modal h3 { margin: 16px 0 8px; font-size: 15px; }
.banner { height: 96px; border-radius: 14px 14px 0 0; position: relative; }
.banner .ava-frame { position: absolute; bottom: -34px; left: 18px; cursor: pointer; }
.field { width: 100%; background: var(--input); border: none; border-radius: 10px; padding: 11px 14px;
  color: var(--text); font-size: 14.5px; outline: none; margin-bottom: 10px; font-family: inherit; }
.btn { background: var(--accent); color: #fff; border: none; border-radius: 10px; padding: 11px 18px;
  font-size: 14.5px; font-weight: 600; cursor: pointer; width: 100%; }
.btn.ghost { background: none; color: var(--accent); }
.btn:disabled { opacity: 0.4; cursor: default; }
.err { color: #E26060; font-size: 13px; margin-bottom: 10px; }
.toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: var(--side);
  color: var(--text); border: 1px solid var(--line); padding: 10px 18px; border-radius: 12px; z-index: 80;
  box-shadow: 0 6px 24px rgba(0,0,0,0.4); font-size: 14px; animation: popIn 150ms; max-width: 90%; text-align: center; }
.swatches { display: flex; gap: 8px; flex-wrap: wrap; }
.sw { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 3px solid transparent; }
.sw.sel { border-color: var(--text); }
.wp-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.wp { aspect-ratio: 3/4; border-radius: 8px; cursor: pointer; border: 2.5px solid transparent;
  background: var(--input); background-size: cover; display: flex; align-items: flex-end;
  justify-content: center; font-size: 10px; color: #fff; text-shadow: 0 1px 2px #000; padding-bottom: 3px; }
.wp.sel { border-color: var(--accent); }
.theme-row { display: flex; gap: 6px; }
.theme-row button { flex: 1; }
.stat { font-size: 13.5px; color: var(--muted); margin: 4px 0; }
.toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 14.5px; }
.toggle { width: 44px; height: 24px; border-radius: 12px; background: var(--input); border: none;
  cursor: pointer; position: relative; }
.toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
  border-radius: 50%; background: var(--muted); transition: left 150ms, background 150ms; }
.toggle.on { background: var(--accent); }
.toggle.on::after { left: 23px; background: #fff; }

.auth-wrap { height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); }
.auth-box { width: 100%; max-width: 360px; padding: 24px; }
.auth-box h1 { text-align: center; font-size: 26px; margin-bottom: 4px; color: var(--accent); }
.auth-box .sub { text-align: center; color: var(--muted); font-size: 14px; margin-bottom: 24px; }
.pw-wrap { position: relative; }
.pw-wrap > button { position: absolute; right: 8px; top: 7px; background: none; border: none;
  color: var(--muted); cursor: pointer; font-size: 16px; }

.emoji-pop, .attach-pop { position: absolute; bottom: 56px; background: var(--side); border: 1px solid var(--line);
  border-radius: 12px; z-index: 40; box-shadow: 0 6px 24px rgba(0,0,0,0.3); animation: popIn 120ms; }
.emoji-pop { left: 8px; padding: 8px; width: 300px; }
.attach-pop { left: 8px; overflow: hidden; min-width: 200px; }
.attach-pop button { display: flex; gap: 10px; width: 100%; background: none; border: none; color: var(--text);
  padding: 11px 16px; font-size: 14.5px; cursor: pointer; align-items: center; }
.attach-pop button:hover { background: var(--hover); }
.emoji-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--line); padding-bottom: 6px; margin-bottom: 6px; }
.emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
.emoji-grid button, .emoji-tabs button { background: none; border: none; font-size: 19px; cursor: pointer;
  padding: 3px; border-radius: 6px; }
.emoji-grid button:hover, .emoji-tabs button:hover { background: var(--hover); }
.emoji-tabs button.sel { background: var(--hover); }

.back-btn { display: none; }
@media (max-width: 720px) {
  .side { width: 100%; min-width: 0; border-right: none; }
  .tg.view-chat .side { display: none; }
  .tg.view-list .main { display: none; }
  .back-btn { display: block; }
}

.b-sender { font-size: 12.5px; font-weight: 600; margin-bottom: 2px; }
.pick-chip { background: var(--accent); color: #fff; border: none; border-radius: 12px; padding: 3px 10px;
  font-size: 13px; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; margin: 0 6px 6px 0; }
.member-row { display: flex; align-items: center; gap: 10px; padding: 7px 4px; border-radius: 8px; }
.member-row:hover { background: var(--hover); }
.member-row .mr-name { flex: 1; font-size: 14.5px; }

.ios-actions { display: flex; gap: 8px; margin: 12px 0 14px; }
.ios-btn { flex: 1; background: var(--input); border: none; border-radius: 14px; padding: 10px 4px;
  color: var(--accent); cursor: pointer; display: flex; flex-direction: column; align-items: center;
  gap: 4px; font-size: 12px; font-weight: 500; }
.ios-btn .ic { font-size: 20px; }
.ios-btn:active { filter: brightness(1.25); }
.ios-list { background: var(--input); border-radius: 14px; overflow: hidden; margin: 6px 0 4px; }
.ios-row { display: flex; align-items: center; gap: 12px; padding: 11px 14px; width: 100%;
  background: none; border: none; border-bottom: 0.5px solid var(--line); color: var(--text);
  font-size: 14.5px; cursor: pointer; text-align: left; }
.ios-row:last-child { border-bottom: none; }
.ios-row:active { background: var(--hover); }
.ios-row .cnt { margin-left: auto; color: var(--muted); }
.media-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.media-grid img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6px; cursor: pointer; }
.rights-row { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12.5px; color: var(--muted);
  margin: 0 0 8px 48px; }
.sw.rainbow { background: conic-gradient(red,#ff0,#0f0,#0ff,#00f,#f0f,red); position: relative; overflow: hidden; display: inline-block; }
.sw.rainbow input { opacity: 0; position: absolute; inset: 0; cursor: pointer; }

.folder-tabs { display: flex; gap: 4px; padding: 0 10px 8px; overflow-x: auto; scrollbar-width: none; }
.folder-tabs::-webkit-scrollbar { display: none; }
.msgs, .chats, .modal { scrollbar-width: none; }
.msgs::-webkit-scrollbar, .chats::-webkit-scrollbar, .modal::-webkit-scrollbar { width: 0; height: 0; display: none; }
.ftab { background: none; border: none; color: var(--muted); font-size: 13.5px; font-weight: 500;
  padding: 5px 11px; border-radius: 14px; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.ftab.on { background: var(--accent); color: #fff; }
.crop-box { width: 240px; height: 240px; margin: 0 auto; position: relative; overflow: hidden;
  border-radius: 12px; background: #000; touch-action: none; cursor: grab; }
.crop-box:active { cursor: grabbing; }
.crop-ring { position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 0 0 999px rgba(0,0,0,0.55); pointer-events: none; }
.bubble.flash { animation: flashHi 1.5s ease; }
@keyframes flashHi { 0%, 55% { box-shadow: 0 0 0 3px var(--accent); } 100% { box-shadow: 0 1px 2px rgba(0,0,0,0.18); } }

.ann-bar { margin: 0 10px 8px; padding: 8px 10px; background: var(--accent-light); border: 1px solid var(--accent);
  border-radius: 12px; font-size: 13px; display: flex; gap: 8px; align-items: center; cursor: pointer; color: var(--text); }
.ann-bar span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.chat-item { position: relative; }
.chat-item + .chat-item::after { content: ""; position: absolute; left: 74px; right: 0; top: 0; height: 1px; background: var(--line); }
.ava.xs { width: 28px; height: 28px; font-size: 12px; }
.msg-ava { width: 32px; flex-shrink: 0; align-self: flex-end; cursor: pointer; }
.bubble-row.in { align-items: flex-end; }
.sec { background: var(--input); border-radius: 16px; padding: 12px 14px; margin: 10px 0; }
.sec h3:first-child { margin-top: 4px; }
.sec .field, .sec .chip { background: var(--bg); }
.sec .wp { background: var(--bg); }
.sw-auto { background: var(--bg); color: var(--muted); display: flex; align-items: center; justify-content: center; font-size: 10px; }
.icon-pick { width: 40px; height: 40px; border-radius: 11px; cursor: pointer; border: 2.5px solid transparent; }
.icon-pick.sel { border-color: var(--accent); }
.chip-on { background: var(--accent) !important; color: #fff; border-color: var(--accent); }
.call-screen { position: fixed; inset: 0; z-index: 90; display: flex; flex-direction: column; align-items: center;
  justify-content: space-between; padding: 8vh 16px 6vh; background-size: cover; background-position: center; }
.call-shade { position: absolute; inset: 0; background: rgba(10, 16, 24, 0.72); backdrop-filter: blur(14px); }
.call-top { position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.call-name { color: #fff; font-size: 24px; font-weight: 700; }
.call-status { color: rgba(255,255,255,0.75); font-size: 15px; }
.call-remote { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.call-local { position: absolute; right: 14px; top: 14px; width: 110px; border-radius: 12px; z-index: 2; }
.call-btns { position: relative; display: flex; gap: 18px; z-index: 2; }
.call-btn { width: 60px; height: 60px; border-radius: 50%; border: none; font-size: 24px; cursor: pointer;
  background: rgba(255,255,255,0.18); color: #fff; backdrop-filter: blur(6px); }
.call-btn.accept { background: #2eb872; }
.call-btn.hang { background: #d9534f; }

.drawer-ov { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 65; }
.drawer { position: fixed; left: 0; top: 0; bottom: 0; width: 290px; background: var(--side); z-index: 66;
  padding: 18px 0 12px; overflow-y: auto; box-shadow: 4px 0 24px rgba(0,0,0,0.35); animation: drawerIn 180ms ease; }
@keyframes drawerIn { from { transform: translateX(-100%); } to { transform: none; } }
@media (prefers-reduced-motion: reduce) { .drawer { animation: none; } }
.drawer-head { padding: 0 18px 12px; }
.drawer-name { font-weight: 700; font-size: 16.5px; margin-top: 10px; display: flex; align-items: center; }
.drawer-status { color: var(--accent); font-size: 14px; cursor: pointer; margin-top: 3px; }
.d-sep { height: 1px; background: var(--line); margin: 6px 0; }
.d-row { display: flex; gap: 16px; align-items: center; width: 100%; background: none; border: none;
  color: var(--text); font-size: 14.5px; font-weight: 500; padding: 12px 18px; cursor: pointer; text-align: left; }
.d-row:hover { background: var(--hover); }
.d-row .d-ic { width: 22px; text-align: center; font-size: 17px; opacity: 0.9; }
.d-row .right { margin-left: auto; }

.call-btn-wrap { display: flex; flex-direction: column; align-items: center; gap: 7px; }
.call-lbl { color: rgba(255,255,255,0.78); font-size: 12.5px; }
.call-btn svg { width: 26px; height: 26px; display: block; }
.call-btn { display: flex; align-items: center; justify-content: center; }
.call-btn.active-w { background: #fff; color: #1a2233; }

.mention { color: var(--accent); font-weight: 600; cursor: pointer; }
.mention:hover { text-decoration: underline; }
.mention-pop { position: absolute; bottom: 100%; left: 8px; right: 8px; margin-bottom: 6px;
  background: var(--side); border: 1px solid var(--line); border-radius: 12px; overflow: hidden;
  z-index: 20; box-shadow: 0 6px 24px rgba(0,0,0,0.35); }
.mention-pop button { display: flex; gap: 8px; align-items: center; width: 100%; padding: 8px 12px;
  background: none; border: none; color: var(--text); cursor: pointer; font-size: 14px; }
.mention-pop button:hover { background: var(--hover); }

.menu-close { border-top: 1px solid var(--line); color: var(--muted) !important; }
.drawer-x { position: absolute; top: 10px; right: 10px; font-size: 14px; }
.pop-x { position: absolute; top: 6px; right: 8px; background: none; border: none; color: var(--muted);
  font-size: 13px; cursor: pointer; z-index: 2; }
.emoji-pop { position: relative; }
.btn-img { width: 22px; height: 22px; object-fit: contain; display: block; }
.btn-ic { display: inline-block; }
button:hover .anim-pulse, button:active .anim-pulse { animation: aPulse 0.4s ease; }
button:hover .anim-spin, button:active .anim-spin { animation: aSpin 0.55s linear; }
button:hover .anim-bounce, button:active .anim-bounce { animation: aBounce 0.45s ease; }
button:hover .anim-shake, button:active .anim-shake { animation: aShake 0.4s ease; }
@keyframes aPulse { 0% { transform: scale(1); } 50% { transform: scale(1.35); } 100% { transform: scale(1); } }
@keyframes aSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes aBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes aShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0; }
.stat-card { background: var(--input); border-radius: 12px; padding: 10px 6px; text-align: center; }
.stat-card b { font-size: 19px; display: block; color: var(--accent); }
.stat-card span { font-size: 11.5px; color: var(--muted); }
.bars { display: flex; align-items: flex-end; gap: 3px; padding: 6px 2px; overflow-x: auto; }
.bar-col { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 18px; flex: 1; }
.bar-col .bar { width: 100%; max-width: 26px; background: var(--accent); border-radius: 4px 4px 0 0; }
.bar-col span { font-size: 9.5px; color: var(--muted); white-space: nowrap; }
.bld-preview { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; margin-bottom: 10px; }
.bp-head { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: var(--side); }
.bp-msgs { padding: 12px 10px; display: flex; flex-direction: column; gap: 8px; background: var(--bg); }
.bp-comp { display: flex; align-items: center; gap: 4px; padding: 6px 8px; background: var(--side); }
.bp-input { flex: 1; background: var(--input); border-radius: 16px; padding: 7px 12px; font-size: 13.5px; }
.bld-row { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.bld-row:last-of-type { border-bottom: none; }
.bld-row .mr-name { min-width: 86px; flex: 0 0 auto; font-size: 13.5px; }
.bld-anims { display: flex; gap: 4px; flex-wrap: wrap; width: 100%; padding-left: 44px; }
.bld-anims .chip { font-size: 11.5px; padding: 3px 8px; }
.call-warn { position: relative; margin-top: 10px; background: rgba(217, 83, 79, 0.25); border: 1px solid #d9534f;
  color: #fff; border-radius: 10px; padding: 8px 12px; font-size: 12.5px; text-align: center; max-width: 320px; }

.sw-pick { background: transparent; border: 2px solid var(--line); display: flex; align-items: center; justify-content: center; }
.pick-plus { color: var(--muted); font-size: 15px; line-height: 1; pointer-events: none; }
.bar-col i { font-size: 9.5px; font-style: normal; color: var(--text); opacity: 0.85; }
.jump-down { position: absolute; right: 14px; bottom: 84px; width: 44px; height: 44px; border-radius: 50%;
  background: var(--side); border: 1px solid var(--line); color: var(--accent); font-size: 22px;
  cursor: pointer; z-index: 6; box-shadow: 0 4px 14px rgba(0,0,0,0.35); }
.main { position: relative; }

.market-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line); }
.market-row:last-of-type { border-bottom: none; }
.market-prev { width: 46px; height: 46px; border-radius: 10px; flex-shrink: 0; position: relative; border: 1px solid var(--line); }
.market-prev span { position: absolute; right: 5px; bottom: 5px; width: 14px; height: 14px; border-radius: 50%; }

.market-app { max-width: 460px; }
.market-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.theme-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.theme-card { background: var(--input); border-radius: 14px; overflow: hidden; cursor: pointer; transition: transform 0.12s; }
.theme-card:active { transform: scale(0.97); }
.tc-cover { position: relative; aspect-ratio: 16/10; background: var(--side); }
.tc-cover img, .tc-cover video { width: 100%; height: 100%; object-fit: cover; display: block; }
.tc-plat { position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,0.55); color: #fff;
  font-size: 10.5px; padding: 2px 7px; border-radius: 8px; backdrop-filter: blur(4px); }
.tc-info { padding: 8px 10px; }
.tc-info b { font-size: 14px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.theme-gallery { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x mandatory; }
.theme-gallery img, .theme-gallery video { height: 230px; border-radius: 12px; scroll-snap-align: center; cursor: pointer; }
.plat-chip { display: inline-block; background: var(--input); border-radius: 10px; padding: 4px 10px; font-size: 13px; }
.pub-media { position: relative; }
.pub-media img, .pub-media video { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; }
.cover-badge { position: absolute; bottom: 4px; left: 4px; background: var(--accent); color: #fff;
  font-size: 10px; padding: 1px 6px; border-radius: 6px; }
.pm-del { position: absolute; top: 3px; right: 3px; width: 22px; height: 22px; border-radius: 50%;
  border: none; background: rgba(0,0,0,0.6); color: #fff; cursor: pointer; font-size: 12px; }
.pub-add { aspect-ratio: 1; border: 2px dashed var(--line); background: none; border-radius: 8px;
  color: var(--muted); font-size: 26px; cursor: pointer; }
`;
