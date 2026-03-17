/**
 * CodeShield Detection Engine
 * Main orchestrator for secret detection pipeline
 * (CommonJS version for VS Code extension)
 */

const { scanWithRegex } = require('./scanner.js');
const { scanWithEntropy } = require('./entropy.js');
const { redactCode } = require('./redactor.js');

const CHUNK_THRESHOLD = 20_000;
const LINES_PER_CHUNK = 500;

function removeDuplicates(detections) {
  if (!Array.isArray(detections)) { return []; }

  const sorted = [...detections].sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    const aIsEntropy = a.type === 'HIGH_ENTROPY_SECRET' ? 1 : 0;
    const bIsEntropy = b.type === 'HIGH_ENTROPY_SECRET' ? 1 : 0;
    return aIsEntropy - bIsEntropy;
  });

  const kept = [];

  for (const detection of sorted) {
    const start = detection.index;
    const end = detection.index + detection.value.length;

    const overlapIndex = kept.findIndex(k => {
      const kStart = k.index;
      const kEnd = k.index + k.value.length;
      return start < kEnd && end > kStart;
    });

    if (overlapIndex === -1) {
      kept.push(detection);
    } else if (
      kept[overlapIndex].type === 'HIGH_ENTROPY_SECRET' &&
      detection.type !== 'HIGH_ENTROPY_SECRET'
    ) {
      kept[overlapIndex] = detection;
    }
  }

  return kept;
}

function sortByIndex(detections) {
  if (!Array.isArray(detections)) { return []; }
  return detections.sort((a, b) => a.index - b.index);
}

function mergeResults(regexResults, entropyResults) {
  const allResults = [
    ...(Array.isArray(regexResults) ? regexResults : []),
    ...(Array.isArray(entropyResults) ? entropyResults : [])
  ];
  return sortByIndex(removeDuplicates(allResults));
}

function isValidInput(rawCode) {
  return typeof rawCode === 'string' && rawCode.length > 0;
}

function chunkAndProcess(rawCode) {
  const lines = rawCode.split('\n');
  const allDetections = [];

  let charOffset = 0;
  for (let i = 0; i < lines.length; i += LINES_PER_CHUNK) {
    const chunkLines = lines.slice(i, i + LINES_PER_CHUNK);
    const chunkText = chunkLines.join('\n');

    const regexHits = scanWithRegex(chunkText);
    const entropyHits = scanWithEntropy(chunkText);

    for (const d of [...regexHits, ...entropyHits]) {
      allDetections.push({ ...d, index: d.index + charOffset });
    }

    charOffset += chunkText.length + 1;
  }

  return allDetections;
}

function processCode(rawCode) {
  if (!isValidInput(rawCode)) {
    return { secretsFound: [], redactedCode: '', mapping: {}, metadata: { totalLength: 0, processingTime: 0, scanCount: 0 } };
  }

  const startTime = performance.now();
  const isLargeInput = rawCode.length > CHUNK_THRESHOLD;

  try {
    let mergedResults;
    let regexCount = 0;
    let entropyCount = 0;

    if (isLargeInput) {
      const allDetections = chunkAndProcess(rawCode);
      mergedResults = sortByIndex(removeDuplicates(allDetections));
      regexCount = mergedResults.filter(d => d.type !== 'HIGH_ENTROPY_SECRET').length;
      entropyCount = mergedResults.filter(d => d.type === 'HIGH_ENTROPY_SECRET').length;
    } else {
      const regexResults = scanWithRegex(rawCode);
      const entropyResults = scanWithEntropy(rawCode);
      mergedResults = mergeResults(regexResults, entropyResults);
      regexCount = regexResults.length;
      entropyCount = entropyResults.length;
    }

    const { redactedCode, mapping } = redactCode(rawCode, mergedResults);

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    return {
      secretsFound: mergedResults,
      redactedCode: redactedCode,
      mapping: mapping,
      metadata: {
        totalLength: rawCode.length,
        processingTime: Math.round(processingTime * 100) / 100,
        scanCount: mergedResults.length,
        regexMatches: regexCount,
        entropyMatches: entropyCount,
        processingMode: isLargeInput ? 'chunked' : 'single'
      }
    };

  } catch (error) {
    console.error('CodeShield processing error:', error);
    return { secretsFound: [], redactedCode: rawCode, mapping: {}, metadata: { totalLength: rawCode.length, processingTime: 0, scanCount: 0, error: error.message } };
  }
}

function quickScan(rawCode) {
  return processCode(rawCode).secretsFound;
}

function getCodeStats(rawCode) {
  if (!isValidInput(rawCode)) {
    return { lineCount: 0, characterCount: 0, wordCount: 0, estimatedRisk: 'none' };
  }
  const lines = rawCode.split('\n');
  const words = rawCode.split(/\s+/).filter(word => word.length > 0);
  const secrets = quickScan(rawCode);
  let risk = 'none';

  if (secrets.length > 0) {
    const highRiskTypes = ['AWS_ACCESS_KEY', 'AWS_SECRET_KEY', 'OPENAI_API_KEY', 'PRIVATE_KEY'];
    const hasHighRisk = secrets.some(secret => highRiskTypes.includes(secret.type));
    risk = hasHighRisk ? 'high' : (secrets.length > 3 ? 'medium' : 'low');
  }

  return { lineCount: lines.length, characterCount: rawCode.length, wordCount: words.length, estimatedRisk: risk, secretCount: secrets.length };
}

module.exports = { processCode, quickScan, getCodeStats };
