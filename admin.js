/* ===================================
   편집 작업 관리 앱 - 관리자 JavaScript
   =================================== */

// Firebase 설정
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

// DOM Elements
const loadingOverlay = document.getElementById('loading');
const accessDenied = document.getElementById('access-denied');
const adminPanel = document.getElementById('admin-panel');
const adminEmailDisplay = document.getElementById('admin-email');
const logoutBtn = document.getElementById('admin-logout-btn');
const goBackBtn = document.getElementById('go-back-btn');
const userListBody = document.getElementById('user-list');
const totalUsersBadge = document.getElementById('total-users-badge');
const noticeForm = document.getElementById('notice-form');
const deleteNoticeBtn = document.getElementById('delete-notice-btn');
const currentNoticePreview = document.getElementById('current-notice-preview');

// Initialize
function init() {
    firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    firebaseDb = firebase.database();
    
    // Auth State Listener
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Check if user is admin
            if (user.email && user.email.startsWith('boss4534')) {
                grantAccess(user);
            } else {
                denyAccess();
                firebase.auth().signOut(); // Force signout non-admins from this session
            }
        } else {
            // Not logged in -> Redirect to index or show access denied
            window.location.href = 'index.html';
        }
    });

    // Event Listeners
    logoutBtn.addEventListener('click', () => {
        firebase.auth().signOut().then(() => {
            window.location.href = 'index.html';
        });
    });

    goBackBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    noticeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        publishNotice();
    });

    deleteNoticeBtn.addEventListener('click', () => {
        if (confirm('현재 공지를 삭제하시겠습니까? 메인 화면의 팝업이 즉시 내려갑니다.')) {
            deleteNotice();
        }
    });
}

function grantAccess(user) {
    adminEmailDisplay.textContent = user.email;
    loadingOverlay.style.display = 'none';
    accessDenied.style.display = 'none';
    adminPanel.style.display = 'block';

    fetchUsers();
    fetchCurrentNotice();
}

function denyAccess() {
    loadingOverlay.style.display = 'none';
    adminPanel.style.display = 'none';
    accessDenied.style.display = 'flex';
}

// Fetch Users
function fetchUsers() {
    const usersRef = firebaseDb.ref('app_users');
    usersRef.on('value', (snapshot) => {
        userListBody.innerHTML = '';
        const users = snapshot.val();
        
        if (!users) {
            totalUsersBadge.textContent = '총 0명';
            userListBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">가입자가 없습니다.</td></tr>';
            return;
        }

        const userArray = Object.keys(users).map(uid => ({
            uid,
            ...users[uid]
        }));

        // Sort by lastLoginAt (descending)
        userArray.sort((a, b) => {
            const timeA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
            const timeB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
            return timeB - timeA;
        });

        totalUsersBadge.textContent = `총 ${userArray.length}명`;

        userArray.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(u.email || '이메일 없음')}</td>
                <td>${u.firstLoginAt ? formatDate(u.firstLoginAt) : '-'}</td>
                <td>${u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '-'}</td>
            `;
            userListBody.appendChild(tr);
        });
    });
}

// Fetch Notice
function fetchCurrentNotice() {
    const noticeRef = firebaseDb.ref('notices/current');
    noticeRef.on('value', (snapshot) => {
        const notice = snapshot.val();
        if (notice) {
            currentNoticePreview.innerHTML = `
                <div style="margin-bottom: 10px;">
                    <strong>기간:</strong> ${notice.startDate} ~ ${notice.endDate}
                </div>
                <div style="white-space: pre-wrap; background: var(--bg-secondary); padding: 10px; border-radius: 4px;">${escapeHtml(notice.message)}</div>
            `;
        } else {
            currentNoticePreview.innerHTML = '<span style="color: var(--text-secondary);">현재 발행된 공지가 없습니다.</span>';
        }
    });
}

// Publish Notice
function publishNotice() {
    const message = document.getElementById('notice-message').value.trim();
    const startDate = document.getElementById('notice-start-date').value;
    const endDate = document.getElementById('notice-end-date').value;

    if (!message || !startDate || !endDate) return;

    if (startDate > endDate) {
        showToast('시작 날짜가 종료 날짜보다 늦을 수 없습니다.', 'error');
        return;
    }

    const noticeData = {
        id: Date.now().toString(), // Used for "Do not show again" reference
        message,
        startDate,
        endDate,
        createdAt: new Date().toISOString()
    };

    firebaseDb.ref('notices/current').set(noticeData)
        .then(() => {
            showToast('공지가 성공적으로 발행되었습니다.', 'success');
            document.getElementById('notice-message').value = '';
            document.getElementById('notice-start-date').value = '';
            document.getElementById('notice-end-date').value = '';
        })
        .catch((error) => {
            console.error('Notice publish error:', error);
            showToast('발행 실패: ' + error.message, 'error');
        });
}

// Delete Notice
function deleteNotice() {
    firebaseDb.ref('notices/current').remove()
        .then(() => {
            showToast('공지가 삭제되었습니다.', 'success');
        })
        .catch((error) => {
            console.error('Notice delete error:', error);
            showToast('삭제 실패: ' + error.message, 'error');
        });
}

// Utils
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function formatDate(isoString) {
    const d = new Date(isoString);
    if(isNaN(d.getTime())) return '-';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateTime(isoString) {
    const d = new Date(isoString);
    if(isNaN(d.getTime())) return '-';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    toast.innerHTML = `<span>${icons[type] || '📢'}</span><span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Start
document.addEventListener('DOMContentLoaded', init);
