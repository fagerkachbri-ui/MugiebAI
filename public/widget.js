/**
 * مَجيب AI — Embeddable Chat Widget
 * Place this script tag on any page to add a floating chat assistant.
 * Usage: <script src="https://your-app.com/widget.js" data-assistant="ASSISTANT_ID"></script>
 */
(function () {
  'use strict';

  var scriptTag = document.currentScript;
  if (!scriptTag) return;

  var assistantId = scriptTag.getAttribute('data-assistant');
  if (!assistantId) {
    console.error('[Majib] Missing data-assistant attribute');
    return;
  }

  // Resolve the API base from the script's own src so it works from any host
  var scriptSrc = scriptTag.src;
  var origin = scriptSrc.replace(/\/widget\.js(\?.*)?$/, '');
  var supabaseUrl = origin;

  // Read anon key from the script's data attribute, or fall back to the bundled one
  var anonKey = scriptTag.getAttribute('data-anon-key') || '';

  // Visitor ID — persisted in localStorage
  var VISITOR_KEY = 'majib_visitor_id';
  var visitorId = (function () {
    try {
      var stored = localStorage.getItem(VISITOR_KEY);
      if (stored) return stored;
    } catch (e) {}
    var id = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    try { localStorage.setItem(VISITOR_KEY, id); } catch (e) {}
    return id;
  })();

  // State
  var assistant = null;
  var messages = [];
  var conversationId = null;
  var isOpen = false;
  var loading = false;
  var dom = {};

  // Inject styles
  var style = document.createElement('style');
  style.textContent = [
    '@import url("https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap");',
    '.majib-reset { margin:0; padding:0; box-sizing:border-box; font-family:"Tajawal",system-ui,sans-serif; }',
    '.majib-bubble { position:fixed; bottom:24px; left:24px; z-index:2147483647; width:56px; height:56px; border-radius:50%;',
    '  display:flex; align-items:center; justify-content:center; cursor:pointer; color:#fff;',
    '  box-shadow:0 8px 24px rgba(0,0,0,0.2); transition:transform .2s ease; }',
    '.majib-bubble:hover { transform:scale(1.1); }',
    '.majib-bubble svg { width:26px; height:26px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }',
    '.majib-window { position:fixed; bottom:24px; left:24px; z-index:2147483647; width:340px; max-width:calc(100vw - 48px);',
    '  height:480px; max-height:calc(100vh - 48px); background:#fff; border-radius:16px; overflow:hidden;',
    '  box-shadow:0 12px 40px rgba(0,0,0,0.2); display:flex; flex-direction:column; }',
    '.majib-window.rtl { direction:rtl; } .majib-window.ltr { direction:ltr; }',
    '.majib-header { padding:12px 16px; display:flex; align-items:center; gap:10px; color:#fff; flex-shrink:0; }',
    '.majib-header-avatar { width:36px; height:36px; background:rgba(255,255,255,0.2); border-radius:10px;',
    '  display:flex; align-items:center; justify-content:center; flex-shrink:0; }',
    '.majib-header-avatar svg { width:20px; height:20px; fill:none; stroke:#fff; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }',
    '.majib-header-info { flex:1; min-width:0; }',
    '.majib-header-name { font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
    '.majib-header-status { font-size:11px; opacity:0.8; }',
    '.majib-close { background:none; border:none; color:#fff; cursor:pointer; padding:4px; border-radius:6px; opacity:0.8; }',
    '.majib-close:hover { opacity:1; background:rgba(255,255,255,0.15); }',
    '.majib-close svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2; }',
    '.majib-messages { flex:1; overflow-y:auto; padding:16px; background:#f8fafc; }',
    '.majib-msg { display:flex; margin-bottom:10px; animation:majib-fade .3s ease; }',
    '.majib-msg.user { justify-content:flex-end; } .majib-msg.assistant { justify-content:flex-start; }',
    '.majib-bubble-text { max-width:80%; padding:8px 14px; border-radius:14px; font-size:13px; line-height:1.5; }',
    '.majib-msg.user .majib-bubble-text { color:#fff; border-top-left-radius:4px; }',
    '.majib-msg.assistant .majib-bubble-text { background:#fff; color:#334155; border:1px solid #f1f5f9; border-top-right-radius:4px; }',
    '.majib-typing { display:flex; gap:4px; padding:10px 14px; background:#fff; border:1px solid #f1f5f9; border-radius:14px; border-top-right-radius:4px; }',
    '.majib-typing span { width:6px; height:6px; background:#cbd5e1; border-radius:50%; animation:majib-bounce 1.4s infinite ease-in-out; }',
    '.majib-typing span:nth-child(2) { animation-delay:.2s; } .majib-typing span:nth-child(3) { animation-delay:.4s; }',
    '.majib-input-row { padding:10px; background:#fff; border-top:1px solid #f1f5f9; display:flex; gap:8px; flex-shrink:0; }',
    '.majib-input { flex:1; padding:8px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;',
    '  font-size:13px; font-family:inherit; color:#0f172a; outline:none; transition:border-color .2s; }',
    '.majib-input:focus { border-color:#0EA5E9; }',
    '.majib-send { width:36px; height:36px; border-radius:10px; border:none; cursor:pointer; color:#fff;',
    '  display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:opacity .2s; }',
    '.majib-send:disabled { opacity:0.5; cursor:default; }',
    '.majib-send svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }',
    '.majib-error { padding:12px 16px; background:#fef2f2; color:#dc2626; font-size:12px; text-align:center; }',
    '@keyframes majib-fade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }',
    '@keyframes majib-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }',
    '@media(max-width:480px) { .majib-window { width:100%; left:0; bottom:0; border-radius:0; } .majib-bubble { bottom:16px; left:16px; } }',
  ].join('\n');
  document.head.appendChild(style);

  // SVG icons
  var ICON_CHAT = '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var ICON_BOT = '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

  function createBubble() {
    var el = document.createElement('div');
    el.className = 'majib-reset majib-bubble';
    el.style.background = (assistant && assistant.primary_color) || '#0EA5E9';
    el.innerHTML = ICON_CHAT;
    el.addEventListener('click', openWindow);
    return el;
  }

  function createWindow() {
    var dir = (assistant && assistant.direction) || 'rtl';
    var el = document.createElement('div');
    el.className = 'majib-reset majib-window ' + dir;
    el.innerHTML = [
      '<div class="majib-header" style="background:' + ((assistant && assistant.primary_color) || '#0EA5E9') + '">',
        '<div class="majib-header-avatar">' + ICON_BOT + '</div>',
        '<div class="majib-header-info">',
          '<div class="majib-header-name">' + escapeHtml((assistant && assistant.name) || 'مَجيب') + '</div>',
          '<div class="majib-header-status">' + (dir === 'rtl' ? 'مساعد ذكي' : 'AI Assistant') + '</div>',
        '</div>',
        '<button class="majib-close" type="button">' + ICON_CLOSE + '</button>',
      '</div>',
      '<div class="majib-messages" id="majib-messages"></div>',
      '<div class="majib-input-row">',
        '<input class="majib-input" type="text" placeholder="' + (dir === 'rtl' ? 'اكتب رسالتك...' : 'Type your message...') + '" />',
        '<button class="majib-send" type="button" disabled style="background:' + ((assistant && assistant.primary_color) || '#0EA5E9') + '">' + ICON_SEND + '</button>',
      '</div>',
    ].join('');

    dom.window = el;
    dom.messages = el.querySelector('#majib-messages');
    dom.input = el.querySelector('.majib-input');
    dom.send = el.querySelector('.majib-send');
    dom.close = el.querySelector('.majib-close');

    dom.close.addEventListener('click', closeWindow);
    dom.send.addEventListener('click', sendMessage);
    dom.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });
    dom.input.addEventListener('input', function () {
      dom.send.disabled = !dom.input.value.trim() || loading;
    });

    if (dir === 'rtl') {
      dom.input.style.textAlign = 'right';
    }
    return el;
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function renderMessages() {
    var html = messages.map(function (m) {
      return '<div class="majib-msg ' + m.role + '"><div class="majib-bubble-text"' +
        (m.role === 'user' ? ' style="background:' + ((assistant && assistant.primary_color) || '#0EA5E9') + '"' : '') +
        '>' + escapeHtml(m.content) + '</div></div>';
    }).join('');
    if (loading) {
      html += '<div class="majib-msg assistant"><div class="majib-typing"><span></span><span></span><span></span></div></div>';
    }
    dom.messages.innerHTML = html;
    dom.messages.scrollTop = dom.messages.scrollHeight;
  }

  function openWindow() {
    if (isOpen) return;
    isOpen = true;
    if (dom.bubble) dom.bubble.style.display = 'none';
    if (!dom.window) createWindow();
    document.body.appendChild(dom.window);
    renderMessages();
    setTimeout(function () { if (dom.input) dom.input.focus(); }, 100);
  }

  function closeWindow() {
    if (!isOpen) return;
    isOpen = false;
    if (dom.window) dom.window.remove();
    if (dom.bubble) dom.bubble.style.display = '';
  }

  async function sendMessage() {
    var text = dom.input.value.trim();
    if (!text || loading) return;

    messages.push({ role: 'user', content: text });
    dom.input.value = '';
    dom.send.disabled = true;
    loading = true;
    renderMessages();

    try {
      var response = await fetch(supabaseUrl + '/functions/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + anonKey,
        },
        body: JSON.stringify({
          assistant_id: assistantId,
          message: text,
          visitor_id: visitorId,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) throw new Error('Request failed: ' + response.status);
      var data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.conversation_id) conversationId = data.conversation_id;
      messages.push({ role: 'assistant', content: data.reply });
    } catch (err) {
      messages.push({ role: 'assistant', content: 'عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.' });
    } finally {
      loading = false;
      renderMessages();
      dom.send.disabled = !dom.input.value.trim();
    }
  }

  async function init() {
    // Fetch assistant config
    try {
      var res = await fetch(supabaseUrl + '/rest/v1/assistants?id=eq.' + encodeURIComponent(assistantId) + '&select=*', {
        headers: {
          'apikey': anonKey,
          'Authorization': 'Bearer ' + anonKey,
        },
      });
      if (res.ok) {
        var arr = await res.json();
        if (arr && arr.length > 0) {
          assistant = arr[0];
          messages.push({ role: 'assistant', content: assistant.welcome_message || 'مرحبًا! كيف يمكنني مساعدتك؟' });
        }
      }
    } catch (e) {
      // Fall back to defaults
    }

    // Create bubble
    dom.bubble = createBubble();
    document.body.appendChild(dom.bubble);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
