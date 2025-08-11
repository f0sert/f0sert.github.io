
    function goBack(e){
      e.preventDefault();
      const href = e.currentTarget.href; // сохранить заранее
      document.body.classList.add('fade-out');
      setTimeout(() => window.location = href, 400);
    }

    // Theme: переключение и сохранение
    (function initTheme(){
      const saved = localStorage.getItem('theme');
      if(saved === 'light') document.documentElement.classList.add('theme-light');
      const btn = document.getElementById('theme');
      function label(){
        const light = document.documentElement.classList.contains('theme-light');
        btn.textContent = light ? 'Тёмная тема (BETA)' : 'Темная тема (BETA)';
      }
      btn.addEventListener('click', ()=>{
        document.documentElement.classList.toggle('theme-light');
        const light = document.documentElement.classList.contains('theme-light');
        localStorage.setItem('theme', light ? 'light' : 'dark');
        label();
      });
      label();
    })();

    // Часы + дата (UTC offset)
    function updateClock(){
      const now = new Date();
      const h = String(now.getHours()).padStart(2,'0');
      const m = String(now.getMinutes()).padStart(2,'0');
      const s = String(now.getSeconds()).padStart(2,'0');
      document.getElementById('clock').textContent = h+':'+m+':'+s;

      const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
      const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} г.`;
      const offMin = -now.getTimezoneOffset();
      const offH = Math.trunc(offMin/60), offM = Math.abs(offMin%60);
      const sign = offH >= 0 ? '+' : '−';
      const off = `UTC${sign}${Math.abs(offH)}${offM?':'+String(offM).padStart(2,'0'):''}`;
      document.getElementById('date').textContent = `${dateStr} • ${off}`;
    }
    setInterval(updateClock, 1000); updateClock();

    // Weather stub (если элемент включён)
    (function(){
      const wEl = document.getElementById('weather');
      if (wEl) wEl.textContent = 'Небольшой ливневый дождь, 14.7 °C';
    })();

    // Year
    // document.getElementById('year').textContent = new Date().getFullYear();

    // Copy handle (если кнопка включена)
    (function(){
      const btn = document.getElementById('copyHandle');
      if(!btn) return;
      const toast = document.getElementById('toast');
      btn.addEventListener('click', async ()=>{
        const text = btn.getAttribute('data-copy');
        try{
          await navigator.clipboard.writeText(text);
          toast.textContent = 'Скопировано: ' + text;
        }catch{
          toast.textContent = text;
        }
        toast.style.display = 'block';
        clearTimeout(window.__toastTid);
        window.__toastTid = setTimeout(()=> toast.style.display='none', 1600);
      });
    })();
  