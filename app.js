// Diff Viewer App
const dmp = new diff_match_patch();

// DOM Elements
const originalInput = document.getElementById('original');
const modifiedInput = document.getElementById('modified');
const diffOutput = document.getElementById('diff-output');
const btnSplit = document.getElementById('btn-split');
const btnInline = document.getElementById('btn-inline');
const btnSwap = document.getElementById('btn-swap');
const btnClear = document.getElementById('btn-clear');
const btnCopy = document.getElementById('btn-copy');
const btnShare = document.getElementById('btn-share');
const stats = document.getElementById('stats');
const addedCount = document.getElementById('added-count');
const removedCount = document.getElementById('removed-count');
const unchangedCount = document.getElementById('unchanged-count');
const toast = document.getElementById('toast');

// State
let viewMode = 'split'; // 'split' or 'inline'

// Initialize
function init() {
    loadFromURL();
    setupEventListeners();
    updateDiff();
}

// Setup Event Listeners
function setupEventListeners() {
    originalInput.addEventListener('input', debounce(updateDiff, 150));
    modifiedInput.addEventListener('input', debounce(updateDiff, 150));
    
    btnSplit.addEventListener('click', () => setViewMode('split'));
    btnInline.addEventListener('click', () => setViewMode('inline'));
    btnSwap.addEventListener('click', swapInputs);
    btnClear.addEventListener('click', clearAll);
    btnCopy.addEventListener('click', copyResult);
    btnShare.addEventListener('click', shareURL);
    
    document.querySelectorAll('.btn-paste').forEach(btn => {
        btn.addEventListener('click', () => pasteFromClipboard(btn.dataset.target));
    });
}

// Debounce helper
function debounce(fn, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Set View Mode
function setViewMode(mode) {
    viewMode = mode;
    btnSplit.classList.toggle('active', mode === 'split');
    btnInline.classList.toggle('active', mode === 'inline');
    updateDiff();
}

// Calculate diff and update display
function updateDiff() {
    const original = originalInput.value;
    const modified = modifiedInput.value;
    
    if (!original && !modified) {
        showPlaceholder();
        updateStats(0, 0, 0);
        return;
    }
    
    const diffs = dmp.diff_main(original, modified);
    dmp.diff_cleanupSemantic(diffs);
    
    const lines = generateLineDiffs(diffs);
    renderDiff(lines);
    
    // Update stats
    const added = lines.filter(l => l.type === 'added').length;
    const removed = lines.filter(l => l.type === 'removed').length;
    const unchanged = lines.filter(l => l.type === 'unchanged').length;
    updateStats(added, removed, unchanged);
}

// Generate line-by-line diffs
function generateLineDiffs(diffs) {
    const lines = [];
    let oldLineNum = 0;
    let newLineNum = 0;
    
    for (const [op, text] of diffs) {
        const textLines = text.split('\n');
        // Handle trailing newline
        if (textLines[textLines.length - 1] === '') {
            textLines.pop();
        }
        
        for (const line of textLines) {
            if (op === 0) { // Equal
                oldLineNum++;
                newLineNum++;
                lines.push({
                    type: 'unchanged',
                    oldLineNum,
                    newLineNum,
                    content: line
                });
            } else if (op === -1) { // Deleted
                oldLineNum++;
                lines.push({
                    type: 'removed',
                    oldLineNum,
                    newLineNum: null,
                    content: line
                });
            } else if (op === 1) { // Inserted
                newLineNum++;
                lines.push({
                    type: 'added',
                    oldLineNum: null,
                    newLineNum,
                    content: line
                });
            }
        }
    }
    
    return lines;
}

// Render diff based on view mode
function renderDiff(lines) {
    if (viewMode === 'split') {
        renderSplitView(lines);
    } else {
        renderInlineView(lines);
    }
}

// Render split view (side by side)
function renderSplitView(lines) {
    const leftLines = [];
    const rightLines = [];
    
    for (const line of lines) {
        if (line.type === 'unchanged') {
            leftLines.push(line);
            rightLines.push(line);
        } else if (line.type === 'removed') {
            leftLines.push(line);
            rightLines.push({ type: 'empty', oldLineNum: null, newLineNum: null, content: '' });
        } else if (line.type === 'added') {
            leftLines.push({ type: 'empty', oldLineNum: null, newLineNum: null, content: '' });
            rightLines.push(line);
        }
    }
    
    diffOutput.innerHTML = `
        <div class="diff-split">
            <div class="diff-pane">
                <div class="diff-pane-header">Original</div>
                <div class="diff-pane-content">
                    ${leftLines.map(line => renderLine(line, 'left')).join('')}
                </div>
            </div>
            <div class="diff-pane">
                <div class="diff-pane-header">Modified</div>
                <div class="diff-pane-content">
                    ${rightLines.map(line => renderLine(line, 'right')).join('')}
                </div>
            </div>
        </div>
    `;
}

// Render inline view (unified)
function renderInlineView(lines) {
    diffOutput.innerHTML = `
        <div class="diff-inline">
            ${lines.map(line => renderInlineLine(line)).join('')}
        </div>
    `;
}

// Render a single line for split view
function renderLine(line, side) {
    const marker = line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' ';
    const lineNum = side === 'left' ? line.oldLineNum : line.newLineNum;
    const displayNum = lineNum || '';
    
    if (line.type === 'empty') {
        return `
            <div class="diff-line empty">
                <span class="line-number"></span>
                <span class="line-marker"></span>
                <span class="line-content"></span>
            </div>
        `;
    }
    
    return `
        <div class="diff-line ${line.type}">
            <span class="line-number">${displayNum}</span>
            <span class="line-marker">${marker}</span>
            <span class="line-content">${escapeHtml(line.content)}</span>
        </div>
    `;
}

// Render inline line
function renderInlineLine(line) {
    const marker = line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' ';
    const oldNum = line.oldLineNum || '';
    const newNum = line.newLineNum || '';
    
    return `
        <div class="diff-line ${line.type}">
            <span class="line-number" style="width: 40px;">${oldNum}</span>
            <span class="line-number" style="width: 40px; border-left: 1px solid var(--border);">${newNum}</span>
            <span class="line-marker">${marker}</span>
            <span class="line-content">${escapeHtml(line.content)}</span>
        </div>
    `;
}

// Update stats display
function updateStats(added, removed, unchanged) {
    addedCount.textContent = `+${added} added`;
    removedCount.textContent = `−${removed} removed`;
    unchangedCount.textContent = `${unchanged} unchanged`;
}

// Show placeholder
function showPlaceholder() {
    diffOutput.innerHTML = `
        <div class="diff-placeholder">
            Enter text in both fields to see the diff
        </div>
    `;
}

// Swap inputs
function swapInputs() {
    const temp = originalInput.value;
    originalInput.value = modifiedInput.value;
    modifiedInput.value = temp;
    updateDiff();
    showToast('Inputs swapped!');
}

// Clear all
function clearAll() {
    originalInput.value = '';
    modifiedInput.value = '';
    updateDiff();
    showPlaceholder();
    updateStats(0, 0, 0);
}

// Copy result to clipboard
async function copyResult() {
    const text = generatePlainTextDiff();
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!');
    } catch (err) {
        showToast('Failed to copy');
    }
}

// Generate plain text diff for copying
function generatePlainTextDiff() {
    const original = originalInput.value;
    const modified = modifiedInput.value;
    const diffs = dmp.diff_main(original, modified);
    dmp.diff_cleanupSemantic(diffs);
    
    let result = '';
    for (const [op, text] of diffs) {
        const lines = text.split('\n');
        if (lines[lines.length - 1] === '') lines.pop();
        
        for (const line of lines) {
            if (op === 0) {
                result += ' ' + line + '\n';
            } else if (op === -1) {
                result += '-' + line + '\n';
            } else if (op === 1) {
                result += '+' + line + '\n';
            }
        }
    }
    return result;
}

// Share URL with encoded content
async function shareURL() {
    const data = {
        original: originalInput.value,
        modified: modifiedInput.value,
        mode: viewMode
    };
    
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    
    try {
        await navigator.clipboard.writeText(url);
        showToast('Share URL copied!');
    } catch (err) {
        showToast('Failed to copy URL');
    }
}

// Load from URL hash
function loadFromURL() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    
    try {
        const data = JSON.parse(decodeURIComponent(escape(atob(hash))));
        if (data.original !== undefined) originalInput.value = data.original;
        if (data.modified !== undefined) modifiedInput.value = data.modified;
        if (data.mode) viewMode = data.mode;
    } catch (e) {
        console.error('Failed to parse URL data');
    }
}

// Paste from clipboard
async function pasteFromClipboard(target) {
    try {
        const text = await navigator.clipboard.readText();
        if (target === 'original') {
            originalInput.value = text;
        } else {
            modifiedInput.value = text;
        }
        updateDiff();
        showToast('Pasted!');
    } catch (err) {
        showToast('Paste failed - use Ctrl+V');
    }
}

// Show toast notification
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Start
init();
