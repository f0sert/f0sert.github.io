(function(){
  const $ = s => document.querySelector(s);
  const hostEl = $('#host'), portEl = $('#port'), modeEl = $('#mode'), checkBtn = $('#check');
  const dot = $('#dot'), text = $('#text'), spinner = $('#spinner');
  const toast = $('#toast'), toastText = $('#toast-text');
  const canvas = $('#fx'), ctx = canvas.getContext('2d');
  const SECURE = isSecureContext;

  // Confetti FX (minimal)
  let W = canvas.width = innerWidth, H = canvas.height = innerHeight;
  addEventListener('resize', () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; });
  const confetti = [];
  function burst(){
    confetti.length = 0;
    for(let i=0;i<70;i++){
      confetti.push({
        x: W/2, y: H/2, r: 2+Math.random()*3, a: Math.random()*Math.PI*2,
        v: 3+Math.random()*3, g: .06+.05*Math.random(), c: Math.random()>.5?'#22c55e':'#7c3aed', life: 60+Math.random()*40
      });
    }
  }
  function tick(){
    ctx.clearRect(0,0,W,H);
    confetti.forEach(p=>{
      p.x += Math.cos(p.a)*p.v;
      p.y += Math.sin(p.a)*p.v + p.g;
      p.v *= .98; p.life--;
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life/80));
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  tick();

  function showToast(msg){
    toastText.textContent = msg;
    toast.style.display = 'flex';
    clearTimeout(showToast.tid);
    showToast.tid = setTimeout(()=> toast.style.display='none', 5200);
  }

  function setStatus(kind, msg, loading=false){
    dot.className = 'dot';
    if(kind==='ok') dot.classList.add('ok');
    else if(kind==='warn') dot.classList.add('warn');
    else if(kind==='err') dot.classList.add('err');
    text.textContent = msg;
    spinner.style.display = loading ? 'block' : 'none';
  }

  function validHost(h){
    return /^[a-zA-Z0-9.-]+$/.test(h) && !/^[-.]/.test(h) && !/[.]{2,}/.test(h);
  }
  function validPort(p){
    const n = Number(p); return Number.isInteger(n) && n>=1 && n<=65535;
  }

  // Core attempts
  function timeoutPromise(ms){ return new Promise((_,rej)=> setTimeout(()=>rej(new Error('TIMEOUT')), ms)); }

  async function attemptFetch(url, ms=4000){
    // If HTTPS page tries HTTP => likely blocked. Early detect.
    if(SECURE && url.startsWith('http://')) throw new Error('BLOCKED_MIXED');
    const ctrl = new AbortController();
    const timer = setTimeout(()=> ctrl.abort('TIMEOUT'), ms);
    try{
      const res = await fetch(url, { mode:'no-cors', cache:'no-store', signal:ctrl.signal });
      clearTimeout(timer);
      // If we got here, TCP/TLS+HTTP succeeded (opaque allowed). Treat as OPEN.
      return {state:'open', detail:'http-ok'};
    }catch(e){
      clearTimeout(timer);
      if(e && (e.name==='AbortError' || e.message==='TIMEOUT')) return {state:'filtered', detail:'timeout'};
      if(e && e.message==='BLOCKED_MIXED') return {state:'blocked', detail:'mixed-content'};
      // Network error. Could be closed or handshake refused.
      return {state:'closed', detail:'net-error'};
    }
  }

  function attemptWS(url, ms=4000){
    return new Promise((resolve)=>{
      // Block ws from https? It's allowed (ws is mixed active content) but many browsers treat it; if blocked, we'll get immediate error.
      let early = true;
      const t0 = performance.now();
      let settled = false;
      const to = setTimeout(()=> {
        if(settled) return;
        settled = true;
        try{ ws && ws.close(); }catch{}
        resolve({state:'filtered', detail:'timeout'});
      }, ms);

      let ws;
      try{
        ws = new WebSocket(url);
      }catch(err){
        clearTimeout(to);
        return resolve({state:'closed', detail:'ctor-fail'});
      }

      ws.onopen = ()=>{
        if(settled) return;
        settled = true;
        clearTimeout(to);
        ws.close();
        resolve({state:'open', detail:'ws-open'});
      };
      ws.onerror = ()=>{
        if(settled) return;
        settled = true;
        clearTimeout(to);
        const dt = performance.now()-t0;
        // Heuristic: very fast error => actively closed (RST). Slow/no response => filtered.
        resolve({state: dt<300 ? 'closed' : 'filtered', detail:'ws-error-'+Math.round(dt)});
      };
    });
  }

  function combine(results){
    // Priorities: open > filtered > closed. Blocked is informational.
    const anyOpen = results.find(r=>r.state==='open');
    if(anyOpen) return {final:'open', via:anyOpen.via, detail:anyOpen.detail};
    const anyFiltered = results.find(r=>r.state==='filtered');
    if(anyFiltered) return {final:'filtered', via:anyFiltered.via, detail:anyFiltered.detail};
    const anyClosed = results.find(r=>r.state==='closed');
    if(anyClosed) return {final:'closed', via:anyClosed.via, detail:anyClosed.detail};
    return {final:'unknown', via:'', detail:''};
  }

  async function check(){
    const host = hostEl.value.trim();
    const port = portEl.value.trim();
    const mode = modeEl.value;

    if(!validHost(host)) { setStatus('err','Некорректный хост'); return; }
    if(!validPort(port)) { setStatus('err','Некорректный порт'); return; }

    setStatus('warn','Проверяю…', true);

    const tasks = [];
    const add = (p, via) => tasks.push(p.then(r=>({...r, via})).catch(()=>({state:'closed', via, detail:'exception'})));

    try{
      if(mode==='auto'){
        // Prefer protocol-appropriate attempts based on context
        if(!SECURE) add(attemptFetch(`http://${host}:${port}/favicon.ico`), 'http');
        add(attemptFetch(`https://${host}:${port}/favicon.ico`), 'https');
        // WS attempts
        add(attemptWS(`ws://${host}:${port}`), 'ws');
        add(attemptWS(`wss://${host}:${port}`), 'wss');
      } else if(mode==='http'){
        add(attemptFetch(`http://${host}:${port}/favicon.ico`), 'http');
      } else if(mode==='https'){
        add(attemptFetch(`https://${host}:${port}/favicon.ico`), 'https');
      } else if(mode==='ws'){
        add(attemptWS(`ws://${host}:${port}`), 'ws');
      } else if(mode==='wss'){
        add(attemptWS(`wss://${host}:${port}`), 'wss');
      }

      const results = await Promise.all(tasks);
      const mixBlocked = results.find(r=>r.state==='blocked' && r.detail==='mixed-content');
      const out = combine(results);

      if(out.final==='open'){
        setStatus('ok', `Открыт (${out.via.toUpperCase()})`);
        burst();
      } else if(out.final==='filtered'){
        setStatus('warn', `Фильтруется/тайм-аут (${out.via.toUpperCase()})`);
      } else if(out.final==='closed'){
        setStatus('err', `Закрыт (${out.via.toUpperCase()})`);
      } else {
        setStatus('warn', 'Не удалось определить');
      }

      if(mixBlocked){
        showToast('Страница открыта по HTTPS, а вы проверяете HTTP. Откройте сайт по http:// для проверки HTTP-портов.');
      }
    }catch(err){
      setStatus('err','Ошибка проверки');
    } finally {
      spinner.style.display = 'none';
    }
  }

  checkBtn.addEventListener('click', check);
  portEl.addEventListener('keydown', e=>{ if(e.key==='Enter') check(); });
  hostEl.addEventListener('keydown', e=>{ if(e.key==='Enter') check(); });

  // Friendly hint on load
  if(SECURE){
    showToast('Вы в HTTPS-контексте: HTTP-запросы могут блокироваться. Для http-портов откройте сайт по http://');
  }
})();
