// Simple Diff Implementation
const DIFF_DELETE = -1;
const DIFF_INSERT = 1;
const DIFF_EQUAL = 0;

function diff_commonPrefix(text1, text2) {
    if (!text1 || !text2 || text1.charAt(0) !== text2.charAt(0)) return 0;
    let pointerMin = 0;
    let pointerMax = Math.min(text1.length, text2.length);
    let pointerMid = pointerMax;
    let pointerStart = 0;
    while (pointerMin < pointerMid) {
        if (text1.substring(pointerStart, pointerMid) === text2.substring(pointerStart, pointerMid)) {
            pointerMin = pointerMid;
            pointerStart = pointerMin;
        } else {
            pointerMax = pointerMid;
        }
        pointerMid = Math.floor((pointerMax - pointerMin) / 2 + pointerMin);
    }
    return pointerMid;
}

function diff_commonSuffix(text1, text2) {
    if (!text1 || !text2 || text1.charAt(text1.length - 1) !== text2.charAt(text2.length - 1)) return 0;
    let pointerMin = 0;
    let pointerMax = Math.min(text1.length, text2.length);
    let pointerMid = pointerMax;
    let pointerEnd = 0;
    while (pointerMin < pointerMid) {
        if (text1.substring(text1.length - pointerMid, text1.length - pointerEnd) ===
            text2.substring(text2.length - pointerMid, text2.length - pointerEnd)) {
            pointerMin = pointerMid;
            pointerEnd = pointerMin;
        } else {
            pointerMax = pointerMid;
        }
        pointerMid = Math.floor((pointerMax - pointerMin) / 2 + pointerMin);
    }
    return pointerMid;
}

function diff_main(text1, text2) {
    if (text1 === text2) {
        return text1 ? [[DIFF_EQUAL, text1]] : [];
    }
    if (text1 === null || text2 === null) {
        throw new Error("Null input. (diff_main)");
    }
    
    const commonPrefix = diff_commonPrefix(text1, text2);
    const prefix = text1.substring(0, commonPrefix);
    text1 = text1.substring(commonPrefix);
    text2 = text2.substring(commonPrefix);
    
    const commonSuffix = diff_commonSuffix(text1, text2);
    const suffix = text1.substring(text1.length - commonSuffix);
    text1 = text1.substring(0, text1.length - commonSuffix);
    text2 = text2.substring(0, text2.length - commonSuffix);
    
    const diffs = diff_compute(text1, text2);
    
    if (prefix) diffs.unshift([DIFF_EQUAL, prefix]);
    if (suffix) diffs.push([DIFF_EQUAL, suffix]);
    
    return diffs;
}

function diff_compute(text1, text2) {
    if (!text1) return [[DIFF_INSERT, text2]];
    if (!text2) return [[DIFF_DELETE, text1]];
    
    const longtext = text1.length > text2.length ? text1 : text2;
    const shorttext = text1.length > text2.length ? text2 : text1;
    const i = longtext.indexOf(shorttext);
    
    if (i !== -1) {
        const diffs = [
            [DIFF_INSERT, longtext.substring(0, i)],
            [DIFF_EQUAL, shorttext],
            [DIFF_INSERT, longtext.substring(i + shorttext.length)]
        ];
        if (text1.length > text2.length) {
            diffs[0][0] = DIFF_DELETE;
            diffs[2][0] = DIFF_DELETE;
        }
        return diffs.filter(d => d[1]);
    }
    
    if (shorttext.length === 1) {
        return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
    }
    
    return diff_bisect(text1, text2);
}

function diff_bisect(text1, text2) {
    const text1Length = text1.length;
    const text2Length = text2.length;
    const maxD = Math.ceil((text1Length + text2Length) / 2);
    const vOffset = maxD;
    const vLength = 2 * maxD;
    const v1 = new Array(vLength);
    const v2 = new Array(vLength);
    
    for (let x = 0; x < vLength; x++) {
        v1[x] = -1;
        v2[x] = -1;
    }
    v1[vOffset + 1] = 0;
    v2[vOffset + 1] = 0;
    
    const delta = text1Length - text2Length;
    const front = delta % 2 !== 0;
    let k1Start = 0;
    let k1End = 0;
    let k2Start = 0;
    let k2End = 0;
    
    for (let d = 0; d < maxD; d++) {
        for (let k1 = -d + k1Start; k1 <= d - k1End; k1 += 2) {
            const k1Offset = vOffset + k1;
            let x1;
            if (k1 === -d || (k1 !== d && v1[k1Offset - 1] < v1[k1Offset + 1])) {
                x1 = v1[k1Offset + 1];
            } else {
                x1 = v1[k1Offset - 1] + 1;
            }
            let y1 = x1 - k1;
            while (x1 < text1Length && y1 < text2Length && text1.charAt(x1) === text2.charAt(y1)) {
                x1++;
                y1++;
            }
            v1[k1Offset] = x1;
            if (x1 > text1Length) {
                k1End += 2;
            } else if (y1 > text2Length) {
                k1Start += 2;
            } else if (front) {
                const k2Offset = vOffset + delta - k1;
                if (k2Offset >= 0 && k2Offset < vLength && v2[k2Offset] !== -1) {
                    const x2 = text1Length - v2[k2Offset];
                    if (x1 >= x2) {
                        return diff_bisectSplit(text1, text2, x1, y1);
                    }
                }
            }
        }
        
        for (let k2 = -d + k2Start; k2 <= d - k2End; k2 += 2) {
            const k2Offset = vOffset + k2;
            let x2;
            if (k2 === -d || (k2 !== d && v2[k2Offset - 1] < v2[k2Offset + 1])) {
                x2 = v2[k2Offset + 1];
            } else {
                x2 = v2[k2Offset - 1] + 1;
            }
            let y2 = x2 - k2;
            while (x2 < text1Length && y2 < text2Length &&
                   text1.charAt(text1Length - x2 - 1) === text2.charAt(text2Length - y2 - 1)) {
                x2++;
                y2++;
            }
            v2[k2Offset] = x2;
            if (x2 > text1Length) {
                k2End += 2;
            } else if (y2 > text2Length) {
                k2Start += 2;
            } else if (!front) {
                const k1Offset = vOffset + delta - k2;
                if (k1Offset >= 0 && k1Offset < vLength && v1[k1Offset] !== -1) {
                    const x1 = v1[k1Offset];
                    const y1 = vOffset + x1 - k1Offset;
                    x2 = text1Length - x2;
                    if (x1 >= x2) {
                        return diff_bisectSplit(text1, text2, x1, y1);
                    }
                }
            }
        }
    }
    return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
}

function diff_bisectSplit(text1, text2, x, y) {
    const text1a = text1.substring(0, x);
    const text2a = text2.substring(0, y);
    const text1b = text1.substring(x);
    const text2b = text2.substring(y);
    const diffs = diff_main(text1a, text2a);
    const diffsb = diff_main(text1b, text2b);
    return diffs.concat(diffsb);
}

function diff_cleanupSemantic(diffs) {
    let changes = false;
    const equalities = [];
    let equalitiesLength = 0;
    let lastEquality = null;
    let pointer = 0;
    let lengthInsertions1 = 0;
    let lengthDeletions1 = 0;
    let lengthInsertions2 = 0;
    let lengthDeletions2 = 0;
    
    while (pointer < diffs.length) {
        if (diffs[pointer][0] === DIFF_EQUAL) {
            equalities[equalitiesLength++] = pointer;
            lengthInsertions1 = lengthInsertions2;
            lengthDeletions1 = lengthDeletions2;
            lengthInsertions2 = 0;
            lengthDeletions2 = 0;
            lastEquality = diffs[pointer][1];
        } else {
            if (diffs[pointer][0] === DIFF_INSERT) {
                lengthInsertions2 += diffs[pointer][1].length;
            } else {
                lengthDeletions2 += diffs[pointer][1].length;
            }
            if (lastEquality && (lastEquality.length <= Math.max(lengthInsertions1, lengthDeletions1)) &&
                (lastEquality.length <= Math.max(lengthInsertions2, lengthDeletions2))) {
                diffs.splice(equalities[equalitiesLength - 1], 0, [DIFF_DELETE, lastEquality]);
                diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
                equalitiesLength--;
                equalitiesLength--;
                pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
                lengthInsertions1 = 0;
                lengthDeletions1 = 0;
                lengthInsertions2 = 0;
                lengthDeletions2 = 0;
                lastEquality = null;
                changes = true;
            }
        }
        pointer++;
    }
    if (changes) diff_cleanupMerge(diffs);
}

function diff_cleanupMerge(diffs) {
    diffs.push([DIFF_EQUAL, '']);
    let pointer = 0;
    let countDelete = 0;
    let countInsert = 0;
    let textDelete = '';
    let textInsert = '';
    let commonlength;
    
    while (pointer < diffs.length) {
        switch (diffs[pointer][0]) {
            case DIFF_INSERT:
                countInsert++;
                textInsert += diffs[pointer][1];
                break;
            case DIFF_DELETE:
                countDelete++;
                textDelete += diffs[pointer][1];
                break;
            case DIFF_EQUAL:
                if (countDelete + countInsert > 1) {
                    if (countDelete !== 0 && countInsert !== 0) {
                        commonlength = diff_commonPrefix(textInsert, textDelete);
                        if (commonlength !== 0) {
                            if ((pointer - countDelete - countInsert) > 0 && diffs[pointer - countDelete - countInsert - 1][0] === DIFF_EQUAL) {
                                diffs[pointer - countDelete - countInsert - 1][1] += textInsert.substring(0, commonlength);
                            } else {
                                diffs.splice(0, 0, [DIFF_EQUAL, textInsert.substring(0, commonlength)]);
                                pointer++;
                            }
                            textInsert = textInsert.substring(commonlength);
                            textDelete = textDelete.substring(commonlength);
                        }
                        commonlength = diff_commonSuffix(textInsert, textDelete);
                        if (commonlength !== 0) {
                            diffs[pointer][1] = textInsert.substring(textInsert.length - commonlength) + diffs[pointer][1];
                            textInsert = textInsert.substring(0, textInsert.length - commonlength);
                            textDelete = textDelete.substring(0, textDelete.length - commonlength);
                        }
                    }
                    pointer -= countDelete + countInsert;
                    diffs.splice(pointer, countDelete + countInsert);
                    if (textDelete.length !== 0) {
                        diffs.splice(pointer, 0, [DIFF_DELETE, textDelete]);
                        pointer++;
                    }
                    if (textInsert.length !== 0) {
                        diffs.splice(pointer, 0, [DIFF_INSERT, textInsert]);
                        pointer++;
                    }
                    pointer++;
                } else if (pointer !== 0 && diffs[pointer - 1][0] === DIFF_EQUAL) {
                    diffs[pointer - 1][1] += diffs[pointer][1];
                    diffs.splice(pointer, 1);
                } else {
                    pointer++;
                }
                countInsert = 0;
                countDelete = 0;
                textDelete = '';
                textInsert = '';
                break;
        }
        pointer++;
    }
    if (diffs[diffs.length - 1][1] === '') diffs.pop();
    
    pointer = 1;
    while (pointer < diffs.length - 1) {
        if (diffs[pointer - 1][0] === DIFF_EQUAL && diffs[pointer + 1][0] === DIFF_EQUAL) {
            if (diffs[pointer][1].substring(diffs[pointer][1].length - diffs[pointer - 1][1].length) === diffs[pointer - 1][1]) {
                diffs[pointer][1] = diffs[pointer - 1][1] + diffs[pointer][1].substring(0, diffs[pointer][1].length - diffs[pointer - 1][1].length);
                diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
                diffs.splice(pointer - 1, 1);
            } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) === diffs[pointer + 1][1]) {
                diffs[pointer - 1][1] += diffs[pointer + 1][1];
                diffs[pointer][1] = diffs[pointer][1].substring(diffs[pointer + 1][1].length) + diffs[pointer + 1][1];
                diffs.splice(pointer + 1, 1);
            }
        }
        pointer++;
    }
}

function diff_match_patch() {}
diff_match_patch.prototype.diff_main = diff_main;
diff_match_patch.prototype.diff_cleanupSemantic = diff_cleanupSemantic;
