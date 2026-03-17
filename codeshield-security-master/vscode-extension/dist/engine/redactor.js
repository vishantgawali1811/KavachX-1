/**
 * redactor.js
 * Responsibility: Transform raw code into safe code using placeholders.
 * (CommonJS version for VS Code extension)
 */

function redactCode(rawCode, secretsFound) {
    if (!secretsFound || secretsFound.length === 0) {
        return { redactedCode: rawCode, mapping: {} };
    }

    const mapping = {};
    const typeCounters = {};
    const valueToPlaceholder = new Map();
    let redactedCode = rawCode;

    const sortedSecrets = [...secretsFound].sort((a, b) => b.index - a.index);

    const usedRegions = [];

    sortedSecrets.forEach(secret => {
        const { type, value, index } = secret;
        const end = index + value.length;

        const overlaps = usedRegions.some(r => index < r.end && end > r.start);
        if (overlaps) return;
        usedRegions.push({ start: index, end });

        let placeholder;

        if (valueToPlaceholder.has(value)) {
            placeholder = valueToPlaceholder.get(value);
        } else {
            typeCounters[type] = (typeCounters[type] || 0) + 1;
            placeholder = `[${type}_${typeCounters[type]}]`;
            valueToPlaceholder.set(value, placeholder);
            mapping[placeholder] = value;
        }

        redactedCode =
            redactedCode.slice(0, index) +
            placeholder +
            redactedCode.slice(index + value.length);
    });

    return { redactedCode, mapping };
}

function restoreCode(aiOutput, mapping) {
    let restored = aiOutput;

    const placeholders = Object.keys(mapping).sort((a, b) => b.length - a.length);

    placeholders.forEach(placeholder => {
        restored = restored.split(placeholder).join(mapping[placeholder]);
    });

    return restored;
}

module.exports = { redactCode, restoreCode };
