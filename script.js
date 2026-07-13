const DEFAULT_KELAS = ['VII', 'VIII', 'IX'];

// Daftar siswa awal dikosongkan — isi sendiri melalui halaman Siswa
const DEFAULT_SISWA = {
    'VII': [],
    'VIII': [],
    'IX': []
};

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
let dataAbsensi = [];
let dataSiswa = {};
let daftarKelas = [];
let semesterAktif = '';
let isDarkMode = false;

let currentPage = 1;
const RECORDS_PER_PAGE = 10;
let currentEditId = null;
let currentDeleteId = null;
let currentEditSiswaKelas = null;
let currentEditSiswaIndex = null;
let currentDeleteSiswaKelas = null;
let currentDeleteSiswaIndex = null;

let absensiChart = null;

// ─────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────
const saveAbsensi = () => localStorage.setItem('ab_absensi', JSON.stringify(dataAbsensi));
const saveSiswa = () => localStorage.setItem('ab_siswa', JSON.stringify(dataSiswa));
const saveKelas = () => localStorage.setItem('ab_kelas', JSON.stringify(daftarKelas));
const saveSemesterData = () => localStorage.setItem('ab_semester', semesterAktif);

function loadData() {
    dataAbsensi = JSON.parse(localStorage.getItem('ab_absensi') || '[]');

    const rawKelas = localStorage.getItem('ab_kelas');
    daftarKelas = rawKelas ? JSON.parse(rawKelas) : [...DEFAULT_KELAS];
    if (!rawKelas) saveKelas();

    const rawSiswa = localStorage.getItem('ab_siswa');
    if (rawSiswa) {
        dataSiswa = JSON.parse(rawSiswa);
        daftarKelas.forEach(k => { if (!dataSiswa[k]) dataSiswa[k] = []; });
    } else {
        dataSiswa = JSON.parse(JSON.stringify(DEFAULT_SISWA));
        saveSiswa();
    }

    const y = new Date().getFullYear();
    semesterAktif = localStorage.getItem('ab_semester') ||
        `Semester 1 - ${y}/${y + 1}`;
}

// ─────────────────────────────────────────
// DARK MODE
// ─────────────────────────────────────────
function initDarkMode() {
    const saved = localStorage.getItem('ab_theme');
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    isDarkMode = saved ? saved === 'dark' : sysDark;
    applyTheme(isDarkMode, false);

    document.getElementById('darkToggle').addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        applyTheme(isDarkMode, true);
        localStorage.setItem('ab_theme', isDarkMode ? 'dark' : 'light');
    });
}

function applyTheme(dark, animate) {
    const html = document.documentElement;
    const icon = document.getElementById('darkIcon');
    const settBtn = document.getElementById('themeToggleBtn');
    const themeLabel = document.getElementById('themeLabel');
    const themeDesc = document.getElementById('themeDesc');
    const themeIcon = document.getElementById('themeIconSettings');

    if (dark) {
        html.setAttribute('data-theme', 'dark');
        icon.className = 'fas fa-sun';
        if (settBtn) { settBtn.classList.add('on'); }
        if (themeLabel) themeLabel.textContent = 'Mode Gelap';
        if (themeDesc) themeDesc.textContent = 'Tampilan gelap aktif';
        if (themeIcon) {
            themeIcon.className = 'fas fa-sun';
            themeIcon.style.color = '#fbbf24';
        }
    } else {
        html.removeAttribute('data-theme');
        icon.className = 'fas fa-moon';
        if (settBtn) { settBtn.classList.remove('on'); }
        if (themeLabel) themeLabel.textContent = 'Mode Gelap';
        if (themeDesc) themeDesc.textContent = 'Aktifkan tampilan gelap';
        if (themeIcon) {
            themeIcon.className = 'fas fa-moon';
            themeIcon.style.color = 'var(--blue-primary)';
        }
    }

    if (animate) {
        icon.classList.add('spin');
        setTimeout(() => icon.classList.remove('spin'), 400);
    }

    // Update chart colors if exists
    if (absensiChart) {
        absensiChart.options.plugins.legend.labels.color = dark ? '#8b949e' : '#475569';
        absensiChart.update();
    }
}

// Called from settings page toggle
function toggleDarkFromSettings() {
    isDarkMode = !isDarkMode;
    applyTheme(isDarkMode, true);
    localStorage.setItem('ab_theme', isDarkMode ? 'dark' : 'light');
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initDarkMode();
    initHeader();
    initNav();
    initAbsensiForm();
    initRekap();
    initSiswaPage();
    populateKelasDropdowns();
    renderDashboard();
    renderKelasChips();

    document.getElementById('currentYear').textContent = new Date().getFullYear();
    document.getElementById('semesterValue').textContent = semesterAktif;
    document.getElementById('currentSemesterBadge').textContent = semesterAktif;

    // Modal buttons
    document.getElementById('saveEditBtn').addEventListener('click', handleEditSave);
    document.getElementById('confirmDeleteBtn').addEventListener('click', handleConfirmDelete);
    document.getElementById('saveEditSiswaBtn').addEventListener('click', handleEditSiswaSave);
    document.getElementById('confirmDeleteSiswaBtn').addEventListener('click', handleConfirmDeleteSiswa);

    // Close modal on backdrop tap
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
    });
});

function initHeader() {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const now = new Date();
    document.getElementById('headerDate').textContent =
        `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ─────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────
function initNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchPage(btn.dataset.section));
    });
}

function switchPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const page = document.getElementById(id);
    if (page) {
        page.classList.add('active-page');
        page.scrollTop = 0;
    }

    const btn = document.querySelector(`.nav-btn[data-section="${id}"]`);
    if (btn) btn.classList.add('active');

    if (id === 'dashboard') renderDashboard();
    if (id === 'rekap') {
        currentPage = 1;
        renderRekap();
    }
    if (id === 'siswa') renderDaftarSiswa();
    if (id === 'pengaturan') {
        renderKelasChips();
        syncSettingsToggle();
    }
}

function syncSettingsToggle() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    isDarkMode ? btn.classList.add('on') : btn.classList.remove('on');
}

// ─────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────
function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const td = dataAbsensi.filter(d => d.tanggal === today);

    document.getElementById('statHadir').textContent = td.filter(d => d.status === 'Hadir').length;
    document.getElementById('statSakit').textContent = td.filter(d => d.status === 'Sakit').length;
    document.getElementById('statIzin').textContent = td.filter(d => d.status === 'Izin').length;
    document.getElementById('statAlpa').textContent = td.filter(d => d.status === 'Alpa').length;
    document.getElementById('statSkorsing').textContent = td.filter(d => d.status === 'Skorsing').length;
    document.getElementById('currentSemesterBadge').textContent = semesterAktif;

    updateChart(filterData());
}

// ─────────────────────────────────────────
// DROPDOWNS
// ─────────────────────────────────────────
function populateKelasDropdowns() {
    ['kelas', 'addSiswaKelas', 'importKelas', 'filterKelas'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const isFilter = id === 'filterKelas';
        el.innerHTML = isFilter ?
            '<option value="all">Semua Kelas</option>' :
            '<option value="" disabled selected>Pilih kelas...</option>';
        daftarKelas.forEach(k => {
            const o = document.createElement('option');
            o.value = k;
            o.textContent = 'Kelas ' + k;
            el.appendChild(o);
        });
    });

    const editKelasEl = document.getElementById('editKelas');
    if (editKelasEl) {
        editKelasEl.innerHTML = '';
        daftarKelas.forEach(k => {
            const o = document.createElement('option');
            o.value = k;
            o.textContent = 'Kelas ' + k;
            editKelasEl.appendChild(o);
        });
    }
}

function updateSiswaList() {
    const kelas = document.getElementById('kelas').value;
    const datalist = document.getElementById('namaSiswaList');
    datalist.innerHTML = '';
    if (kelas && dataSiswa[kelas]) {
        dataSiswa[kelas].forEach(nama => {
            const o = document.createElement('option');
            o.value = nama;
            datalist.appendChild(o);
        });
    }
}

// ─────────────────────────────────────────
// ABSENSI FORM
// ─────────────────────────────────────────
function initAbsensiForm() {
    document.getElementById('tanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('btnSimpanAbsensi').addEventListener('click', handleAbsensiSubmit);
}

function handleAbsensiSubmit() {
    const tanggal = document.getElementById('tanggal').value;
    const kelas = document.getElementById('kelas').value;
    const namaSiswa = document.getElementById('namaSiswa').value.trim();
    const statusEl = document.querySelector('input[name="status"]:checked');
    const status = statusEl ? statusEl.value : null;

    if (!tanggal || !kelas || !namaSiswa || !status) {
        showToast('Semua kolom harus diisi!', 'error');
        return;
    }

    const dup = dataAbsensi.some(d =>
        d.tanggal === tanggal &&
        d.namaSiswa.toLowerCase() === namaSiswa.toLowerCase()
    );
    if (dup) { showToast(`"${namaSiswa}" sudah diabsen hari ini.`, 'warning'); return; }

    dataAbsensi.push({
        id: Date.now(),
        tanggal,
        kelas,
        namaSiswa,
        status,
        timestamp: new Date().toISOString()
    });
    saveAbsensi();

    document.getElementById('namaSiswa').value = '';
    document.querySelector('input[name="status"][value="Hadir"]').checked = true;
    showToast('Absensi berhasil disimpan! ✓', 'success');
    renderDashboard();
}

// ─────────────────────────────────────────
// REKAP
// ─────────────────────────────────────────
function initRekap() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('filterTanggalMulai').value = today;
    document.getElementById('filterTanggalSampai').value = today;

    ['filterKelas', 'filterStatus', 'filterTanggalMulai', 'filterTanggalSampai'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            currentPage = 1;
            renderRekap();
        });
    });
    document.getElementById('resetFilter').addEventListener('click', resetFilter);
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
}

function filterData() {
    const kelas = document.getElementById('filterKelas')?.value || 'all';
    const status = document.getElementById('filterStatus')?.value || 'all';
    const tMulai = document.getElementById('filterTanggalMulai')?.value || '';
    const tSampai = document.getElementById('filterTanggalSampai')?.value || '';

    return dataAbsensi
        .filter(d => kelas === 'all' || d.kelas === kelas)
        .filter(d => status === 'all' || d.status === status)
        .filter(d => !tMulai || d.tanggal >= tMulai)
        .filter(d => !tSampai || d.tanggal <= tSampai)
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
}

function renderRekap() {
    const filtered = filterData();
    const total = filtered.length;
    const totalPages = Math.ceil(total / RECORDS_PER_PAGE);
    const start = (currentPage - 1) * RECORDS_PER_PAGE;
    const pageData = filtered.slice(start, start + RECORDS_PER_PAGE);

    document.getElementById('totalDataBadge').textContent = `${total} data`;
    document.getElementById('paginationInfo').textContent =
        `Menampilkan ${total > 0 ? start + 1 : 0}–${Math.min(start + RECORDS_PER_PAGE, total)} dari ${total} data`;

    const list = document.getElementById('rekapList');
    const icons = { Hadir: 'fa-user-check', Sakit: 'fa-hospital', Izin: 'fa-user-tag', Alpa: 'fa-user-times', Skorsing: 'fa-ban' };

    list.innerHTML = pageData.length === 0 ?
        `<div class="empty-state"><i class="fas fa-clipboard"></i><p>Tidak ada data absensi ditemukan.</p></div>` :
        pageData.map(d => `
            <div class="rekap-card">
                <div class="rekap-avatar ${d.status.toLowerCase()}">
                    <i class="fas ${icons[d.status]||'fa-user'}"></i>
                </div>
                <div class="rekap-info">
                    <div class="rekap-name">${escHtml(d.namaSiswa)}</div>
                    <div class="rekap-meta">Kelas ${escHtml(d.kelas)} &bull; ${formatDateShort(d.tanggal)}</div>
                    <span class="status-badge ${d.status.toLowerCase()}">${d.status}</span>
                </div>
                <div class="rekap-actions">
                    <button class="action-btn btn-edit"   onclick="openEditModal(${d.id})"><i class="fas fa-pen"></i></button>
                    <button class="action-btn btn-delete" onclick="openDeleteModal(${d.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`).join('');

    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages || totalPages === 0;
    renderPageNumbers(totalPages);
    updateChart(filtered);
}

function renderPageNumbers(totalPages) {
    const c = document.getElementById('pageNumbers');
    c.innerHTML = '';
    if (totalPages <= 1) return;

    let s = Math.max(1, currentPage - 2);
    let e = Math.min(totalPages, currentPage + 2);
    if (currentPage <= 3) e = Math.min(totalPages, 5);
    if (currentPage > totalPages - 2) s = Math.max(1, totalPages - 4);

    for (let i = s; i <= e; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = 'page-number' + (i === currentPage ? ' active' : '');
        btn.addEventListener('click', () => {
            currentPage = i;
            renderRekap();
        });
        c.appendChild(btn);
    }
}

function changePage(delta) {
    currentPage += delta;
    renderRekap();
}

function resetFilter() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('filterKelas').value = 'all';
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterTanggalMulai').value = today;
    document.getElementById('filterTanggalSampai').value = today;
    currentPage = 1;
    renderRekap();
    showToast('Filter direset!', 'success');
}

function toggleFilter() {
    document.getElementById('filterBody').classList.toggle('open');
    document.getElementById('filterChevron').classList.toggle('open');
}

// ─────────────────────────────────────────
// EDIT ABSENSI (LENGKAP)
// ─────────────────────────────────────────
function openEditModal(id) {
    const d = dataAbsensi.find(x => x.id === id);
    if (!d) return;
    currentEditId = id;
    document.getElementById('editTanggal').value = d.tanggal;
    document.getElementById('editNamaSiswa').value = d.namaSiswa;
    document.getElementById('editKelas').value = d.kelas;
    const r = document.querySelector(`input[name="editStatus"][value="${d.status}"]`);
    if (r) r.checked = true;
    openModal('editModal');
}

function handleEditSave() {
    const idx = dataAbsensi.findIndex(x => x.id === currentEditId);
    if (idx === -1) { showToast('Data tidak ditemukan!', 'error'); return; }

    const newTanggal = document.getElementById('editTanggal').value;
    const newNama = document.getElementById('editNamaSiswa').value.trim();
    const newKelas = document.getElementById('editKelas').value;
    const statusEl = document.querySelector('input[name="editStatus"]:checked');
    const newStatus = statusEl ? statusEl.value : null;

    if (!newTanggal || !newNama || !newKelas || !newStatus) {
        showToast('Semua kolom harus diisi!', 'error');
        return;
    }

    dataAbsensi[idx] = {...dataAbsensi[idx], tanggal: newTanggal, namaSiswa: newNama, kelas: newKelas, status: newStatus };
    saveAbsensi();
    closeModal('editModal');
    renderRekap();
    renderDashboard();
    showToast('Data berhasil diperbarui!', 'success');
}

// ─────────────────────────────────────────
// HAPUS ABSENSI
// ─────────────────────────────────────────
function openDeleteModal(id) {
    currentDeleteId = id;
    openModal('deleteModal');
}

function handleConfirmDelete() {
    dataAbsensi = dataAbsensi.filter(x => x.id !== currentDeleteId);
    saveAbsensi();
    closeModal('deleteModal');
    renderRekap();
    renderDashboard();
    showToast('Data absensi dihapus!', 'success');
}

// ─────────────────────────────────────────
// MANAJEMEN SISWA
// ─────────────────────────────────────────
function initSiswaPage() {
    document.getElementById('btnTambahSiswa').addEventListener('click', handleTambahSiswa);
    document.getElementById('btnImportSiswa').addEventListener('click', handleImportSiswa);
}

function handleTambahSiswa() {
    const kelas = document.getElementById('addSiswaKelas').value;
    const nama = document.getElementById('addSiswaName').value.trim();
    if (!kelas) { showToast('Pilih kelas terlebih dahulu!', 'warning'); return; }
    if (!nama) { showToast('Masukkan nama siswa!', 'warning'); return; }
    if (!dataSiswa[kelas]) dataSiswa[kelas] = [];
    if (dataSiswa[kelas].some(n => n.toLowerCase() === nama.toLowerCase())) {
        showToast('Siswa ini sudah ada di kelas tersebut!', 'warning');
        return;
    }
    dataSiswa[kelas].push(nama);
    saveSiswa();
    document.getElementById('addSiswaName').value = '';
    renderDaftarSiswa();
    showToast(`${nama} berhasil ditambahkan ke Kelas ${kelas}!`, 'success');
}

function handleImportSiswa() {
    const kelas = document.getElementById('importKelas').value;
    const raw = document.getElementById('importNama').value.trim();
    if (!kelas) { showToast('Pilih kelas target!', 'warning'); return; }
    if (!raw) { showToast('Daftar nama tidak boleh kosong!', 'warning'); return; }

    const names = raw.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) { showToast('Tidak ada nama valid!', 'warning'); return; }

    if (!confirm(`Yakin ganti daftar Kelas ${kelas} dengan ${names.length} siswa baru?\nData absensi lama tidak terhapus.`)) return;

    dataSiswa[kelas] = names;
    saveSiswa();
    document.getElementById('importNama').value = '';
    renderDaftarSiswa();
    showToast(`Daftar Kelas ${kelas} berhasil diganti! (${names.length} siswa)`, 'success');
}

function renderDaftarSiswa() {
    const container = document.getElementById('daftarSiswaContainer');
    container.innerHTML = '';

    daftarKelas.forEach(kelas => {
                const list = dataSiswa[kelas] || [];
                const sec = document.createElement('div');
                sec.className = 'kelas-section';
                sec.innerHTML = `
            <div class="kelas-header" onclick="toggleKelasBody('kb_${kelas}','kc_${kelas}')">
                <div class="kelas-header-left">
                    <i class="fas fa-chalkboard"></i>
                    <div>
                        <div class="kelas-name">Kelas ${kelas}</div>
                        <div class="kelas-count">${list.length} siswa</div>
                    </div>
                </div>
                <i class="fas fa-chevron-down kelas-chevron" id="kc_${kelas}"></i>
            </div>
            <div class="kelas-body" id="kb_${kelas}">
                ${list.length === 0
                    ? '<p style="text-align:center;color:var(--text-3);font-size:.8rem;padding:12px">Belum ada siswa</p>'
                    : list.map((nama, idx) => `
                        <div class="siswa-item">
                            <div class="siswa-num">${idx + 1}</div>
                            <div class="siswa-nama">${escHtml(nama)}</div>
                            <div class="siswa-actions">
                                <button class="action-btn btn-edit"   onclick="openEditSiswaModal('${kelas}',${idx})"><i class="fas fa-pen"></i></button>
                                <button class="action-btn btn-delete" onclick="openDeleteSiswaModal('${kelas}',${idx},'${escHtml(nama)}')"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>`).join('')
                }
            </div>`;
        container.appendChild(sec);
    });
}

function toggleKelasBody(bodyId, chevronId) {
    document.getElementById(bodyId)?.classList.toggle('open');
    document.getElementById(chevronId)?.classList.toggle('open');
}

function openEditSiswaModal(kelas, index) {
    currentEditSiswaKelas = kelas;
    currentEditSiswaIndex = index;
    document.getElementById('editSiswaName').value = dataSiswa[kelas][index];
    openModal('editSiswaModal');
}

function handleEditSiswaSave() {
    const newNama = document.getElementById('editSiswaName').value.trim();
    if (!newNama) { showToast('Nama tidak boleh kosong!', 'warning'); return; }

    const oldNama = dataSiswa[currentEditSiswaKelas][currentEditSiswaIndex];
    dataSiswa[currentEditSiswaKelas][currentEditSiswaIndex] = newNama;
    saveSiswa();

    // Sinkronkan nama di rekap absensi
    dataAbsensi = dataAbsensi.map(d =>
        (d.namaSiswa === oldNama && d.kelas === currentEditSiswaKelas)
            ? { ...d, namaSiswa: newNama } : d
    );
    saveAbsensi();

    closeModal('editSiswaModal');
    renderDaftarSiswa();
    showToast('Nama siswa berhasil diperbarui!', 'success');
}

function openDeleteSiswaModal(kelas, index, nama) {
    currentDeleteSiswaKelas = kelas;
    currentDeleteSiswaIndex = index;
    document.getElementById('deleteSiswaName').textContent = nama;
    openModal('deleteSiswaModal');
}

function handleConfirmDeleteSiswa() {
    dataSiswa[currentDeleteSiswaKelas].splice(currentDeleteSiswaIndex, 1);
    saveSiswa();
    closeModal('deleteSiswaModal');
    renderDaftarSiswa();
    showToast('Siswa berhasil dihapus dari daftar!', 'success');
}

// ─────────────────────────────────────────
// KELOLA KELAS
// ─────────────────────────────────────────
function tambahKelas() {
    const name = document.getElementById('newKelasName').value.trim().toUpperCase();
    if (!name) { showToast('Masukkan nama kelas!', 'warning'); return; }
    if (daftarKelas.includes(name)) { showToast('Kelas sudah ada!', 'warning'); return; }

    daftarKelas.push(name);
    if (!dataSiswa[name]) dataSiswa[name] = [];
    saveKelas(); saveSiswa();

    document.getElementById('newKelasName').value = '';
    populateKelasDropdowns();
    renderKelasChips();
    renderDaftarSiswa();
    showToast(`Kelas ${name} berhasil ditambahkan!`, 'success');
}

function hapusKelas(kelas) {
    const n = (dataSiswa[kelas] || []).length;
    const msg = n > 0
        ? `Hapus Kelas ${kelas}? ${n} siswa akan ikut terhapus dari daftar.`
        : `Hapus Kelas ${kelas}?`;
    if (!confirm(msg)) return;

    daftarKelas = daftarKelas.filter(k => k !== kelas);
    delete dataSiswa[kelas];
    saveKelas(); saveSiswa();
    populateKelasDropdowns();
    renderKelasChips();
    renderDaftarSiswa();
    showToast(`Kelas ${kelas} dihapus!`, 'success');
}

function renderKelasChips() {
    const c = document.getElementById('daftarKelas');
    c.innerHTML = daftarKelas.length === 0
        ? '<p style="color:var(--text-3);font-size:.8rem">Belum ada kelas</p>'
        : daftarKelas.map(k => `
            <div class="kelas-chip">
                <span>${k}</span>
                <button onclick="hapusKelas('${k}')" title="Hapus Kelas ${k}"><i class="fas fa-times"></i></button>
            </div>`).join('');
}

// ─────────────────────────────────────────
// SEMESTER
// ─────────────────────────────────────────
function openSemesterModal() {
    document.getElementById('semesterInput').value = semesterAktif;
    openModal('semesterModal');
}

function saveSemester() {
    const val = document.getElementById('semesterInput').value.trim();
    if (!val) { showToast('Nama semester tidak boleh kosong!', 'warning'); return; }
    semesterAktif = val;
    saveSemesterData();
    document.getElementById('semesterValue').textContent          = semesterAktif;
    document.getElementById('currentSemesterBadge').textContent   = semesterAktif;
    closeModal('semesterModal');
    showToast('Semester diperbarui!', 'success');
}


// ─────────────────────────────────────────
// BACKUP & RESTORE
// ─────────────────────────────────────────
function backupData() {
    const backup = {
        version: '2.1',
        timestamp: new Date().toISOString(),
        semester: semesterAktif,
        kelas: daftarKelas,
        siswa: dataSiswa,
        absensi: dataAbsensi
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `backup_absensi_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup berhasil diunduh! ✓', 'success');
}

function restoreData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const bk = JSON.parse(e.target.result);
            if (!bk.absensi || !bk.siswa || !bk.kelas) {
                showToast('File backup tidak valid!', 'error'); return;
            }

            const ts = bk.timestamp ? new Date(bk.timestamp).toLocaleString('id-ID') : '?';
            const ok = confirm(
                `Restore backup dari ${ts}?\n\n` +
                `• Semester: ${bk.semester}\n` +
                `• Kelas: ${bk.kelas.join(', ')}\n` +
                `• Siswa: ${Object.values(bk.siswa).flat().length}\n` +
                `• Absensi: ${bk.absensi.length}\n\n` +
                `SEMUA data saat ini akan diganti!`
            );
            if (!ok) { input.value = ''; return; }

            dataAbsensi   = bk.absensi;
            dataSiswa     = bk.siswa;
            daftarKelas   = bk.kelas;
            semesterAktif = bk.semester || semesterAktif;

            saveAbsensi(); saveSiswa(); saveKelas(); saveSemesterData();
            populateKelasDropdowns();
            renderDashboard();
            renderDaftarSiswa();
            renderKelasChips();
            document.getElementById('semesterValue').textContent        = semesterAktif;
            document.getElementById('currentSemesterBadge').textContent = semesterAktif;
            showToast('Data berhasil dipulihkan! ✓', 'success');
        } catch {
            showToast('File backup rusak atau tidak valid!', 'error');
        }
        input.value = '';
    };
    reader.readAsText(file);
}

// ─────────────────────────────────────────
// HAPUS SEMUA
// ─────────────────────────────────────────
function confirmHapusSemua() {
    if (!confirm(`Hapus SEMUA data absensi (${dataAbsensi.length} data)?\nTindakan ini TIDAK DAPAT dibatalkan!`)) return;
    dataAbsensi = [];
    saveAbsensi();
    renderDashboard();
    renderRekap();
    showToast('Semua data absensi telah dihapus!', 'success');
}

function confirmResetSiswa() {
    const totalSiswa = Object.values(dataSiswa).flat().length;
    if (!confirm(`Reset semua daftar siswa (${totalSiswa} siswa dari semua kelas)?\nData absensi tidak terhapus.`)) return;
    daftarKelas.forEach(k => { dataSiswa[k] = []; });
    saveSiswa();
    renderDaftarSiswa();
    showToast('Semua daftar siswa berhasil dikosongkan!', 'success');
}

// ─────────────────────────────────────────
// CHART
// ─────────────────────────────────────────
function updateChart(data) {
    const counts = {
        Hadir:    data.filter(d => d.status === 'Hadir').length,
        Sakit:    data.filter(d => d.status === 'Sakit').length,
        Izin:     data.filter(d => d.status === 'Izin').length,
        Alpa:     data.filter(d => d.status === 'Alpa').length,
        Skorsing: data.filter(d => d.status === 'Skorsing').length
    };
    const total    = Object.values(counts).reduce((a,b) => a+b, 0);
    const emptyEl  = document.getElementById('chartEmpty');
    const canvasEl = document.getElementById('absensiChart');

    if (total === 0) {
        if (emptyEl)  { emptyEl.style.display = 'flex'; }
        if (canvasEl) canvasEl.style.display = 'none';
        if (absensiChart) { absensiChart.destroy(); absensiChart = null; }
        return;
    }

    if (emptyEl)  emptyEl.style.display  = 'none';
    if (canvasEl) canvasEl.style.display = 'block';

    const dark    = isDarkMode;
    const textClr = dark ? '#8b949e' : '#475569';

    const chartData = {
        labels: ['Hadir','Sakit','Izin','Alpa','Skorsing'],
        datasets: [{
            data: Object.values(counts),
            backgroundColor: ['#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6'],
            borderColor: dark ? '#161b22' : '#fff',
            borderWidth: 2,
            hoverOffset: 8
        }]
    };

    if (absensiChart) {
        absensiChart.data = chartData;
        absensiChart.options.plugins.legend.labels.color = textClr;
        absensiChart.update('none');
    } else {
        const ctx = canvasEl.getContext('2d');
        absensiChart = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font:    { family: 'Plus Jakarta Sans', size: 11 },
                            padding: 14,
                            color:   textClr
                        }
                    },
                    tooltip: {
                        callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` }
                    }
                }
            }
        });
    }
}

// ─────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────
function processDataForTotal(data) {
    const map = {};
    data.forEach(item => {
        const key = `${item.namaSiswa}|${item.kelas}`;
        if (!map[key]) map[key] = { namaSiswa: item.namaSiswa, kelas: item.kelas, Hadir:0, Sakit:0, Izin:0, Alpa:0, Skorsing:0, Total:0 };
        if (map[key].hasOwnProperty(item.status)) map[key][item.status]++;
        map[key].Total++;
    });
    return Object.values(map).sort((a,b) => a.kelas.localeCompare(b.kelas) || a.namaSiswa.localeCompare(b.namaSiswa));
}

function exportData(type, format) {
    const data = type === 'harian' ? filterData() : processDataForTotal(dataAbsensi);
    if (data.length === 0) { showToast('Tidak ada data untuk diekspor.', 'warning'); return; }
    format === 'excel' ? exportToExcel(data, type) : exportToPdf(data, type);
}

function exportToExcel(data, type) {
    const rows = type === 'harian'
        ? data.map(d => ({ 'Tanggal': d.tanggal, 'Kelas': d.kelas, 'Nama Siswa': d.namaSiswa, 'Status': d.status }))
        : data.map(d => ({ 'Kelas': d.kelas, 'Nama Siswa': d.namaSiswa, 'Hadir': d.Hadir, 'Sakit': d.Sakit, 'Izin': d.Izin, 'Alpa': d.Alpa, 'Skorsing': d.Skorsing, 'Total': d.Total }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'harian' ? 'Absensi Harian' : 'Rekap Total');
    XLSX.writeFile(wb, `absensi_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Berhasil diekspor ke Excel!', 'success');
}

function exportToPdf(data, type) {
    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF('landscape');
    const title = type === 'harian' ? 'Laporan Absensi Harian' : 'Rekap Total Absensi Siswa';
    const cols  = type === 'harian'
        ? ['No.','Tanggal','Kelas','Nama Siswa','Status']
        : ['No.','Kelas','Nama Siswa','Hadir','Sakit','Izin','Alpa','Skorsing','Total'];
    const rows  = type === 'harian'
        ? data.map((d,i) => [i+1, d.tanggal, d.kelas, d.namaSiswa, d.status])
        : data.map((d,i) => [i+1, d.kelas, d.namaSiswa, d.Hadir, d.Sakit, d.Izin, d.Alpa, d.Skorsing, d.Total]);

    doc.setFontSize(16); doc.text(title, 14, 18);
    doc.setFontSize(10); doc.text(`SMP Mangun Jaya 01 | ${semesterAktif} | Cetak: ${formatDate(new Date())}`, 14, 25);
    doc.autoTable(cols, rows, { startY: 32, headStyles: { fillColor: [37,99,235] }, theme: 'grid', styles: { fontSize: 9 } });
    doc.save(`absensi_${type}_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('Berhasil diekspor ke PDF!', 'success');
}

// ─────────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────────
function openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; document.body.style.overflow = ''; }
}

// ─────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(date) {
    return date.toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

function formatDateShort(str) {
    const [y,m,d] = str.split('-');
    const months  = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    const icon  = document.getElementById('toastIcon');
    const msgEl = document.getElementById('toastMsg');
    const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };

    icon.className  = `fas ${icons[type] || icons.info}`;
    msgEl.textContent = msg;
    toast.className   = `toast show ${type}`;

    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}