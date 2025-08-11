
    function goBack(e){
      e.preventDefault();
      const href = e.currentTarget.href; // сохранить заранее
      document.body.classList.add('fade-out');
      setTimeout(() => window.location = href, 400);
    }
    
document.addEventListener('DOMContentLoaded', () => {
  const player = document.getElementById('player');
  if (!player) return;

  const audio = player.querySelector('#audio');
  const unlockBtn = player.querySelector('#unlock');

  // Старт по клику
  unlockBtn.addEventListener('click', async () => {
    try {
      await audio.play();
      unlockBtn.classList.add('hidden');
    } catch (e) {
      console.warn('Не удалось запустить аудио:', e);
    }
  });

  // Обновление прогресса
  audio.addEventListener('timeupdate', () => {
    const d = audio.duration || 1;
    const t = audio.currentTime || 0;
  });
});


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
  