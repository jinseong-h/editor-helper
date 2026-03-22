/* ===================================
   편집 작업 관리 앱 - 메인 JavaScript
   =================================== */

// ===================================
// Data Store & LocalStorage
// ===================================
const STORAGE_KEYS = {
    CHANNELS: 'editor_app_channels',
    TASKS: 'editor_app_tasks',
    BANK_INFO: 'editor_app_bank_info',
    DAILY_LOGS: 'editor_app_daily_logs',
    THEME: 'editor_app_theme'
};

// 데이터 저장소
let channels = [];
let tasks = [];
let dailyLogs = {}; // YYYY-MM-DD: seconds

// LocalStorage에서 데이터 로드
function loadData() {
    try {
        const savedChannels = localStorage.getItem(STORAGE_KEYS.CHANNELS);
        const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
        const savedDailyLogs = localStorage.getItem(STORAGE_KEYS.DAILY_LOGS);

        channels = savedChannels ? JSON.parse(savedChannels) : [];
        tasks = savedTasks ? JSON.parse(savedTasks) : [];
        dailyLogs = savedDailyLogs ? JSON.parse(savedDailyLogs) : {};

        // 진행 중이던 스탑워치 복원
        tasks.forEach(task => {
            if (task.isRunning && task.lastStartTime) {
                // 앱이 닫혀있던 동안의 시간 계산하지 않음 (일시정지 상태로 변경)
                task.isRunning = false;
                task.lastStartTime = null;
            }
        });
        saveData();
    } catch (e) {
        console.error('데이터 로드 실패:', e);
        channels = [];
        tasks = [];
        dailyLogs = {};
    }
}

// LocalStorage에 데이터 저장
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEYS.CHANNELS, JSON.stringify(channels));
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
        localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(dailyLogs));
    } catch (e) {
        console.error('데이터 저장 실패:', e);
        showToast('데이터 저장에 실패했습니다.', 'error');
    }
}

// UUID 생성
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===================================
// Theme Toggle (Dark Mode)
// ===================================
function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    // 저장된 테마 또는 시스템 설정 확인
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    applyTheme(currentTheme);

    toggleBtn?.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    });

    // 시스템 테마 변경 감지 (사용자가 직접 설정하지 않은 경우)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(STORAGE_KEYS.THEME)) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

function applyTheme(theme) {
    const themeIcon = document.getElementById('theme-icon');
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeIcon) themeIcon.textContent = '🌙';
    }
}

// ===================================
// Guide & Suggestion Modal
// ===================================
function initGuideModal() {
    const infoBtn = document.getElementById('info-btn');
    const closeBtn = document.getElementById('guide-modal-close');

    infoBtn?.addEventListener('click', () => openModal('guide-modal'));
    closeBtn?.addEventListener('click', () => closeModal('guide-modal'));

    const suggestionBtn = document.getElementById('suggestion-btn');
    const suggestionCloseBtn = document.getElementById('suggestion-modal-close');

    suggestionBtn?.addEventListener('click', () => openModal('suggestion-modal'));
    suggestionCloseBtn?.addEventListener('click', () => closeModal('suggestion-modal'));
}

// ===================================
// Navigation
// ===================================
function initNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const pages = document.querySelectorAll('.page');

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPage = tab.dataset.page;

            // 탭 활성화
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // 페이지 전환
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `${targetPage}-page`) {
                    page.classList.add('active');
                }
            });

            // 페이지별 초기화
            if (targetPage === 'summary') {
                updateSummary();
            } else if (targetPage === 'tasks') {
                renderTasks();
            } else if (targetPage === 'settings') {
                renderChannels();
            } else if (targetPage === 'invoice') {
                updateInvoiceChannelSelect();
                updateInvoicePreview();
            } else if (targetPage === 'time-log') {
                renderTimeLog();
            }
        });
    });
}

// ===================================
// Toast Notifications
// ===================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };

    toast.innerHTML = `<span>${icons[type] || '📢'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===================================
// Modal Management
// ===================================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function initModals() {
    // 모달 닫기 버튼들
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target === el) {
                const modal = el.closest('.modal');
                if (modal) modal.classList.remove('active');
            }
        });
    });

    // 취소 버튼들
    document.getElementById('task-cancel-btn')?.addEventListener('click', () => closeModal('task-modal'));
    document.getElementById('channel-cancel-btn')?.addEventListener('click', () => closeModal('channel-modal'));
    document.getElementById('time-edit-cancel')?.addEventListener('click', () => closeModal('time-edit-modal'));
}

// ===================================
// Channel Management
// ===================================
function initChannelManagement() {
    const addBtn = document.getElementById('add-channel-btn');
    const form = document.getElementById('channel-form');

    addBtn?.addEventListener('click', () => {
        resetChannelForm();
        document.getElementById('channel-modal-title').textContent = '고객 추가';
        openModal('channel-modal');
    });

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveChannel();
    });
}

function resetChannelForm() {
    document.getElementById('channel-id').value = '';
    document.getElementById('channel-name').value = '';
    document.getElementById('channel-longform-rate').value = '';
    document.getElementById('channel-shortform-rate').value = '';
    document.getElementById('channel-thumbnail-rate').value = '';
    document.getElementById('channel-memo').value = '';
    document.querySelector('input[name="longform-type"][value="perProject"]').checked = true;
}

function saveChannel() {
    const id = document.getElementById('channel-id').value;
    const name = document.getElementById('channel-name').value.trim();
    const longformType = document.querySelector('input[name="longform-type"]:checked').value;
    const longformRate = parseInt(document.getElementById('channel-longform-rate').value) || 0;
    const shortformRate = parseInt(document.getElementById('channel-shortform-rate').value) || 0;
    const thumbnailRate = parseInt(document.getElementById('channel-thumbnail-rate').value) || 0;
    const memo = document.getElementById('channel-memo').value.trim();

    if (!name) {
        showToast('고객명을 입력해주세요.', 'warning');
        return;
    }

    const channelData = {
        id: id || generateId(),
        name,
        longformType,
        longformRate,
        shortformRate,
        thumbnailRate,
        memo
    };

    if (id) {
        // 수정
        const index = channels.findIndex(c => c.id === id);
        if (index !== -1) {
            channels[index] = channelData;
        }
        showToast('고객이 수정되었습니다.', 'success');
    } else {
        // 추가
        channels.push(channelData);
        showToast('고객이 추가되었습니다.', 'success');
    }

    saveData();
    renderChannels();
    updateChannelSelects();
    closeModal('channel-modal');
}

function editChannel(id) {
    const channel = channels.find(c => c.id === id);
    if (!channel) return;

    document.getElementById('channel-id').value = channel.id;
    document.getElementById('channel-name').value = channel.name;
    document.getElementById('channel-longform-rate').value = channel.longformRate || '';
    document.getElementById('channel-shortform-rate').value = channel.shortformRate || '';
    document.getElementById('channel-thumbnail-rate').value = channel.thumbnailRate || '';
    document.getElementById('channel-memo').value = channel.memo || '';

    const radioBtn = document.querySelector(`input[name="longform-type"][value="${channel.longformType}"]`);
    if (radioBtn) radioBtn.checked = true;

    document.getElementById('channel-modal-title').textContent = '고객 수정';
    openModal('channel-modal');
}

function deleteChannel(id) {
    if (!confirm('정말 이 고객을 삭제하시겠습니까?\n해당 고객의 작업들은 유지됩니다.')) return;

    channels = channels.filter(c => c.id !== id);
    saveData();
    renderChannels();
    updateChannelSelects();
    showToast('고객이 삭제되었습니다.', 'success');
}

function renderChannels() {
    const list = document.getElementById('channels-list');
    const emptyState = document.getElementById('empty-channels');

    if (channels.length === 0) {
        list.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    list.style.display = 'grid';
    emptyState.style.display = 'none';

    list.innerHTML = channels.map(channel => `
        <div class="channel-card">
            <div class="channel-info">
                <h3>${escapeHtml(channel.name)}</h3>
                <div class="channel-rates">
                    <span class="rate-tag">롱폼: <span>${formatCurrency(channel.longformRate)}${channel.longformType === 'perMinute' ? '/분' : '/건'}</span></span>
                    <span class="rate-tag">숏폼: <span>${formatCurrency(channel.shortformRate)}/건</span></span>
                    <span class="rate-tag">썸네일: <span>${formatCurrency(channel.thumbnailRate)}/건</span></span>
                </div>
                ${channel.memo ? `<p class="channel-memo">${escapeHtml(channel.memo)}</p>` : ''}
            </div>
            <div class="channel-actions">
                <button class="btn btn-sm btn-secondary" onclick="editChannel('${channel.id}')">편집</button>
                <button class="btn btn-sm btn-danger" onclick="deleteChannel('${channel.id}')">삭제</button>
            </div>
        </div>
    `).join('');
}

// ===================================
// Task Management
// ===================================
function initTaskManagement() {
    const addBtn = document.getElementById('add-task-btn');
    const form = document.getElementById('task-form');

    addBtn?.addEventListener('click', () => {
        if (channels.length === 0) {
            showToast('먼저 설정에서 고객을 추가해주세요.', 'warning');
            return;
        }
        resetTaskForm();
        document.getElementById('task-modal-title').textContent = '새 작업 추가';
        openModal('task-modal');
    });

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTask();
    });

    // 고객/타입 변경 시 단가 자동 계산
    document.getElementById('task-channel')?.addEventListener('change', updateRateHint);
    document.getElementById('task-type')?.addEventListener('change', updateRateHint);
    document.getElementById('task-video-minutes')?.addEventListener('input', updateRateHint);
    document.getElementById('task-video-seconds')?.addEventListener('input', updateRateHint);

    // 수동으로 단가를 입력하면 자동 계산 플래그 해제
    document.getElementById('task-rate')?.addEventListener('input', (e) => {
        e.target.removeAttribute('data-auto-calculated');
    });

    // 필터링
    document.getElementById('filter-show-completed')?.addEventListener('change', renderTasks);
    document.getElementById('filter-channel')?.addEventListener('change', renderTasks);
    document.getElementById('filter-type')?.addEventListener('change', renderTasks);
    document.getElementById('sort-order')?.addEventListener('change', renderTasks);
}

function resetTaskForm() {
    document.getElementById('task-id').value = '';
    document.getElementById('task-name').value = '';
    document.getElementById('task-channel').value = '';
    document.getElementById('task-type').value = 'longform';
    document.getElementById('task-due-date').value = '';
    document.getElementById('task-video-minutes').value = '0';
    document.getElementById('task-video-seconds').value = '0';
    document.getElementById('task-rate').value = '';
    document.getElementById('task-rate').removeAttribute('data-auto-calculated');
    document.getElementById('rate-hint').textContent = '';

    updateChannelSelects();
}

function updateRateHint() {
    const channelId = document.getElementById('task-channel').value;
    const taskType = document.getElementById('task-type').value;
    const videoMinutes = parseInt(document.getElementById('task-video-minutes').value) || 0;
    const videoSeconds = parseInt(document.getElementById('task-video-seconds').value) || 0;
    const rateHint = document.getElementById('rate-hint');
    const rateInput = document.getElementById('task-rate');

    const channel = channels.find(c => c.id === channelId);
    if (!channel) {
        rateHint.textContent = '';
        return;
    }

    let rate = 0;
    let hint = '';

    switch (taskType) {
        case 'longform':
            if (channel.longformType === 'perMinute') {
                const totalMinutes = videoMinutes + (videoSeconds / 60);
                rate = Math.round(channel.longformRate * totalMinutes);
                hint = `분당 ${formatCurrency(channel.longformRate)} × ${totalMinutes.toFixed(1)}분 = ${formatCurrency(rate)}`;
            } else {
                rate = channel.longformRate;
                hint = `건당 ${formatCurrency(rate)}`;
            }
            break;
        case 'shortform':
            rate = channel.shortformRate;
            hint = `건당 ${formatCurrency(rate)}`;
            break;
        case 'thumbnail':
            rate = channel.thumbnailRate;
            hint = `건당 ${formatCurrency(rate)}`;
            break;
        case 'other':
            hint = '기타 작업 - 직접 입력';
            break;
    }

    rateHint.textContent = hint;

    // 기존 값이 없거나, 이전에 자동 입력된 값이라면 덮어쓰기
    if ((!rateInput.value || rateInput.dataset.autoCalculated === 'true') && rate > 0) {
        rateInput.value = rate;
        rateInput.dataset.autoCalculated = 'true';
    } else if (!rateInput.value) {
        rateInput.removeAttribute('data-auto-calculated');
    }
}

function saveTask() {
    const id = document.getElementById('task-id').value;
    const name = document.getElementById('task-name').value.trim();
    const channelId = document.getElementById('task-channel').value;
    const type = document.getElementById('task-type').value;
    const dueDate = document.getElementById('task-due-date').value;
    const videoMinutes = parseInt(document.getElementById('task-video-minutes').value) || 0;
    const videoSeconds = parseInt(document.getElementById('task-video-seconds').value) || 0;
    const rate = parseInt(document.getElementById('task-rate').value) || 0;

    if (!name || !channelId) {
        showToast('작업명과 고객을 입력해주세요.', 'warning');
        return;
    }

    if (id) {
        // 수정
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.name = name;
            task.channelId = channelId;
            task.type = type;
            task.dueDate = dueDate;
            task.videoDurationMinutes = videoMinutes;
            task.videoDurationSeconds = videoSeconds;
            task.rate = rate;
        }
        showToast('작업이 수정되었습니다.', 'success');
    } else {
        // 추가
        const task = {
            id: generateId(),
            name,
            channelId,
            type,
            dueDate,
            createdAt: new Date().toISOString(),
            completedAt: null,
            isCompleted: false,
            elapsedSeconds: 0,
            isRunning: false,
            lastStartTime: null,
            videoDurationMinutes: videoMinutes,
            videoDurationSeconds: videoSeconds,
            rate,
            isRateLocked: false
        };
        tasks.push(task);
        showToast('작업이 추가되었습니다.', 'success');
    }

    saveData();
    renderTasks();
    closeModal('task-modal');
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById('task-id').value = task.id;
    document.getElementById('task-name').value = task.name;
    document.getElementById('task-channel').value = task.channelId;
    document.getElementById('task-type').value = task.type;
    document.getElementById('task-due-date').value = task.dueDate || '';
    document.getElementById('task-video-minutes').value = task.videoMinutes || '0';
    document.getElementById('task-video-seconds').value = task.videoSeconds || '0';
    document.getElementById('task-rate').value = task.rate || '';

    // 기존 작업을 수정하는 경우 수동 입력된 값으로 간주하여 자동 계산 덮어쓰기 방지
    document.getElementById('task-rate').removeAttribute('data-auto-calculated');

    updateChannelSelects();
    updateRateHint();

    document.getElementById('task-modal-title').textContent = '작업 수정';
    openModal('task-modal');
}

function deleteTask(id) {
    if (!confirm('정말 이 작업을 삭제하시겠습니까?')) return;

    tasks = tasks.filter(t => t.id !== id);
    saveData();
    renderTasks();
    showToast('작업이 삭제되었습니다.', 'success');
}

function toggleTaskComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // 스탑워치 정지
    if (task.isRunning) {
        stopStopwatch(id);
    }

    task.isCompleted = !task.isCompleted;
    task.completedAt = task.isCompleted ? new Date().toISOString() : null;

    saveData();
    renderTasks();

    if (task.isCompleted) {
        showToast('작업이 완료되었습니다! 🎉', 'success');
    }
}

function updateChannelSelects() {
    const selects = [
        document.getElementById('task-channel'),
        document.getElementById('filter-channel'),
        document.getElementById('summary-channel')
    ];

    selects.forEach(select => {
        if (!select) return;

        const currentValue = select.value;
        const isFilterSelect = select.id !== 'task-channel';

        select.innerHTML = isFilterSelect
            ? '<option value="">모든 고객</option>'
            : '<option value="">고객 선택</option>';

        channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = channel.name;
            select.appendChild(option);
        });

        if (currentValue && channels.some(c => c.id === currentValue)) {
            select.value = currentValue;
        }
    });
}

function getFilteredTasks() {
    const showCompleted = document.getElementById('filter-show-completed')?.checked || false;
    const filterChannel = document.getElementById('filter-channel')?.value || '';
    const filterType = document.getElementById('filter-type')?.value || '';
    const sortOrder = document.getElementById('sort-order')?.value || 'createdDesc';

    let filtered = [...tasks];

    // 기본적으로 미완료 작업만 보기
    if (!showCompleted) {
        filtered = filtered.filter(t => !t.isCompleted);
    }

    // 고객 필터
    if (filterChannel) {
        filtered = filtered.filter(t => t.channelId === filterChannel);
    }

    // 작업 종류 필터
    if (filterType) {
        filtered = filtered.filter(t => t.type === filterType);
    }

    // 정렬
    filtered.sort((a, b) => {

        switch (sortOrder) {
            case 'recentWork':
                const aTime = a.lastWorkedAt || new Date(a.createdAt).getTime();
                const bTime = b.lastWorkedAt || new Date(b.createdAt).getTime();
                return bTime - aTime;
            case 'dueAsc':
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            case 'dueDesc':
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(b.dueDate) - new Date(a.dueDate);
            case 'createdDesc':
                return new Date(b.createdAt) - new Date(a.createdAt);
            default:
                return 0;
        }
    });

    return filtered;
}

function createTaskHTML(task) {
    const channel = channels.find(c => c.id === task.channelId);
    const channelName = channel ? channel.name : '(삭제된 고객)';
    const typeLabels = {
        longform: '롱폼',
        shortform: '숏폼',
        thumbnail: '썸네일',
        other: '기타'
    };

    const elapsedSeconds = getTaskElapsedSeconds(task);
    const timeDisplay = formatTime(elapsedSeconds);
    const hourlyRate = calculateHourlyRate(task.rate, elapsedSeconds);

    let cardClass = 'task-card';
    cardClass += ` type-${task.type}`;
    if (task.isRunning) cardClass += ' running';
    if (task.isCompleted) cardClass += ' completed';

    return `
        <div class="${cardClass}" data-task-id="${task.id}">
            <div class="task-card-header">
                <div class="task-header-left">
                    <h3 class="task-title">${escapeHtml(task.name)}</h3>
                    <div class="task-meta">
                        <span class="task-badge">📺 ${escapeHtml(channelName)}</span>
                        <span class="task-badge type-${task.type}">${typeLabels[task.type]}</span>
                        ${task.dueDate ? `<span class="task-badge">📅 ${formatDate(task.dueDate)}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    ${task.isCompleted ? '<span class="completed-badge">완료</span>' : ''}
                    <button class="btn btn-icon btn-secondary" onclick="editTask('${task.id}')" title="수정">✏️</button>
                    <button class="btn btn-icon btn-danger" onclick="deleteTask('${task.id}')" title="삭제">🗑️</button>
                </div>
            </div>
            
            <div class="task-body-grid">
                <div class="stopwatch-section">
                    <div class="stopwatch-display" onclick="openTimeEditModal('${task.id}')" data-task-id="${task.id}">${timeDisplay}</div>
                    <div class="stopwatch-controls">
                        ${task.isRunning
            ? `<button class="stopwatch-btn pause" onclick="stopStopwatch('${task.id}')">⏸</button>`
            : `<button class="stopwatch-btn play" onclick="startStopwatch('${task.id}')">▶</button>`
        }
                        <button class="stopwatch-btn reset" onclick="resetStopwatch('${task.id}')">↺</button>
                    </div>
                </div>
                <div class="task-info-col">
                    <div class="video-duration-section">
                        <div class="video-duration-label">영상 길이</div>
                        <div class="video-duration-inputs">
                            <input type="number" min="0" value="${task.videoDurationMinutes || 0}" 
                                onchange="updateVideoDuration('${task.id}', 'minutes', this.value)">
                            <span>분</span>
                            <input type="number" min="0" max="59" value="${task.videoDurationSeconds || 0}"
                                onchange="updateVideoDuration('${task.id}', 'seconds', this.value)">
                            <span>초</span>
                        </div>
                    </div>
                    <div class="task-stats-inline">
                        <div class="task-stat-inline">
                            <span class="task-stat-label">단가</span>
                            <span class="task-stat-value rate-editable">
                                <input type="number" class="rate-input" value="${task.rate || 0}" 
                                    onchange="updateTaskRate('${task.id}', this.value)"
                                    ${task.isRateLocked ? '' : 'disabled'}>
                                <span class="rate-display ${task.isRateLocked ? 'hidden' : ''}">${formatCurrency(task.rate)}</span>
                                <button class="rate-lock-btn ${task.isRateLocked ? 'locked' : ''}" 
                                    onclick="toggleRateLock('${task.id}')" 
                                    title="${task.isRateLocked ? '자동 계산으로 전환' : '수동 입력 모드'}">
                                    ${task.isRateLocked ? '🔒' : '✏️'}
                                </button>
                            </span>
                        </div>
                        <div class="task-stat-inline">
                            <span class="task-stat-label">시급</span>
                            <span class="task-stat-value">${task.isCompleted && elapsedSeconds > 0 ? formatCurrency(hourlyRate) : '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="task-complete-section">
                <label class="complete-label">
                    <input type="checkbox" class="complete-checkbox" 
                        ${task.isCompleted ? 'checked' : ''} 
                        onchange="toggleTaskComplete('${task.id}')">
                    <span>작업 완료</span>
                </label>
            </div>
        </div>
    `;
}

function renderTasks() {
    const grid = document.getElementById('tasks-grid');
    const activeSection = document.getElementById('active-tasks-section');
    const activeGrid = document.getElementById('active-tasks-grid');
    const emptyState = document.getElementById('empty-tasks');
    const filtered = getFilteredTasks();

    // 활성화된 타이머 작업들 분리 (복사본 생성)
    const activeTasks = tasks.filter(t => t.isRunning);

    // 활성화된 작업 섹션 렌더링
    if (activeTasks.length > 0) {
        activeSection.style.display = 'block';
        activeGrid.innerHTML = activeTasks.map(createTaskHTML).join('');
    } else {
        activeSection.style.display = 'none';
        activeGrid.innerHTML = '';
    }

    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // 전체 목록 (활성화된 작업도 원래 위치에 유지됨)
    grid.innerHTML = filtered.map(createTaskHTML).join('');
}

function updateVideoDuration(taskId, field, value) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    value = parseInt(value) || 0;
    if (field === 'seconds') value = Math.min(59, Math.max(0, value));
    if (field === 'minutes') value = Math.max(0, value);

    if (field === 'minutes') {
        task.videoDurationMinutes = value;
    } else {
        task.videoDurationSeconds = value;
    }

    // 분당 단가인 경우 단가 재계산 (수동 모드가 아닐 때만)
    if (!task.isRateLocked) {
        const channel = channels.find(c => c.id === task.channelId);
        if (channel && task.type === 'longform' && channel.longformType === 'perMinute') {
            const totalMinutes = task.videoDurationMinutes + (task.videoDurationSeconds / 60);
            task.rate = Math.round(channel.longformRate * totalMinutes);
        }
    }

    saveData();
    renderTasks();
}

// 단가 잠금/해제 토글
function toggleRateLock(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.isRateLocked = !task.isRateLocked;

    // 잠금 해제시 자동 계산 적용
    if (!task.isRateLocked) {
        const channel = channels.find(c => c.id === task.channelId);
        if (channel) {
            switch (task.type) {
                case 'longform':
                    if (channel.longformType === 'perMinute') {
                        const totalMinutes = (task.videoDurationMinutes || 0) + ((task.videoDurationSeconds || 0) / 60);
                        task.rate = Math.round(channel.longformRate * totalMinutes);
                    } else {
                        task.rate = channel.longformRate;
                    }
                    break;
                case 'shortform':
                    task.rate = channel.shortformRate;
                    break;
                case 'thumbnail':
                    task.rate = channel.thumbnailRate;
                    break;
            }
        }
        showToast('자동 계산 모드로 전환되었습니다.', 'success');
    } else {
        showToast('수동 입력 모드로 전환되었습니다. 단가를 직접 수정하세요.', 'success');
    }

    saveData();
    renderTasks();
}

// 수동 단가 수정
function updateTaskRate(taskId, value) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.rate = parseInt(value) || 0;
    saveData();
    renderTasks();
}

// ===================================
// Stopwatch Functions
// ===================================
let stopwatchIntervals = {};

function getTaskElapsedSeconds(task) {
    let elapsed = task.elapsedSeconds || 0;
    if (task.isRunning && task.lastStartTime) {
        elapsed += Math.floor((Date.now() - task.lastStartTime) / 1000);
    }
    return elapsed;
}

function startStopwatch(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.isRunning) return;

    task.isRunning = true;
    task.lastStartTime = Date.now();
    task.lastWorkedAt = Date.now();
    saveData();

    // UI 업데이트 인터벌
    stopwatchIntervals[taskId] = setInterval(() => {
        const display = document.querySelector(`.stopwatch-display[data-task-id="${taskId}"]`);
        if (display) {
            display.textContent = formatTime(getTaskElapsedSeconds(task));
        }
    }, 1000);

    renderTasks();
}

// 일별 작업 시간 업데이트 (자정 지날 경우 분할)
function updateDailyLogs(startTime, endTime) {
    let current = new Date(startTime);
    const end = new Date(endTime);

    while (current < end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        // 다음 날 자정
        const nextDay = new Date(year, current.getMonth(), current.getDate() + 1);

        // 현재 날짜의 끝 지점 (다음 날 자정 또는 종료 시간)
        const limit = nextDay < end ? nextDay : end;

        // 해당 날짜의 작업 시간 (초 단위)
        const seconds = Math.floor((limit - current) / 1000);

        if (seconds > 0) {
            dailyLogs[dateKey] = (dailyLogs[dateKey] || 0) + seconds;
        }

        current = nextDay;
    }
}

function stopStopwatch(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.isRunning) return;

    const now = Date.now();

    // 경과 시간 저장
    if (task.lastStartTime) {
        task.elapsedSeconds += Math.floor((now - task.lastStartTime) / 1000);

        // 일별 로그 업데이트
        updateDailyLogs(task.lastStartTime, now);
    }

    task.isRunning = false;
    task.lastStartTime = null;
    task.lastWorkedAt = Date.now();
    saveData();

    // 인터벌 정리
    if (stopwatchIntervals[taskId]) {
        clearInterval(stopwatchIntervals[taskId]);
        delete stopwatchIntervals[taskId];
    }

    renderTasks();
}

function resetStopwatch(taskId) {
    if (!confirm('작업 시간을 초기화하시겠습니까?')) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // 인터벌 정리
    if (stopwatchIntervals[taskId]) {
        clearInterval(stopwatchIntervals[taskId]);
        delete stopwatchIntervals[taskId];
    }

    task.elapsedSeconds = 0;
    task.isRunning = false;
    task.lastStartTime = null;
    saveData();
    renderTasks();
}

function openTimeEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // 스탑워치가 돌아가고 있으면 일시정지
    if (task.isRunning) {
        stopStopwatch(taskId);
    }

    const totalSeconds = task.elapsedSeconds || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    document.getElementById('time-edit-task-id').value = taskId;
    document.getElementById('time-edit-hours').value = hours;
    document.getElementById('time-edit-minutes').value = minutes;
    document.getElementById('time-edit-seconds').value = seconds;

    openModal('time-edit-modal');
}

function initTimeEditModal() {
    const form = document.getElementById('time-edit-form');
    form?.addEventListener('submit', (e) => {
        e.preventDefault();

        const taskId = document.getElementById('time-edit-task-id').value;
        const hours = parseInt(document.getElementById('time-edit-hours').value) || 0;
        const minutes = parseInt(document.getElementById('time-edit-minutes').value) || 0;
        const seconds = parseInt(document.getElementById('time-edit-seconds').value) || 0;

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        task.elapsedSeconds = (hours * 3600) + (minutes * 60) + seconds;
        task.lastWorkedAt = Date.now();
        saveData();
        renderTasks();
        closeModal('time-edit-modal');
        showToast('작업 시간이 수정되었습니다.', 'success');
    });
}

// 페이지 종료 시 실행 중인 스탑워치 저장 로직 제거 (다른 기기에서 타이머가 멈추는 버그 수정)

// ===================================
// Summary Page
// ===================================
function initSummaryPage() {
    document.getElementById('summary-period')?.addEventListener('change', updateSummary);
    document.getElementById('summary-channel')?.addEventListener('change', updateSummary);

    // 월별 옵션 생성
    generatePeriodOptions();
}

function generatePeriodOptions(selectedPeriod = null) {
    const select = document.getElementById('summary-period');
    if (!select) return;

    // 기존 옵션 유지 (전체 기간)
    select.innerHTML = '<option value="all">전체 기간</option>';

    // 작업이 있는 월들 찾기
    const months = new Set();
    tasks.forEach(task => {
        if (task.completedAt) {
            const date = new Date(task.completedAt);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.add(yearMonth);
        }
    });

    // 정렬 후 옵션 추가
    Array.from(months).sort().reverse().forEach(yearMonth => {
        const [year, month] = yearMonth.split('-');
        const option = document.createElement('option');
        option.value = yearMonth;
        option.textContent = `${year}년 ${parseInt(month)}월`;
        select.appendChild(option);
    });

    // 선택값 복원
    if (selectedPeriod && select.querySelector(`option[value="${selectedPeriod}"]`)) {
        select.value = selectedPeriod;
    }
}

function updateSummary() {
    const period = document.getElementById('summary-period')?.value || 'all';
    const channelId = document.getElementById('summary-channel')?.value || '';

    // 완료된 작업만 필터링
    let filteredTasks = tasks.filter(t => t.isCompleted);

    // 기간 필터
    if (period !== 'all') {
        filteredTasks = filteredTasks.filter(task => {
            if (!task.completedAt) return false;
            const date = new Date(task.completedAt);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return yearMonth === period;
        });
    }

    // 고객 필터
    if (channelId) {
        filteredTasks = filteredTasks.filter(t => t.channelId === channelId);
    }

    // 통계 계산
    const totalTasks = filteredTasks.length;
    const totalRate = filteredTasks.reduce((sum, t) => sum + (t.rate || 0), 0);
    const totalSeconds = filteredTasks.reduce((sum, t) => sum + (t.elapsedSeconds || 0), 0);
    const totalHours = totalSeconds / 3600;
    const avgHourly = totalHours > 0 ? Math.floor(totalRate / totalHours) : 0;

    // UI 업데이트
    document.getElementById('total-tasks').textContent = totalTasks.toLocaleString();
    document.getElementById('total-earnings').textContent = formatCurrency(totalRate);
    document.getElementById('total-time').textContent = formatDuration(totalSeconds);
    document.getElementById('avg-hourly').textContent = formatCurrency(avgHourly);

    // 고객별 시급 차트 업데이트
    updateHourlyChart(filteredTasks);

    // 기간 옵션 업데이트 (선택값 유지)
    generatePeriodOptions(period);
}

function updateHourlyChart(filteredTasks) {
    const container = document.getElementById('hourly-chart');
    if (!container) return;

    // 고객별 통계 계산
    const channelStats = {};

    filteredTasks.forEach(task => {
        if (!channelStats[task.channelId]) {
            channelStats[task.channelId] = {
                totalRate: 0,
                totalSeconds: 0
            };
        }
        channelStats[task.channelId].totalRate += task.rate || 0;
        channelStats[task.channelId].totalSeconds += task.elapsedSeconds || 0;
    });

    // 시급 계산 및 정렬
    const chartData = Object.entries(channelStats)
        .map(([channelId, stats]) => {
            const channel = channels.find(c => c.id === channelId);
            const hourlyRate = stats.totalSeconds > 0
                ? Math.floor(stats.totalRate / (stats.totalSeconds / 3600))
                : 0;
            return {
                name: channel ? channel.name : '(삭제된 고객)',
                hourlyRate
            };
        })
        .filter(d => d.hourlyRate > 0)
        .sort((a, b) => b.hourlyRate - a.hourlyRate);

    if (chartData.length === 0) {
        container.innerHTML = '<div class="chart-empty">표시할 데이터가 없습니다</div>';
        return;
    }

    const maxRate = Math.max(...chartData.map(d => d.hourlyRate));

    container.innerHTML = chartData.map(data => `
        <div class="chart-bar-container">
            <div class="chart-bar-label">
                <span class="chart-bar-name">${escapeHtml(data.name)}</span>
                <span class="chart-bar-value">${formatCurrency(data.hourlyRate)}/시간</span>
            </div>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width: ${(data.hourlyRate / maxRate * 100)}%"></div>
            </div>
        </div>
    `).join('');
}

// ===================================
// Invoice Page (작업내역서 제작)
// ===================================
let selectedInvoiceMonth = null;
let invoiceStartDate = null;
let invoiceEndDate = null;

function initInvoicePage() {
    // 고객 선택 드롭다운에 고객 추가
    updateInvoiceChannelSelect();

    // 월 선택 버튼 생성
    generateMonthButtons();

    // 기간 선택 토글
    document.getElementById('custom-period-toggle')?.addEventListener('change', (e) => {
        const monthSelector = document.getElementById('month-selector');
        const customSelector = document.getElementById('custom-period-selector');

        if (e.target.checked) {
            monthSelector.style.display = 'none';
            customSelector.style.display = 'block';
            selectedInvoiceMonth = null;
        } else {
            monthSelector.style.display = 'grid';
            customSelector.style.display = 'none';
            invoiceStartDate = null;
            invoiceEndDate = null;
        }
        updateInvoicePreview();
    });

    // 세부 기간 선택 이벤트
    document.getElementById('invoice-start-date')?.addEventListener('change', (e) => {
        invoiceStartDate = e.target.value;
        updateInvoicePreview();
    });

    document.getElementById('invoice-end-date')?.addEventListener('change', (e) => {
        invoiceEndDate = e.target.value;
        updateInvoicePreview();
    });

    // 고객 선택 이벤트
    document.getElementById('invoice-channel')?.addEventListener('change', updateInvoicePreview);

    // 입금 정보 저장/불러오기
    document.getElementById('save-bank-info-btn')?.addEventListener('click', saveBankInfo);
    document.getElementById('load-bank-info-btn')?.addEventListener('click', loadBankInfo);

    // PDF 생성 버튼
    document.getElementById('generate-pdf-btn')?.addEventListener('click', generateInvoicePDF);
}

function updateInvoiceChannelSelect() {
    const select = document.getElementById('invoice-channel');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">고객 선택</option>';

    channels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = channel.name;
        select.appendChild(option);
    });

    if (currentValue && channels.some(c => c.id === currentValue)) {
        select.value = currentValue;
    }
}

function generateMonthButtons() {
    const container = document.getElementById('month-selector');
    if (!container) return;

    const months = [];
    const now = new Date();

    // 최근 12개월 생성
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            label: `${date.getFullYear()}년 ${date.getMonth() + 1}월`
        });
    }

    container.innerHTML = months.map(month => `
        <button class="month-btn" data-month="${month.value}">${month.label}</button>
    `).join('');

    // 월 버튼 클릭 이벤트
    container.querySelectorAll('.month-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedInvoiceMonth = btn.dataset.month;
            updateInvoicePreview();
        });
    });
}

function getInvoiceTasks() {
    const channelId = document.getElementById('invoice-channel')?.value;
    if (!channelId) return [];

    let startDate, endDate;

    // 월 선택 모드
    if (selectedInvoiceMonth) {
        const [year, month] = selectedInvoiceMonth.split('-');
        startDate = new Date(year, parseInt(month) - 1, 1);
        endDate = new Date(year, parseInt(month), 0, 23, 59, 59);
    }
    // 세부 기간 선택 모드
    else if (invoiceStartDate && invoiceEndDate) {
        startDate = new Date(invoiceStartDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(invoiceEndDate);
        endDate.setHours(23, 59, 59, 999);
    } else {
        return [];
    }

    return tasks.filter(task => {
        if (!task.isCompleted || !task.completedAt || task.channelId !== channelId) {
            return false;
        }
        const completedAt = new Date(task.completedAt);
        return completedAt >= startDate && completedAt <= endDate;
    }).sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
}

function updateInvoicePreview() {
    const container = document.getElementById('invoice-preview');
    if (!container) return;

    const channelId = document.getElementById('invoice-channel')?.value;
    const channel = channels.find(c => c.id === channelId);

    if (!channelId) {
        container.innerHTML = '<p class="preview-placeholder">고객을 선택해주세요.</p>';
        return;
    }

    if (!selectedInvoiceMonth && (!invoiceStartDate || !invoiceEndDate)) {
        container.innerHTML = '<p class="preview-placeholder">기간을 선택해주세요.</p>';
        return;
    }

    const invoiceTasks = getInvoiceTasks();

    if (invoiceTasks.length === 0) {
        container.innerHTML = '<p class="preview-placeholder">선택한 기간에 완료된 작업이 없습니다.</p>';
        return;
    }

    const totalAmount = invoiceTasks.reduce((sum, t) => sum + (t.rate || 0), 0);
    const typeLabels = {
        longform: '롱폼',
        shortform: '숏폼',
        thumbnail: '썸네일',
        other: '기타'
    };

    // 기간 텍스트
    let periodText = '';
    if (selectedInvoiceMonth) {
        const [year, month] = selectedInvoiceMonth.split('-');
        periodText = `${year}년 ${parseInt(month)}월`;
    } else {
        periodText = `${invoiceStartDate} ~ ${invoiceEndDate}`;
    }

    // 입금 정보
    const bankName = document.getElementById('bank-name')?.value || '';
    const accountNumber = document.getElementById('account-number')?.value || '';
    const accountHolder = document.getElementById('account-holder')?.value || '';
    const hasBankInfo = bankName && accountNumber && accountHolder;

    container.innerHTML = `
        <div class="invoice-preview-content">
            <h2>작업내역서</h2>
            <div class="invoice-info">
                <div class="invoice-info-item">
                    <span class="invoice-info-label">고객:</span>
                    <span>${escapeHtml(channel.name)}</span>
                </div>
                <div class="invoice-info-item">
                    <span class="invoice-info-label">기간:</span>
                    <span>${periodText}</span>
                </div>
            </div>
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>번호</th>
                        <th>작업명</th>
                        <th>작업종류</th>
                        <th>영상길이</th>
                        <th>완료일</th>
                        <th class="amount">단가</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoiceTasks.map((task, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHtml(task.name)}</td>
                            <td>${typeLabels[task.type] || task.type}</td>
                            <td>${(task.videoDurationMinutes || task.videoDurationSeconds) ? `${task.videoDurationMinutes || 0}분 ${task.videoDurationSeconds || 0}초` : '-'}</td>
                            <td>${formatFullDate(task.completedAt)}</td>
                            <td class="amount">${formatCurrency(task.rate)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="invoice-total">
                <span class="label">총 ${invoiceTasks.length}건</span>
                <span class="value">${formatCurrency(totalAmount)}</span>
            </div>
            ${hasBankInfo ? `
                <div class="invoice-bank-info">
                    <h4>💳 입금 정보</h4>
                    <p><strong>${escapeHtml(bankName)}</strong> ${escapeHtml(accountNumber)}</p>
                    <p>예금주: ${escapeHtml(accountHolder)}</p>
                </div>
            ` : ''}
        </div>
    `;
}

function saveBankInfo() {
    const bankInfo = {
        bankName: document.getElementById('bank-name')?.value || '',
        accountNumber: document.getElementById('account-number')?.value || '',
        accountHolder: document.getElementById('account-holder')?.value || ''
    };

    localStorage.setItem(STORAGE_KEYS.BANK_INFO, JSON.stringify(bankInfo));

    // 클라우드 동기화
    if (currentSyncCode && firebaseDb) {
        uploadToCloud().catch(e => console.error('입금 정보 동기화 실패:', e));
    }

    showToast('입금 정보가 저장되었습니다.', 'success');
}

function loadBankInfo() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.BANK_INFO);
        if (!saved) {
            showToast('저장된 입금 정보가 없습니다.', 'warning');
            return null;
        }

        const bankInfo = JSON.parse(saved);
        document.getElementById('bank-name').value = bankInfo.bankName || '';
        document.getElementById('account-number').value = bankInfo.accountNumber || '';
        document.getElementById('account-holder').value = bankInfo.accountHolder || '';

        showToast('입금 정보를 불러왔습니다.', 'success');
        updateInvoicePreview();
        return bankInfo;
    } catch (e) {
        console.error('입금 정보 로드 실패:', e);
        return null;
    }
}

function getBankInfo() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.BANK_INFO);
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        return null;
    }
}

function formatFullDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function generateInvoicePDF() {
    const channelId = document.getElementById('invoice-channel')?.value;
    const channel = channels.find(c => c.id === channelId);

    if (!channelId || !channel) {
        showToast('고객을 선택해주세요.', 'warning');
        return;
    }

    if (!selectedInvoiceMonth && (!invoiceStartDate || !invoiceEndDate)) {
        showToast('기간을 선택해주세요.', 'warning');
        return;
    }

    const invoiceTasks = getInvoiceTasks();

    if (invoiceTasks.length === 0) {
        showToast('선택한 기간에 완료된 작업이 없습니다.', 'warning');
        return;
    }

    const totalAmount = invoiceTasks.reduce((sum, t) => sum + (t.rate || 0), 0);
    const typeLabels = {
        longform: '롱폼',
        shortform: '숏폼',
        thumbnail: '썸네일',
        other: '기타'
    };

    // 기간 텍스트
    let periodText = '';
    if (selectedInvoiceMonth) {
        const [year, month] = selectedInvoiceMonth.split('-');
        periodText = `${year}년 ${parseInt(month)}월`;
    } else {
        periodText = `${invoiceStartDate} ~ ${invoiceEndDate}`;
    }

    // 입금 정보
    const bankName = document.getElementById('bank-name')?.value || '';
    const accountNumber = document.getElementById('account-number')?.value || '';
    const accountHolder = document.getElementById('account-holder')?.value || '';
    const hasBankInfo = bankName && accountNumber && accountHolder;

    // 인쇄용 HTML 생성
    const printContent = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <title>작업내역서 - ${channel.name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: 'Noto Sans KR', sans-serif;
                    padding: 40px;
                    color: #333;
                    background: white;
                }
                h1 {
                    text-align: center;
                    font-size: 28px;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #333;
                    padding-bottom: 15px;
                }
                .info-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 25px;
                    font-size: 14px;
                }
                .info-item {
                    display: flex;
                    gap: 8px;
                }
                .info-label {
                    color: #666;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 25px;
                }
                th, td {
                    border: 1px solid #333;
                    padding: 10px;
                    text-align: left;
                    font-size: 13px;
                }
                th {
                    background: #f5f5f5;
                    font-weight: 600;
                }
                .amount {
                    text-align: right;
                }
                .total-section {
                    text-align: right;
                    font-size: 16px;
                    margin-bottom: 30px;
                    padding: 15px;
                    background: #f9f9f9;
                    border-radius: 8px;
                }
                .total-section strong {
                    font-size: 20px;
                    color: #5c4ce7;
                }
                .bank-section {
                    border: 2px solid #5c4ce7;
                    padding: 20px;
                    border-radius: 8px;
                    background: #f8f7ff;
                }
                .bank-section h4 {
                    margin-bottom: 12px;
                    font-size: 14px;
                    color: #666;
                }
                .bank-section p {
                    margin: 5px 0;
                    font-size: 15px;
                }
                .bank-section strong {
                    color: #5c4ce7;
                }
                @media print {
                    body { padding: 20mm; }
                }
            </style>
        </head>
        <body>
            <h1>작업내역서</h1>
            <div class="info-section">
                <div class="info-item">
                    <span class="info-label">고객:</span>
                    <span>${escapeHtml(channel.name)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">기간:</span>
                    <span>${periodText}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">발행일:</span>
                    <span>${formatFullDate(new Date().toISOString())}</span>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">번호</th>
                        <th>작업명</th>
                        <th style="width: 80px;">작업종류</th>
                        <th style="width: 80px;">영상길이</th>
                        <th style="width: 100px;">완료일</th>
                        <th style="width: 120px;" class="amount">단가</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoiceTasks.map((task, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHtml(task.name)}</td>
                            <td>${typeLabels[task.type] || task.type}</td>
                            <td>${(task.videoDurationMinutes || task.videoDurationSeconds) ? `${task.videoDurationMinutes || 0}분 ${task.videoDurationSeconds || 0}초` : '-'}</td>
                            <td>${formatFullDate(task.completedAt)}</td>
                            <td class="amount">${formatCurrency(task.rate)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="total-section">
                총 ${invoiceTasks.length}건 &nbsp;&nbsp;|&nbsp;&nbsp; 합계: <strong>${formatCurrency(totalAmount)}</strong>
            </div>
            ${hasBankInfo ? `
                <div class="bank-section">
                    <h4>💳 입금 안내</h4>
                    <p><strong>${escapeHtml(bankName)}</strong> ${escapeHtml(accountNumber)}</p>
                    <p>예금주: ${escapeHtml(accountHolder)}</p>
                </div>
            ` : ''}
        </body>
        </html>
    `;

    // 새 창에서 인쇄
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // 잠시 후 인쇄 대화상자 열기
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// ===================================
// Data Import/Export
// ===================================
function initDataManagement() {
    const exportBtn = document.getElementById('export-data-btn');
    const importBtn = document.getElementById('import-data-btn');
    const importInput = document.getElementById('import-file-input');

    exportBtn?.addEventListener('click', exportData);
    importBtn?.addEventListener('click', () => importInput?.click());
    importInput?.addEventListener('change', handleImportFile);

    // 불러오기 옵션 버튼
    document.getElementById('import-overwrite')?.addEventListener('click', () => importData('overwrite'));
    document.getElementById('import-append')?.addEventListener('click', () => importData('append'));
}

function exportData() {
    const data = {
        version: 3,
        exportedAt: new Date().toISOString(),
        channels,
        tasks,
        dailyLogs,
        bankInfo: getBankInfo()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `편집관리_백업_${formatDateForFilename(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('데이터가 다운로드되었습니다.', 'success');
}

let pendingImportData = null;

function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            pendingImportData = JSON.parse(event.target.result);

            // 데이터 유효성 검사
            if (!pendingImportData.channels || !pendingImportData.tasks) {
                throw new Error('올바른 백업 파일이 아닙니다.');
            }

            openModal('import-modal');
        } catch (err) {
            showToast('파일을 읽을 수 없습니다: ' + err.message, 'error');
            pendingImportData = null;
        }
    };
    reader.readAsText(file);

    // 같은 파일을 다시 선택할 수 있도록 초기화
    e.target.value = '';
}

function importData(mode) {
    if (!pendingImportData) return;

    try {
        if (mode === 'overwrite') {
            channels = pendingImportData.channels || [];
            tasks = pendingImportData.tasks || [];
            dailyLogs = pendingImportData.dailyLogs || {};

            // version 2+: bankInfo 가져오기
            if (pendingImportData.bankInfo) {
                localStorage.setItem(STORAGE_KEYS.BANK_INFO, JSON.stringify(pendingImportData.bankInfo));
            }
        } else {
            // 추가 모드: ID 충돌 방지를 위해 새 ID 부여
            const newChannels = (pendingImportData.channels || []).map(c => ({
                ...c,
                id: generateId()
            }));

            // 고객 ID 매핑
            const channelIdMap = {};
            pendingImportData.channels?.forEach((oldChannel, index) => {
                channelIdMap[oldChannel.id] = newChannels[index].id;
            });

            // 작업의 고객 ID도 업데이트
            const newTasks = (pendingImportData.tasks || []).map(t => ({
                ...t,
                id: generateId(),
                channelId: channelIdMap[t.channelId] || t.channelId
            }));

            channels = [...channels, ...newChannels];
            tasks = [...tasks, ...newTasks];

            // 일별 로그 병합
            const importedLogs = pendingImportData.dailyLogs || {};
            Object.entries(importedLogs).forEach(([date, seconds]) => {
                dailyLogs[date] = (dailyLogs[date] || 0) + seconds;
            });

            // 추가 모드에서 bankInfo는 덮어쓰지 않음 (기존 정보 유지)
        }

        saveData();
        renderChannels();
        renderTasks();
        updateChannelSelects();
        updateSummary();
        renderTimeLog(); // New

        closeModal('import-modal');
        showToast(mode === 'overwrite' ? '데이터를 덮어썼습니다.' : '데이터를 추가했습니다.', 'success');
    } catch (err) {
        showToast('데이터 불러오기 실패: ' + err.message, 'error');
    }
    pendingImportData = null;
}

// ===================================
// Time Log Page (New)
// ===================================
function initTimeLogPage() {
    // 기간 선택 버튼
    const periodBtns = document.querySelectorAll('.period-btn');
    periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            periodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const range = btn.dataset.range;
            const monthSelector = document.getElementById('time-log-month-selector');

            if (range === 'month') {
                monthSelector.style.display = 'block';
                generateTimeLogMonthOptions();
            } else {
                monthSelector.style.display = 'none';
            }

            renderTimeLog();
        });
    });

    // 월 선택 변경
    document.getElementById('time-log-month')?.addEventListener('change', renderTimeLog);
}

function generateTimeLogMonthOptions() {
    const select = document.getElementById('time-log-month');
    if (!select) return;

    select.innerHTML = '';
    const months = new Set(Object.keys(dailyLogs).map(date => date.substring(0, 7)));

    // 현재 달이 없으면 추가
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    months.add(currentMonth);

    Array.from(months).sort().reverse().forEach(yearMonth => {
        const [year, month] = yearMonth.split('-');
        const option = document.createElement('option');
        option.value = yearMonth;
        option.textContent = `${year}년 ${parseInt(month)}월`;
        select.appendChild(option);
    });
}

function renderTimeLog() {
    const rangeBtn = document.querySelector('.period-btn.active');
    const range = rangeBtn ? rangeBtn.dataset.range : '7days';

    let startDate, endDate;
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    if (range === '7days') {
        endDate = new Date(now);
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
    } else if (range === '30days') {
        endDate = new Date(now);
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 29);
    } else if (range === 'month') {
        const selectedMonth = document.getElementById('time-log-month')?.value;
        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            startDate = new Date(year, parseInt(month) - 1, 1);
            endDate = new Date(year, parseInt(month), 0);
        } else {
            // 기본값: 이번 달
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
    }

    // 날짜별 데이터 수집
    const chartLabels = [];
    const chartValues = [];
    let totalSeconds = 0;

    // 시작일~종료일 반복
    const iterDate = new Date(startDate);
    iterDate.setHours(0, 0, 0, 0);
    const endIter = new Date(endDate);
    endIter.setHours(23, 59, 59, 999);

    // 안전장치: 너무 긴 기간 방지 (최대 365일)
    let safeGuard = 0;

    while (iterDate <= endIter && safeGuard < 365) {
        const year = iterDate.getFullYear();
        const month = String(iterDate.getMonth() + 1).padStart(2, '0');
        const day = String(iterDate.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        const seconds = dailyLogs[dateKey] || 0;
        totalSeconds += seconds;

        chartLabels.push(`${parseInt(month)}/${parseInt(day)}`);
        chartValues.push(seconds); // 초 단위

        iterDate.setDate(iterDate.getDate() + 1);
        safeGuard++;
    }

    // 통계 계산
    const daysCount = chartValues.length;
    const avgSeconds = daysCount > 0 ? Math.floor(totalSeconds / daysCount) : 0;

    // UI 업데이트
    document.getElementById('period-total-time').textContent = formatDuration(totalSeconds);
    document.getElementById('daily-average-time').textContent = formatDuration(avgSeconds);

    // 차트 그리기
    const container = document.getElementById('daily-time-chart');
    if (container) {
        container.innerHTML = '';
        if (chartValues.every(v => v === 0)) {
            container.innerHTML = '<div class="chart-empty">기록된 작업 시간이 없습니다</div>';
        } else {
            const maxSeconds = Math.max(...chartValues, 3600); // 최소 1시간 기준

            container.innerHTML = chartValues.map((seconds, index) => {
                const heightPercent = Math.max((seconds / maxSeconds) * 100, 2); // 최소 높이 보장
                const label = chartLabels[index];

                let chartTimeHtml = '';
                if (seconds === 0) {
                    chartTimeHtml = '<span style="color: var(--text-disabled); font-size: 14px;">-</span>';
                } else {
                    const h = Math.floor(seconds / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    if (h > 0 && m > 0) {
                        chartTimeHtml = `${h}시간<br>${m}분`;
                    } else if (h > 0) {
                        chartTimeHtml = `${h}시간`;
                    } else {
                        chartTimeHtml = `${m}분`;
                    }
                }

                return `
                    <div class="daily-bar">
                        <div class="daily-bar-value">${chartTimeHtml}</div>
                        <div class="daily-bar-track">
                            <div class="daily-bar-fill" style="height: ${heightPercent}%"></div>
                        </div>
                        <div class="daily-bar-label">${label}</div>
                    </div>
                `;
            }).join('');
        }
    }
}

// ===================================
// Utility Functions
// ===================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCurrency(amount) {
    if (!amount) return '0원';
    return amount.toLocaleString() + '원';
}

function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDateForFilename(date) {
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function calculateHourlyRate(rate, elapsedSeconds) {
    if (!rate || !elapsedSeconds) return 0;
    const hours = elapsedSeconds / 3600;
    return Math.floor(rate / hours);
}

// ===================================
// Firebase Cloud Sync
// ===================================

// 글로벌 상태 변수
let currentDate = new Date();
let currentView = 'day'; // 'day', 'week', 'month'
let selectedTasks = new Set();
let isCloudSyncing = false;
let isSyncConnecting = false;
let isApplyingCloudData = false;
let syncListener = null;
let syncListenerRef = null;
let pendingOfflineData = false;
let currentEditingTaskId = null; // 수정 중인 작업 ID 저장

// Firebase 설정 - 사용자 Firebase 프로젝트
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCCT2GfTaQGvinrOOv6kUpVbewFzIt_hjw",
    authDomain: "edito-work-manager.firebaseapp.com",
    databaseURL: "https://edito-work-manager-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "edito-work-manager",
    storageBucket: "edito-work-manager.firebasestorage.app",
    messagingSenderId: "1069894148361",
    appId: "1:1069894148361:web:27f254aab64feb69c2b3d8"
};

let firebaseApp = null;
let firebaseDb = null;

// Firebase 초기화
function initFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
            firebaseDb = firebase.database();
            console.log('☁️ Firebase 초기화 완료');

            // 리다이렉트 결과 처리 (에러 핸들링)
            firebase.auth().getRedirectResult().catch((error) => {
                console.error('Google 로그인 결과 에러:', error);
                if (error.code === 'auth/operation-not-allowed') {
                    alert('Firebase 콘솔에서 Google 로그인 제공업체가 활성화되지 않았습니다.');
                } else if (error.code === 'auth/unauthorized-domain') {
                    alert('승인되지 않은 도메인입니다. Firebase 콘솔의 Authentication -> Settings -> 승인된 도메인에 현재 접속 중인 주소를 추가해주세요.');
                } else if (window.location.protocol === 'file:') {
                    alert('로컬 파일(file://) 환경에서는 리다이렉트 로그인이 작동하지 않을 수 있습니다.');
                } else {
                    alert('로그인 에러: ' + error.message);
                }
            });

            // 로그인 상태 감지
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    console.log('✅ Google 로그인 성공:', user.email);
                    // 로그인 게이트 숨기고 앱 보이기
                    showApp();
                    connectToGoogleSync(user);
                } else {
                    console.log('🔌 로그아웃 상태');
                    // 로그인 게이트 보이고 앱 숨기기
                    showLoginGate();
                    disconnectSync();
                }
            });
        } else {
            console.warn('Firebase SDK가 로드되지 않았습니다.');
        }
    } catch (e) {
        console.error('Firebase 초기화 실패:', e);
    }
}

// 로그인 게이트 표시
function showLoginGate() {
    const gate = document.getElementById('login-gate');
    const app = document.getElementById('app-container');
    if (gate) gate.style.display = 'flex';
    if (app) app.style.display = 'none';
}

// 앱 표시
function showApp() {
    const gate = document.getElementById('login-gate');
    const app = document.getElementById('app-container');
    if (gate) gate.style.display = 'none';
    if (app) app.style.display = 'block';
}

// 클라우드 동기화 UI 초기화
function initCloudSync() {
    // 설정 탭 동기화 버튼
    document.getElementById('cloud-sync-btn')?.addEventListener('click', () => {
        updateSyncModalView();
        openModal('sync-modal');
    });

    // 상단 탭바 프로필 버튼 클릭 → 동기화 모달 열기
    document.getElementById('nav-profile-btn')?.addEventListener('click', () => {
        updateSyncModalView();
        openModal('sync-modal');
    });

    // 로그인 게이트 버튼
    document.getElementById('login-gate-btn')?.addEventListener('click', () => {
        loginWithGoogle();
    });

    // Google 로그인 (모달 내 버튼)
    document.getElementById('google-login-btn')?.addEventListener('click', () => {
        loginWithGoogle();
    });

    // 수동 동기화
    document.getElementById('sync-manual-btn')?.addEventListener('click', () => {
        const user = firebase.auth().currentUser;
        if (user) {
            uploadToCloud();
            showToast('클라우드에 안전하게 동기화했습니다.', 'success');
        } else {
            showToast('먼저 로그인해주세요.', 'warning');
        }
    });

    // 로그아웃
    document.getElementById('sync-logout-btn')?.addEventListener('click', () => {
        if (confirm('로그아웃하시겠습니까?\n로그아웃하면 로그인 화면으로 돌아갑니다.')) {
            firebase.auth().signOut().then(() => {
                // 저장된 클라우드 업데이트 시간 및 로컬 데이터 모두 초기화
                localStorage.removeItem('editor_app_updated_at');
                
                // 계정 전환 시 데이터 잔류를 막기 위해 로컬 데이터 삭제
                localStorage.removeItem(STORAGE_KEYS.CHANNELS);
                localStorage.removeItem(STORAGE_KEYS.TASKS);
                localStorage.removeItem(STORAGE_KEYS.DAILY_LOGS);
                localStorage.removeItem(STORAGE_KEYS.BANK_INFO);
                
                // 메모리 상의 데이터도 초기화
                channels = [];
                tasks = [];
                dailyLogs = {};
                if (typeof selectedTasks !== 'undefined') {
                    selectedTasks.clear();
                }
                
                // 화면 초기화
                renderChannels();
                renderTasks();
                if (typeof updateSummary === 'function') {
                    updateSummary();
                }
                
                // 은행 정보 폼 초기화
                const bankNameInput = document.getElementById('bank-name');
                const accountNumberInput = document.getElementById('account-number');
                const accountHolderInput = document.getElementById('account-holder');
                
                if (bankNameInput) bankNameInput.value = '';
                if (accountNumberInput) accountNumberInput.value = '';
                if (accountHolderInput) accountHolderInput.value = '';
                
                showToast('로그아웃 되었습니다.', 'success');
            }).catch((error) => {
                console.error('로그아웃 실패:', error);
            });
        }
    });
}

// Google 로그인 공통 함수
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    firebase.auth().signInWithPopup(provider).catch((error) => {
        console.error('Google 로그인 실패:', error);
        showToast('로그인에 실패했습니다.', 'error');
        
        if (error.code === 'auth/operation-not-allowed') {
            alert('Firebase 콘솔에서 Google 로그인 제공업체가 활성화되지 않았습니다.');
        } else if (error.code === 'auth/unauthorized-domain') {
            alert('승인되지 않은 도메인입니다. Firebase 콘솔의 Authentication -> Settings -> 승인된 도메인에 현재 접속 중인 주소를 추가해주세요. (현재 URL: ' + window.location.hostname + ')');
        } else if (window.location.protocol === 'file:') {
            alert('로컬 파일(file://) 환경에서는 Google 로그인이 작동하지 않을 수 있습니다.');
        } else {
            alert('로그인 에러: ' + error.message);
        }
    });
}

// Google 로그인 계정으로 데이터 동기화 연결
async function connectToGoogleSync(user) {
    if (!firebaseDb || !user) return;

    isSyncConnecting = true; // 동기화 연결 중 로컬→클라우드 자동 업로드 차단
    showLoading('데이터 동기화 중...');

    try {
        // 기존 리스너 해제 (이전 계정의 리스너가 남아있는 경우를 대비)
        if (syncListener && syncListenerRef) {
            syncListenerRef.off('value', syncListener);
            syncListener = null;
            syncListenerRef = null;
        }

        // 클라우드에서 데이터 확인 (users/uid 경로 사용)
        const snapshot = await firebaseDb.ref(`users/${user.uid}`).once('value');
        const cloudData = snapshot.val();

        if (cloudData) {
            // 로그인/재로그인 시 항상 클라우드 데이터를 우선 적용
            // (로컬 타임스탬프와 비교하지 않음 — 재로그인 기기의 오래된 로컬 데이터가
            //  클라우드의 최신 데이터를 덮어쓰는 치명적 버그 방지)
            applyCloudData(cloudData);
            if (cloudData.updatedAt) {
                localStorage.setItem('editor_app_updated_at', cloudData.updatedAt.toString());
            }
            showToast('클라우드에서 데이터를 동기화했습니다.', 'success');
        } else {
            // 새 사용자이거나 클라우드에 데이터가 없으면 로컬 데이터 업로드
            await uploadToCloud();
        }

        // 실시간 동기화 리스너 설정
        setupSyncListener();

        updateSyncStatus(true);
        updateSyncModalView();

        closeModal('sync-modal');
    } catch (e) {
        console.error('동기화 연결 실패:', e);
        showToast('동기화 연결에 실패했습니다. 권한을 확인해주세요.', 'error');
    } finally {
        hideLoading();
        isSyncConnecting = false; // 보호 플래그 해제
    }
}

// 클라우드에 데이터 업로드
async function uploadToCloud(timestamp = Date.now()) {
    if (!firebaseDb) return;

    // 인증 상태 확인
    const user = firebase.auth().currentUser;
    if (!user) {
        console.warn('예기치 않은 오류: 인증되지 않은 상태에서 업로드 시도');
        return;
    }

    try {
        await firebaseDb.ref(`users/${user.uid}`).set({
            channels: channels || [],
            tasks: tasks || [],
            dailyLogs: dailyLogs || {},
            bankInfo: getBankInfo(),
            updatedAt: timestamp
        });
        localStorage.setItem('editor_app_updated_at', timestamp.toString());
        console.log('☁️ 클라우드에 업로드 완료');
    } catch (e) {
        console.error('업로드 실패:', e);
        throw e;
    }
}

// 클라우드 데이터 적용
function applyCloudData(cloudData) {
    isApplyingCloudData = true; // 무한 루프 방지 플래그 설정

    // 모든 로컬 스탑워치 인터벌 정리 (다른 기기에서 정지한 경우 대응)
    Object.keys(stopwatchIntervals).forEach(taskId => {
        clearInterval(stopwatchIntervals[taskId]);
        delete stopwatchIntervals[taskId];
    });

    channels = cloudData.channels || [];
    tasks = cloudData.tasks || [];
    dailyLogs = cloudData.dailyLogs || {};

    // 입금 정보도 클라우드에서 복원
    if (cloudData.bankInfo) {
        localStorage.setItem(STORAGE_KEYS.BANK_INFO, JSON.stringify(cloudData.bankInfo));
    }

    // 클라우드에서 isRunning이 true인 작업에 대해 로컬 인터벌 재시작
    tasks.forEach(task => {
        if (task.isRunning && task.lastStartTime) {
            stopwatchIntervals[task.id] = setInterval(() => {
                const display = document.querySelector(`.stopwatch-display[data-task-id="${task.id}"]`);
                if (display) {
                    display.textContent = formatTime(getTaskElapsedSeconds(task));
                }
            }, 1000);
        }
    });

    // 로컬 저장 (클라우드 업로드는 건너뜀)
    originalSaveData();
    renderChannels();
    renderTasks();
    updateChannelSelects();
    updateSummary();
    renderTimeLog();

    console.log('☁️ 클라우드 데이터 적용 완료');

    isApplyingCloudData = false; // 플래그 해제
}

// 실시간 동기화 리스너 설정
function setupSyncListener() {
    if (!firebaseDb) return;

    // 인증 상태 확인
    const user = firebase.auth().currentUser;
    if (!user) {
        console.warn('예기치 않은 오류: 인증되지 않은 상태에서 리스너 설정 시도');
        return;
    }

    const ref = firebaseDb.ref(`users/${user.uid}`);
    syncListenerRef = ref;

    syncListener = ref.on('value', (snapshot) => {
        const cloudData = snapshot.val();
        if (cloudData && cloudData.updatedAt) {
            // 다른 기기에서 업데이트된 경우에만 적용
            const localUpdatedAt = parseInt(localStorage.getItem('editor_app_updated_at') || '0');
            if (cloudData.updatedAt > localUpdatedAt) {
                applyCloudData(cloudData);
                localStorage.setItem('editor_app_updated_at', cloudData.updatedAt.toString());
                showToast('기기 간 데이터가 자동 동기화되었습니다.', 'success');
            }
        }
    });
}

// 동기화 해제 (로그아웃 처리)
function disconnectSync() {
    const user = firebaseApp ? firebase.auth().currentUser : null;

    if (syncListener && syncListenerRef) {
        syncListenerRef.off('value', syncListener);
        syncListener = null;
        syncListenerRef = null;
    }

    updateSyncStatus(false);
    updateSyncModalView();
    closeModal('sync-modal');
}

// 동기화 상태 업데이트 (프로필 버튼)
function updateSyncStatus(connected) {
    const badge = document.getElementById('sync-status-badge');
    if (badge) {
        badge.style.display = connected ? 'flex' : 'none';
    }

    // 프로필 버튼 업데이트
    const profileImg = document.getElementById('nav-profile-img');
    const profileIcon = document.getElementById('nav-profile-icon');
    const user = firebaseApp ? firebase.auth().currentUser : null;

    if (connected && user) {
        // 프로필 사진이 있으면 표시
        if (user.photoURL && profileImg) {
            profileImg.src = user.photoURL;
            profileImg.style.display = 'block';
            if (profileIcon) profileIcon.style.display = 'none';
        }
    } else {
        if (profileImg) {
            profileImg.style.display = 'none';
            profileImg.src = '';
        }
        if (profileIcon) profileIcon.style.display = 'block';
    }
}

// 동기화 모달 뷰 업데이트
function updateSyncModalView() {
    const loginView = document.getElementById('sync-login-view');
    const connectedView = document.getElementById('sync-connected-view');
    const emailDisplay = document.getElementById('current-user-email');

    const user = firebaseApp ? firebase.auth().currentUser : null;

    if (user) {
        if (loginView) loginView.style.display = 'none';
        if (connectedView) connectedView.style.display = 'block';
        if (emailDisplay) emailDisplay.textContent = user.email;
    } else {
        if (loginView) loginView.style.display = 'block';
        if (connectedView) connectedView.style.display = 'none';
    }
}

// 로딩 오버레이
function showLoading(text = '로딩 중...') {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${text}</div>
        `;
        document.body.appendChild(overlay);
    } else {
        overlay.querySelector('.loading-text').textContent = text;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// 데이터 저장 시 클라우드 동기화
const originalSaveData = saveData;
saveData = function () {
    originalSaveData();

    // 클라우드 데이터 적용 중이거나 동기화 연결 중이면 업로드하지 않음
    if (isApplyingCloudData || isSyncConnecting || !firebaseApp) {
        return;
    }

    // 클라우드에 자동 동기화 (즉각 반영 처리)
    const user = firebase.auth().currentUser;
    if (user && firebaseDb) {
        const timestamp = Date.now();
        localStorage.setItem('editor_app_updated_at', timestamp.toString());

        uploadToCloud(timestamp).catch(e => console.error('자동 동기화 실패:', e));
    }
};

// ===================================
// Initialization
// ===================================
function init() {
    initThemeToggle();
    initGuideModal();
    loadData();
    initNavigation();
    initModals();
    initChannelManagement();
    initTaskManagement();
    initTimeEditModal();
    initSummaryPage();
    initInvoicePage();
    initTimeLogPage();
    initDataManagement();
    initCloudSync();

    // Firebase 초기화 (약간의 지연 후)
    setTimeout(initFirebase, 500);

    // 초기 렌더링
    renderChannels();
    renderTasks();
    updateChannelSelects();

    console.log('📋 편집 작업 관리 앱이 시작되었습니다!');
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', init);

