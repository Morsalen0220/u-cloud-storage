// script.js

// গ্লোবাল ভেরিয়েবল
let currentPath = 'root';
let folders = JSON.parse(localStorage.getItem('folders')) || [
    { id: 'root', name: 'হোম', parent: null, path: 'root' }
];
let files = JSON.parse(localStorage.getItem('files')) || [];

// DOM এলিমেন্ট
const fileGrid = document.getElementById('fileGrid');
const searchInput = document.getElementById('searchInput');
const breadcrumb = document.getElementById('breadcrumb');
const folderModal = document.getElementById('folderModal');
const previewModal = document.getElementById('previewModal');

// স্ট্যাটস আপডেট
function updateStats() {
    const currentFiles = files.filter(f => f.path === currentPath);
    const currentFolders = folders.filter(f => f.parent === currentPath && f.id !== 'root');
    
    let totalSize = 0;
    files.forEach(f => totalSize += f.size);
    
    document.getElementById('totalFiles').textContent = files.length;
    document.getElementById('totalFolders').textContent = folders.length - 1;
    document.getElementById('totalSize').textContent = formatBytes(totalSize);
}

// ফাইল সাইজ ফরম্যাট
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ফাইল আইকন
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'jpg': 'fa-image', 'jpeg': 'fa-image', 'png': 'fa-image', 'gif': 'fa-image',
        'mp4': 'fa-video', 'mkv': 'fa-video', 'avi': 'fa-video',
        'mp3': 'fa-music', 'wav': 'fa-music',
        'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'docx': 'fa-file-word',
        'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel',
        'zip': 'fa-file-archive', 'rar': 'fa-file-archive', '7z': 'fa-file-archive',
        'txt': 'fa-file-alt', 'js': 'fa-file-code', 'html': 'fa-file-code',
        'css': 'fa-file-code', 'py': 'fa-file-code'
    };
    return icons[ext] || 'fa-file';
}

// ফাইল গ্রিড রেন্ডার
function renderFileGrid() {
    const currentFolders = folders.filter(f => f.parent === currentPath && f.id !== 'root');
    const currentFiles = files.filter(f => f.path === currentPath);
    
    let html = '';
    
    // ফোল্ডার দেখাও
    currentFolders.forEach(folder => {
        html += `
            <div class="file-item folder-item" ondblclick="navigateTo('${folder.id}')">
                <div class="file-actions">
                    <button class="action-btn" onclick="renameFolder('${folder.id}')" title="rename">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" onclick="deleteFolder('${folder.id}')" title="delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="file-icon folder-icon">
                    <i class="fas fa-folder fa-3x"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${folder.name}</div>
                    <div class="file-meta">ফোল্ডার</div>
                </div>
            </div>
        `;
    });
    
    // ফাইল দেখাও
    currentFiles.forEach(file => {
        html += `
            <div class="file-item" ondblclick="previewFile('${file.id}')">
                <div class="file-actions">
                    <button class="action-btn" onclick="downloadFile('${file.id}')" title="download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-btn" onclick="renameFile('${file.id}')" title="rename">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" onclick="moveFile('${file.id}')" title="move">
                        <i class="fas fa-folder-open"></i>
                    </button>
                    <button class="action-btn" onclick="deleteFile('${file.id}')" title="delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="file-icon">
                    <i class="fas ${getFileIcon(file.name)} fa-3x"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">${formatBytes(file.size)}</div>
                </div>
            </div>
        `;
    });
    
    // খালি থাকলে
    if (currentFolders.length === 0 && currentFiles.length === 0) {
        html = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #94a3b8;">
                <i class="fas fa-folder-open" style="font-size: 48px; margin-bottom: 20px;"></i>
                <p>এই ফোল্ডার খালি</p>
                <p style="font-size: 0.9em;">ফাইল আপলোড করুন বা নতুন ফোল্ডার তৈরি করুন</p>
            </div>
        `;
    }
    
    fileGrid.innerHTML = html;
    updateBreadcrumb();
    updateStats();
}

// ব্রেডক্রাম্ব আপডেট
function updateBreadcrumb() {
    const path = [];
    let current = folders.find(f => f.id === currentPath);
    
    while (current) {
        path.unshift(current);
        current = folders.find(f => f.id === current.parent);
    }
    
    let html = '<span onclick="navigateTo(\'root\')"><i class="fas fa-home"></i> হোম</span>';
    
    path.forEach((folder, index) => {
        if (folder.id !== 'root') {
            html += `<span onclick="navigateTo('${folder.id}')">${folder.name}</span>`;
        }
    });
    
    breadcrumb.innerHTML = html;
}

// নেভিগেট
function navigateTo(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
        currentPath = folderId;
        renderFileGrid();
    }
}

// সার্চ ফাংশন
searchInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (searchTerm.length < 2) {
        renderFileGrid();
        return;
    }
    
    const allFolders = folders.filter(f => f.id !== 'root' && f.name.toLowerCase().includes(searchTerm));
    const allFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm));
    
    let html = '';
    
    allFolders.forEach(folder => {
        html += `
            <div class="file-item folder-item" ondblclick="navigateTo('${folder.id}')">
                <div class="file-icon folder-icon">
                    <i class="fas fa-folder fa-3x"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${folder.name}</div>
                    <div class="file-meta">ফোল্ডার</div>
                </div>
            </div>
        `;
    });
    
    allFiles.forEach(file => {
        html += `
            <div class="file-item" ondblclick="previewFile('${file.id}')">
                <div class="file-icon">
                    <i class="fas ${getFileIcon(file.name)} fa-3x"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">${formatBytes(file.size)}</div>
                </div>
            </div>
        `;
    });
    
    fileGrid.innerHTML = html;
});

// ফাইল সিলেক্ট
function handleFileSelect(input) {
    const selectedFiles = input.files;
    
    for (let file of selectedFiles) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const fileData = {
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target.result,
                path: currentPath,
                uploadedAt: new Date().toISOString()
            };
            
            files.push(fileData);
            localStorage.setItem('files', JSON.stringify(files));
            
            // UI আপডেট
            renderFileGrid();
            
            // টেলিগ্রামে আপলোড (API কল)
            uploadToTelegram(fileData);
        };
        
        reader.readAsDataURL(file);
    }
    
    input.value = '';
}

// টেলিগ্রাম আপলোড (ব্যাকএন্ড কল)
function uploadToTelegram(fileData) {
    const apiUrl = 'https://your-render-app.onrender.com/upload';
    
    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filename: fileData.name,
            data: fileData.data.split(',')[1],
            size: fileData.size
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // আপডেট ফাইল ইনফো
            const fileIndex = files.findIndex(f => f.id === fileData.id);
            files[fileIndex].telegramId = data.message_id;
            files[fileIndex].downloadUrl = data.download_url;
            localStorage.setItem('files', JSON.stringify(files));
            
            showNotification('ফাইল আপলোড সফল হয়েছে!', 'success');
        }
    })
    .catch(err => {
        console.error('Upload error:', err);
        showNotification('আপলোড ব্যর্থ হয়েছে!', 'error');
    });
}

// নতুন ফোল্ডার মোডাল
function showNewFolderModal() {
    document.getElementById('folderName').value = '';
    folderModal.style.display = 'flex';
}

function closeFolderModal() {
    folderModal.style.display = 'none';
}

// ফোল্ডার তৈরি
function createFolder() {
    const folderName = document.getElementById('folderName').value.trim();
    
    if (folderName) {
        const newFolder = {
            id: Date.now() + Math.random(),
            name: folderName,
            parent: currentPath,
            path: currentPath,
            createdAt: new Date().toISOString()
        };
        
        folders.push(newFolder);
        localStorage.setItem('folders', JSON.stringify(folders));
        
        renderFileGrid();
        closeFolderModal();
        showNotification('ফোল্ডার তৈরি হয়েছে!', 'success');
    }
}

// ফোল্ডার মুছুন
function deleteFolder(folderId) {
    if (confirm('এই ফোল্ডার এবং এর সব কন্টেন্ট মুছে ফেলতে চান?')) {
        folders = folders.filter(f => f.id !== folderId && f.parent !== folderId);
        files = files.filter(f => f.path !== folderId);
        
        localStorage.setItem('folders', JSON.stringify(folders));
        localStorage.setItem('files', JSON.stringify(files));
        
        renderFileGrid();
        showNotification('ফোল্ডার মুছে ফেলা হয়েছে!', 'success');
    }
}

// ফাইল মুছুন
function deleteFile(fileId) {
    if (confirm('এই ফাইলটি মুছে ফেলতে চান?')) {
        files = files.filter(f => f.id !== fileId);
        localStorage.setItem('files', JSON.stringify(files));
        
        renderFileGrid();
        showNotification('ফাইল মুছে ফেলা হয়েছে!', 'success');
    }
}

// ফাইল প্রিভিউ
function previewFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    const previewBody = document.getElementById('previewBody');
    const previewTitle = document.getElementById('previewTitle');
    
    previewTitle.textContent = file.name;
    
    if (file.type.startsWith('image/')) {
        previewBody.innerHTML = `<img src="${file.data}" class="preview-image">`;
    } else if (file.type.startsWith('video/')) {
        previewBody.innerHTML = `<video src="${file.data}" controls class="preview-video"></video>`;
    } else if (file.type.startsWith('audio/')) {
        previewBody.innerHTML = `<audio src="${file.data}" controls></audio>`;
    } else {
        previewBody.innerHTML = `
            <div class="preview-info">
                <p><strong>নাম:</strong> ${file.name}</p>
                <p><strong>সাইজ:</strong> ${formatBytes(file.size)}</p>
                <p><strong>আপলোড:</strong> ${new Date(file.uploadedAt).toLocaleString()}</p>
                <button class="btn btn-primary" onclick="downloadFile('${file.id}')">
                    <i class="fas fa-download"></i> ডাউনলোড
                </button>
            </div>
        `;
    }
    
    previewModal.style.display = 'flex';
}

function closePreview() {
    previewModal.style.display = 'none';
}

// ফাইল ডাউনলোড
function downloadFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    if (file.downloadUrl) {
        window.open(file.downloadUrl, '_blank');
    } else {
        const a = document.createElement('a');
        a.href = file.data;
        a.download = file.name;
        a.click();
    }
}

// ফাইল মুভ
function moveFile(fileId) {
    const folderList = folders.filter(f => f.id !== 'root');
    let folderOptions = folderList.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    
    const selectedFolder = prompt(`ফাইল সরান:\nফোল্ডার আইডি দিন:\n${folderOptions}`);
    
    if (selectedFolder) {
        const fileIndex = files.findIndex(f => f.id === fileId);
        files[fileIndex].path = selectedFolder;
        localStorage.setItem('files', JSON.stringify(files));
        
        renderFileGrid();
        showNotification('ফাইল সরানো হয়েছে!', 'success');
    }
}

// ফাইলের নাম পরিবর্তন
function renameFile(fileId) {
    const file = files.find(f => f.id === fileId);
    const newName = prompt('নতুন নাম দিন:', file.name);
    
    if (newName && newName !== file.name) {
        file.name = newName;
        localStorage.setItem('files', JSON.stringify(files));
        
        renderFileGrid();
        showNotification('নাম পরিবর্তন হয়েছে!', 'success');
    }
}

// ফোল্ডারের নাম পরিবর্তন
function renameFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    const newName = prompt('নতুন নাম দিন:', folder.name);
    
    if (newName && newName !== folder.name) {
        folder.name = newName;
        localStorage.setItem('folders', JSON.stringify(folders));
        
        renderFileGrid();
        showNotification('নাম পরিবর্তন হয়েছে!', 'success');
    }
}

// নোটিফিকেশন
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        font-weight: 500;
        z-index: 2000;
        animation: slideIn 0.3s;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// কনটেক্সট মেনু
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    
    const fileItem = e.target.closest('.file-item');
    if (fileItem) {
        showContextMenu(e.pageX, e.pageY, fileItem);
    }
});

function showContextMenu(x, y, element) {
    // কনটেক্সট মেনু দেখাও
}

// ইনিশিয়ালাইজ
renderFileGrid();

// কিবোর্ড শর্টকাট
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
    }
    
    if (e.key === 'Escape') {
        closePreview();
        closeFolderModal();
    }
});