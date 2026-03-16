"""
message_analysis.py
-------------------
Phishing message / email detection engine for KavachX Part 3.

Pipeline:
    1. Text preprocessing
    2. DistilBERT NLP classification (reuses model from hybrid_analysis)
    3. Multi-layer keyword heuristic analysis
    4. Explainability — human-readable reasons
    5. Risk scoring (blended: 70% NLP + 30% heuristic)
    6. Recommendation generation
"""

import re
import logging

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Signal vocabularies
# ─────────────────────────────────────────────────────────────────────────────

URGENCY_PHRASES = [
    'act immediately', 'urgent', 'expires in', 'within 24 hours',
    'account suspended', 'act now', 'immediately', 'limited time',
    "don't delay", 'right away', 'as soon as possible', 'action required',
    'your account has been', 'unauthorized access', 'security alert',
    'verify immediately', 'confirm now', 'respond within', 'will be closed',
    'will be suspended', 'will be terminated', 'permanent closure',
    'final warning', 'last chance', 'account will be locked',
    'failure to respond', 'time sensitive', 'expiring soon',
]

CREDENTIAL_PHRASES = [
    'verify your', 'confirm your identity', 'enter your password',
    'update your information', 'login credentials', 'bank details',
    'aadhaar', 'social security', 'credit card number', 'cvv',
    'otp', 'one-time password', 'pin number', 'account number',
    'verify your account', 'confirm your account', 'reset your password',
    'update your payment', 'billing information', 'routing number',
    'enter your details', 'provide your', 'submit your credentials',
    'sign in to', 'log in to verify', 'authenticate your',
]

FINANCIAL_PHRASES = [
    'prize', 'lottery', 'won', 'winner', 'reward', 'cashback',
    'scholarship', 'refund', 'claim your', 'transfer', 'bitcoin',
    'inheritance', 'million dollars', 'lakh', 'crore', 'free money',
    'investment opportunity', 'guaranteed return', 'double your',
    'claim now', 'you have been selected', 'congratulations',
    'unclaimed funds', 'tax refund', 'payment pending',
]

IMPERSONATION_TARGETS = [
    'paypal', 'amazon', 'google', 'microsoft', 'apple', 'facebook',
    'netflix', 'instagram', 'twitter', 'linkedin', 'dropbox',
    'chase', 'bank of america', 'wells fargo', 'citibank', 'irs',
    'fedex', 'ups', 'dhl', 'whatsapp', 'telegram', 'coinbase',
    'binance', 'robinhood', 'venmo', 'zelle', 'crypto wallet',
    'hdfc', 'icici', 'sbi', 'axis bank', 'paytm', 'phonepe',
    'razorpay', 'flipkart', 'myntra', 'swiggy', 'zomato',
]

AI_GENERATED_SIGNALS = [
    'i hope this email finds you well',
    'as per our previous conversation',
    'kindly be informed',
    'please be advised that',
    'i am writing to inform you',
    'this is to notify you',
    'we regret to inform you',
    'your prompt attention',
    'at your earliest convenience',
]

SUSPICIOUS_TLDS = [
    '.tk', '.ml', '.xyz', '.click', '.win', '.buzz', '.top',
    '.gq', '.cf', '.ga', '.work', '.date', '.racing', '.review',
    '.stream', '.party', '.loan', '.download', '.bid',
]

URL_PATTERN = re.compile(r'https?://[^\s<>"\']+', re.IGNORECASE)
EMAIL_PATTERN = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')


# ─────────────────────────────────────────────────────────────────────────────
# Text preprocessing
# ─────────────────────────────────────────────────────────────────────────────

def preprocess_text(text: str) -> str:
    """Normalize whitespace and strip to a reasonable length."""
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ─────────────────────────────────────────────────────────────────────────────
# Indicator detection layers
# ─────────────────────────────────────────────────────────────────────────────

def detect_urgency(text_lower: str) -> tuple[bool, list[str]]:
    matched = [p for p in URGENCY_PHRASES if p in text_lower]
    if matched:
        shown = "', '".join(matched[:3])
        suffix = f" (+{len(matched) - 3} more)" if len(matched) > 3 else ""
        return True, [f"Urgent language detected: '{shown}'{suffix}"]
    return False, []


def detect_credential_harvesting(text_lower: str) -> tuple[bool, list[str]]:
    matched = [p for p in CREDENTIAL_PHRASES if p in text_lower]
    if matched:
        shown = "', '".join(matched[:2])
        return True, [f"Credential harvesting request: '{shown}'"]
    return False, []


def detect_financial_scam(text_lower: str) -> tuple[bool, list[str]]:
    matched = [p for p in FINANCIAL_PHRASES if p in text_lower]
    if matched:
        shown = "', '".join(matched[:2])
        return True, [f"Financial scam indicators: '{shown}'"]
    return False, []


def detect_impersonation(text_lower: str, has_urgency: bool) -> tuple[bool, list[str]]:
    matched = [b for b in IMPERSONATION_TARGETS if b in text_lower]
    if matched and has_urgency:
        shown = "', '".join(matched[:2])
        return True, [f"Brand impersonation with urgency: '{shown}'"]
    if matched:
        return False, [f"Brand name mentioned: '{matched[0]}' (no urgency — low risk)"]
    return False, []


def detect_suspicious_links(text: str) -> tuple[bool, list[str], list[str]]:
    urls = URL_PATTERN.findall(text)
    suspicious = []
    reasons = []

    for url in urls:
        url_lower = url.lower()
        # Check suspicious TLDs
        for tld in SUSPICIOUS_TLDS:
            if tld in url_lower:
                suspicious.append(url)
                reasons.append(f"Suspicious link: {url[:80]} ({tld} domain)")
                break
        # Check IP-based URLs
        if re.search(r'https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url_lower):
            suspicious.append(url)
            reasons.append(f"IP-based link detected: {url[:80]}")

    if urls and not suspicious:
        # Links exist but none are obviously suspicious
        pass

    return bool(suspicious), reasons, suspicious


def detect_ai_generated(text_lower: str) -> tuple[bool, list[str]]:
    matched = [p for p in AI_GENERATED_SIGNALS if p in text_lower]
    # Need multiple signals to flag — single matches are too common in normal email
    if len(matched) >= 2:
        shown = "', '".join(matched[:2])
        return True, [f"Possible AI-generated content patterns: '{shown}'"]
    return False, []


def detect_excessive_caps(text: str) -> list[str]:
    caps_words = re.findall(r'\b[A-Z]{4,}\b', text)
    unique = set(w for w in caps_words if w not in ('HTTP', 'HTTPS', 'HTML', 'FREE', 'NULL'))
    if len(unique) > 3:
        return [f"Excessive ALL-CAPS text ({len(unique)} instances) — fear/urgency tactic"]
    return []


# ─────────────────────────────────────────────────────────────────────────────
# Heuristic scoring
# ─────────────────────────────────────────────────────────────────────────────

def heuristic_score(text: str) -> tuple[float, list[str], dict]:
    """
    Multi-layer keyword/pattern heuristic analysis.
    Returns (score, reasons, indicators).
    """
    text_lower = text.lower()
    score = 0.0
    reasons = []
    indicators = {
        'urgency': False,
        'credential_request': False,
        'suspicious_links': [],
        'impersonation': False,
        'financial_scam': False,
        'ai_generated': False,
    }

    # Layer 1: Urgency
    found, r = detect_urgency(text_lower)
    if found:
        score += min(0.30, 0.10 * len([p for p in URGENCY_PHRASES if p in text_lower]))
        indicators['urgency'] = True
    reasons.extend(r)

    # Layer 2: Credential harvesting
    found, r = detect_credential_harvesting(text_lower)
    if found:
        score += 0.25
        indicators['credential_request'] = True
    reasons.extend(r)

    # Layer 3: Financial scam
    found, r = detect_financial_scam(text_lower)
    if found:
        score += 0.20
        indicators['financial_scam'] = True
    reasons.extend(r)

    # Layer 4: Impersonation
    found, r = detect_impersonation(text_lower, indicators['urgency'])
    if found:
        score += 0.20
        indicators['impersonation'] = True
    reasons.extend(r)

    # Layer 5: Suspicious links
    found, r, links = detect_suspicious_links(text)
    if found:
        score += 0.15
        indicators['suspicious_links'] = links
    reasons.extend(r)

    # Layer 6: AI-generated content
    found, r = detect_ai_generated(text_lower)
    if found:
        score += 0.05
        indicators['ai_generated'] = True
    reasons.extend(r)

    # Layer 7: Excessive caps
    caps_reasons = detect_excessive_caps(text)
    if caps_reasons:
        score += 0.05
    reasons.extend(caps_reasons)

    return min(score, 1.0), reasons, indicators


# ─────────────────────────────────────────────────────────────────────────────
# Recommendation engine
# ─────────────────────────────────────────────────────────────────────────────

def generate_recommendation(score: float, indicators: dict) -> dict:
    """Generate user-facing recommendation based on risk score and indicators."""
    if score >= 0.70:
        action = "Do NOT click any links or provide personal information."
        steps = [
            "Do not reply to this message",
            "Do not click any links in the message",
            "Do not provide any credentials or personal data",
            "Report this message as phishing to your email provider",
        ]
        if indicators.get('credential_request'):
            steps.append("If you already shared credentials, change your passwords immediately")
        if indicators.get('impersonation'):
            steps.append("Verify by visiting the official website directly (type it yourself)")
        if indicators.get('suspicious_links'):
            steps.append("Do not visit any of the suspicious links identified")
        return {'action': action, 'steps': steps, 'severity': 'critical'}

    if score >= 0.40:
        action = "Exercise caution. Verify the sender before responding."
        steps = [
            "Verify the sender's email address carefully",
            "Do not click links — navigate to the website directly",
            "Contact the organization through official channels to confirm",
            "Look for spelling errors or unusual formatting",
        ]
        return {'action': action, 'steps': steps, 'severity': 'warning'}

    action = "This message appears legitimate. No immediate threat detected."
    steps = [
        "Message shows no strong phishing indicators",
        "Standard safety practices still recommended",
    ]
    return {'action': action, 'steps': steps, 'severity': 'safe'}


# ─────────────────────────────────────────────────────────────────────────────
# Main analysis function
# ─────────────────────────────────────────────────────────────────────────────

def analyze_message(text: str, nlp_classifier=None) -> dict:
    """
    Full phishing message analysis pipeline.

    Parameters
    ----------
    text : str
        The raw message text to analyse.
    nlp_classifier : transformers.Pipeline or None
        The loaded HuggingFace text-classification pipeline.
        If None, uses heuristic scoring only.

    Returns
    -------
    dict with risk_score, label, status, reasons, indicators, recommendation, etc.
    """
    cleaned = preprocess_text(text)
    truncated = cleaned[:2000]

    nlp_score = 0.0
    nlp_confidence = 0.0
    nlp_used = False
    nlp_reasons = []

    # ── NLP model inference ──────────────────────────────────────────────────
    if nlp_classifier is not None:
        try:
            result = nlp_classifier(truncated)[0]
            label_raw = result['label'].upper()
            conf = float(result['score'])

            is_phishing = any(k in label_raw for k in ('PHISH', 'MALICIOUS', '1', 'LABEL_1'))
            nlp_score = conf if is_phishing else (1.0 - conf)
            nlp_confidence = conf
            nlp_used = True

            if nlp_score >= 0.70:
                nlp_reasons.append(f"NLP model flagged as phishing (confidence {conf:.0%})")
            elif nlp_score >= 0.45:
                nlp_reasons.append(f"NLP model found suspicious patterns (confidence {conf:.0%})")

        except Exception as exc:
            logger.warning('NLP inference failed for message analysis: %s', exc)

    # ── Heuristic analysis ───────────────────────────────────────────────────
    kw_score, kw_reasons, indicators = heuristic_score(cleaned)

    # ── Blend scores ─────────────────────────────────────────────────────────
    if nlp_used:
        final_score = 0.70 * nlp_score + 0.30 * kw_score
    else:
        final_score = kw_score

    final_score = round(min(max(final_score, 0.0), 1.0), 4)

    # ── Combine reasons ──────────────────────────────────────────────────────
    all_reasons = nlp_reasons + kw_reasons
    if not all_reasons:
        all_reasons = ['No strong phishing indicators detected']

    # ── Classification ───────────────────────────────────────────────────────
    if final_score >= 0.70:
        label, status = 'phishing', 'Phishing'
    elif final_score >= 0.40:
        label, status = 'suspicious', 'Suspicious'
    else:
        label, status = 'legitimate', 'Safe'

    # ── Recommendation ───────────────────────────────────────────────────────
    recommendation = generate_recommendation(final_score, indicators)

    return {
        'risk_score': final_score,
        'risk_pct': round(final_score * 100),
        'label': label,
        'status': status,
        'reasons': all_reasons,
        'indicators': indicators,
        'recommendation': recommendation,
        'nlp_model_used': nlp_used,
        'nlp_confidence': round(nlp_confidence, 4) if nlp_used else None,
        'keyword_score': round(kw_score, 4),
        'message_snippet': cleaned[:100] + ('...' if len(cleaned) > 100 else ''),
        'full_message_length': len(cleaned),
    }
