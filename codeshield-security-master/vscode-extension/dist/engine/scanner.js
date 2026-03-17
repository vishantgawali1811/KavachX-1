/**
 * CodeShield Scanner Module
 * Detects known secrets using regular expression patterns
 * (CommonJS version for VS Code extension)
 */

const SECRET_PATTERNS = {
  AWS_ACCESS_KEY: {
    pattern: /\bAKIA[0-9A-Z]+\b/g,
    label: 'AWS_ACCESS_KEY'
  },
  AWS_SECRET_KEY: {
    pattern: /(?:aws_secret(?:_access)?_key|secret_access_key|secret_key|aws_secret)\s*[:=\s]\s*["']?([0-9a-zA-Z/+]{40})["']?/gi,
    label: 'AWS_SECRET_KEY'
  },
  OPENAI_API_KEY: {
    pattern: /\bsk-(?:[a-zA-Z0-9]{20,}|[a-zA-Z]+-[a-zA-Z0-9_-]{20,})\b/g,
    label: 'OPENAI_API_KEY'
  },
  STRIPE_LIVE_KEY: {
    pattern: /\bsk_live_[a-zA-Z0-9]{24,}\b/g,
    label: 'STRIPE_LIVE_KEY'
  },
  STRIPE_TEST_KEY: {
    pattern: /\bsk_test_[a-zA-Z0-9]{24,}\b/g,
    label: 'STRIPE_TEST_KEY'
  },
  GOOGLE_API_KEY: {
    pattern: /\bAIza[0-9A-Za-z_-]{35,}\b/g,
    label: 'GOOGLE_API_KEY'
  },
  JWT_TOKEN: {
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    label: 'JWT_TOKEN'
  },
  BEARER_TOKEN: {
    pattern: /Bearer\s+([a-zA-Z0-9\-._~+/]{20,}=*)/g,
    label: 'BEARER_TOKEN'
  },
  PRIVATE_KEY: {
    pattern: /-----BEGIN\s+(?:RSA |OPENSSH |EC |DSA |PGP |ENCRYPTED )?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA |OPENSSH |EC |DSA |PGP |ENCRYPTED )?PRIVATE\s+KEY-----/g,
    label: 'PRIVATE_KEY'
  },
  PASSWORD_ASSIGNMENT: {
    pattern: /(?:password|pwd)\s*[:=]\s*([^\s\n\r"']+)/gi,
    label: 'PASSWORD_ASSIGNMENT'
  },
  SEMANTIC_PASSWORD: {
    pattern: /(?:password|secret|pwd|apikey|api_key|jwtSecret|initialPassword|credential)\s*[:=]\s*['"]([^'"]{8,})['"](?!\s*\.)/gi,
    label: 'SEMANTIC_PASSWORD'
  },
  PHONE_NUMBER: {
    pattern: /(?<![\w])(?:\+\d{1,3}[\s-])?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?![\w-])/g,
    label: 'PHONE_NUMBER'
  },
  ENV_VARIABLE: {
    pattern: /^([A-Z][A-Z0-9_]{2,})\s*=\s*["']?([^\s"'\n\r]{16,})["']?$/gm,
    label: 'ENV_VARIABLE',
    captureGroup: 2
  },
  GITHUB_PAT: {
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,}\b/g,
    label: 'GITHUB_PAT'
  },
  SLACK_TOKEN: {
    pattern: /\bxox[bpars]-[0-9A-Za-z-]{10,}\b/g,
    label: 'SLACK_TOKEN'
  },
  SLACK_WEBHOOK: {
    pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9]{8,12}\/[A-Za-z0-9]{8,12}\/[a-zA-Z0-9]{20,}/g,
    label: 'SLACK_WEBHOOK'
  },
  HUGGINGFACE_TOKEN: {
    pattern: /\bhf_[a-zA-Z0-9]{20,}\b/g,
    label: 'HUGGINGFACE_TOKEN'
  },
  URI_PASSWORD: {
    pattern: /\b(?:mysql|mongodb|postgres|postgresql|redis|amqp|ftp|sftp):(?:\/\/)[^:@\s"']*:(?!\d{1,5}@)([^:@\s"'\/]{6,})@/g,
    label: 'URI_PASSWORD',
    captureGroup: 1
  }
};

function scanWithRegex(rawCode) {
  if (!rawCode || typeof rawCode !== 'string') {
    return [];
  }

  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const uuidRanges = [];
  let uuidMatch;
  while ((uuidMatch = UUID_RE.exec(rawCode)) !== null) {
    uuidRanges.push([uuidMatch.index, uuidMatch.index + uuidMatch[0].length]);
  }

  function isInsideUUID(start, end) {
    return uuidRanges.some(([us, ue]) => start >= us && end <= ue);
  }

  const detections = [];
  const seenDetections = new Set();

  for (const [type, config] of Object.entries(SECRET_PATTERNS)) {
    let match;
    config.pattern.lastIndex = 0;

    while ((match = config.pattern.exec(rawCode)) !== null) {
      const groupIndex = config.captureGroup !== undefined ? config.captureGroup : (match[1] !== undefined ? 1 : 0);
      const matchedValue = match[groupIndex] !== undefined ? match[groupIndex] : match[0];

      const startIndex = groupIndex > 0 && match[groupIndex] !== undefined
        ? match.index + match[0].indexOf(match[groupIndex])
        : match.index;

      const detectionKey = `${startIndex}-${matchedValue}`;

      if (!seenDetections.has(detectionKey)) {
        seenDetections.add(detectionKey);

        if (isInsideUUID(startIndex, startIndex + matchedValue.length)) {
          if (match.index === config.pattern.lastIndex) config.pattern.lastIndex++;
          continue;
        }

        detections.push({
          type: config.label,
          value: matchedValue,
          index: startIndex
        });
      }

      if (match.index === config.pattern.lastIndex) {
        config.pattern.lastIndex++;
      }
    }
  }

  return detections;
}

function getSecretPatterns() {
  return SECRET_PATTERNS;
}

module.exports = { scanWithRegex, getSecretPatterns };
