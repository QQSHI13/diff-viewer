// Simple LCS-based diff
function diff_main(text1, text2) {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    
    // LCS matrix
    const m = lines1.length, n = lines2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (lines1[i - 1] === lines2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    
    // Backtrack
    const result = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
            result.unshift([0, lines1[i - 1]]);
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift([1, lines2[j - 1]]);
            j--;
        } else {
            result.unshift([-1, lines1[i - 1]]);
            i--;
        }
    }
    
    // Group consecutive
    const grouped = [];
    for (const [type, line] of result) {
        if (grouped.length && grouped[grouped.length - 1][0] === type) {
            grouped[grouped.length - 1][1] += '\n' + line;
        } else {
            grouped.push([type, line]);
        }
    }
    return grouped;
}

const diff_match_patch = function() {};
diff_match_patch.prototype.diff_main = diff_main;
diff_match_patch.prototype.diff_cleanupSemantic = function() {};
