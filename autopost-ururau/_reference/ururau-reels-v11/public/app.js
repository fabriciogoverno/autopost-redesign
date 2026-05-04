let currentPage = 'dashboard';
let currentMonth = new Date();
let postsData = [];
let lastCreatedPostId = null;

document.querySelectorAll('.menu li').forEach(item => {
  item.addEventListener('click', () => {
    const page = item.dataset.page;
    navigate(page);
  });
});

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.menu li').forEach(l => l.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  if (page === 'dashboard') loadDashboard();
  if (page === 'calendar') loadCalendar();
  if (page === 'logs') loadLogs();
  if (page === 'template') loadTemplateEditor();
  if (page === 'config') loadConfig();
}

async function loadDashboard() {
  try {
    const res = await fetch('/api/stats');
    const stats = await res.json();
    document.getElementById('statToday').textContent = stats.today;
    document.getElementById('statWeek').textContent = stats.week;
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statPending').textContent = stats.pending;
    document.getElementById('statPublished').textContent = stats.published;
    document.getElementById('statErrors').textContent = stats.errors;

    const postsRes = await fetch('/api/posts');
    postsData = await postsRes.json();
    renderPostsList(postsData.slice(0, 10));
  } catch (e) {
    console.error('Dashboard load error:', e);
  }
}

function renderPostsList(posts) {
  const container = document.getElementById('postsList');
  if (!posts.length) {
    container.innerHTML = '<div class="post-item"><div class="post-info">Nenhuma publicacao ainda. Clique em "Criar Reels Agora" para comecar.</div></div>';
    return;
  }

  container.innerHTML = posts.map(p => {
    const thumb = p.media_path ? `/api/media?path=${encodeURIComponent(p.media_path)}` : '';
    return `<div class="post-item">
      <img class="post-thumb" src="${thumb}" alt="" onerror="this.style.display='none'">
      <div class="post-info">
        <div class="post-title">${escapeHtml(p.title)}</div>
        <div class="post-meta">${p.category} | ${new Date(p.created_at).toLocaleString('pt-BR')}</div>
      </div>
      <span class="post-status status-${p.status}">${p.status}</span>
      <div class="post-actions">
        ${p.status === 'pending' ? `<button onclick="publishPost(${p.id})">Publicar</button>` : ''}
        ${p.status === 'published' ? `<button onclick="rollbackPost(${p.id})">Rollback</button>` : ''}
        ${p.status === 'scheduled' ? `<button onclick="publishPost(${p.id})">Publicar Agora</button>` : ''}
        <button onclick="deletePost(${p.id})">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// SIMULATOR
function updateSimulator() {
  const slider = document.getElementById('simSlider');
  const value = parseInt(slider.value);
  document.getElementById('simValue').textContent = value;

  const minPerManual = 10;
  const secPerAuto = 10;
  const minSavedPerPost = minPerManual - (secPerAuto / 60);

  const dayMin = Math.round(value * minSavedPerPost);
  const monthMin = Math.round(dayMin * 30);
  const yearMin = Math.round(dayMin * 365);

  document.getElementById('simDay').textContent = formatTime(dayMin);
  document.getElementById('simMonth').textContent = formatTime(monthMin);
  document.getElementById('simYear').textContent = formatTime(yearMin);
}

function formatTime(minutes) {
  if (minutes < 60) return minutes + 'm';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

// Initialize simulator
document.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById('simSlider');
  if (slider) updateSimulator();
  loadDashboard();
});

async function scrapeUrl() {
  const url = document.getElementById('inputUrl').value;
  if (!url) return alert('Digite uma URL primeiro');

  try {
    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('inputTitle').value = data.title || '';
      document.getElementById('inputSummary').value = data.summary || '';
      document.getElementById('inputImage').value = data.image || '';
    } else {
      alert('Erro ao extrair: ' + (data.error || 'Falha'));
    }
  } catch (e) {
    alert('Erro de conexao ao extrair URL');
  }
}

async function generatePreview() {
  const title = document.getElementById('inputTitle').value;
  const summary = document.getElementById('inputSummary').value;
  const category = document.getElementById('inputCategory').value;
  const imageUrl = document.getElementById('inputImage').value;

  if (!title) return alert('Titulo obrigatorio para preview');

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: '', title, summary, category, imageUrl })
    });
    const result = await res.json();
    if (res.ok) {
      lastCreatedPostId = result.id;
      document.getElementById('previewPlaceholder').style.display = 'none';
      const img = document.getElementById('previewImage');
      img.style.display = 'block';
      img.src = `/api/media?path=${encodeURIComponent(result.mediaPath)}`;
      document.getElementById('captionPreview').textContent = result.caption;
    } else {
      alert('Erro no preview: ' + (result.error || 'Falha'));
    }
  } catch (e) {
    alert('Erro ao gerar preview');
  }
}

async function createPost() {
  const title = document.getElementById('inputTitle').value;
  if (!title) return alert('Titulo obrigatorio');

  if (!lastCreatedPostId) {
    await generatePreview();
    if (!lastCreatedPostId) return;
  }

  try {
    const res = await fetch(`/api/posts/${lastCreatedPostId}/publish`, { method: 'POST' });
    const result = await res.json();
    if (res.ok) {
      alert('Publicado com sucesso no Instagram!');
      navigate('dashboard');
      clearForm();
    } else {
      alert('Erro ao publicar: ' + (result.error || 'Falha'));
    }
  } catch (e) {
    alert('Erro de conexao ao publicar');
  }
}

async function createAndSchedule() {
  const title = document.getElementById('inputTitle').value;
  if (!title) return alert('Titulo obrigatorio');

  const scheduledAt = prompt('Data/hora para agendar (YYYY-MM-DD HH:MM):');
  if (!scheduledAt) return;

  if (!lastCreatedPostId) {
    await generatePreview();
    if (!lastCreatedPostId) return;
  }

  try {
    const res = await fetch(`/api/posts/${lastCreatedPostId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt })
    });
    if (res.ok) {
      alert('Agendado com sucesso!');
      navigate('dashboard');
      clearForm();
    } else {
      alert('Erro ao agendar');
    }
  } catch (e) {
    alert('Erro de conexao ao agendar');
  }
}

async function publishPost(id) {
  if (!confirm('Publicar no Instagram agora?')) return;
  try {
    const res = await fetch(`/api/posts/${id}/publish`, { method: 'POST' });
    const result = await res.json();
    if (res.ok) {
      alert('Publicado com sucesso!');
      loadDashboard();
    } else {
      alert('Erro: ' + (result.error || 'Falha'));
    }
  } catch (e) {
    alert('Erro de conexao');
  }
}

async function rollbackPost(id) {
  if (!confirm('Rollback desta publicacao?')) return;
  try {
    await fetch(`/api/posts/${id}/rollback`, { method: 'POST' });
    alert('Rollback realizado');
    loadDashboard();
  } catch (e) {
    alert('Erro no rollback');
  }
}

async function deletePost(id) {
  if (!confirm('Excluir permanentemente?')) return;
  try {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    loadDashboard();
  } catch (e) {
    alert('Erro ao excluir');
  }
}

function clearForm() {
  document.getElementById('inputUrl').value = '';
  document.getElementById('inputTitle').value = '';
  document.getElementById('inputSummary').value = '';
  document.getElementById('inputImage').value = '';
  document.getElementById('previewImage').style.display = 'none';
  document.getElementById('previewPlaceholder').style.display = 'flex';
  document.getElementById('captionPreview').textContent = 'Legenda sera gerada automaticamente...';
  lastCreatedPostId = null;
}

function loadCalendar() {
  renderCalendar();
}

function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthNames = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('calendarMonth').textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  const dayHeaders = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
  dayHeaders.forEach(d => {
    grid.innerHTML += `<div class="calendar-day-header">${d}</div>`;
  });

  for (let i = 0; i < firstDay; i++) {
    grid.innerHTML += '<div class="calendar-day"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayPosts = postsData.filter(p => p.scheduled_at && p.scheduled_at.startsWith(dateStr));
    let postsHtml = '';
    dayPosts.forEach(p => {
      postsHtml += `<div class="day-post-dot" title="${escapeHtml(p.title)}"></div>`;
    });
    grid.innerHTML += `<div class="calendar-day">
      <div class="calendar-day-number">${day}</div>
      <div class="calendar-day-posts">${postsHtml}</div>
    </div>`;
  }
}

function changeMonth(delta) {
  currentMonth.setMonth(currentMonth.getMonth() + delta);
  renderCalendar();
}

async function loadLogs() {
  try {
    const res = await fetch('/api/logs');
    const logs = await res.json();
    const container = document.getElementById('logsContainer');
    if (!logs.length) {
      container.innerHTML = '<div class="log-item">Nenhum log registrado</div>';
      return;
    }
    container.innerHTML = logs.map(l => {
      const date = new Date(l.created_at).toLocaleString('pt-BR');
      return `<div class="log-item log-level-${l.level}">[${date}] [${l.level.toUpperCase()}] ${escapeHtml(l.message)}</div>`;
    }).join('');
  } catch (e) {
    console.error('Logs load error:', e);
  }
}

async function clearLogs() {
  if (!confirm('Limpar todos os logs?')) return;
  try {
    await fetch('/api/logs', { method: 'DELETE' });
    loadLogs();
  } catch (e) {
    alert('Erro ao limpar logs');
  }
}

async function loadConfig() {
  try {
    const res = await fetch('/api/settings');
    const settings = await res.json();
    document.getElementById('configGeminiKey').value = settings.gemini_api_key || '';
    document.getElementById('configIgUser').value = settings.instagram_username || '';
    document.getElementById('configIgPass').value = settings.instagram_password || '';
    document.getElementById('configTimes').value = settings.autoblog_times || '07:00,09:00,12:00,15:00,18:00,21:00';
    document.getElementById('configAutoblog').checked = settings.autoblog_enabled === '1';

    const statusInd = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    if (settings.autoblog_enabled === '1') {
      statusInd.classList.add('on');
      statusText.textContent = 'Autoblog: ON';
    } else {
      statusInd.classList.remove('on');
      statusText.textContent = 'Autoblog: OFF';
    }
  } catch (e) {
    console.error('Config load error:', e);
  }
}

async function saveConfig() {
  const settings = [
    { key: 'gemini_api_key', value: document.getElementById('configGeminiKey').value },
    { key: 'instagram_username', value: document.getElementById('configIgUser').value },
    { key: 'instagram_password', value: document.getElementById('configIgPass').value },
    { key: 'autoblog_times', value: document.getElementById('configTimes').value },
    { key: 'autoblog_enabled', value: document.getElementById('configAutoblog').checked ? '1' : '0' }
  ];

  try {
    for (const s of settings) {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s)
      });
    }
    alert('Configuracoes salvas! Reinicie o servidor para aplicar Autoblog.');
    loadConfig();
  } catch (e) {
    alert('Erro ao salvar configuracoes');
  }
}

function showModal(html) {
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modal').classList.add('active');
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

// ===== TEMPLATE EDITOR =====
let currentTemplate = null;

async function loadTemplateEditor() {
  try {
    const res = await fetch('/api/template');
    currentTemplate = await res.json();
    fillTemplateFields(currentTemplate);
  } catch (e) {
    console.error('Template load error:', e);
  }
}

function fillTemplateFields(tpl) {
  if (!tpl || !tpl.layers) return;

  const l = tpl.layers;

  // Category
  if (l.category) {
    document.getElementById('tplCatX').value = l.category.x || 55;
    document.getElementById('tplCatY').value = l.category.y || 1040;
    document.getElementById('tplCatFontSize').value = l.category.fontSize || 22;
    document.getElementById('tplCatHeight').value = l.category.height || 52;
    document.getElementById('tplCatPaddingX').value = l.category.paddingX || 24;
    document.getElementById('tplCatRadius').value = l.category.radius || 6;
  }

  // Title
  if (l.title) {
    document.getElementById('tplTitleX').value = l.title.x || 55;
    document.getElementById('tplTitleY').value = l.title.y || 1110;
    document.getElementById('tplTitleFontSize').value = l.title.fontSize || 61;
    document.getElementById('tplTitleLineHeight').value = l.title.lineHeight || 72;
    document.getElementById('tplTitleMaxChars').value = l.title.maxCharsPerLine || 22;
    document.getElementById('tplTitleMaxWidth').value = l.title.maxWidth || 970;
  }

  // Separator
  if (l.separator) {
    document.getElementById('tplSepX').value = l.separator.x || 55;
    document.getElementById('tplSepWidth').value = l.separator.width || 220;
    document.getElementById('tplSepHeight').value = l.separator.height || 5;
    document.getElementById('tplSepMarginTop').value = l.separator.marginTopAfterTitle || 18;
    document.getElementById('tplSepColor').value = l.separator.color || '#C11F25';
  }

  // Summary
  if (l.summary) {
    document.getElementById('tplSumX').value = l.summary.x || 55;
    document.getElementById('tplSumFontSize').value = l.summary.fontSize || 32;
    document.getElementById('tplSumLineHeight').value = l.summary.lineHeight || 46;
    document.getElementById('tplSumMaxChars').value = l.summary.maxCharsPerLine || 36;
    document.getElementById('tplSumMarginTop').value = l.summary.marginTopAfterLine || 28;
  }

  // Watermark
  if (l.watermark) {
    document.getElementById('tplWmX').value = l.watermark.x || 55;
    document.getElementById('tplWmY').value = l.watermark.y || 1880;
    document.getElementById('tplWmFontSize').value = l.watermark.fontSize || 18;
    document.getElementById('tplWmOpacity').value = l.watermark.opacity || 0.5;
  }

  // Category colors
  if (tpl.categoryColors) {
    document.getElementById('tplColorOpiniao').value = tpl.categoryColors.OPINIAO || '#E63946';
    document.getElementById('tplColorPolitica').value = tpl.categoryColors.POLITICA || '#1D3557';
    document.getElementById('tplColorEsporte').value = tpl.categoryColors.ESPORTE || '#2A9D8F';
    document.getElementById('tplColorSeguranca').value = tpl.categoryColors.SEGURANCA || '#E9C46A';
    document.getElementById('tplColorEconomia').value = tpl.categoryColors.ECONOMIA || '#F4A261';
    document.getElementById('tplColorGeral').value = tpl.categoryColors.GERAL || '#6C757D';
  }

  // Load backups
  loadBackups();
}

function buildTemplateFromFields() {
  return {
    layers: {
      category: {
        x: parseInt(document.getElementById('tplCatX').value),
        y: parseInt(document.getElementById('tplCatY').value),
        fontSize: parseInt(document.getElementById('tplCatFontSize').value),
        height: parseInt(document.getElementById('tplCatHeight').value),
        paddingX: parseInt(document.getElementById('tplCatPaddingX').value),
        radius: parseInt(document.getElementById('tplCatRadius').value)
      },
      title: {
        x: parseInt(document.getElementById('tplTitleX').value),
        y: parseInt(document.getElementById('tplTitleY').value),
        fontSize: parseInt(document.getElementById('tplTitleFontSize').value),
        lineHeight: parseInt(document.getElementById('tplTitleLineHeight').value),
        maxCharsPerLine: parseInt(document.getElementById('tplTitleMaxChars').value),
        maxWidth: parseInt(document.getElementById('tplTitleMaxWidth').value)
      },
      separator: {
        x: parseInt(document.getElementById('tplSepX').value),
        width: parseInt(document.getElementById('tplSepWidth').value),
        height: parseInt(document.getElementById('tplSepHeight').value),
        marginTopAfterTitle: parseInt(document.getElementById('tplSepMarginTop').value),
        color: document.getElementById('tplSepColor').value
      },
      summary: {
        x: parseInt(document.getElementById('tplSumX').value),
        fontSize: parseInt(document.getElementById('tplSumFontSize').value),
        lineHeight: parseInt(document.getElementById('tplSumLineHeight').value),
        maxCharsPerLine: parseInt(document.getElementById('tplSumMaxChars').value),
        marginTopAfterLine: parseInt(document.getElementById('tplSumMarginTop').value)
      },
      watermark: {
        x: parseInt(document.getElementById('tplWmX').value),
        y: parseInt(document.getElementById('tplWmY').value),
        fontSize: parseInt(document.getElementById('tplWmFontSize').value),
        opacity: parseFloat(document.getElementById('tplWmOpacity').value)
      }
    },
    categoryColors: {
      OPINIAO: document.getElementById('tplColorOpiniao').value,
      POLITICA: document.getElementById('tplColorPolitica').value,
      ESPORTE: document.getElementById('tplColorEsporte').value,
      SEGURANCA: document.getElementById('tplColorSeguranca').value,
      ECONOMIA: document.getElementById('tplColorEconomia').value,
      GERAL: document.getElementById('tplColorGeral').value
    }
  };
}

async function saveTemplate() {
  const updates = buildTemplateFromFields();
  try {
    const res = await fetch('/api/template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const result = await res.json();
    if (res.ok) {
      alert('Template salvo com sucesso!');
      currentTemplate = result.template;
    } else {
      alert('Erro ao salvar: ' + (result.error || 'Falha'));
    }
  } catch (e) {
    alert('Erro de conexao ao salvar template');
  }
}

async function resetTemplate() {
  if (!confirm('Restaurar template para o padrao original do Canva? Todas as alteracoes serao perdidas.')) return;
  try {
    const res = await fetch('/api/template/reset', { method: 'POST' });
    const result = await res.json();
    if (res.ok) {
      alert('Template restaurado para o padrao!');
      fillTemplateFields(result.template);
      currentTemplate = result.template;
    } else {
      alert('Erro ao restaurar: ' + (result.error || 'Falha'));
    }
  } catch (e) {
    alert('Erro de conexao ao restaurar');
  }
}

async function generateTemplatePreview() {
  try {
    const res = await fetch('/api/template/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Titulo de teste do template editavel',
        summary: 'Este e um preview para voce verificar se as posicoes, fontes e cores estao corretas antes de publicar.',
        category: 'OPINIAO'
      })
    });
    const result = await res.json();
    if (res.ok) {
      document.getElementById('templatePreviewPlaceholder').style.display = 'none';
      const img = document.getElementById('templatePreviewImg');
      img.style.display = 'block';
      img.src = result.previewUrl;
    } else {
      alert('Erro no preview: ' + (result.error || 'Falha'));
    }
  } catch (e) {
    alert('Erro de conexao ao gerar preview');
  }
}

// ===== BACKUPS =====
async function loadBackups() {
  try {
    const res = await fetch('/api/template/backups');
    const backups = await res.json();
    const container = document.getElementById('backupsList');

    if (!backups.length) {
      container.innerHTML = '<div class="backup-item"><span class="backup-name">Nenhum backup ainda</span></div>';
      return;
    }

    container.innerHTML = backups.map(b => {
      const date = new Date(b.time).toLocaleString('pt-BR');
      return `<div class="backup-item">
        <span class="backup-name">${escapeHtml(b.name)}</span>
        <span style="color:var(--text-secondary);font-size:11px">${date}</span>
        <div class="backup-actions">
          <button onclick="restoreBackup('${b.name}')">Restaurar</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    console.error('Backups load error:', e);
    document.getElementById('backupsList').innerHTML = '<div class="backup-item"><span class="backup-name">Erro ao carregar backups</span></div>';
  }
}

async function restoreBackup(name) {
  if (!confirm('Restaurar template para o backup: ' + name + '?')) return;
  try {
    const res = await fetch('/api/template/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backupName: name })
    });
    const result = await res.json();
    if (res.ok) {
      alert('Backup restaurado com sucesso!');
      fillTemplateFields(result.template);
      currentTemplate = result.template;
    } else {
      alert('Erro ao restaurar: ' + (result.error || 'Falha'));
    }
  } catch (e) {
    alert('Erro de conexao ao restaurar backup');
  }
}

