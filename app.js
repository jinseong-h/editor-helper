// ===================================
// Login Slider UX
// ===================================
function initLoginSlider() {
    const track = document.querySelector('.login-slider-track');
    if (!track) return;
    const originalImages = Array.from(track.querySelectorAll('.slider-image'));
    const totalOriginal = originalImages.length;
    if (totalOriginal === 0) return;

    // 3배수로 복제하여 무한 루프 구현 (가운데 세트에서 시작)
    track.innerHTML = '';
    for(let i=0; i<3; i++) {
        originalImages.forEach(img => {
            const clone = img.cloneNode(true);
            track.appendChild(clone);
        });
    }

    const allImages = Array.from(track.querySelectorAll('.slider-image'));
    let currentIndex = totalOriginal; // 중간 세트의 첫 번째 이미지부터 시작

    function updateSlider(animate = true) {
        if (animate) {
            track.style.transition = '';
            allImages.forEach(img => img.style.transition = '');
        } else {
            track.style.transition = 'none';
            allImages.forEach(img => img.style.transition = 'none');
        }

        allImages.forEach((img, index) => {
            if (index === currentIndex) {
                img.classList.add('active');
            } else {
                img.classList.remove('active');
            }
        });

        const activeImg = allImages[currentIndex];
        if (activeImg) {
            const containerHeight = track.parentElement.clientHeight;
            const imgCenter = activeImg.offsetTop + (activeImg.offsetHeight / 2);
            const offset = (containerHeight / 2) - imgCenter;
            track.style.transform = `translateY(${offset}px)`;
        }

        if (!animate) {
            // 레이아웃 강제 재계산 (움찔거림 방지)
            void track.offsetWidth;
        }
    }

    track.addEventListener('transitionend', (e) => {
        if (e.target !== track || e.propertyName !== 'transform') return;
        
        // 끝 세트에 도달하면 다시 중간 세트로 깜빡임 없이 이동
        if (currentIndex >= totalOriginal * 2) {
            currentIndex -= totalOriginal;
            updateSlider(false);
        } else if (currentIndex < totalOriginal) {
            currentIndex += totalOriginal;
            updateSlider(false);
        }
    });

    // Ensure accurate calculation even if images are slow to load
    Promise.all(originalImages.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(res => { img.onload = res; img.onerror = res; });
    })).then(() => {
        updateSlider(false);
    });

    window.addEventListener('resize', () => {
        updateSlider(false);
    });

    setInterval(() => {
        // Do not update animations if the tab is inactive or the login gate is hidden
        if (document.hidden || track.parentElement.clientHeight === 0) return;

        // Failsafe: if out of bounds due to missing transitionend events
        if (currentIndex >= totalOriginal * 2) {
            currentIndex -= totalOriginal;
            updateSlider(false);
            // Wait a frame for the 'none' transition to apply before sliding to the next
            setTimeout(() => {
                currentIndex++;
                updateSlider(true);
            }, 50);
            return;
        }

        currentIndex++;
        updateSlider(true);
    }, 4500); // 1.5초 이동 + 3초 대기 = 4.5초 간격
}

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
    initWeeklyCalendar();
    initDataManagement();
    initCloudSync();
    initLoginSlider();
    initPipTimerSetting();

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


