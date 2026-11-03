// ===== APPLICATION STATE =====
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let productImg = new Image();
let logoImg = new Image();
let productLoaded = false;
let logoLoaded = false;

// Default canvas coordinate dimensions
const MAX_CANVAS_WIDTH = 640;
const MAX_CANVAS_HEIGHT = 640;

// Logo Transform & Style State
let logoData = {
    x: 50,
    y: 50,
    width: 150,
    height: 150,
    opacity: 1.0,
    rotation: 0, // in degrees
    blendMode: 'source-over'
};

// Active Boundary Mode: 'full' | 'custom'
let boundaryMode = 'full';

// Active Boundary in canvas pixels: { x, y, w, h }
let activeBoundary = { x: 0, y: 0, w: 600, h: 600 };

// Custom User-drawn Print Area
let customPrintAreaPx = null;

// Interactive Drawing of Custom Boundary
let isDrawingCustomArea = false;
let drawStart = { x: 0, y: 0 };
let tempCustomBox = null;

// Guides & Preview Mode
let showGuides = true;
let isPreviewMode = false;

// Handle & Drag System
let isDraggingLogo = false;
let activeResizeHandle = null; // 'tl' | 'tr' | 'bl' | 'br'
let dragStartMouse = { x: 0, y: 0 };
let dragStartLogo = { x: 0, y: 0, width: 0, height: 0 };

const HANDLE_SIZE = 10; // corner handle size in px

// ===== BOUNDARY MANAGEMENT =====
function setBoundaryMode(mode) {
    boundaryMode = mode;

    document.getElementById('btn-bound-full').classList.toggle('active', mode === 'full');
    document.getElementById('btn-bound-custom').classList.toggle('active', mode === 'custom');

    const hint = document.getElementById('boundary-hint');
    if (mode === 'full') {
        hint.textContent = 'Boundary: Entire product image. Logo cannot go outside the product.';
    } else if (mode === 'custom') {
        hint.textContent = 'Boundary: Custom drawn area. Click "✏️ Draw Area" to redraw anytime.';
    }

    updateActiveBoundary();
    clampLogoToBoundary();
    render();
}

function startDrawCustomBoundary() {
    if (!productLoaded) {
        showError('Please upload a product image first.');
        return;
    }
    isDrawingCustomArea = true;
    tempCustomBox = null;
    canvas.classList.add('crosshair');
    setStatus('✏️ Click and drag on the product to set your printable area');
}

function updateActiveBoundary() {
    if (boundaryMode === 'custom' && customPrintAreaPx) {
        activeBoundary = customPrintAreaPx;
    } else {
        // Full product boundary with small 4px safe margin
        activeBoundary = {
            x: 4,
            y: 4,
            w: Math.max(20, canvas.width - 8),
            h: Math.max(20, canvas.height - 8)
        };
    }
}

// ===== CLAMP LOGO TO BOUNDARY (STRICT NO-ESCAPE) =====
function clampLogoToBoundary() {
    if (!activeBoundary) return;

    // Logo size cannot exceed boundary dimensions
    logoData.width = Math.min(logoData.width, activeBoundary.w);
    logoData.height = Math.min(logoData.height, activeBoundary.h);

    const maxX = activeBoundary.x + activeBoundary.w - logoData.width;
    const maxY = activeBoundary.y + activeBoundary.h - logoData.height;

    logoData.x = Math.max(activeBoundary.x, Math.min(logoData.x, maxX));
    logoData.y = Math.max(activeBoundary.y, Math.min(logoData.y, maxY));

    syncInputsWithState();
}

// ===== EXACT INPUTS & STATE SYNC =====
function syncInputsWithState() {
    const xInput = document.getElementById('posXInput');
    const yInput = document.getElementById('posYInput');
    const wInput = document.getElementById('sizeWInput');
    const hInput = document.getElementById('sizeHInput');
    const sizeRange = document.getElementById('sizeRange');
    const sizeVal = document.getElementById('size-value');
    const rotateRange = document.getElementById('rotateRange');
    const rotateVal = document.getElementById('rotate-value');
    const opacityRange = document.getElementById('opacityRange');
    const opacityVal = document.getElementById('opacity-value');
    const liveInfo = document.getElementById('live-info-badge');

    if (xInput) xInput.value = Math.round(logoData.x);
    if (yInput) yInput.value = Math.round(logoData.y);
    if (wInput) wInput.value = Math.round(logoData.width);
    if (hInput) hInput.value = Math.round(logoData.height);
    if (sizeRange) sizeRange.value = Math.round(logoData.width);
    if (sizeVal) sizeVal.textContent = `${Math.round(logoData.width)}px`;
    if (rotateRange) rotateRange.value = Math.round(logoData.rotation);
    if (rotateVal) rotateVal.textContent = `${Math.round(logoData.rotation)}°`;
    if (opacityRange) opacityRange.value = Math.round(logoData.opacity * 100);
    if (opacityVal) opacityVal.textContent = `${Math.round(logoData.opacity * 100)}%`;

    if (liveInfo && logoLoaded) {
        liveInfo.textContent = `Logo: ${Math.round(logoData.width)}×${Math.round(logoData.height)}px at (${Math.round(logoData.x)}, ${Math.round(logoData.y)})`;
    }
}

function manualSetPosition() {
    const newX = parseInt(document.getElementById('posXInput').value) || 0;
    const newY = parseInt(document.getElementById('posYInput').value) || 0;
    logoData.x = newX;
    logoData.y = newY;
    clampLogoToBoundary();
    render();
}

function manualSetSize(sourceAxis) {
    const lockRatio = document.getElementById('lockAspectCheckbox').checked;
    let newW = parseInt(document.getElementById('sizeWInput').value) || 20;
    let newH = parseInt(document.getElementById('sizeHInput').value) || 20;

    const ratio = (logoLoaded && logoImg.width > 0) ? (logoImg.height / logoImg.width) : 1;

    if (lockRatio) {
        if (sourceAxis === 'w') {
            newH = Math.round(newW * ratio);
        } else {
            newW = Math.round(newH / ratio);
        }
    }

    logoData.width = Math.max(10, newW);
    logoData.height = Math.max(10, newH);
    clampLogoToBoundary();
    render();
}

function updateSize(val) {
    const newW = parseInt(val);
    const ratio = (logoLoaded && logoImg.width > 0) ? (logoImg.height / logoImg.width) : 1;
    logoData.width = newW;
    logoData.height = Math.round(newW * ratio);
    clampLogoToBoundary();
    render();
}

function updateOpacity(val) {
    logoData.opacity = parseInt(val) / 100;
    syncInputsWithState();
    render();
}

function updateRotation(val) {
    logoData.rotation = parseInt(val);
    syncInputsWithState();
    render();
}

function resetRotation() {
    logoData.rotation = 0;
    syncInputsWithState();
    render();
}

function updateBlendMode(mode) {
    logoData.blendMode = mode;
    render();
}

// ===== QUICK ALIGNMENT =====
function quickAlign(position) {
    if (!activeBoundary || !logoLoaded) return;

    const b = activeBoundary;
    const w = logoData.width;
    const h = logoData.height;

    const centerX = b.x + Math.round((b.w - w) / 2);
    const centerY = b.y + Math.round((b.h - h) / 2);

    switch (position) {
        case 'top-left':
            logoData.x = b.x;
            logoData.y = b.y;
            break;
        case 'top-center':
            logoData.x = centerX;
            logoData.y = b.y;
            break;
        case 'top-right':
            logoData.x = b.x + b.w - w;
            logoData.y = b.y;
            break;
        case 'mid-left':
            logoData.x = b.x;
            logoData.y = centerY;
            break;
        case 'center':
            logoData.x = centerX;
            logoData.y = centerY;
            break;
        case 'mid-right':
            logoData.x = b.x + b.w - w;
            logoData.y = centerY;
            break;
        case 'chest':
            logoData.x = centerX;
            logoData.y = b.y + Math.round(b.h * 0.22);
            break;
        case 'bottom-center':
            logoData.x = centerX;
            logoData.y = b.y + b.h - h;
            break;
        case 'fit': {
            const ratio = (logoImg.height / logoImg.width);
            const maxW = b.w * 0.9;
            const maxH = b.h * 0.9;
            if (maxW * ratio <= maxH) {
                logoData.width = Math.round(maxW);
                logoData.height = Math.round(maxW * ratio);
            } else {
                logoData.height = Math.round(maxH);
                logoData.width = Math.round(maxH / ratio);
            }
            logoData.x = b.x + Math.round((b.w - logoData.width) / 2);
            logoData.y = b.y + Math.round((b.h - logoData.height) / 2);
            break;
        }
    }

    clampLogoToBoundary();
    render();
    setStatus(`Aligned: ${position}`);
}

// ===== UPLOAD HANDLING =====
async function uploadFile(input, type) {
    if (!input.files[0]) return;

    setStatus('Uploading...');
    showError('');

    const formData = new FormData();
    formData.append('file', input.files[0]);
    formData.append('type', type);

    let data;
    try {
        const res = await fetch('/upload', { method: 'POST', body: formData });
        data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (err) {
        setStatus('Upload failed');
        showError(err.message || 'Upload failed');
        input.value = '';
        return;
    }

    if (type === 'product') {
        productImg = new Image();
        productImg.onload = () => {
            productLoaded = true;

            const nw = productImg.naturalWidth || productImg.width;
            const nh = productImg.naturalHeight || productImg.height;
            const ratio = nw / nh;

            let targetW = MAX_CANVAS_WIDTH;
            let targetH = Math.round(targetW / ratio);

            if (targetH > MAX_CANVAS_HEIGHT) {
                targetH = MAX_CANVAS_HEIGHT;
                targetW = Math.round(targetH * ratio);
            }

            canvas.width = targetW;
            canvas.height = targetH;

            const dimBadge = document.getElementById('product-dimensions-badge');
            dimBadge.textContent = `Original: ${nw}×${nh}px | Canvas: ${targetW}×${targetH}px`;
            dimBadge.classList.remove('hidden');

            document.getElementById('canvas-placeholder').classList.add('hidden');
            document.getElementById('product-upload-box').classList.add('has-file');
            document.getElementById('product-upload-label').textContent = '✓ Product image loaded';

            updateActiveBoundary();
            if (logoLoaded) {
                clampLogoToBoundary();
            }

            setStatus('Product image loaded successfully');
            updateDownloadState();
            render();
        };
        productImg.onerror = () => {
            setStatus('Failed to load image');
            showError('Could not load the uploaded image');
        };
        productImg.src = data.url;
    } else {
        logoImg = new Image();
        logoImg.onload = () => {
            logoLoaded = true;
            document.getElementById('logo-upload-box').classList.add('has-file');
            document.getElementById('logo-upload-label').textContent = '✓ Logo loaded (clean background)';

            const ratio = logoImg.height / logoImg.width;
            const initialW = Math.min(180, Math.round(activeBoundary.w * 0.45));
            logoData.width = initialW;
            logoData.height = Math.round(initialW * ratio);

            logoData.x = activeBoundary.x + Math.round((activeBoundary.w - logoData.width) / 2);
            logoData.y = activeBoundary.y + Math.round((activeBoundary.h - logoData.height) / 2);

            clampLogoToBoundary();
            setStatus('Logo loaded — drag handles to resize or reposition');
            updateDownloadState();
            render();
        };
        logoImg.onerror = () => {
            setStatus('Failed to load logo');
            showError('Could not load the uploaded logo');
        };
        logoImg.src = data.url;
    }
}

function updateDownloadState() {
    const btn = document.getElementById('downloadBtn');
    const enabled = productLoaded && logoLoaded;
    btn.disabled = !enabled;
    btn.setAttribute('aria-disabled', String(!enabled));
}

function showError(message) {
    const banner = document.getElementById('error-banner');
    if (!message) {
        banner.classList.add('hidden');
        banner.textContent = '';
        return;
    }
    banner.textContent = message;
    banner.classList.remove('hidden');
}

function setStatus(msg) {
    document.getElementById('status-bar').textContent = msg;
}

// ===== TOOLBAR TOGGLES =====
function toggleGuides() {
    showGuides = !showGuides;
    const btn = document.getElementById('toggleGuidesBtn');
    const text = document.getElementById('guides-text');
    btn.classList.toggle('active', showGuides);
    text.textContent = showGuides ? 'Guides: ON' : 'Guides: OFF';
    render();
}

function togglePreviewMode() {
    isPreviewMode = !isPreviewMode;
    const btn = document.getElementById('previewModeBtn');
    btn.classList.toggle('active', isPreviewMode);
    btn.textContent = isPreviewMode ? '🛠️ Edit Mode' : '✨ Clean Preview';

    if (isPreviewMode) {
        showGuides = false;
        setStatus('Clean preview mode active (Guides hidden)');
    } else {
        showGuides = true;
        setStatus('Edit mode active');
    }
    document.getElementById('toggleGuidesBtn').classList.toggle('active', showGuides);
    document.getElementById('guides-text').textContent = showGuides ? 'Guides: ON' : 'Guides: OFF';
    render();
}

// ===== INTERACTIVE CORNER HANDLES & HIT TESTING =====
function getHandlePositions() {
    const { x, y, width, height } = logoData;
    return {
        tl: { x: x, y: y },
        tr: { x: x + width, y: y },
        bl: { x: x, y: y + height },
        br: { x: x + width, y: y + height }
    };
}

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function detectHandle(pos) {
    if (!logoLoaded || isPreviewMode) return null;
    const handles = getHandlePositions();
    const hitRadius = HANDLE_SIZE + 4;

    for (const [key, h] of Object.entries(handles)) {
        if (Math.abs(pos.x - h.x) <= hitRadius && Math.abs(pos.y - h.y) <= hitRadius) {
            return key;
        }
    }
    return null;
}

function isInsideLogo(pos) {
    if (!logoLoaded) return false;
    return pos.x >= logoData.x &&
           pos.x <= logoData.x + logoData.width &&
           pos.y >= logoData.y &&
           pos.y <= logoData.y + logoData.height;
}

// ===== MOUSE & TOUCH EVENT LISTENERS =====
canvas.addEventListener('mousedown', (e) => {
    const pos = getCanvasCoordinates(e);

    // 1. Drawing custom boundary mode
    if (isDrawingCustomArea) {
        drawStart = pos;
        tempCustomBox = { x: pos.x, y: pos.y, w: 0, h: 0 };
        return;
    }

    if (!logoLoaded) return;

    // 2. Check for Corner Handles
    const handle = detectHandle(pos);
    if (handle) {
        activeResizeHandle = handle;
        dragStartMouse = pos;
        dragStartLogo = { ...logoData };
        return;
    }

    // 3. Check for Dragging Logo Body
    if (isInsideLogo(pos)) {
        isDraggingLogo = true;
        dragStartMouse = pos;
        dragStartLogo = { ...logoData };
        canvas.classList.add('dragging');
    }
});

canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasCoordinates(e);

    // 1. Drawing custom boundary
    if (isDrawingCustomArea && tempCustomBox) {
        const x = Math.min(drawStart.x, pos.x);
        const y = Math.min(drawStart.y, pos.y);
        const w = Math.abs(pos.x - drawStart.x);
        const h = Math.abs(pos.y - drawStart.y);
        tempCustomBox = { x, y, w, h };
        render();
        return;
    }

    // 2. Resizing Logo via Corner Handle
    if (activeResizeHandle) {
        const dx = pos.x - dragStartMouse.x;
        const dy = pos.y - dragStartMouse.y;
        const ratio = (logoImg.height / logoImg.width);
        const lockAspect = document.getElementById('lockAspectCheckbox').checked;

        let newW = dragStartLogo.width;
        let newH = dragStartLogo.height;
        let newX = dragStartLogo.x;
        let newY = dragStartLogo.y;

        if (activeResizeHandle === 'br') {
            newW = Math.max(20, dragStartLogo.width + dx);
            newH = lockAspect ? Math.round(newW * ratio) : Math.max(20, dragStartLogo.height + dy);
        } else if (activeResizeHandle === 'bl') {
            newW = Math.max(20, dragStartLogo.width - dx);
            newH = lockAspect ? Math.round(newW * ratio) : Math.max(20, dragStartLogo.height + dy);
            newX = dragStartLogo.x + (dragStartLogo.width - newW);
        } else if (activeResizeHandle === 'tr') {
            newW = Math.max(20, dragStartLogo.width + dx);
            newH = lockAspect ? Math.round(newW * ratio) : Math.max(20, dragStartLogo.height - dy);
            newY = dragStartLogo.y + (dragStartLogo.height - newH);
        } else if (activeResizeHandle === 'tl') {
            newW = Math.max(20, dragStartLogo.width - dx);
            newH = lockAspect ? Math.round(newW * ratio) : Math.max(20, dragStartLogo.height - dy);
            newX = dragStartLogo.x + (dragStartLogo.width - newW);
            newY = dragStartLogo.y + (dragStartLogo.height - newH);
        }

        // Keep strictly constrained to boundary
        if (newX < activeBoundary.x) {
            newW -= (activeBoundary.x - newX);
            newX = activeBoundary.x;
            if (lockAspect) newH = Math.round(newW * ratio);
        }
        if (newY < activeBoundary.y) {
            newH -= (activeBoundary.y - newY);
            newY = activeBoundary.y;
            if (lockAspect) newW = Math.round(newH / ratio);
        }
        if (newX + newW > activeBoundary.x + activeBoundary.w) {
            newW = activeBoundary.x + activeBoundary.w - newX;
            if (lockAspect) newH = Math.round(newW * ratio);
        }
        if (newY + newH > activeBoundary.y + activeBoundary.h) {
            newH = activeBoundary.y + activeBoundary.h - newY;
            if (lockAspect) newW = Math.round(newH / ratio);
        }

        logoData.x = newX;
        logoData.y = newY;
        logoData.width = Math.max(15, newW);
        logoData.height = Math.max(15, newH);

        clampLogoToBoundary();
        render();
        return;
    }

    // 3. Dragging Logo Body
    if (isDraggingLogo) {
        const dx = pos.x - dragStartMouse.x;
        const dy = pos.y - dragStartMouse.y;
        logoData.x = dragStartLogo.x + dx;
        logoData.y = dragStartLogo.y + dy;
        clampLogoToBoundary();
        render();
        return;
    }

    // 4. Cursor hints
    canvas.className = '';
    if (isDrawingCustomArea) {
        canvas.classList.add('crosshair');
        return;
    }

    if (!isPreviewMode && logoLoaded) {
        const handle = detectHandle(pos);
        if (handle === 'tl' || handle === 'br') {
            canvas.classList.add('resize-tl');
        } else if (handle === 'tr' || handle === 'bl') {
            canvas.classList.add('resize-tr');
        } else if (isInsideLogo(pos)) {
            canvas.classList.add('over-logo');
        }
    }
});

function endInteractions() {
    if (isDrawingCustomArea && tempCustomBox) {
        if (tempCustomBox.w > 20 && tempCustomBox.h > 20) {
            customPrintAreaPx = { ...tempCustomBox };
            setBoundaryMode('custom');
            setStatus('Custom print boundary applied');
        } else {
            setStatus('Drawn area was too small, cancelled');
        }
        isDrawingCustomArea = false;
        tempCustomBox = null;
        canvas.classList.remove('crosshair');
        render();
        return;
    }

    isDraggingLogo = false;
    activeResizeHandle = null;
    canvas.classList.remove('dragging');
}

canvas.addEventListener('mouseup', endInteractions);
canvas.addEventListener('mouseleave', endInteractions);

// Touch Support
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const pos = {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };

    if (!logoLoaded) return;
    const handle = detectHandle(pos);
    if (handle) {
        activeResizeHandle = handle;
        dragStartMouse = pos;
        dragStartLogo = { ...logoData };
    } else if (isInsideLogo(pos)) {
        isDraggingLogo = true;
        dragStartMouse = pos;
        dragStartLogo = { ...logoData };
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const pos = {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };

    if (activeResizeHandle) {
        const dx = pos.x - dragStartMouse.x;
        const ratio = (logoImg.height / logoImg.width);
        let newW = Math.max(20, dragStartLogo.width + dx);
        let newH = Math.round(newW * ratio);
        logoData.width = newW;
        logoData.height = newH;
        clampLogoToBoundary();
        render();
    } else if (isDraggingLogo) {
        logoData.x = dragStartLogo.x + (pos.x - dragStartMouse.x);
        logoData.y = dragStartLogo.y + (pos.y - dragStartMouse.y);
        clampLogoToBoundary();
        render();
    }
}, { passive: false });

canvas.addEventListener('touchend', endInteractions);

// ===== MAIN RENDERING ENGINE =====
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Product Image
    if (productLoaded) {
        ctx.drawImage(productImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Draw Active Boundary / Guides (if not in clean preview mode)
    if (showGuides && activeBoundary && productLoaded) {
        const b = activeBoundary;

        // Subtle dark shading outside the printable zone
        if (boundaryMode !== 'full') {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
            ctx.fillRect(0, 0, canvas.width, b.y); // top
            ctx.fillRect(0, b.y + b.h, canvas.width, canvas.height - (b.y + b.h)); // bottom
            ctx.fillRect(0, b.y, b.x, b.h); // left
            ctx.fillRect(b.x + b.w, b.y, canvas.width - (b.x + b.w), b.h); // right
            ctx.restore();
        }

        // Boundary Border
        ctx.save();
        ctx.strokeStyle = '#38a169';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        // Boundary Label
        ctx.fillStyle = '#276749';
        ctx.font = 'bold 11px -apple-system, sans-serif';
        const labelText = boundaryMode === 'custom' ? 'Custom Print Area' : 'Product Boundary';
        ctx.fillText(labelText, b.x + 4, Math.max(14, b.y - 6));
        ctx.restore();
    }

    // 3. Draw Temporary Custom Area while dragging
    if (tempCustomBox) {
        ctx.save();
        ctx.strokeStyle = '#e53e3e';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(tempCustomBox.x, tempCustomBox.y, tempCustomBox.w, tempCustomBox.h);
        ctx.fillStyle = 'rgba(229, 62, 62, 0.1)';
        ctx.fillRect(tempCustomBox.x, tempCustomBox.y, tempCustomBox.w, tempCustomBox.h);
        ctx.restore();
    }

    // 4. Draw Logo with Rotation, Opacity, and Blend Mode
    if (logoLoaded && logoImg.complete) {
        ctx.save();
        ctx.globalAlpha = logoData.opacity;
        ctx.globalCompositeOperation = logoData.blendMode;

        const centerX = logoData.x + logoData.width / 2;
        const centerY = logoData.y + logoData.height / 2;

        ctx.translate(centerX, centerY);
        if (logoData.rotation !== 0) {
            ctx.rotate((logoData.rotation * Math.PI) / 180);
        }

        ctx.drawImage(
            logoImg,
            -logoData.width / 2,
            -logoData.height / 2,
            logoData.width,
            logoData.height
        );
        ctx.restore();

        // 5. Draw Transform Bounding Box & Corner Handles (in Edit Mode)
        if (showGuides) {
            ctx.save();
            ctx.strokeStyle = '#3182ce';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(logoData.x, logoData.y, logoData.width, logoData.height);
            ctx.restore();

            // Draw 4 Corner Handles
            const handles = getHandlePositions();
            for (const h of Object.values(handles)) {
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#3182ce';
                ctx.lineWidth = 2;
                ctx.fillRect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
                ctx.strokeRect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
                ctx.restore();
            }
        }
    }
}

// ===== DOWNLOAD FINAL MOCKUP (HIGH RESOLUTION & CLEAN) =====
function downloadImage() {
    if (!productLoaded || !logoLoaded) return;

    const outW = productImg.naturalWidth || canvas.width;
    const outH = productImg.naturalHeight || canvas.height;

    const scaleX = outW / canvas.width;
    const scaleY = outH / canvas.height;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = outW;
    exportCanvas.height = outH;
    const expCtx = exportCanvas.getContext('2d');

    // 1. Draw product
    expCtx.drawImage(productImg, 0, 0, outW, outH);

    // 2. Draw Logo at scaled position & size
    expCtx.save();
    expCtx.globalAlpha = logoData.opacity;
    expCtx.globalCompositeOperation = logoData.blendMode;

    const logoOutW = logoData.width * scaleX;
    const logoOutH = logoData.height * scaleY;
    const centerX = (logoData.x * scaleX) + logoOutW / 2;
    const centerY = (logoData.y * scaleY) + logoOutH / 2;

    expCtx.translate(centerX, centerY);
    if (logoData.rotation !== 0) {
        expCtx.rotate((logoData.rotation * Math.PI) / 180);
    }
    expCtx.drawImage(logoImg, -logoOutW / 2, -logoOutH / 2, logoOutW, logoOutH);
    expCtx.restore();

    // Trigger download
    const link = document.createElement('a');
    link.download = 'product-logo-mockup.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();

    setStatus('Final high-resolution mockup downloaded!');
}

// ===== RESET ALL =====
function resetCanvas() {
    productImg = new Image();
    logoImg = new Image();
    productLoaded = false;
    logoLoaded = false;
    customPrintAreaPx = null;
    boundaryMode = 'full';
    showGuides = true;
    isPreviewMode = false;

    logoData = {
        x: 50,
        y: 50,
        width: 150,
        height: 150,
        opacity: 1.0,
        rotation: 0,
        blendMode: 'source-over'
    };

    canvas.width = 600;
    canvas.height = 600;

    document.getElementById('canvas-placeholder').classList.remove('hidden');
    document.getElementById('product-dimensions-badge').classList.add('hidden');
    document.getElementById('product-upload-box').classList.remove('has-file');
    document.getElementById('logo-upload-box').classList.remove('has-file');
    document.getElementById('product-upload-label').textContent = 'Click to upload product image';
    document.getElementById('logo-upload-label').textContent = 'Click to upload logo (white bg removed)';
    document.getElementById('blendModeSelect').value = 'source-over';
    document.getElementById('lockAspectCheckbox').checked = true;

    setBoundaryMode('full');
    syncInputsWithState();
    updateDownloadState();
    render();
    setStatus('Ready for product upload');
}

// Initial render
updateActiveBoundary();
render();
