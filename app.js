// ── STATE ─────────────────────────────────────────────
let tasks = [];
let chart = null;

let focusRunning = false;
let focusPaused = false;
let focusInterval = null;
let focusSecondsLeft = 1500;
let totalFocusSeconds = 0;
let sessionsCompleted = 0;

// ── STORAGE ───────────────────────────────────────────
function save() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  localStorage.setItem('focus', JSON.stringify({
    total: totalFocusSeconds,
    sessions: sessionsCompleted
  }));
}

function load() {
  tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  const f = JSON.parse(localStorage.getItem('focus')) || {};
  totalFocusSeconds = f.total || 0;
  sessionsCompleted = f.sessions || 0;
}

// ── NAVIGATION ─────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById('page-' + btn.dataset.page).classList.add('active');
    };
  });
}

// ── TASKS ─────────────────────────────────────────────
function addTask() {
  const input = document.getElementById('task-input');
  const text = input.value.trim();
  if (!text) return;

  const priority = document.getElementById('priority-select').value;

  tasks.push({
    id: Date.now(),
    text,
    priority,
    done: false
  });

  input.value = '';
  save();
  renderTasks();
  callAI();
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) t.done = !t.done;
  save();
  renderTasks();
  callAI();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  renderTasks();
  callAI();
}

function renderTasks() {
  const list = document.getElementById('task-list');

  const done = tasks.filter(t => t.done).length;
  const pending = tasks.length - done;

  document.getElementById('stat-total').textContent = tasks.length;
  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('hdr-done').textContent = done;
  document.getElementById('hdr-pending').textContent = pending;

  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-pct').textContent = pct + '%';

  updateChart(done, pending);

  if (!tasks.length) {
    list.innerHTML = `<div class="empty-state">No tasks yet</div>`;
    return;
  }

  list.innerHTML = tasks.map(t => `
    <div class="task-item" data-id="${t.id}">
      <input type="checkbox" ${t.done ? 'checked' : ''}/>
      <span class="task-text ${t.done ? 'done' : ''}">${t.text}</span>
      <span class="priority-badge badge-${t.priority}">${t.priority}</span>
      <button class="task-delete">×</button>
    </div>
  `).join('');
}

// EVENT DELEGATION
document.addEventListener('click', (e) => {
  const item = e.target.closest('.task-item');
  if (!item) return;

  const id = Number(item.dataset.id);

  if (e.target.matches('input')) toggleTask(id);
  if (e.target.matches('.task-delete')) deleteTask(id);
});

// ── CHART ─────────────────────────────────────────────
function updateChart(done, pending) {
  const canvas = document.getElementById('task-chart');
  if (!canvas) return;

  if (chart) chart.destroy();

  chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Done', 'Pending'],
      datasets: [{
        data: [done, pending],
        backgroundColor: ['#2d5a27', '#c0392b']
      }]
    },
    options: { plugins: { legend: { display: false } } }
  });
}

// ── AI ────────────────────────────────────────────────
function callAI() {
  const el = document.getElementById('ai-content');

  if (!tasks.length) {
    el.innerHTML = `<p class="ai-placeholder">Add tasks to get advice</p>`;
    return;
  }

  const pending = tasks.filter(t => !t.done);
  const high = pending.find(t => t.priority === 'high');

  let msg = high
    ? `Focus on "${high.text}" first`
    : pending.length
      ? `${pending.length} tasks remaining — start small`
      : `All tasks done. Great work`;

  el.innerHTML = `<p class="ai-text">${msg}</p>`;
}

// ── GARDEN ────────────────────────────────────────────
function drawPlant() {
  const leaves = document.getElementById('leaves');
  const stem = document.getElementById('stem');

  if (!leaves) return;

  const minutes = totalFocusSeconds / 60;
  const stage = Math.min(6, Math.floor(minutes / 2)); // fast growth

  leaves.innerHTML = '';

  const top = 120 - stage * 10;
  stem.setAttribute('y', top);
  stem.setAttribute('height', 130 - top);

  for (let i = 0; i < stage; i++) {
    leaves.innerHTML += `<ellipse cx="65" cy="${top + i*10}" rx="10" ry="5" fill="#2d5a27"/>`;
    leaves.innerHTML += `<ellipse cx="95" cy="${top + i*10}" rx="10" ry="5" fill="#2d5a27"/>`;
  }

  document.getElementById('g-total-mins').textContent = Math.floor(minutes);
  document.getElementById('garden-total-display').textContent = Math.floor(minutes);
}

// ── TIMER ─────────────────────────────────────────────
function startTimer() {
  if (focusRunning) return;

  const mins = parseInt(document.getElementById('timer-minutes').value) || 25;

  if (!focusPaused) {
    focusSecondsLeft = mins * 60;
  }

  focusRunning = true;
  focusPaused = false;

  focusInterval = setInterval(() => {
    focusSecondsLeft--;
    totalFocusSeconds++;

    if (focusSecondsLeft <= 0) {
      clearInterval(focusInterval);
      focusRunning = false;
      sessionsCompleted++;
      save();
    }

    updateTimerUI();
    drawPlant();

  }, 1000);
}

function pauseTimer() {
  clearInterval(focusInterval);
  focusRunning = false;
  focusPaused = true;
}

function resetTimer() {
  clearInterval(focusInterval);
  focusRunning = false;
  focusPaused = false;

  const mins = parseInt(document.getElementById('timer-minutes').value) || 25;
  focusSecondsLeft = mins * 60;

  updateTimerUI();
}

// ── TIMER UI ──────────────────────────────────────────
function updateTimerUI() {
  const m = Math.floor(focusSecondsLeft / 60);
  const s = focusSecondsLeft % 60;

  document.getElementById('big-timer').textContent =
    `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  load();
  initNav();
  renderTasks();
  callAI();
  updateTimerUI();
  drawPlant();

  document.getElementById('add-btn').onclick = addTask;
  document.getElementById('start-btn').onclick = startTimer;
  document.getElementById('pause-btn').onclick = pauseTimer;
  document.getElementById('reset-btn').onclick = resetTimer;
});