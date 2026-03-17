/**
 * CodeShield Entropy Module
 * Detects unknown secrets using Shannon entropy analysis
 * (CommonJS version for VS Code extension)
 */

function calculateEntropy(str) {
  if (!str || typeof str !== 'string') {
    return 0;
  }

  const len = str.length;
  if (len === 0) {
    return 0;
  }

  const freq = {};
  for (let i = 0; i < len; i++) {
    const char = str[i];
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  for (const char in freq) {
    const p = freq[char] / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

function tokenizeText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const tokens = [];
  let currentToken = '';
  let startIndex = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (/\s|[.,;:!(){}[\]"'<>]/.test(char)) {
      if (currentToken.length > 0) {
        tokens.push({
          value: currentToken,
          index: startIndex
        });
        currentToken = '';
      }
    } else {
      if (currentToken.length === 0) {
        startIndex = i;
      }
      currentToken += char;
    }
  }

  if (currentToken.length > 0) {
    tokens.push({
      value: currentToken,
      index: startIndex
    });
  }

  return tokens;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALL_HEX_PATTERN = /^[0-9a-f]+$/i;

function isFalsePositive(token) {
  if (UUID_PATTERN.test(token)) return true;
  if (token.startsWith('data:image/') || token.startsWith('data:application/')) return true;
  if (token.length > 200) return true;
  if (ALL_HEX_PATTERN.test(token)) return true;
  return false;
}

function isHighEntropySecret(token) {
  if (token.length <= 20) {
    return false;
  }

  if (isFalsePositive(token)) {
    return false;
  }

  const entropy = calculateEntropy(token);

  if (entropy <= 4.5) {
    return false;
  }

  const hasLetters = /[a-zA-Z]/.test(token);
  const hasNumbers = /[0-9]/.test(token);

  return hasLetters && hasNumbers;
}

function scanWithEntropy(rawCode) {
  if (!rawCode || typeof rawCode !== 'string') {
    return [];
  }

  const detections = [];
  const seenDetections = new Set();

  const tokens = tokenizeText(rawCode);

  for (const token of tokens) {
    if (isHighEntropySecret(token.value)) {
      const detectionKey = `${token.index}-${token.value}`;

      if (!seenDetections.has(detectionKey)) {
        seenDetections.add(detectionKey);

        detections.push({
          type: 'HIGH_ENTROPY_SECRET',
          value: token.value,
          index: token.index
        });
      }
    }
  }

  return detections;
}

function getEntropyStats(text) {
  if (!text || typeof text !== 'string') {
    return {
      averageEntropy: 0,
      maxEntropy: 0,
      highEntropyTokens: 0,
      totalTokens: 0
    };
  }

  const tokens = tokenizeText(text);
  const entropies = tokens.map(token => calculateEntropy(token.value));

  return {
    averageEntropy: entropies.length > 0 ? entropies.reduce((a, b) => a + b, 0) / entropies.length : 0,
    maxEntropy: entropies.length > 0 ? Math.max(...entropies) : 0,
    highEntropyTokens: entropies.filter(e => e > 4.5).length,
    totalTokens: tokens.length
  };
}

module.exports = { calculateEntropy, scanWithEntropy, getEntropyStats };
