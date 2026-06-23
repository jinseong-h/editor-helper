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
                    
                    // 사용자 로그인 기록 (관리자 페이지용)
                    trackUserLogin(user);

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

    // 메인 화면이 보일 때 공지사항 확인
    checkAndShowNotice();
}

// 클라우드 동기화 UI 초기화
function initCloudSync() {
    // 설정 탭 동기화 버튼
    document.getElementById('cloud-sync-btn')?.addEventListener('click', () => {
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

    // 동기화 모달 내 로그아웃
    document.getElementById('sync-logout-btn')?.addEventListener('click', () => {
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

                document.getElementById('app-container').style.display = 'none';
                document.getElementById('login-gate').style.display = 'flex';
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
            workSessions: workSessions || [],
            bankInfo: getBankInfo(),
            pipTimerEnabled: isPipEnabled(),
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
    workSessions = cloudData.workSessions || [];

    // 입금 정보도 클라우드에서 복원
    if (cloudData.bankInfo) {
        localStorage.setItem(STORAGE_KEYS.BANK_INFO, JSON.stringify(cloudData.bankInfo));
    }

    // PiP 설정 복원
    if (cloudData.pipTimerEnabled !== undefined) {
        localStorage.setItem(STORAGE_KEYS.PIP_TIMER, cloudData.pipTimerEnabled.toString());
        const toggle = document.getElementById('pip-timer-toggle');
        if (toggle) toggle.checked = cloudData.pipTimerEnabled;
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
// User Tracking & Notice System
// ===================================
function trackUserLogin(user) {
    if (!firebaseDb) return;
    
    const userRef = firebaseDb.ref(`app_users/${user.uid}`);
    userRef.once('value').then(snap => {
        const data = snap.val() || {};
        const now = new Date().toISOString();
        
        // 보존할 이전 데이터
        const updateData = {
            email: user.email,
            lastLoginAt: now,
            firstLoginAt: data.firstLoginAt || now
        };
        
        userRef.update(updateData).catch(err => console.error('유저 트래킹 기록 실패:', err));
    });
}

function checkAndShowNotice() {
    if (!firebaseDb) return;

    const noticeRef = firebaseDb.ref('notices/current');
    noticeRef.once('value').then(snap => {
        const notice = snap.val();
        if (!notice) return;

        const today = new Date();
        // 한국 시간에 맞게 오늘 날짜 (YYYY-MM-DD) 구성
        const kstOffset = 9 * 60 * 60 * 1000;
        const d = new Date(today.getTime() + kstOffset);
        const todayStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;

        if (todayStr >= notice.startDate && todayStr <= notice.endDate) {
            // Check if user chose "Do not show again"
            const hiddenNoticeId = localStorage.getItem('hide_notice_id');
            if (hiddenNoticeId !== notice.id) {
                // Show modal
                document.getElementById('notice-modal-message').textContent = notice.message;
                
                // Keep the ID reference for when they close it
                document.getElementById('notice-modal').dataset.noticeId = notice.id;
                
                openModal('notice-modal');
            }
        }
    }).catch(err => console.error('공지사항 확인 실패:', err));
}

function closeNoticeModal() {
    const modal = document.getElementById('notice-modal');
    const neverShowCheckbox = document.getElementById('notice-never-show');
    
    if (neverShowCheckbox && neverShowCheckbox.checked) {
        const noticeId = modal.dataset.noticeId;
        if (noticeId) {
            localStorage.setItem('hide_notice_id', noticeId);
        }
    }
    closeModal('notice-modal');
}
