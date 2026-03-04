// Simple Diff Implementation
const DIFF_DELETE = -1;
const DIFF_INSERT = 1;
const DIFF_EQUAL = 0;

function diff_main(text1, text2) {
    // Check for equality
    if (text1 === text2) {
        return text1 ? [[DIFF_EQUAL, text1]] : [];
    }
    
    // Check for null inputs
    if (text1 === null || text2 === null) {
        throw new Error("Null input. (diff_main)");
    }
    
    // Trim off common prefix
    const commonPrefix = diff_commonPrefix(text1, text2);
    const prefix = text1.substring(0, commonPrefix);
    text1 = text1.substring(commonPrefix);
    text2 = text2.substring(commonPrefix);
    
    // Trim off common suffix
    const commonSuffix = diff_commonSuffix(text1, text2);
    const suffix = text1.substring(text1.length - commonSuffix);
    text1 = text1.substring(0, text1.length - commonSuffix);
    text2 = text2.substring(0, text2.length - commonSuffix);
    
    // Compute the diff on the middle block
    const diffs = diff_compute(text1, text2);
    
    // Restore the prefix and suffix
    if (prefix) {
        diffs.unshift([DIFF_EQUAL, prefix]);
    }
    if (suffix) {
        diffs.push([DIFF_EQUAL, suffix]);
    }
    
    return diffs;
}

function diff_compute(text1, text2) {
    if (!text1) {
        return [[DIFF_INSERT, text2]];
    }
    if (!text2) {
        return [[DIFF_DELETE, text1]];
    }
    
    const longtext = text1.length > text2.length ? text1 : text2;
    const shorttext = text1.length > text2.length ? text2 : text1;
    const i = longtext.indexOf(shorttext);
    
    if (i !== -1) {
        // One string is inside the other
        const diffs = [
            [DIFF_INSERT, longtext.substring(0, i)],
            [DIFF_EQUAL, shorttext],
            [DIFF_INSERT, longtext.substring(i + shorttext.length)]
        ];
        if (text1.length > text2.length) {
            diffs[0][0] = DIFF_DELETE;
            diffs[2][0] = DIFF_DELETE;
        }
        return diffs.filter(d => d[1]); // Remove empty entries
    }
    
    if (shorttext.length === 1) {
        // Single character - can't do better
        return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
    }
    
    // Use line-based diff for better results with code
    return diff_lineMode(text1, text2);
}

function diff_lineMode(text1, text2) {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    
    // Simple LCS-based diff
    const matrix = [];
    for (let i = 0; i <= lines1.length; i++) {
        matrix[i] = new Array(lines2.length + 1).fill(0);
    }
    
    for (let i = 1; i <= lines1.length; i++) {
        for (let j = 1; j <= lines2.length; j++) {
            if (lines1[i - 1] === lines2[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1] + 1;
            } else {
                matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
            }
        }
    }
    
    // Backtrack to find diff
    const diffs = [];
    let i = lines1.length, j = lines2.length;
    
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
            diffs.unshift([DIFF_EQUAL, lines1[i - 1]]);
            i--;
            j--;
        } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
            diffs.unshift([DIFF_INSERT, lines2[j - 1]]);
            j--;
        } else {
            diffs.unshift([DIFF_DELETE, lines1[i - 1]]);
            i--;
        }
    }
    
    // Group consecutive same-type diffs
    const grouped = [];
    for (const [type, line] of diffs) {
        if (grouped.length > 0 && grouped[grouped.length - 1][0] === type) {
            grouped[grouped.length - 1][1] += '\n' + line;
        } else {
            grouped.push([type, line]);
        }
    }
    
    return grouped;
}

function diff_commonPrefix(text1, text2) {
    if (!text1 || !text2 || text1[0] !== text2[0]) {
        return 0;
    }
    let pointermin = 0;
    let pointermax = Math.min(text1.length, text2.length);
    let pointermid = pointermax;
    let pointerstart = 0;
    
    while (pointermin < pointermid) {
        if (text1.substring(pointerstart, pointermid) === text2.substring(pointerstart, pointermid)) {
            pointermin = pointermid;
            pointerstart = pointermin;
        } else {
            pointermax = pointermid;
        }
        pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
    }
    return pointermid;
}

function diff_commonSuffix(text1, text2) {
    if (!text1 || !text2 || text1[text1.length - 1] !== text2[text2.length - 1]) {
        return 0;
    }
    let pointermin = 0;
    let pointermax = Math.min(text1.length, text2.length);
    let pointermid = pointermax;
    let pointerend = 0;
    
    while (pointermin < pointermid) {
        if (text1.substring(text1.length - pointermid, text1.length - pointerend) ===
            text2.substring(text2.length - pointermid, text2.length - pointerend)) {
            pointermin = pointermid;
            pointerend = pointermin;
        } else {
            pointermax = pointermid;
        }
        pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
    }
    return pointermid;
}

// Simple cleanup - merge adjacent equalities
function diff_cleanupMerge(diffs) {
    if (diffs.length < 2) return diffs;
    
    const result = [diffs[0]];
    for (let i = 1; i < diffs.length; i++) {
        const last = result[result.length - 1];
        const current = diffs[i];
        
        if (last[0] === current[0]) {
            last[1] += current[1];
        } else {
            result.push(current);
        }
    }
    return result;
}

// Create a mock dmp object for compatibility
const dmp = {
    diff_main: diff_main,
    diff_cleanupSemantic: diff_cleanupMerge,
    diff_cleanupMerge: diff_cleanupMerge
};

// Diff Viewer App
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
        const lines = text.split('\n');
        if (lines[lines.length - 1] === '') {
            lines.pop();
        }

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
        const lines = text.split('\n');
        if (lines[lines.length - 1] === '') {
            lines.pop();
        }

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
        const lines = text.split('\n');
        if (lines[lines.length - 1] === '') lines.pop();
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
        const lines = text.split('\n');
        if (lines[lines.length - 1] === '') lines.pop();
        
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
