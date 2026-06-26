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
    WORK_SESSIONS: 'editor_app_work_sessions',
    THEME: 'editor_app_theme',
    PIP_TIMER: 'editor_app_pip_timer',
    INVOICE_ROUNDING: 'editor_app_invoice_rounding'
};

// 데이터 저장소
let channels = [];
let tasks = [];
let dailyLogs = {}; // YYYY-MM-DD: seconds
let workSessions = []; // [{id, taskId, taskName, channelName, startTime, endTime}]

// LocalStorage에서 데이터 로드
function loadData() {
    try {
        const savedChannels = localStorage.getItem(STORAGE_KEYS.CHANNELS);
        const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
        const savedDailyLogs = localStorage.getItem(STORAGE_KEYS.DAILY_LOGS);
        const savedWorkSessions = localStorage.getItem(STORAGE_KEYS.WORK_SESSIONS);

        channels = savedChannels ? JSON.parse(savedChannels) : [];
        tasks = savedTasks ? JSON.parse(savedTasks) : [];
        dailyLogs = savedDailyLogs ? JSON.parse(savedDailyLogs) : {};
        workSessions = savedWorkSessions ? JSON.parse(savedWorkSessions) : [];

        // Ensure every session has a unique ID (migration for older sessions)
        let sessionsUpdated = false;
        workSessions.forEach(session => {
            if (!session.id) {
                session.id = generateId();
                sessionsUpdated = true;
            }
        });

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
        localStorage.setItem(STORAGE_KEYS.WORK_SESSIONS, JSON.stringify(workSessions));
        
        // AI 도구용 요약 데이터 생성 및 DOM 주입
        updateAiSummaryData();
    } catch (e) {
        console.error('데이터 저장 실패:', e);
        showToast('데이터 저장에 실패했습니다.', 'error');
    }
}

// AI 도우미용 데이터 요약 & DOM 주입 함수
function updateAiSummaryData() {
    try {
        // 1. 작업 시간 요약 데이터 (오늘, 어제, 이번 주 일별 작업시간)
        const today = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const todayKst = new Date(today.getTime() + kstOffset);
        const yesterdayKst = new Date(today.getTime() + kstOffset - (24 * 60 * 60 * 1000));

        const getKstDateStr = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
        
        const todayStr = getKstDateStr(todayKst);
        const yesterdayStr = getKstDateStr(yesterdayKst);

        // 이번 주 구하기 (월요일~일요일)
        const dayOfWeek = todayKst.getUTCDay(); // 0=일요일, 1=월요일...
        const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const tempDate = new Date(todayKst.getTime() + (mondayDiff + i) * 24 * 60 * 60 * 1000);
            weekDates.push(getKstDateStr(tempDate));
        }

        const todaySeconds = dailyLogs[todayStr] || 0;
        const yesterdaySeconds = dailyLogs[yesterdayStr] || 0;
        let weekSeconds = 0;
        const dailyList = [];

        weekDates.forEach(dStr => {
            const sec = dailyLogs[dStr] || 0;
            weekSeconds += sec;
            dailyList.push({
                date: dStr,
                work_minutes: Math.round(sec / 60)
            });
        });

        const worktimeSummary = {
            status: "ok",
            timezone: "Asia/Seoul",
            range: {
                start: weekDates[0],
                end: weekDates[6]
            },
            today: {
                date: todayStr,
                work_minutes: Math.round(todaySeconds / 60),
                work_hours: parseFloat((todaySeconds / 3600).toFixed(1))
            },
            yesterday: {
                date: yesterdayStr,
                work_minutes: Math.round(yesterdaySeconds / 60),
                work_hours: parseFloat((yesterdaySeconds / 3600).toFixed(1))
            },
            week: {
                total_minutes: Math.round(weekSeconds / 60),
                total_hours: parseFloat((weekSeconds / 3600).toFixed(1))
            },
            daily: dailyList,
            source_updated_at: new Date().toISOString()
        };

        // DOM 주입: #ai-worktime-summary
        let summaryScript = document.getElementById('ai-worktime-summary');
        if (!summaryScript) {
            summaryScript = document.createElement('script');
            summaryScript.id = 'ai-worktime-summary';
            summaryScript.type = 'application/json';
            document.body.appendChild(summaryScript);
        }
        summaryScript.textContent = JSON.stringify(worktimeSummary, null, 2);

        // 2. 미완료 작업 목록 데이터
        const unfinishedJobs = tasks.filter(t => !t.isCompleted).map(t => {
            const channel = channels.find(c => c.id === t.channelId);
            return {
                id: t.id,
                title: t.name,
                channel_name: channel ? channel.name : '',
                status: "unfinished",
                deadline: t.dueDate || ""
            };
        });

        const unfinishedSummary = {
            visible_unfinished_count: unfinishedJobs.length,
            jobs: unfinishedJobs
        };

        // DOM 주입: #ai-unfinished-jobs
        let unfinishedScript = document.getElementById('ai-unfinished-jobs');
        if (!unfinishedScript) {
            unfinishedScript = document.createElement('script');
            unfinishedScript.id = 'ai-unfinished-jobs';
            unfinishedScript.type = 'application/json';
            document.body.appendChild(unfinishedScript);
        }
        unfinishedScript.textContent = JSON.stringify(unfinishedSummary, null, 2);

        // 3. 최근 7일 편집 목표 수행률 데이터 (adherence check 용도)
        const adherenceData = {};
        weekDates.forEach(dStr => {
            const sec = dailyLogs[dStr] || 0;
            // 해당 일에 완료된 작업 중 예정된 시간이나 계획 등 비교용 기초 정보 추가
            adherenceData[dStr] = {
                date: dStr,
                actual_minutes: Math.round(sec / 60)
            };
        });

        // DOM 주입: #ai-adherence-editing
        let adherenceScript = document.getElementById('ai-adherence-editing');
        if (!adherenceScript) {
            adherenceScript = document.createElement('script');
            adherenceScript.id = 'ai-adherence-editing';
            adherenceScript.type = 'application/json';
            document.body.appendChild(adherenceScript);
        }
        adherenceScript.textContent = JSON.stringify(adherenceData, null, 2);

    } catch (e) {
        console.error('AI 요약 데이터 업데이트 실패:', e);
    }
}

// UUID 생성
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

    // 공지사항 모달 닫기
    document.getElementById('notice-modal-close')?.addEventListener('click', closeNoticeModal);
    document.getElementById('notice-modal-ok')?.addEventListener('click', closeNoticeModal);
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

