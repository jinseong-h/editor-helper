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

    // 수동으로 단가를 입력하면 자동 계산 플래그 해제 및 콤마 포맷팅
    document.getElementById('task-rate')?.addEventListener('input', (e) => {
        e.target.removeAttribute('data-auto-calculated');
        let val = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = val ? parseInt(val, 10).toLocaleString() : '';
    });

    // 필터링 — 두 토글은 상호 배타적
    document.getElementById('filter-show-completed')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            const unsettledToggle = document.getElementById('filter-unsettled');
            if (unsettledToggle) unsettledToggle.checked = false;
        }
        renderTasks();
    });
    document.getElementById('filter-unsettled')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            const completedToggle = document.getElementById('filter-show-completed');
            if (completedToggle) completedToggle.checked = false;
        }
        renderTasks();
    });
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

    if (channelId === '__unassigned__') {
        rateHint.textContent = '고객 미지정 - 단가 직접 입력';
        return;
    }

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
        rateInput.value = rate.toLocaleString();
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
    const rate = parseInt(document.getElementById('task-rate').value.replace(/,/g, '')) || 0;

    if (!name || !channelId) {
        showToast('작업명과 고객을 선택해주세요.', 'warning');
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
            isSettled: false,
            settledAt: null,
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
    document.getElementById('task-rate').value = task.rate ? task.rate.toLocaleString() : '';

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

    // DOM에서 현재 입력된 단가 값을 먼저 반영 (onchange 미발생 방지)
    const taskCard = document.querySelector(`.task-card[data-task-id="${id}"]`);
    if (taskCard) {
        const rateInput = taskCard.querySelector('.rate-input');
        if (rateInput && !rateInput.disabled) {
            const currentRate = parseInt(rateInput.value.replace(/,/g, '')) || 0;
            task.rate = currentRate;
        }
    }

    task.isCompleted = !task.isCompleted;
    task.completedAt = task.isCompleted ? new Date().toISOString() : null;

    // 완료 해제 시 정산도 해제
    if (!task.isCompleted) {
        task.isSettled = false;
        task.settledAt = null;
    }

    saveData();
    renderTasks();

    if (task.isCompleted) {
        showToast('작업이 완료되었습니다! 🎉', 'success');
    }
}

function toggleTaskSettled(id) {
    const task = tasks.find(t => t.id === id);
    if (!task || !task.isCompleted) return;

    task.isSettled = !task.isSettled;
    task.settledAt = task.isSettled ? new Date().toISOString() : null;

    saveData();
    renderTasks();

    if (task.isSettled) {
        showToast('정산 완료 처리되었습니다! 💰', 'success');
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
        const isTaskSelect = select.id === 'task-channel';
        const isFilterSelect = !isTaskSelect;

        select.innerHTML = isFilterSelect
            ? '<option value="">모든 고객</option>'
            : '<option value="">고객 선택</option>';

        // '고객 미지정' 옵션 추가
        const unassignedOption = document.createElement('option');
        unassignedOption.value = '__unassigned__';
        unassignedOption.textContent = '고객 미지정';
        select.appendChild(unassignedOption);

        channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = channel.name;
            select.appendChild(option);
        });

        if (currentValue && (currentValue === '__unassigned__' || channels.some(c => c.id === currentValue))) {
            select.value = currentValue;
        }
    });
}

function getFilteredTasks() {
    const showCompleted = document.getElementById('filter-show-completed')?.checked || false;
    const showUnsettled = document.getElementById('filter-unsettled')?.checked || false;
    const filterChannel = document.getElementById('filter-channel')?.value || '';
    const filterType = document.getElementById('filter-type')?.value || '';
    const sortOrder = document.getElementById('sort-order')?.value || 'createdDesc';

    let filtered = [...tasks];

    // 정산 미완료 필터 (완료되었지만 정산이 안 된 작업)
    if (showUnsettled) {
        filtered = filtered.filter(t => t.isCompleted && !t.isSettled);
    } else if (!showCompleted) {
        // 기본적으로 미완료 작업만 보기
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
    const channelName = task.channelId === '__unassigned__' ? '고객 미지정' : (channel ? channel.name : '(삭제된 고객)');
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
    if (task.isSettled) cardClass += ' settled';

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
                    ${task.isSettled ? '<span class="settled-badge">정산완료</span>' : ''}
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
                                <input type="text" class="rate-input" value="${(task.rate || 0).toLocaleString()}" 
                                    oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')"
                                    onchange="updateTaskRate('${task.id}', this.value.replace(/,/g, ''))"
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
                ${task.isCompleted ? `
                <label class="complete-label settle-label">
                    <input type="checkbox" class="complete-checkbox settle-checkbox" 
                        ${task.isSettled ? 'checked' : ''} 
                        onchange="toggleTaskSettled('${task.id}')">
                    <span>정산 완료</span>
                </label>
                ` : ''}
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

    // renderTasks()를 호출하면 DOM이 교체되어 입력 중인 값이 유실되므로
    // 해당 카드의 rate-display만 업데이트
    const taskCard = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
    if (taskCard) {
        const rateDisplay = taskCard.querySelector('.rate-display');
        if (rateDisplay) {
            rateDisplay.textContent = formatCurrency(task.rate);
        }
    }
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

    // PiP 타이머 열기
    openPipTimer();
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

        // 작업 세션 기록 (주간 캘린더용)
        const channel = channels.find(c => c.id === task.channelId);
        workSessions.push({
            id: generateId(),
            taskId: task.id,
            taskName: task.name,
            channelName: channel ? channel.name : '(알 수 없음)',
            channelId: task.channelId,
            startTime: task.lastStartTime,
            endTime: now
        });
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

    // PiP 타이머 업데이트 (실행 중인 타이머가 없으면 닫기)
    updatePipTimerContent();
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

    // PiP 타이머 업데이트
    updatePipTimerContent();
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
// PiP (Picture-in-Picture) Timer
// ===================================
let pipWindow = null;
let pipUpdateInterval = null;

function isPipEnabled() {
    const saved = localStorage.getItem(STORAGE_KEYS.PIP_TIMER);
    return saved === null ? true : saved === 'true'; // 기본값: 켜짐
}

function initPipTimerSetting() {
    const toggle = document.getElementById('pip-timer-toggle');
    if (!toggle) return;

    toggle.checked = isPipEnabled();

    toggle.addEventListener('change', () => {
        localStorage.setItem(STORAGE_KEYS.PIP_TIMER, toggle.checked.toString());
        if (!toggle.checked && pipWindow && !pipWindow.closed) {
            pipWindow.close();
            pipWindow = null;
        }
        showToast(toggle.checked ? 'PiP 타이머가 활성화되었습니다.' : 'PiP 타이머가 비활성화되었습니다.', 'success');
    });
}

function isPipSupported() {
    return 'documentPictureInPicture' in window;
}

async function openPipTimer() {
    if (!isPipEnabled() || !isPipSupported()) return;

    // 이미 열려 있으면 내용만 업데이트
    if (pipWindow && !pipWindow.closed) {
        updatePipTimerContent();
        return;
    }

    try {
        pipWindow = await documentPictureInPicture.requestWindow({
            width: 340,
            height: 200
        });

        // PiP 창에 스타일 주입
        const style = pipWindow.document.createElement('style');
        style.textContent = getPipStyles();
        pipWindow.document.head.appendChild(style);

        // Google Fonts 로드
        const fontLink = pipWindow.document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap';
        pipWindow.document.head.appendChild(fontLink);

        // 컨테이너 생성
        const container = pipWindow.document.createElement('div');
        container.id = 'pip-container';
        pipWindow.document.body.appendChild(container);

        // 창 닫힐 때 정리
        pipWindow.addEventListener('pagehide', () => {
            if (pipUpdateInterval) {
                clearInterval(pipUpdateInterval);
                pipUpdateInterval = null;
            }
            pipWindow = null;
        });

        // 내용 업데이트
        updatePipTimerContent();

        // 주기적 업데이트 (1초마다)
        pipUpdateInterval = setInterval(() => {
            if (pipWindow && !pipWindow.closed) {
                updatePipTimerContent();
            } else {
                clearInterval(pipUpdateInterval);
                pipUpdateInterval = null;
            }
        }, 1000);

    } catch (e) {
        console.warn('PiP 타이머 열기 실패:', e);
    }
}

function updatePipTimerContent() {
    if (!pipWindow || pipWindow.closed) return;

    const container = pipWindow.document.getElementById('pip-container');
    if (!container) return;

    const runningTasks = tasks.filter(t => t.isRunning);

    if (runningTasks.length === 0) {
        // 실행 중인 타이머 없으면 창 닫기
        pipWindow.close();
        pipWindow = null;
        if (pipUpdateInterval) {
            clearInterval(pipUpdateInterval);
            pipUpdateInterval = null;
        }
        return;
    }

    container.innerHTML = runningTasks.map(task => {
        const channel = channels.find(c => c.id === task.channelId);
        const channelName = task.channelId === '__unassigned__' ? '고객 미지정' : (channel ? channel.name : '');
        const elapsed = getTaskElapsedSeconds(task);
        const timeStr = formatTime(elapsed);

        return `
            <div class="pip-task">
                <div class="pip-task-info">
                    <div class="pip-task-name">${escapeHtml(task.name)}</div>
                    ${channelName ? `<div class="pip-task-channel">${escapeHtml(channelName)}</div>` : ''}
                </div>
                <div class="pip-task-timer">
                    <div class="pip-time">${timeStr}</div>
                    <button class="pip-btn pip-pause" data-id="${task.id}">⏸</button>
                </div>
            </div>
        `;
    }).join('');

    // 일시정지 버튼 이벤트 연결
    container.querySelectorAll('.pip-pause').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskId = btn.dataset.id;
            stopStopwatch(taskId);
        });
    });
}

function getPipStyles() {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Pretendard Variable', -apple-system, sans-serif;
            background: #1a1a2e;
            color: #e0e0e0;
            overflow: hidden;
            -webkit-user-select: none;
            user-select: none;
        }
        #pip-container {
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            height: 100vh;
            overflow-y: auto;
        }
        .pip-task {
            background: rgba(255,255,255,0.08);
            border-radius: 10px;
            padding: 10px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .pip-task-info {
            flex: 1;
            min-width: 0;
            overflow: hidden;
        }
        .pip-task-name {
            font-size: 13px;
            font-weight: 600;
            color: #fff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .pip-task-channel {
            font-size: 11px;
            color: rgba(255,255,255,0.5);
            margin-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .pip-task-timer {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }
        .pip-time {
            font-family: 'JetBrains Mono', monospace;
            font-size: 18px;
            font-weight: 700;
            color: #4ecdc4;
            letter-spacing: 1px;
        }
        .pip-btn {
            width: 30px;
            height: 30px;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: transform 0.15s, background 0.15s;
        }
        .pip-btn:hover { transform: scale(1.15); }
        .pip-btn:active { transform: scale(0.95); }
        .pip-pause {
            background: rgba(255,107,107,0.2);
            color: #ff6b6b;
        }
        .pip-pause:hover { background: rgba(255,107,107,0.35); }
    `;
}

