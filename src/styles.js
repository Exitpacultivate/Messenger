export const css = `
* { box-sizing: border-box; margin: 0; }
.tg { height: 100vh; display: flex; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg); color: var(--text); overflow: hidden; }
.tg[data-theme="dark"]  { --bg:#17212B; --side:#0E1621; --bub-out:var(--accent-dim); --bub-in:#182533; --text:#fff; --muted:#8DA8C2; --line:#101921; --hover:#202B36; --input:#242F3D; }
.tg[data-theme="amoled"]{ --bg:#000; --side:#000; --bub-out:var(--accent-dim); --bub-in:#111; --text:#fff; --muted:#7A8A9A; --line:#1a1a1a; --hover:#151515; --input:#161616; }
.tg[data-theme="light"] { --bg:#fff; --side:#F5F7FA; --bub-out:var(--accent-light); --bub-in:#F0F2F5; --text:#1a2230; --muted:#70808F; --line:#E4E8EC; --hover:#EDF1F5; --input:#EDF1F5; }

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
.ftab { background: none; border: none; color: var(--muted); font-size: 13.5px; font-weight: 500;
  padding: 5px 11px; border-radius: 14px; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.ftab.on { background: var(--accent); color: #fff; }
.crop-box { width: 240px; height: 240px; margin: 0 auto; position: relative; overflow: hidden;
  border-radius: 12px; background: #000; touch-action: none; cursor: grab; }
.crop-box:active { cursor: grabbing; }
.crop-ring { position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 0 0 999px rgba(0,0,0,0.55); pointer-events: none; }
.bubble.flash { animation: flashHi 1.5s ease; }
@keyframes flashHi { 0%, 55% { box-shadow: 0 0 0 3px var(--accent); } 100% { box-shadow: 0 1px 2px rgba(0,0,0,0.18); } }
`;
