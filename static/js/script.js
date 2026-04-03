// ===== STATE =====
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let productImg = new Image();
let logoImg = new Image();
let logoLoaded = false;
let productLoaded = false;

let logoData = { x: 50, y: 50, size: 150, opacity: 1.0 };

// Print area in canvas pixels (set when product is selected)
let printArea = null;      // { x, y, w, h } in canvas px
let printAreaMM = null;    // { width_mm, height_mm, label }

// Canvas is 600x600 px — we treat product image as filling it fully.
// Print area is centered on the canvas by default.
const CANVAS_SIZE = 600;

// ===== PRODUCT DATA =====
let allProducts = [];

fetch('/api/products')
    .then(r => r.json())
    .then(data => {
        allProducts = data;
    });

// ===== PRODUCT SEARCH =====
function filterProducts() {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const dropdown = document.getElementById('product-dropdown');

    if (q.length < 2) {
        dropdown.classList.add('hidden');
        return;
    }

    const results = allProducts
        .filter(p =>
            p.ItemCode.toLowerCase().includes(q) ||
            p.ItemName.toLowerCase().includes(q)
        )
        .slice(0, 50);

    if (results.length === 0) {
        dropdown.innerHTML = '<div class="dropdown-item" style="color:#a0aec0">No results found</div>';
        dropdown.classList.remove('hidden');
        return;
    }

    dropdown.innerHTML = results.map(p => `
        <div class="dropdown-item" onclick="selectProduct('${p.ItemCode}')">
            <div class="item-code">${p.ItemCode}</div>
            <div class="item-name">${p.ItemName}</div>
        </div>
    `).join('');

    dropdown.classList.remove('hidden');
}

function selectProduct(itemCode) {
    document.getElementById('product-dropdown').classList.add('hidden');
    document.getElementById('searchInput').value = '';

    fetch(`/api/product/${itemCode}`)
        .then(r => r.json())
        .then(product => {
            const label = document.getElementById('selected-label');
            label.textContent = `${product.ItemCode} — ${product.ItemName}`;

            document.getElementById('selected-product').classList.remove('hidden');

            if (product.printArea) {
                printAreaMM = product.printArea;
                document.getElementById('print-area-label').textContent = product.printArea.label;
                document.getElementById('print-area-info').classList.remove('hidden');
                computePrintAreaPixels();
                setStatus(`Print area: ${product.printArea.label}`);
            } else {
                printArea = null;
                printAreaMM = null;
                document.getElementById('print-area-info').classList.add('hidden');
            }

            render();
        });
}

function clearProduct() {
    document.getElementById('selected-product').classList.add('hidden');
    document.getElementById('print-area-info').classList.add('hidden');
    printArea = null;
    printAreaMM = null;
    render();
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.control-group')) {
        document.getElementById('product-dropdown').classList.add('hidden');
    }
});

// ===== COMPUTE PRINT AREA IN PIXELS =====
// We map the MaxPrintAreaDefault (in mm) to canvas pixels.
// We scale the print area proportionally so the largest dimension = 60% of canvas.
function computePrintAreaPixels() {
    if (!printAreaMM) return;

    const { width_mm, height_mm } = printAreaMM;

    // Scale: fit the print area to ~60% of canvas at most
    const maxPx = CANVAS_SIZE * 0.6;
    const scale = Math.min(maxPx / width_mm, maxPx / height_mm);

    const pw = Math.round(width_mm * scale);
    const ph = Math.round(height_mm * scale);

    // Center the print area on canvas
    const px = Math.round((CANVAS_SIZE - pw) / 2);
    const py = Math.round((CANVAS_SIZE - ph) / 2);

    printArea = { x: px, y: py, w: pw, h: ph };

    // Clamp logo into print area
    clampLogoToPrintArea();
}

// ===== CLAMP LOGO POSITION =====
function clampLogoToPrintArea() {
    if (!printArea) return;

    const logoW = logoData.size;
    const logoH = logoLoaded
        ? Math.round(logoData.size * (logoImg.height / logoImg.width))
        : logoData.size;

    const maxX = printArea.x + printArea.w - logoW;
    const maxY = printArea.y + printArea.h - logoH;

    logoData.x = Math.max(printArea.x, Math.min(logoData.x, maxX));
    logoData.y = Math.max(printArea.y, Math.min(logoData.y, maxY));
}

// ===== DRAG SYSTEM =====
let isDragging = false;
let offsetX = 0, offsetY = 0;

canvas.addEventListener('mousedown', (e) => {
    if (!logoLoaded) return;

    const mx = e.offsetX;
    const my = e.offsetY;
    const logoW = logoData.size;
    const logoH = Math.round(logoData.size * (logoImg.height / logoImg.width));

    if (mx >= logoData.x && mx <= logoData.x + logoW &&
        my >= logoData.y && my <= logoData.y + logoH) {
        isDragging = true;
        offsetX = mx - logoData.x;
        offsetY = my - logoData.y;
        canvas.classList.add('dragging');
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!logoLoaded) return;

    const mx = e.offsetX;
    const my = e.offsetY;
    const logoW = logoData.size;
    const logoH = Math.round(logoData.size * (logoImg.height / logoImg.width));

    // Cursor hint
    if (mx >= logoData.x && mx <= logoData.x + logoW &&
        my >= logoData.y && my <= logoData.y + logoH) {
        canvas.classList.add('over-logo');
    } else {
        canvas.classList.remove('over-logo');
    }

    if (!isDragging) return;

    let newX = e.offsetX - offsetX;
    let newY = e.offsetY - offsetY;

    if (printArea) {
        // Constrain to print area
        newX = Math.max(printArea.x, Math.min(newX, printArea.x + printArea.w - logoW));
        newY = Math.max(printArea.y, Math.min(newY, printArea.y + printArea.h - logoH));
    }

    logoData.x = newX;
    logoData.y = newY;
    render();
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.classList.remove('dragging');
});
canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.classList.remove('dragging');
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;

    if (!logoLoaded) return;
    const logoW = logoData.size;
    const logoH = Math.round(logoData.size * (logoImg.height / logoImg.width));

    if (mx >= logoData.x && mx <= logoData.x + logoW &&
        my >= logoData.y && my <= logoData.y + logoH) {
        isDragging = true;
        offsetX = mx - logoData.x;
        offsetY = my - logoData.y;
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDragging) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    let newX = touch.clientX - rect.left - offsetX;
    let newY = touch.clientY - rect.top - offsetY;

    const logoW = logoData.size;
    const logoH = Math.round(logoData.size * (logoImg.height / logoImg.width));

    if (printArea) {
        newX = Math.max(printArea.x, Math.min(newX, printArea.x + printArea.w - logoW));
        newY = Math.max(printArea.y, Math.min(newY, printArea.y + printArea.h - logoH));
    }

    logoData.x = newX;
    logoData.y = newY;
    render();
}, { passive: false });

canvas.addEventListener('touchend', () => isDragging = false);

// ===== UPLOAD =====
async function uploadFile(input, type) {
    if (!input.files[0]) return;

    setStatus('Uploading...');

    const formData = new FormData();
    formData.append('file', input.files[0]);
    formData.append('type', type);

    const res = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (type === 'product') {
        productImg = new Image();
        productImg.onload = () => {
            productLoaded = true;
            document.getElementById('canvas-placeholder').classList.add('hidden');
            document.getElementById('product-upload-box').classList.add('has-file');
            document.getElementById('product-upload-label').textContent = '✓ Product image loaded';
            setStatus('Product image loaded');
            render();
        };
        productImg.src = data.url;
    } else {
        logoImg = new Image();
        logoImg.onload = () => {
            logoLoaded = true;
            document.getElementById('logo-upload-box').classList.add('has-file');
            document.getElementById('logo-upload-label').textContent = '✓ Logo loaded';

            // Place logo in center of print area (or canvas center)
            if (printArea) {
                logoData.x = printArea.x + Math.round((printArea.w - logoData.size) / 2);
                logoData.y = printArea.y + Math.round((printArea.h - logoData.size) / 2);
            } else {
                logoData.x = Math.round((CANVAS_SIZE - logoData.size) / 2);
                logoData.y = Math.round((CANVAS_SIZE - logoData.size) / 2);
            }

            setStatus('Logo loaded — drag it onto the product');
            render();
        };
        logoImg.src = data.url;
    }
}

// ===== SIZE & OPACITY =====
function updateSize(val) {
    logoData.size = parseInt(val);
    document.getElementById('size-value').textContent = val;
    clampLogoToPrintArea();
    render();
}

function updateOpacity(val) {
    logoData.opacity = parseInt(val) / 100;
    document.getElementById('opacity-value').textContent = val;
    render();
}

// ===== RENDER =====
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw product
    if (productLoaded) {
        ctx.drawImage(productImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#f7fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw print area overlay
    if (printArea) {
        // Shaded outside
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        // Top
        ctx.fillRect(0, 0, canvas.width, printArea.y);
        // Bottom
        ctx.fillRect(0, printArea.y + printArea.h, canvas.width, canvas.height - printArea.y - printArea.h);
        // Left
        ctx.fillRect(0, printArea.y, printArea.x, printArea.h);
        // Right
        ctx.fillRect(printArea.x + printArea.w, printArea.y, canvas.width - printArea.x - printArea.w, printArea.h);
        ctx.restore();

        // Print area border
        ctx.save();
        ctx.strokeStyle = '#3182ce';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(printArea.x, printArea.y, printArea.w, printArea.h);
        ctx.restore();

        // Print area label
        ctx.save();
        ctx.fillStyle = '#3182ce';
        ctx.font = 'bold 11px Arial';
        ctx.fillText(`Print Area: ${printAreaMM.label}`, printArea.x + 4, printArea.y - 5);
        ctx.restore();
    }

    // Draw logo
    if (logoLoaded && logoImg.complete) {
        const logoW = logoData.size;
        const logoH = Math.round(logoData.size * (logoImg.height / logoImg.width));

        ctx.save();
        ctx.globalAlpha = logoData.opacity;
        ctx.drawImage(logoImg, logoData.x, logoData.y, logoW, logoH);
        ctx.restore();
    }
}

// ===== DOWNLOAD =====
function downloadImage() {
    // Render a clean version without the print area overlay
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (productLoaded) {
        tempCtx.drawImage(productImg, 0, 0, tempCanvas.width, tempCanvas.height);
    }

    if (logoLoaded) {
        const logoW = logoData.size;
        const logoH = Math.round(logoData.size * (logoImg.height / logoImg.width));
        tempCtx.globalAlpha = logoData.opacity;
        tempCtx.drawImage(logoImg, logoData.x, logoData.y, logoW, logoH);
    }

    const link = document.createElement('a');
    link.download = 'logo-mockup.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();

    setStatus('Image downloaded!');
}

// ===== RESET =====
function resetCanvas() {
    productImg = new Image();
    logoImg = new Image();
    logoLoaded = false;
    productLoaded = false;
    printArea = null;
    printAreaMM = null;
    logoData = { x: 50, y: 50, size: 150, opacity: 1.0 };

    document.getElementById('canvas-placeholder').classList.remove('hidden');
    document.getElementById('product-upload-box').classList.remove('has-file');
    document.getElementById('logo-upload-box').classList.remove('has-file');
    document.getElementById('product-upload-label').textContent = 'Click to upload product image';
    document.getElementById('logo-upload-label').textContent = 'Click to upload logo (white bg removed)';
    document.getElementById('selected-product').classList.add('hidden');
    document.getElementById('print-area-info').classList.add('hidden');
    document.getElementById('sizeRange').value = 150;
    document.getElementById('size-value').textContent = 150;
    document.getElementById('opacityRange').value = 100;
    document.getElementById('opacity-value').textContent = 100;

    render();
    setStatus('Reset — ready for a new product');
}

// ===== STATUS =====
function setStatus(msg) {
    document.getElementById('status-bar').textContent = msg;
}

// Initial render
render();
