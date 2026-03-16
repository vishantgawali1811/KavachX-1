"""
hybrid_analysis.py
------------------
Extends the URL-only model with two additional analysis layers:

  1. structural_analysis(data)  — scores DOM structure signals
  2. content_text_analysis(text) — NLP scoring on visible page text
  3. combine_scores(...)         — weighted fusion + reason generation
  4. load_nlp_model()            — loads HuggingFace classifier once at startup

Weights:
    final_score = 0.4 * url_score
                + 0.3 * structural_score
                + 0.3 * content_score

NLP model used (if transformers + torch available):
    Model:   cybersectony/phishing-email-detection-distilbert_v2.4.3
    Set env  PHISHING_NLP_MODEL=<model-id>  to override.
    If unavailable, falls back to keyword heuristics transparently.
"""

import logging
import os
import re


logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Phishing keyword vocabulary
# ─────────────────────────────────────────────────────────────────────────────

URGENT_PHRASES = [
    'verify your account', 'confirm your identity', 'update your information',
    'account suspended', 'unusual activity', 'click here to verify',
    'enter your password', 'login to continue', 'urgent action required',
    'your account has been', 'unauthorized access', 'security alert',
    'act immediately', 'limited time', 'expires in', 'act now',
    'confirm now', 'validate your', 'credential', 'bank details',
    'credit card number', 'social security', 'tax refund', 'claim your',
    'you are a winner', 'congratulations you', 'password reset',
    'one-time code', 'one time password', ' otp ', 'authentication code',
    'two-factor', '2fa code', 'do not share', 'suspicious sign-in',
    'your account will be', 'missing payment', 'reactivate your',
    'invoice attached', 'parcel could not', 'delivery failed',
]

IMPERSONATION_TARGETS = [
    'paypal', 'amazon', 'google', 'microsoft', 'apple', 'facebook',
    'netflix', 'instagram', 'twitter', 'linkedin', 'dropbox',
    'chase', 'bank of america', 'wells fargo', 'citibank', 'irs',
    'fedex', 'ups', 'dhl', 'whatsapp', 'telegram', 'coinbase',
    'binance', 'robinhood', 'venmo', 'zelle', 'crypto wallet',
]

# Suspicious form action patterns (relative paths or odd domains)
SUSPICIOUS_ACTION_RE = re.compile(
    r'(\.php$|action=|redirect=|/gate\.|/log\.|/submit\.php)',
    re.IGNORECASE,
)

TITLE_PHISH_RE = re.compile(
    r'\b(verify|login|signin|sign in|secure|account|update|confirm|'
    r'validate|suspended|restricted|warning|alert|urgent)\b',
    re.IGNORECASE,
)


# ─────────────────────────────────────────────────────────────────────────────
# NLP model — loaded once at startup
# ─────────────────────────────────────────────────────────────────────────────

_nlp_classifier = None
NLP_MODEL_AVAILABLE = False


def load_nlp_model() -> bool:
    """
    Attempts to load a phishing text classifier from HuggingFace.
    Silently falls back to keyword-only analysis if transformers/torch
    is not installed or model download fails.

    Returns True if the model loaded successfully.
    """
    global _nlp_classifier, NLP_MODEL_AVAILABLE

    model_name = os.environ.get(
        'PHISHING_NLP_MODEL',
        'cybersectony/phishing-email-detection-distilbert_v2.4.3',
    )

    try:
        # Imports are inside try so the rest of the module works without torch
        from transformers import pipeline as hf_pipeline  # noqa

        logger.info(f'Loading NLP model: {model_name} ...')
        _nlp_classifier = hf_pipeline(
            'text-classification',
            model=model_name,
            truncation=True,
            max_length=512,
            device=-1,      # always CPU — safe in all environments
        )
        NLP_MODEL_AVAILABLE = True
        logger.info(f'NLP model loaded successfully: {model_name}')
        return True

    except ImportError:
        logger.warning(
            'transformers/torch not installed. '
            'Content NLP analysis will use keyword heuristics only. '
            'Run: pip install transformers torch'
        )
    except Exception as exc:
        logger.warning(
            f'Could not load NLP model "{model_name}": {exc}. '
            'Falling back to keyword heuristics.'
        )

    _nlp_classifier = None
    NLP_MODEL_AVAILABLE = False
    return False


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Structural analysis
# ─────────────────────────────────────────────────────────────────────────────

def structural_analysis(data: dict) -> tuple[float, list[str]]:
    """
    Score DOM structural indicators of phishing.

    Parameters
    ----------
    data : dict
        Keys used (all optional, defaults to 0):
            numPasswordFields, numForms, numIframes, numInputs,
            title, formActions (list of strings)

    Returns
    -------
    (score: float, reasons: list[str])
        score is clamped to [0.0, 1.0]
    """
    score   = 0.0
    reasons = []

    num_passwords = int(data.get('numPasswordFields', 0))
    num_forms     = int(data.get('numForms', 0))
    num_iframes   = int(data.get('numIframes', 0))
    num_inputs    = int(data.get('numInputs', 0))
    title         = str(data.get('title', ''))
    form_actions  = data.get('formActions', [])   # list of action URL strings

    # ── Password fields ──────────────────────────────────────────────────────
    if num_passwords >= 2:
        score += 0.35
        reasons.append(f'Multiple password fields detected ({num_passwords})')
    elif num_passwords == 1:
        score += 0.25
        reasons.append('Password field detected on page')

    # ── Forms ────────────────────────────────────────────────────────────────
    if num_forms > 3:
        score += 0.25
        reasons.append(f'Excessive forms on page ({num_forms})')
    elif num_forms >= 2:
        score += 0.15
        reasons.append(f'Multiple forms detected ({num_forms})')

    # ── Iframes ──────────────────────────────────────────────────────────────
    if num_iframes > 2:
        score += 0.20
        reasons.append(f'Excessive iframes detected ({num_iframes})')
    elif num_iframes > 0:
        score += 0.08
        reasons.append(f'Iframe(s) present on page ({num_iframes})')

    # ── High input density ────────────────────────────────────────────────────
    if num_inputs > 10:
        score += 0.10
        reasons.append(f'Unusually high number of input fields ({num_inputs})')

    # ── Suspicious page title ─────────────────────────────────────────────────
    if title and TITLE_PHISH_RE.search(title):
        score += 0.15
        reasons.append(f'Suspicious keywords in page title: "{title[:60]}"')

    # ── Suspicious form actions ───────────────────────────────────────────────
    for action in (form_actions or []):
        if SUSPICIOUS_ACTION_RE.search(str(action)):
            score += 0.20
            reasons.append(f'Suspicious form action target: {action[:80]}')
            break   # count once even if multiple

    return (min(score, 1.0), reasons)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — NLP / keyword content analysis
# ─────────────────────────────────────────────────────────────────────────────

def _keyword_score(text: str) -> tuple[float, list[str]]:
    """
    Lightweight keyword heuristic fallback — no model download required.
    """
    if not text:
        return 0.0, []

    lower   = text.lower()
    score   = 0.0
    reasons = []

    # Urgent / deceptive phrases
    matched_urgent = [p for p in URGENT_PHRASES if p in lower]
    if matched_urgent:
        contrib = min(0.05 * len(matched_urgent), 0.45)
        score  += contrib
        reasons.append(
            f'Urgent/deceptive language detected: '
            f'{", ".join(matched_urgent[:3])}{"…" if len(matched_urgent) > 3 else ""}'
        )

    # Brand impersonation
    matched_brands = [b for b in IMPERSONATION_TARGETS if b in lower]
    if matched_brands:
        # Brand name alone isn't conclusive — only flag combined with urgency
        if matched_urgent:
            score += 0.20
            reasons.append(
                f'Brand impersonation combined with urgency: '
                f'{", ".join(matched_brands[:2])}'
            )
        else:
            score += 0.05

    # Excessive ALL-CAPS words (fear-mongering pattern)
    caps_words = re.findall(r'\b[A-Z]{4,}\b', text)
    unique_caps = set(w for w in caps_words if w not in ('HTTP', 'HTTPS', 'HTML', 'CSS', 'API'))
    if len(unique_caps) > 4:
        score += 0.10
        reasons.append(f'Excessive ALL-CAPS text detected ({len(unique_caps)} instances)')

    return (min(score, 1.0), reasons)


def content_text_analysis(text: str) -> tuple[float, list[str]]:
    """
    Analyse visible page text for phishing indicators.

    Uses the HuggingFace classifier if loaded; otherwise falls back
    to keyword heuristics. Always safe even when text is empty.

    Parameters
    ----------
    text : str  — visible body text (should be pre-truncated to ~5000 chars)

    Returns
    -------
    (score: float, reasons: list[str])
        score ∈ [0.0, 1.0]
    """
    if not text or not text.strip():
        return 0.0, []

    # Limit to first 2000 chars for NLP model speed (tokens ≈ 400–500)
    text_for_model = text[:2000]

    # ── HuggingFace classifier path ──────────────────────────────────────────
    if NLP_MODEL_AVAILABLE and _nlp_classifier is not None:
        try:
            result = _nlp_classifier(text_for_model)[0]
            label  = result['label'].upper()
            conf   = float(result['score'])

            # cybersectony model labels: "phishing" / "safe" (or similar)
            is_phishing = any(k in label for k in ('PHISH', 'MALICIOUS', '1', 'LABEL_1'))
            nlp_score   = conf if is_phishing else (1.0 - conf)

            reasons = []
            if nlp_score >= 0.70:
                reasons.append(f'NLP model flagged content as phishing (confidence {conf:.0%})')
            elif nlp_score >= 0.45:
                reasons.append(f'NLP model found suspicious content patterns (confidence {conf:.0%})')

            # Blend with keyword scorer for robustness
            kw_score, kw_reasons = _keyword_score(text)
            blended = 0.7 * nlp_score + 0.3 * kw_score
            return (min(blended, 1.0), reasons + kw_reasons)

        except Exception as exc:
            logger.warning('NLP inference failed, using keyword fallback: %s', exc)

    # ── Keyword heuristic fallback ────────────────────────────────────────────
    return _keyword_score(text)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 & 6 — Combine scores + explainability
# ─────────────────────────────────────────────────────────────────────────────

def combine_scores(
    url_score: float,
    url_features: dict,
    structural_score: float,
    structural_reasons: list[str],
    content_score: float,
    content_reasons: list[str],
) -> dict:
    """
    Weighted fusion of all three scores plus URL-derived reasons.

    final_score = 0.40 * url_score
                + 0.30 * structural_score
                + 0.30 * content_score

    Returns the full hybrid result dict ready for the API response.
    """
    final_score = (
        0.40 * url_score
        + 0.30 * structural_score
        + 0.30 * content_score
    )
    final_score = round(min(max(final_score, 0.0), 1.0), 4)

    reasons = []

    # ── URL-derived reasons ───────────────────────────────────────────────────
    if url_features.get('ip'):
        reasons.append('IP address used as hostname (suspicious)')
    if url_features.get('suspicious_tld'):
        reasons.append('Suspicious top-level domain detected')
    if url_features.get('shortening_service'):
        reasons.append('URL shortening service detected')
    if url_features.get('prefix_suffix'):
        reasons.append('Hyphen prefix/suffix pattern in domain')
    if url_features.get('https_token'):
        reasons.append('Missing HTTPS (plain HTTP connection)')
    if url_features.get('statistical_report') == 1:
        reasons.append('Domain found in statistical phishing reports')
    if float(url_features.get('phish_hints', 0)) >= 2:
        reasons.append(f'Multiple phishing-hint keywords in URL ({int(url_features["phish_hints"])})')
    if float(url_features.get('length_url', 0)) > 75:
        reasons.append(f'Unusually long URL ({int(url_features["length_url"])} chars)')
    if float(url_features.get('nb_hyphens', 0)) > 3:
        reasons.append(f'Excessive hyphens in URL ({int(url_features["nb_hyphens"])})')
    if url_score >= 0.70 and not reasons:
        reasons.append('URL model flagged as high-confidence phishing')

    # ── Structural + content reasons ─────────────────────────────────────────
    reasons.extend(structural_reasons)
    reasons.extend(content_reasons)

    # Determine label and status
    if final_score >= 0.70:
        label  = 'phishing'
        status = 'Phishing'
    elif final_score >= 0.40:
        label  = 'suspicious'
        status = 'Suspicious'
    else:
        label  = 'legitimate'
        status = 'Safe'

    return {
        'url_score':         round(url_score, 4),
        'structural_score':  round(structural_score, 4),
        'content_score':     round(content_score, 4),
        'final_score':       final_score,
        'risk_score':        final_score,          # kept for backward compat
        'risk_pct':          round(final_score * 100),
        'prediction':        1 if label == 'phishing' else 0,
        'label':             label,
        'status':            status,
        'reasons':           reasons if reasons else ['No strong phishing indicators detected'],
        'hybrid':            True,
        'nlp_model_used':    NLP_MODEL_AVAILABLE,
    }
