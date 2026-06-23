// ===================================
// Summary Page
// ===================================
function initSummaryPage() {
    document.getElementById('summary-period')?.addEventListener('change', updateSummary);
    document.getElementById('summary-channel')?.addEventListener('change', updateSummary);
    document.getElementById('exclude-archived-stats')?.addEventListener('change', updateSummary);

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
    // '__unassigned__' 고객도 요약에서 필터 가능

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

    const excludeArchived = document.getElementById('exclude-archived-stats')?.checked ?? true;

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
            let name = '(삭제된 고객)';
            let isArchived = false;

            if (channelId === '__unassigned__') {
                name = '고객 미지정';
            } else if (channelId && channelId.startsWith('__custom__::')) {
                name = channelId.replace('__custom__::', '');
            } else {
                const channel = channels.find(c => c.id === channelId);
                if (channel) {
                    name = channel.name;
                    isArchived = !!channel.isArchived;
                }
            }

            const hourlyRate = stats.totalSeconds > 0
                ? Math.floor(stats.totalRate / (stats.totalSeconds / 3600))
                : 0;

            return {
                name,
                isArchived,
                hourlyRate
            };
        })
        .filter(d => {
            if (d.hourlyRate <= 0) return false;
            if (excludeArchived && d.isArchived) return false;
            return true;
        })
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

    // 절삭 옵션 버튼 이벤트 등록
    const roundingButtons = document.querySelectorAll('.rounding-btn');
    const savedRounding = localStorage.getItem(STORAGE_KEYS.INVOICE_ROUNDING) || 'none';
    roundingButtons.forEach(btn => {
        if (btn.dataset.rounding === savedRounding) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    roundingButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            roundingButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const roundingOption = btn.dataset.rounding || 'none';
            localStorage.setItem(STORAGE_KEYS.INVOICE_ROUNDING, roundingOption);
            updateInvoicePreview();
        });
    });
}

function updateInvoiceChannelSelect() {
    updateChannelSelects();
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
            label: `${String(date.getFullYear()).slice(-2)}년 ${date.getMonth() + 1}월`
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

function getTruncatedAmount(amount, option) {
    if (option === '1') {
        return Math.floor(amount / 10) * 10;
    } else if (option === '10') {
        return Math.floor(amount / 100) * 100;
    }
    return amount;
}

function updateInvoicePreview() {
    const container = document.getElementById('invoice-preview');
    if (!container) return;

    const channelId = document.getElementById('invoice-channel')?.value;
    if (!channelId) {
        container.innerHTML = '<p class="preview-placeholder">고객을 선택해주세요.</p>';
        return;
    }

    let channelName = '';
    if (channelId.startsWith('__custom__::')) {
        channelName = channelId.replace('__custom__::', '');
    } else {
        const channel = channels.find(c => c.id === channelId);
        channelName = channel ? channel.name : '(삭제된 고객)';
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

    const roundingOption = localStorage.getItem(STORAGE_KEYS.INVOICE_ROUNDING) || 'none';
    const rawTotalAmount = invoiceTasks.reduce((sum, t) => sum + (t.rate || 0), 0);
    const totalAmount = getTruncatedAmount(rawTotalAmount, roundingOption);
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
                    <span>${escapeHtml(channelName)}</span>
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
    if (!channelId) {
        showToast('고객을 선택해주세요.', 'warning');
        return;
    }

    let channelName = '';
    if (channelId.startsWith('__custom__::')) {
        channelName = channelId.replace('__custom__::', '');
    } else {
        const channel = channels.find(c => c.id === channelId);
        if (!channel) {
            showToast('고객을 찾을 수 없습니다.', 'warning');
            return;
        }
        channelName = channel.name;
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

    const roundingOption = localStorage.getItem(STORAGE_KEYS.INVOICE_ROUNDING) || 'none';
    const rawTotalAmount = invoiceTasks.reduce((sum, t) => sum + (t.rate || 0), 0);
    const totalAmount = getTruncatedAmount(rawTotalAmount, roundingOption);
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
            <title>작업내역서 - ${channelName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: 'Noto Sans KR', sans-serif;
                    padding: 40px;
                    color: #333;
                    background: white;
                    line-height: 1.6;
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
                    <span>${escapeHtml(channelName)}</span>
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
        workSessions,
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
            workSessions = pendingImportData.workSessions || [];

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

            // workSessions 병합
            const importedSessions = (pendingImportData.workSessions || []).map(s => ({
                ...s,
                id: generateId()
            }));
            workSessions = [...workSessions, ...importedSessions];
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
// Weekly Calendar (주간 작업 캘린더)
// ===================================
const SESSION_COLORS = ['color-0','color-1','color-2','color-3','color-4','color-5','color-6','color-7'];

function getWeekDates(offset) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (offset * 7));
    monday.setHours(0, 0, 0, 0);

    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d);
    }
    return dates;
}

function renderWeeklyCalendar() {
    const grid = document.getElementById('weekly-calendar-grid');
    const legend = document.getElementById('weekly-calendar-legend');
    const label = document.getElementById('week-label');
    if (!grid) return;

    const weekDates = getWeekDates(currentWeekOffset);
    const dayNames = ['월', '화', '수', '목', '금', '토', '일'];

    // 라벨 업데이트
    const startStr = `${weekDates[0].getMonth() + 1}/${weekDates[0].getDate()}`;
    const endStr = `${weekDates[6].getMonth() + 1}/${weekDates[6].getDate()}`;
    if (label) label.textContent = `${weekDates[0].getFullYear()}년 ${startStr} ~ ${endStr}`;

    // 이 주에 해당하는 세션 필터
    const weekStart = weekDates[0].getTime();
    const weekEnd = new Date(weekDates[6]);
    weekEnd.setHours(23, 59, 59, 999);
    const weekEndTime = weekEnd.getTime();

    const weekSessions = workSessions.filter(s => {
        return s.endTime >= weekStart && s.startTime <= weekEndTime;
    });

    // 고객별 색상 매핑
    const channelColorMap = {};
    let colorIndex = 0;
    weekSessions.forEach(s => {
        if (!channelColorMap[s.channelId || s.channelName]) {
            channelColorMap[s.channelId || s.channelName] = {
                color: SESSION_COLORS[colorIndex % SESSION_COLORS.length],
                name: s.channelName
            };
            colorIndex++;
        }
    });

    // 표시할 시간 범위 계산 (세션이 있는 시간대만)
    let minHour = 24, maxHour = 0;
    weekSessions.forEach(s => {
        const startD = new Date(s.startTime);
        const endD = new Date(s.endTime);
        minHour = Math.min(minHour, startD.getHours());
        maxHour = Math.max(maxHour, endD.getHours() + 1);
    });
    if (minHour >= maxHour) {
        minHour = 8;
        maxHour = 22;
    }
    minHour = Math.max(0, minHour - 1);
    maxHour = Math.min(24, maxHour + 1);
    const totalHours = maxHour - minHour;

    // 그리드 생성
    let html = '';

    // 헤더 행
    html += '<div class="calendar-header-cell"></div>'; // 빈 코너
    weekDates.forEach((d, i) => {
        const isToday = new Date().toDateString() === d.toDateString();
        html += `<div class="calendar-header-cell" ${isToday ? 'style="color: var(--accent-primary); font-weight: 700;"' : ''}>
            ${dayNames[i]}
            <span class="day-date">${d.getMonth() + 1}/${d.getDate()}</span>
        </div>`;
    });

    // 시간 행
    for (let h = minHour; h < maxHour; h++) {
        html += `<div class="calendar-time-label">${String(h).padStart(2, '0')}:00</div>`;
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            html += `<div class="calendar-day-column" data-day="${dayIdx}" data-hour="${h}"></div>`;
        }
    }

    grid.style.gridTemplateColumns = '50px repeat(7, 1fr)';
    grid.style.gridTemplateRows = `auto repeat(${totalHours}, 40px)`;
    grid.innerHTML = html;

    if (weekSessions.length === 0) {
        grid.innerHTML += '<div class="calendar-empty-msg">이 주에 기록된 작업 세션이 없습니다.<br><small>스톱워치를 사용하면 자동으로 기록됩니다.</small></div>';
    }

    // 세션 블록 배치
    weekSessions.forEach(session => {
        const startD = new Date(session.startTime);
        const endD = new Date(session.endTime);

        // 이 주의 각 날짜에 걸쳐 세션 분할
        weekDates.forEach((dayDate, dayIdx) => {
            const dayStart = new Date(dayDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayDate);
            dayEnd.setHours(23, 59, 59, 999);

            // 이 날짜와 겹치는 부분
            const overlapStart = Math.max(startD.getTime(), dayStart.getTime());
            const overlapEnd = Math.min(endD.getTime(), dayEnd.getTime());

            if (overlapStart >= overlapEnd) return;

            const oStartDate = new Date(overlapStart);
            const oEndDate = new Date(overlapEnd);

            const startHour = oStartDate.getHours() + oStartDate.getMinutes() / 60;
            const endHour = oEndDate.getHours() + oEndDate.getMinutes() / 60;

            // 표시 범위 내의 위치 계산
            const topFraction = (startHour - minHour) / totalHours;
            const heightFraction = (endHour - startHour) / totalHours;

            if (heightFraction <= 0) return;

            // 해당 날짜 열의 첫 번째 셀 찾기
            const cells = grid.querySelectorAll(`.calendar-day-column[data-day="${dayIdx}"]`);
            if (cells.length === 0) return;

            // 부모 컨테이너(grid) 기준으로 절대 위치 배치를 위해 첫 셀과 마지막 셀 사용
            const firstCell = cells[0];
            const lastCell = cells[cells.length - 1];

            const columnTop = firstCell.offsetTop;
            const columnHeight = (lastCell.offsetTop + lastCell.offsetHeight) - columnTop;

            const blockTop = columnTop + (topFraction * columnHeight);
            const blockHeight = Math.max(heightFraction * columnHeight, 4);

            const colorClass = channelColorMap[session.channelId || session.channelName]?.color || 'color-0';

            const startTimeStr = `${String(oStartDate.getHours()).padStart(2, '0')}:${String(oStartDate.getMinutes()).padStart(2, '0')}`;
            const endTimeStr = `${String(oEndDate.getHours()).padStart(2, '0')}:${String(oEndDate.getMinutes()).padStart(2, '0')}`;

            // Calculate total duration in minutes/hours
            const diffMs = session.endTime - session.startTime;
            const diffMin = Math.round(diffMs / (1000 * 60));
            let durationStr = '';
            if (diffMin >= 60) {
                const hours = Math.floor(diffMin / 60);
                const mins = diffMin % 60;
                durationStr = mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
            } else {
                durationStr = `${diffMin}분`;
            }

            const block = document.createElement('div');
            block.className = `calendar-session-block ${colorClass}`;
            block.style.top = `${blockTop}px`;
            block.style.left = `${firstCell.offsetLeft + 2}px`;
            block.style.width = `${firstCell.offsetWidth - 4}px`;
            block.style.height = `${blockHeight}px`;
            block.setAttribute('data-channel', session.channelName || '');
            block.setAttribute('data-task', session.taskName || '');
            block.setAttribute('data-time', `${startTimeStr} ~ ${endTimeStr}`);
            block.setAttribute('data-duration', durationStr);

            if (blockHeight > 20) {
                block.innerHTML = `<span class="session-task-name">${escapeHtml(session.taskName)}</span>
                    <span class="session-time-range">${startTimeStr}~${endTimeStr}</span>`;
            } else if (blockHeight > 10) {
                block.innerHTML = `<span class="session-task-name">${escapeHtml(session.taskName)}</span>`;
            }

            grid.appendChild(block);
        });
    });

    // 범례
    if (legend) {
        legend.innerHTML = Object.values(channelColorMap).map(info => {
            const bgColor = getComputedStyle(document.createElement('div')).getPropertyValue('--accent-primary') || '#6366f1';
            return `<div class="legend-item">
                <div class="legend-color ${info.color}"></div>
                <span>${escapeHtml(info.name)}</span>
            </div>`;
        }).join('');
    }
}

function getOrCreateTooltip() {
    let tooltip = document.getElementById('calendar-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'calendar-tooltip';
        tooltip.className = 'calendar-tooltip';
        document.body.appendChild(tooltip);
    }
    return tooltip;
}

function handleCalendarMouseOver(e) {
    const block = e.target.closest('.calendar-session-block');
    if (!block) return;

    const channel = block.getAttribute('data-channel');
    const task = block.getAttribute('data-task');
    const time = block.getAttribute('data-time');
    const duration = block.getAttribute('data-duration');

    const tooltip = getOrCreateTooltip();
    tooltip.innerHTML = `
        <div class="tooltip-row"><span class="tooltip-label">고객명:</span><span class="tooltip-value">${escapeHtml(channel)}</span></div>
        <div class="tooltip-row"><span class="tooltip-label">작업명:</span><span class="tooltip-value">${escapeHtml(task)}</span></div>
        <div class="tooltip-row"><span class="tooltip-label">작업시간:</span><span class="tooltip-time">${time} (${duration})</span></div>
    `;
    tooltip.classList.add('show');
}

function handleCalendarMouseMove(e) {
    const tooltip = document.getElementById('calendar-tooltip');
    if (!tooltip || !tooltip.classList.contains('show')) return;

    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    const pageWidth = window.innerWidth;
    const pageHeight = window.innerHeight;

    let left = e.pageX + 15;
    let top = e.pageY + 15;

    // Check right edge collision
    if (left + tooltipWidth > pageWidth + window.scrollX - 20) {
        left = e.pageX - tooltipWidth - 15;
    }
    // Check bottom edge collision
    if (top + tooltipHeight > pageHeight + window.scrollY - 20) {
        top = e.pageY - tooltipHeight - 15;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function handleCalendarMouseOut(e) {
    const block = e.target.closest('.calendar-session-block');
    if (!block) return;

    const tooltip = document.getElementById('calendar-tooltip');
    if (tooltip) {
        tooltip.classList.remove('show');
    }
}

function initWeeklyCalendar() {
    document.getElementById('week-today-btn')?.addEventListener('click', () => {
        currentWeekOffset = 0;
        renderWeeklyCalendar();
    });
    document.getElementById('week-prev-btn')?.addEventListener('click', () => {
        currentWeekOffset--;
        renderWeeklyCalendar();
    });
    document.getElementById('week-next-btn')?.addEventListener('click', () => {
        currentWeekOffset++;
        renderWeeklyCalendar();
    });

    const grid = document.getElementById('weekly-calendar-grid');
    if (grid) {
        grid.addEventListener('mouseover', handleCalendarMouseOver);
        grid.addEventListener('mousemove', handleCalendarMouseMove);
        grid.addEventListener('mouseout', handleCalendarMouseOut);
    }
}

