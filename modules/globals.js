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

