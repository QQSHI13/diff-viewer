// Diff Viewer App
// Uses diff.js for diff_match_patch

// DOM Elements
const originalInput = document.getElementById('original');
const modifiedInput = document.getElementById('modified');
const diffOutput = document.getElementById('diff-output');
const addedCountEl = document.getElementById('added-count');
const removedCountEl = document.getElementById('removed-count');
const unchangedCountEl = document.getElementById('unchanged-count');
const toast = document.getElementById('toast');

// State
let viewMode = 'split';
let diffData = null;
const dmp = new diff_match_patch();

// Initialize
function init() {
    setupEventListeners();
    debouncedComputeDiff();
}

function setupEventListeners() {
    originalInput.addEventListener('input', debouncedComputeDiff);
    modifiedInput.addEventListener('input', debouncedComputeDiff);

    document.getElementById('btn-split').addEventListener('click', () => setViewMode('split'));
    document.getElementById('btn-inline').addEventListener('click', () => setViewMode('inline'));
    document.getElementById('btn-swap').addEventListener('click', swapInputs);
    document.getElementById('btn-clear').addEventListener('click', clearInputs);
    document.getElementById('btn-copy').addEventListener('click', copyResult);

    document.querySelectorAll('.btn-paste').forEach(btn => {
        btn.addEventListener('click', () => pasteFromClipboard(btn.dataset.target));
    });
}

function splitLines(text) {
    if (!text) return [];
    const lines = text.split('\n');
    // Remove trailing empty lines caused by trailing newlines
    while (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
    }
    return lines;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedComputeDiff = debounce(computeDiff, 300);

function computeDiff() {
    const original = originalInput.value;
    const modified = modifiedInput.value;

    if (!original && !modified) {
        showPlaceholder();
        return;
    }

    const diffs = dmp.diff_main(original, modified);
    dmp.diff_cleanupSemantic(diffs);

    diffData = diffs;
    renderDiff(diffs);
    updateStats(diffs);
}

function showPlaceholder() {
    diffOutput.innerHTML = `
        <div class="diff-placeholder">
            Enter text in both fields to see the diff
        </div>
    `;
    updateStats([]);
}

function renderDiff(diffs) {
    if (viewMode === 'split') {
        renderSplitView(diffs);
    } else {
        renderInlineView(diffs);
    }
}

function renderSplitView(diffs) {
    const leftLines = [];
    const rightLines = [];
    let leftLineNum = 1;
    let rightLineNum = 1;

    diffs.forEach(([type, text]) => {
        if (!text) return;
        const lines = splitLines(text);

        lines.forEach(line => {
            if (type === 0) { // Equal
                const lineData = {
                    type: 'unchanged',
                    content: escapeHtml(line),
                    leftNum: leftLineNum++,
                    rightNum: rightLineNum++
                };
                leftLines.push(lineData);
                rightLines.push(lineData);
            } else if (type === -1) { // Deleted
                leftLines.push({
                    type: 'removed',
                    content: escapeHtml(line),
                    leftNum: leftLineNum++,
                    rightNum: null
                });
            } else if (type === 1) { // Inserted
                rightLines.push({
                    type: 'added',
                    content: escapeHtml(line),
                    leftNum: null,
                    rightNum: rightLineNum++
                });
            }
        });
    });

    const maxLines = Math.max(leftLines.length, rightLines.length);

    let html = '<div class="diff-split">';
    
    // Left pane
    html += '<div class="diff-pane">';
    html += '<div class="diff-pane-header">Original</div>';
    for (let i = 0; i < maxLines; i++) {
        const line = leftLines[i];
        if (line) {
            const marker = line.type === 'removed' ? '−' : '&nbsp;';
            html += `<div class="diff-line ${line.type}">
                <span class="line-number">${line.leftNum || ''}</span>
                <span class="line-marker">${marker}</span>
                <span class="line-content">${line.content || '&nbsp;'}</span>
            </div>`;
        } else {
            html += `<div class="diff-line empty">
                <span class="line-number"></span>
                <span class="line-marker"></span>
                <span class="line-content"></span>
            </div>`;
        }
    }
    html += '</div>';

    // Right pane
    html += '<div class="diff-pane">';
    html += '<div class="diff-pane-header">Modified</div>';
    for (let i = 0; i < maxLines; i++) {
        const line = rightLines[i];
        if (line) {
            const marker = line.type === 'added' ? '+' : '&nbsp;';
            html += `<div class="diff-line ${line.type}">
                <span class="line-number">${line.rightNum || ''}</span>
                <span class="line-marker">${marker}</span>
                <span class="line-content">${line.content || '&nbsp;'}</span>
            </div>`;
        } else {
            html += `<div class="diff-line empty">
                <span class="line-number"></span>
                <span class="line-marker"></span>
                <span class="line-content"></span>
            </div>`;
        }
    }
    html += '</div>';

    html += '</div>';
    diffOutput.innerHTML = html;
}

function renderInlineView(diffs) {
    let html = '<div class="diff-inline">';
    let lineNum = 1;

    diffs.forEach(([type, text]) => {
        if (!text) return;
        const lines = splitLines(text);

        lines.forEach(line => {
            let typeClass = 'unchanged';
            let marker = '&nbsp;';

            if (type === -1) {
                typeClass = 'removed';
                marker = '−';
            } else if (type === 1) {
                typeClass = 'added';
                marker = '+';
            } else {
                lineNum++;
            }

            html += `<div class="diff-line ${typeClass}">
                <span class="line-number">${type === 0 ? lineNum - 1 : ''}</span>
                <span class="line-marker">${marker}</span>
                <span class="line-content">${escapeHtml(line) || '&nbsp;'}</span>
            </div>`;
        });
    });

    html += '</div>';
    diffOutput.innerHTML = html;
}

function updateStats(diffs) {
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    diffs.forEach(([type, text]) => {
        if (!text) return;
        const lines = splitLines(text);
        const count = lines.length;
        
        if (type === 1) added += count;
        else if (type === -1) removed += count;
        else unchanged += count;
    });

    addedCountEl.textContent = `+${added} added`;
    removedCountEl.textContent = `−${removed} removed`;
    unchangedCountEl.textContent = `${unchanged} unchanged`;
}

function setViewMode(mode) {
    viewMode = mode;
    document.getElementById('btn-split').classList.toggle('active', mode === 'split');
    document.getElementById('btn-inline').classList.toggle('active', mode === 'inline');
    if (diffData) {
        renderDiff(diffData);
    }
}

function swapInputs() {
    const temp = originalInput.value;
    originalInput.value = modifiedInput.value;
    modifiedInput.value = temp;
    computeDiff();
}

function clearInputs() {
    originalInput.value = '';
    modifiedInput.value = '';
    showPlaceholder();
}

async function pasteFromClipboard(target) {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById(target).value = text;
        computeDiff();
        showToast(`Pasted into ${target}`);
    } catch (err) {
        showToast('Failed to paste from clipboard');
    }
}

function copyResult() {
    const original = originalInput.value;
    const modified = modifiedInput.value;
    
    if (!original && !modified) {
        showToast('Nothing to copy');
        return;
    }
    
    const text = generatePlainTextDiff();
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard');
    }).catch(() => {
        showToast('Failed to copy');
    });
}

function generatePlainTextDiff() {
    if (!diffData) return '';
    
    return diffData.map(([type, text]) => {
        const lines = splitLines(text);
        
        return lines.map(line => {
            if (type === -1) return `- ${line}`;
            if (type === 1) return `+ ${line}`;
            return `  ${line}`;
        }).join('\n');
    }).join('\n');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Start
init();
