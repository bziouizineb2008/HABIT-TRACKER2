const state = {
  currentView: 'today',
  selectedDays: 30,
  challengeStarted: false,
  theme: 'dark',
  modalOpen: false,
  selectedHabitIcon: 'check',
  selectedHabitColor: '#e39a73',
  habits: [],
  challengeStartDate: null,
  challengeDays: {},
  gridFilter: null,
};

const tabButtons = document.querySelectorAll('.tab-button');
const themeToggle = document.querySelector('.theme-toggle');
const todayView = document.querySelector('.today-view');
const setupView = document.querySelector('.challenge-setup-view');
const activeView = document.querySelector('.challenge-active-view');
const gridView = document.querySelector('.challenge-grid-view');
const dayPills = document.querySelectorAll('.day-pill');
const customDaysInput = document.getElementById('custom-days');
const actionButtons = document.querySelectorAll('[data-action]');
const habitModal = document.getElementById('habit-modal');
const habitForm = document.getElementById('habit-form');
const habitNameInput = document.getElementById('habit-name');
const iconButtons = document.querySelectorAll('.icon-option');
const colorButtons = document.querySelectorAll('.color-option');
const habitList = document.getElementById('habit-list');
const emptyState = document.getElementById('empty-state');
const progressSummary = document.getElementById('progress-summary');
const progressPercent = document.getElementById('progress-percent');
const progressFill = document.getElementById('progress-fill');
const challengeGridTable = document.querySelector('.grid-table');
const challengeSummaryDate = document.querySelector('.summary-copy p');
const challengePercent = document.querySelector('.challenge-percent');
const challengeProgressFill = document.querySelector('.large-bar span');
const challengeMetricValues = document.querySelectorAll('.metric-value');
const challengeCompleteCopy = document.querySelector('.challenge-complete-copy');
const challengeSetupHint = document.querySelector('.banner-copy p');
const gridFilterButtons = document.querySelectorAll('[data-grid-filter]');
let nextHabitId = 0;

function getDayRecord(dayNumber) {
  if (!state.challengeDays[dayNumber]) {
    state.challengeDays[dayNumber] = { completedHabitIds: [], note: '' };
  }
  return state.challengeDays[dayNumber];
}

function formatChallengeDate(dayNumber) {
  const date = new Date(state.challengeStartDate);
  date.setDate(date.getDate() + dayNumber - 1);
  const parts = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === 'weekday').value;
  const month = parts.find((part) => part.type === 'month').value;
  const day = parts.find((part) => part.type === 'day').value;
  return `${weekday} · ${month} ${day}`;
}

function updateChallengeSummary() {
  const dayCount = state.selectedDays;
  const habitCount = state.habits.length;
  if (challengeSetupHint) {
    challengeSetupHint.textContent = habitCount > 0
      ? `Complete all ${habitCount} ${habitCount === 1 ? 'habit' : 'habits'} each day`
      : 'Add habits to your day to begin tracking';
  }
  let completedCells = 0;
  let wonDays = 0;
  let currentRun = 0;
  let countingCurrentRun = true;
  const today = new Date();
  const startDate = state.challengeStartDate || today;
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const currentDay = Math.max(1, Math.min(dayCount, Math.floor((todayUtc - startUtc) / 86400000) + 1));

  for (let day = 1; day <= dayCount; day += 1) {
    const record = getDayRecord(day);
    const completed = state.habits.filter((habit) => record.completedHabitIds.includes(habit.id)).length;
    completedCells += completed;
    if (habitCount > 0 && completed === habitCount) {
      wonDays += 1;
      if (countingCurrentRun && day <= currentDay) currentRun += 1;
    } else {
      if (day <= currentDay) countingCurrentRun = false;
    }
  }

  const completionPercent = dayCount > 0 && habitCount > 0
    ? Math.round((completedCells / (dayCount * habitCount)) * 100)
    : 0;
  const daysLeft = Math.max(0, dayCount - currentDay);

  if (challengeSummaryDate && state.challengeStartDate) {
    const finalDate = new Date(state.challengeStartDate);
    finalDate.setDate(finalDate.getDate() + dayCount - 1);
    const startLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(state.challengeStartDate);
    const endLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(finalDate);
    challengeSummaryDate.textContent = `${startLabel} — ${endLabel}`;
  }
  if (challengePercent) challengePercent.textContent = `${completionPercent}%`;
  if (challengeProgressFill) challengeProgressFill.style.width = `${completionPercent}%`;
  if (challengeMetricValues[0]) challengeMetricValues[0].textContent = String(wonDays);
  if (challengeMetricValues[1]) challengeMetricValues[1].textContent = String(currentRun);
  if (challengeMetricValues[2]) challengeMetricValues[2].textContent = String(daysLeft);
  if (challengeCompleteCopy) {
    if (habitCount === 0) {
      challengeCompleteCopy.textContent = 'Add a habit to start tracking your challenge — then leave a note for each day.';
    } else {
      challengeCompleteCopy.textContent = 'Finish every habit in a row to win the day — then leave a note.';
    }
  }
}

function renderChallengeGrid() {
  if (!challengeGridTable || !state.challengeStarted || !state.challengeStartDate) return;

  gridFilterButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.gridFilter === state.gridFilter));
  });

  const columns = `minmax(120px, 1.3fr) repeat(${Math.max(state.habits.length, 1)}, minmax(64px, 1fr)) minmax(140px, 1.8fr)`;
  const header = document.createElement('div');
  header.className = 'grid-header';
  header.style.setProperty('--grid-columns', columns);

  const dayHeading = document.createElement('div');
  dayHeading.className = 'col-day';
  dayHeading.textContent = 'DAY';
  header.appendChild(dayHeading);

  state.habits.forEach((habit) => {
    const habitHeading = document.createElement('div');
    habitHeading.className = 'habit-col';
    const icon = document.createElement('div');
    icon.className = 'habit-col-icon';
    icon.style.background = habit.color;
    icon.textContent = habit.icon;
    const name = document.createElement('span');
    name.textContent = habit.name;
    habitHeading.append(icon, name);
    header.appendChild(habitHeading);
  });

  const noteHeading = document.createElement('div');
  noteHeading.className = 'col-note';
  noteHeading.textContent = 'NOTE';
  header.appendChild(noteHeading);

  const rows = [];
  let visibleDays = 0;
  for (let day = 1; day <= state.selectedDays; day += 1) {
    const record = getDayRecord(day);
    const completedHabitCount = state.habits.filter((habit) => record.completedHabitIds.includes(habit.id)).length;
    const dayIsDone = state.habits.length > 0 && completedHabitCount === state.habits.length;
    if (state.gridFilter === 'done' && !dayIsDone) continue;
    if (state.gridFilter === 'todo' && dayIsDone) continue;

    const row = document.createElement('div');
    row.className = `grid-row${day === 1 ? ' highlight-row' : ''}`;
    row.style.setProperty('--grid-columns', columns);
    visibleDays += 1;

    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell';
    const dayName = document.createElement('div');
    dayName.className = 'day-name';
    dayName.textContent = `Day ${day}`;
    const dateLabel = document.createElement('div');
    dateLabel.className = 'day-date';
    dateLabel.textContent = formatChallengeDate(day);
    dayCell.append(dayName, dateLabel);
    row.appendChild(dayCell);

    state.habits.forEach((habit) => {
      const completed = record.completedHabitIds.includes(habit.id);
      const checkbox = document.createElement('button');
      checkbox.type = 'button';
      checkbox.className = `cell-box${completed ? ' checked' : ''}`;
      checkbox.setAttribute('aria-label', `${habit.name}, day ${day}: ${completed ? 'done' : 'to do'}`);
      checkbox.setAttribute('aria-pressed', String(completed));
      checkbox.dataset.habitName = habit.name;
      checkbox.style.setProperty('--habit-color', habit.color);
      checkbox.innerHTML = '<span></span>';
      checkbox.addEventListener('click', () => {
        const currentRecord = getDayRecord(day);
        if (currentRecord.completedHabitIds.includes(habit.id)) {
          currentRecord.completedHabitIds = currentRecord.completedHabitIds.filter((id) => id !== habit.id);
        } else {
          currentRecord.completedHabitIds.push(habit.id);
        }
        if (day === 1) {
          habit.done = currentRecord.completedHabitIds.includes(habit.id);
          renderHabits();
          updateProgress();
        }
        renderChallengeGrid();
        updateChallengeSummary();
      });
      row.appendChild(checkbox);
    });

    if (state.habits.length === 0) {
      const noHabits = document.createElement('div');
      noHabits.className = 'grid-no-habits';
      noHabits.textContent = 'Add a habit to track';
      row.appendChild(noHabits);
    }

    const note = document.createElement('input');
    note.className = 'note-input';
    note.type = 'text';
    note.placeholder = 'Add a note...';
    note.value = record.note;
    note.setAttribute('aria-label', `Note for day ${day}`);
    note.addEventListener('input', () => {
      getDayRecord(day).note = note.value;
    });
    row.appendChild(note);
    rows.push(row);
  }

  if (visibleDays === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'grid-filter-empty';
    emptyMessage.textContent = state.gridFilter === 'done'
      ? 'No completed days yet.'
      : 'All challenge days are complete.';
    rows.push(emptyMessage);
  }

  challengeGridTable.replaceChildren(header, ...rows);
  updateChallengeSummary();
}

function updateView() {
  todayView.classList.toggle('active', state.currentView === 'today');
  setupView.classList.toggle('active', state.currentView === 'challenge-setup');
  activeView.classList.toggle('active', state.currentView === 'challenge-active');
  gridView.classList.toggle('active', state.currentView === 'challenge-grid');

  tabButtons.forEach((btn) => {
    const isToday = btn.dataset.view === 'today';
    const isActive = isToday ? state.currentView === 'today' : state.currentView !== 'today';
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });
}

function updateProgress() {
  const total = state.habits.length;
  const complete = state.habits.filter((habit) => habit.done).length;
  const percent = total === 0 ? 0 : Math.round((complete / total) * 100);

  if (progressSummary) {
    progressSummary.textContent = `${complete} of ${total} habits complete`;
  }

  if (progressPercent) {
    progressPercent.textContent = `${percent}%`;
  }

  if (progressFill) {
    progressFill.style.width = `${percent}%`;
  }
}

function setTheme(theme) {
  state.theme = theme;
  document.body.classList.toggle('light-mode', theme === 'light');
}

function setChallengeDays(days) {
  state.selectedDays = Number(days) || 30;
  dayPills.forEach((pill) => {
    pill.classList.toggle('selected', Number(pill.dataset.days) === state.selectedDays);
  });

  const bannerText = document.querySelector('.banner-copy h4');
  if (bannerText) {
    bannerText.textContent = `${state.selectedDays}-day challenge`;
  }

  const summaryTitle = document.querySelector('.summary-copy h2');
  if (summaryTitle) {
    summaryTitle.textContent = `${state.selectedDays}-Day Challenge`;
  }
  if (state.challengeStarted) {
    renderChallengeGrid();
  }
}

function openHabitModal() {
  state.modalOpen = true;
  habitModal.classList.remove('hidden');
  habitModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => habitNameInput.focus(), 50);
}

function closeHabitModal() {
  state.modalOpen = false;
  habitModal.classList.add('hidden');
  habitModal.setAttribute('aria-hidden', 'true');
  habitForm.reset();
  state.selectedHabitIcon = 'check';
  state.selectedHabitColor = '#e39a73';
  iconButtons.forEach((button) => button.classList.toggle('selected', button.dataset.icon === 'check'));
  colorButtons.forEach((button) => button.classList.toggle('selected', button.dataset.color === '#e39a73'));
}

function renderHabits() {
  const hasHabits = state.habits.length > 0;
  emptyState.style.display = hasHabits ? 'none' : 'flex';
  habitList.innerHTML = '';

  if (!hasHabits) return;

  state.habits.forEach((habit) => {
    const item = document.createElement('div');
    item.className = 'habit-item';
    const main = document.createElement('div');
    main.className = 'habit-main';
    const icon = document.createElement('div');
    icon.className = 'habit-icon';
    icon.style.background = habit.color;
    icon.textContent = habit.icon;
    const name = document.createElement('div');
    name.className = 'habit-text';
    name.textContent = habit.name;
    main.append(icon, name);

    const actions = document.createElement('div');
    actions.className = 'habit-actions';
    const check = document.createElement('button');
    check.type = 'button';
    check.className = `habit-check${habit.done ? ' checked' : ''}`;
    check.dataset.habitId = String(habit.id);
    check.setAttribute('aria-label', `Mark ${habit.name} complete`);
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'habit-delete';
    deleteButton.dataset.deleteId = String(habit.id);
    deleteButton.setAttribute('aria-label', `Delete ${habit.name}`);
    deleteButton.textContent = 'Delete';
    actions.append(check, deleteButton);
    item.append(main, actions);
    habitList.appendChild(item);
  });

  habitList.querySelectorAll('.habit-check').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = Number(button.dataset.habitId);
      const habit = state.habits.find((item) => item.id === targetId);
      if (!habit) return;
      habit.done = !habit.done;
      if (state.challengeStarted) {
        const record = getDayRecord(1);
        if (habit.done && !record.completedHabitIds.includes(habit.id)) {
          record.completedHabitIds.push(habit.id);
        } else if (!habit.done) {
          record.completedHabitIds = record.completedHabitIds.filter((id) => id !== habit.id);
        }
        renderChallengeGrid();
      }
      renderHabits();
      updateProgress();
      updateChallengeSummary();
    });
  });

  habitList.querySelectorAll('.habit-delete').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = Number(button.dataset.deleteId);
      state.habits = state.habits.filter((habit) => habit.id !== targetId);
      Object.values(state.challengeDays).forEach((record) => {
        record.completedHabitIds = record.completedHabitIds.filter((id) => id !== targetId);
      });
      renderHabits();
      updateProgress();
      renderChallengeGrid();
      updateChallengeSummary();
    });
  });
}

function addHabit(name, icon, color) {
  state.habits.push({
    id: ++nextHabitId,
    name,
    icon,
    color,
    done: false,
  });
  renderHabits();
  updateProgress();
  renderChallengeGrid();
  updateChallengeSummary();
  closeHabitModal();
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const requested = button.dataset.view;

    if (requested === 'today') {
      state.currentView = 'today';
    } else {
      state.currentView = state.challengeStarted ? 'challenge-grid' : 'challenge-setup';
    }

    updateView();
  });
});

dayPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    setChallengeDays(pill.dataset.days);
  });
});

customDaysInput.addEventListener('input', (event) => {
  const value = event.target.value.trim();
  if (!value) return;
  const days = Number(value);
  if (!Number.isNaN(days) && days >= 1 && days <= 365) {
    setChallengeDays(days);
  }
});

actionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;

    if (action === 'start-challenge') {
      state.challengeStarted = true;
      state.challengeStartDate = new Date();
      state.challengeDays = {};
      state.gridFilter = null;
      state.habits.forEach((habit) => {
        habit.done = false;
      });
      renderHabits();
      updateProgress();
      renderChallengeGrid();
      updateChallengeSummary();
      state.currentView = 'challenge-grid';
      updateView();
      return;
    }

    if (action === 'go-today') {
      state.currentView = 'today';
      updateView();
      return;
    }

    if (action === 'end-challenge') {
      state.challengeStarted = false;
      state.challengeStartDate = null;
      state.challengeDays = {};
      state.gridFilter = null;
      state.currentView = 'challenge-setup';
      updateView();
      return;
    }

    if (action === 'close-modal') {
      closeHabitModal();
      return;
    }

    if (action === 'add-habit') {
      openHabitModal();
    }
  });
});

gridFilterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const requestedFilter = button.dataset.gridFilter;
    state.gridFilter = state.gridFilter === requestedFilter ? null : requestedFilter;
    renderChallengeGrid();
  });
});

iconButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.selectedHabitIcon = button.dataset.icon;
    iconButtons.forEach((iconButton) => {
      iconButton.classList.toggle('selected', iconButton === button);
    });
  });
});

colorButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.selectedHabitColor = button.dataset.color;
    colorButtons.forEach((colorButton) => {
      colorButton.classList.toggle('selected', colorButton === button);
    });
  });
});

habitForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = habitNameInput.value.trim();
  if (!value) {
    habitNameInput.focus();
    return;
  }

  const iconMap = {
    check: '✓',
    sun: '☀',
    walk: '🚶',
    book: '📖',
    spark: '✦',
    heart: '♡',
    drop: '❀',
    flower: '✿',
    moon: '☾',
    plant: '❋',
    coffee: '☕',
    music: '♫',
    fire: '✹',
    stars: '✦',
    timer: '◔',
    target: '◎',
  };

  addHabit(value, iconMap[state.selectedHabitIcon] || '✓', state.selectedHabitColor);
});

themeToggle.addEventListener('click', () => {
  setTheme(state.theme === 'dark' ? 'light' : 'dark');
});

function init() {
  setTheme('dark');
  setChallengeDays(30);
  renderHabits();
  updateProgress();
  updateChallengeSummary();
  updateView();
}

init();
