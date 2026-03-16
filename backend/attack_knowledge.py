"""
attack_knowledge.py
--------------------
Static knowledge base mapping all 21 URL features to:
  - Plain-language explanation
  - Risk description
  - Possible attack types
  - Severity level (Low / Medium / High)

Includes build_security_analysis() which, given a feature dict,
returns a list of triggered feature advisory entries.
"""

# ── Full knowledge base for all 21 features ───────────────────────────────
ATTACK_KNOWLEDGE_BASE = {
    # ── Structural (binary) features ──────────────────────────────────────
    'ip': {
        'explanation': 'The URL uses a raw IP address (like 192.168.1.1) instead of a domain name.',
        'risk': 'Real websites almost never use raw IP addresses. Attackers use IPs to avoid domain blacklists and hide their identity.',
        'possible_attacks': [
            'Phishing redirection',
            'Man-in-the-Middle attack',
            'Malware injection',
            'Botnet hosting',
        ],
        'severity': 'High',
    },
    'https_token': {
        'explanation': 'The website uses HTTP instead of HTTPS — meaning the connection is NOT encrypted.',
        'risk': 'Everything you type on this site (passwords, card numbers) is sent in plain text. Anyone on the same network can intercept it.',
        'possible_attacks': [
            'Man-in-the-Middle attack',
            'Session hijacking',
            'Data interception',
            'Credential theft',
        ],
        'severity': 'High',
    },
    'prefix_suffix': {
        'explanation': 'The domain name contains a hyphen (e.g. paypal-login.com, secure-bank.net).',
        'risk': 'Attackers add hyphens to make fake domains look similar to real brands and trick users into trusting them.',
        'possible_attacks': [
            'Brand impersonation',
            'Fake login portal',
            'Social engineering attack',
            'Credential theft',
        ],
        'severity': 'Medium',
    },
    'shortening_service': {
        'explanation': 'The URL uses a link shortener like bit.ly, tinyurl, or similar services.',
        'risk': 'Shortened links completely hide the real destination. You cannot know where you are being sent before clicking.',
        'possible_attacks': [
            'Phishing redirection',
            'Hidden redirect attack',
            'Malware injection',
            'Drive-by download',
        ],
        'severity': 'High',
    },
    'suspicious_tld': {
        'explanation': 'The website uses a top-level domain (TLD) commonly associated with phishing attacks (e.g. .tk, .ml, .xyz, .win, .click).',
        'risk': 'Many free or very cheap TLDs are heavily abused by attackers because they require no identity verification and cost almost nothing.',
        'possible_attacks': [
            'Scam landing page',
            'Phishing redirection',
            'Fake login portal',
            'Malicious redirection',
        ],
        'severity': 'High',
    },
    'statistical_report': {
        'explanation': 'The domain or IP address has been previously flagged in security threat intelligence databases.',
        'risk': 'This URL has a documented history of hosting malicious or deceptive content according to threat databases.',
        'possible_attacks': [
            'Known phishing campaign',
            'Malware distribution',
            'Botnet hosting',
            'Drive-by download',
        ],
        'severity': 'High',
    },

    # ── Statistical features ───────────────────────────────────────────────
    'length_url': {
        'explanation': 'The URL is unusually long compared to normal websites.',
        'risk': 'Attackers make URLs very long to hide the real destination, overflow browser displays, and confuse security scanners.',
        'possible_attacks': [
            'URL obfuscation',
            'Obfuscation attack',
            'Hidden redirect attack',
            'Phishing redirection',
        ],
        'severity': 'Medium',
    },
    'length_hostname': {
        'explanation': 'The domain/hostname part of the URL is very long.',
        'risk': 'Long hostnames are used to embed fake brand names (like "paypal.secure-login.com") to fool users into thinking they are on a real site.',
        'possible_attacks': [
            'Brand impersonation',
            'URL obfuscation',
            'Social engineering attack',
            'Fake login portal',
        ],
        'severity': 'Medium',
    },
    'nb_dots': {
        'explanation': 'The URL contains an unusually large number of dots (.).',
        'risk': 'More dots mean more subdomains. Attackers stack subdomains like "apple.paypal.secure.login.evil.com" to make fake sites look real.',
        'possible_attacks': [
            'Subdomain spoofing',
            'Brand impersonation',
            'DNS spoofing',
            'Phishing redirection',
        ],
        'severity': 'Medium',
    },
    'nb_hyphens': {
        'explanation': 'The URL contains many hyphens (-).',
        'risk': 'Multiple hyphens are used as visual tricks to make fake domains look like real brand names at a quick glance.',
        'possible_attacks': [
            'Brand impersonation',
            'Social engineering attack',
            'Fake login portal',
            'Credential theft',
        ],
        'severity': 'Medium',
    },
    'nb_qm': {
        'explanation': 'The URL contains multiple question marks (query parameters).',
        'risk': 'Multiple query parameters can pass hidden tracking data, redirect targets, or session tokens that attackers can steal.',
        'possible_attacks': [
            'URL obfuscation',
            'Token theft',
            'Session hijacking',
            'Phishing redirection',
        ],
        'severity': 'Low',
    },
    'nb_percent': {
        'explanation': 'The URL contains percent-encoded characters (%) used to hide its true content.',
        'risk': 'Percent encoding can disguise malicious characters, bypass URL filters, or hide the real destination of a redirect.',
        'possible_attacks': [
            'URL obfuscation',
            'Obfuscation attack',
            'Hidden redirect attack',
            'Malicious redirection',
        ],
        'severity': 'Medium',
    },
    'nb_slash': {
        'explanation': 'The URL has an unusually high number of forward slashes, making it very deeply nested.',
        'risk': 'Deeply nested paths are often a sign of obfuscation designed to hide the real file or destination being accessed.',
        'possible_attacks': [
            'URL obfuscation',
            'Phishing redirection',
            'Hidden redirect attack',
            'Drive-by download',
        ],
        'severity': 'Low',
    },
    'nb_www': {
        'explanation': 'The URL contains more than one occurrence of "www".',
        'risk': 'Real websites only have "www" once. Duplicating it is a known trick to make fake sites look like legitimate www domains.',
        'possible_attacks': [
            'Brand impersonation',
            'URL obfuscation',
            'Fake login portal',
            'Social engineering attack',
        ],
        'severity': 'Medium',
    },
    'ratio_digits_url': {
        'explanation': 'A large portion of the URL consists of numbers.',
        'risk': 'Randomly generated or machine-created phishing URLs tend to have lots of numbers to avoid pattern-based detection systems.',
        'possible_attacks': [
            'URL obfuscation',
            'Obfuscation attack',
            'Phishing redirection',
            'Malware injection',
        ],
        'severity': 'Medium',
    },
    'ratio_digits_host': {
        'explanation': 'The hostname itself contains too many numeric digits.',
        'risk': 'IP-like or randomly generated hostnames with many numbers are used by attackers to avoid domain-name blacklists.',
        'possible_attacks': [
            'URL obfuscation',
            'Phishing redirection',
            'Botnet hosting',
            'DNS spoofing',
        ],
        'severity': 'Medium',
    },
    'char_repeat': {
        'explanation': 'The URL contains repeated character sequences (e.g. "aaaa", "xxxxx").',
        'risk': 'Attackers use repeated characters to pad URLs, confuse automated scanners, or fill space in obfuscated fake addresses.',
        'possible_attacks': [
            'Obfuscation attack',
            'URL obfuscation',
            'Social engineering attack',
            'Malicious redirection',
        ],
        'severity': 'Low',
    },
    'avg_words_raw': {
        'explanation': 'The average length of words in the full URL is unusually short.',
        'risk': 'Machine-generated phishing domains often use very short or meaningless word fragments that are hard to read or remember.',
        'possible_attacks': [
            'Phishing redirection',
            'Scam landing page',
            'Brand impersonation',
            'Social engineering attack',
        ],
        'severity': 'Low',
    },
    'avg_word_host': {
        'explanation': 'The average length of words in the hostname is unusually short.',
        'risk': 'Randomly generated phishing domains typically have very short, meaningless hostname segments.',
        'possible_attacks': [
            'Brand impersonation',
            'Fake login portal',
            'Phishing redirection',
            'Social engineering attack',
        ],
        'severity': 'Low',
    },
    'avg_word_path': {
        'explanation': 'The average length of words in the URL path is very short.',
        'risk': 'Short URL path words suggest machine-generated or auto-created phishing pages used in large-scale automated attacks.',
        'possible_attacks': [
            'Phishing redirection',
            'Scam landing page',
            'Malicious redirection',
            'Drive-by download',
        ],
        'severity': 'Low',
    },
    'phish_hints': {
        'explanation': 'The URL contains phishing keywords like "login", "verify", "secure", "admin", "account", "update".',
        'risk': 'Attackers deliberately use these words to make fake pages look like official login or account management pages of real brands.',
        'possible_attacks': [
            'Credential theft',
            'Account takeover',
            'Fake login portal',
            'Social engineering attack',
        ],
        'severity': 'High',
    },
}

# ── Thresholds — when a statistical feature is "triggered" ────────────────
# For most: triggered when value EXCEEDS threshold
# For avg_word_* features: triggered when value is BELOW threshold (short = bad)
FEATURE_THRESHOLDS = {
    'length_url':         75,
    'length_hostname':    25,
    'nb_dots':             4,
    'nb_hyphens':          3,
    'nb_qm':               1,
    'nb_percent':          2,
    'nb_slash':            6,
    'nb_www':              1,
    'ratio_digits_url':  0.15,
    'ratio_digits_host': 0.10,
    'char_repeat':         0,   # any repeat is suspicious
    'avg_words_raw':       4.0, # triggered if BELOW this
    'avg_word_host':       5.0, # triggered if BELOW this
    'avg_word_path':       3.0, # triggered if BELOW this
    'phish_hints':         0,   # any hint is suspicious (value > 0)
}

# Features where "below threshold" = triggered
BELOW_THRESHOLD_FEATURES = {'avg_words_raw', 'avg_word_host', 'avg_word_path'}

# Binary structural features (triggered when value > 0)
STRUCTURAL_BINARY = {
    'ip', 'https_token', 'prefix_suffix',
    'shortening_service', 'suspicious_tld', 'statistical_report',
}

SEVERITY_ORDER = {'High': 3, 'Medium': 2, 'Low': 1}


def build_security_analysis(feature_dict: dict) -> list:
    """
    Given a dict of {feature_name: numeric_value}, return a list of
    advisory entries for every triggered feature, sorted High → Low severity.

    Each entry:
    {
        'feature':          str,
        'explanation':      str,
        'risk':             str,
        'possible_attacks': list[str],
        'severity':         'High' | 'Medium' | 'Low',
    }
    """
    triggered = []

    for feature, value in feature_dict.items():
        kb = ATTACK_KNOWLEDGE_BASE.get(feature)
        if not kb:
            continue

        is_triggered = False

        if feature in STRUCTURAL_BINARY:
            is_triggered = float(value) > 0
        else:
            threshold = FEATURE_THRESHOLDS.get(feature)
            if threshold is not None:
                if feature in BELOW_THRESHOLD_FEATURES:
                    # triggered only when value is positive AND below the threshold
                    is_triggered = float(value) > 0 and float(value) < threshold
                else:
                    is_triggered = float(value) > threshold

        if is_triggered:
            triggered.append({
                'feature':          feature,
                'explanation':      kb['explanation'],
                'risk':             kb['risk'],
                'possible_attacks': kb['possible_attacks'],
                'severity':         kb['severity'],
            })

    # Sort: High → Medium → Low
    triggered.sort(key=lambda x: SEVERITY_ORDER.get(x['severity'], 0), reverse=True)
    return triggered


def get_risk_level(final_score: float) -> str:
    """Convert a 0-1 score to a human-readable risk level."""
    if final_score >= 0.70:
        return 'High'
    if final_score >= 0.40:
        return 'Medium'
    return 'Low'


def get_highest_severity(security_analysis: list) -> str:
    """Return the highest severity found in a security_analysis list."""
    if not security_analysis:
        return 'None'
    return max(security_analysis, key=lambda x: SEVERITY_ORDER.get(x['severity'], 0))['severity']
