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
// Guide & Suggestion Modal & Email Copy
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

    // 이메일 복사 버튼
    const copyEmailBtn = document.getElementById('copy-email-btn');
    copyEmailBtn?.addEventListener('click', () => {
        navigator.clipboard.writeText('a_dot@kakao.com').then(() => {
            showToast('메일 주소가 복사되었습니다!', 'success');
        }).catch(() => {
            // fallback
            const ta = document.createElement('textarea');
            ta.value = 'a_dot@kakao.com';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('메일 주소가 복사되었습니다!', 'success');
        });
    });
}

// ===================================
// Navigation
// ===================================
let currentWeekOffset = 0; // 주간 캘린더 현재 주 오프셋

function navigateToPage(targetPage) {
    const navTabs = document.querySelectorAll('.nav-tab');
    const pages = document.querySelectorAll('.page');

    // 탭 활성화 (customers, settings는 탭에 없으므로 전부 비활성)
    navTabs.forEach(t => t.classList.remove('active'));
    const matchingTab = document.querySelector(`.nav-tab[data-page="${targetPage}"]`);
    if (matchingTab) matchingTab.classList.add('active');

    // 페이지 전환
    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === `${targetPage}-page`) {
            page.classList.add('active');
        }
    });

    // 페이지별 초기화
    if (targetPage === 'stats') {
        updateSummary();
        generateTimeLogMonthOptions();
        renderTimeLog();
        renderWeeklyCalendar();
    } else if (targetPage === 'tasks') {
        renderTasks();
    } else if (targetPage === 'customers') {
        renderChannels();
    } else if (targetPage === 'settings') {
        // settings page doesn't need special init
    } else if (targetPage === 'invoice') {
        updateInvoiceChannelSelect();
        updateInvoicePreview();
    }
}

function initNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            navigateToPage(tab.dataset.page);
        });
    });

    // 통계 서브탭 전환
    const subTabs = document.querySelectorAll('.stats-sub-tab');
    subTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetSub = tab.dataset.sub;

            subTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            document.querySelectorAll('.stats-sub-section').forEach(sec => {
                sec.classList.remove('active');
            });

            if (targetSub === 'summary') {
                document.getElementById('stats-summary-section')?.classList.add('active');
                updateSummary();
            } else if (targetSub === 'time-log') {
                document.getElementById('stats-timelog-section')?.classList.add('active');
                generateTimeLogMonthOptions();
                renderTimeLog();
                renderWeeklyCalendar();
            }
        });
    });

    // 프로필 드롭다운 메뉴
    initProfileDropdown();
}

// ===================================
// Profile Dropdown Menu
// ===================================
function initProfileDropdown() {
    const profileBtn = document.getElementById('nav-profile-btn');
    const dropdown = document.getElementById('profile-dropdown');

    if (!profileBtn || !dropdown) return;

    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        updateProfileDropdownInfo();
    });

    // 바깥 클릭 시 닫기
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !profileBtn.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });

    // 고객 관리
    document.getElementById('menu-customers')?.addEventListener('click', () => {
        dropdown.classList.remove('show');
        navigateToPage('customers');
    });

    // 설정
    document.getElementById('menu-settings')?.addEventListener('click', () => {
        dropdown.classList.remove('show');
        navigateToPage('settings');
    });

    // 로그아웃
    document.getElementById('menu-logout')?.addEventListener('click', () => {
        dropdown.classList.remove('show');
        if (confirm('로그아웃하시겠습니까?\n로그아웃하면 로그인 화면으로 돌아갑니다.')) {
            firebase.auth().signOut().then(() => {
                localStorage.removeItem('editor_app_updated_at');
                localStorage.removeItem(STORAGE_KEYS.CHANNELS);
                localStorage.removeItem(STORAGE_KEYS.TASKS);
                localStorage.removeItem(STORAGE_KEYS.DAILY_LOGS);
                localStorage.removeItem(STORAGE_KEYS.BANK_INFO);
                localStorage.removeItem(STORAGE_KEYS.WORK_SESSIONS);

                channels = [];
                tasks = [];
                dailyLogs = {};
                workSessions = [];

                showToast('로그아웃되었습니다.', 'success');
                updateSyncStatus(false);
                updateSyncModalView();
                closeModal('sync-modal');

                // 로그인 게이트 표시
                document.getElementById('app-container').style.display = 'none';
                document.getElementById('login-gate').style.display = 'flex';
            }).catch(err => {
                console.error('로그아웃 실패:', err);
                showToast('로그아웃에 실패했습니다.', 'error');
            });
        }
    });
}

function updateProfileDropdownInfo() {
    const user = typeof firebaseApp !== 'undefined' && firebaseApp ? firebase.auth().currentUser : null;
    const userSection = document.getElementById('profile-dropdown-user');
    const divider = document.getElementById('profile-dropdown-divider');
    const logoutBtn = document.getElementById('menu-logout');
    const logoutDivider = document.getElementById('profile-dropdown-logout-divider');

    if (user) {
        if (userSection) {
            userSection.style.display = 'flex';
            const img = document.getElementById('dropdown-profile-img');
            if (img && user.photoURL) {
                img.src = user.photoURL;
                img.style.display = 'block';
            } else if (img) {
                img.style.display = 'none';
            }
            const nameEl = document.getElementById('dropdown-user-name');
            if (nameEl) nameEl.textContent = user.displayName || '사용자';
            const emailEl = document.getElementById('dropdown-user-email');
            if (emailEl) emailEl.textContent = user.email || '';
        }
        if (divider) divider.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'flex';
        if (logoutDivider) logoutDivider.style.display = 'block';
    } else {
        if (userSection) userSection.style.display = 'none';
        if (divider) divider.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (logoutDivider) logoutDivider.style.display = 'none';
    }
}

