"""
backend/feature_extraction.py
------------------------------
Self-contained feature extraction for a single URL.

IMPORTANT: The feature order here MUST match the column order that was
present in the training DataFrame when the model was fitted.

Feature order (21 total):
    Structural (6):  ip, https_token, prefix_suffix, shortening_service,
                     suspicious_tld, statistical_report
    Statistical (15): length_url, length_hostname, nb_dots, nb_hyphens,
                      nb_qm, nb_percent, nb_slash, nb_www,
                      ratio_digits_url, ratio_digits_host,
                      char_repeat, avg_words_raw, avg_word_host,
                      avg_word_path, phish_hints
"""

import re
import socket
import urllib.parse
from urllib.parse import urlparse

import numpy as np
import pandas as pd
import tldextract

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
PHISH_HINTS = [
    'wp', 'login', 'includes', 'admin', 'content', 'site', 'images',
    'js', 'alibaba', 'css', 'myaccount', 'dropbox', 'themes', 'plugins',
    'signin', 'view',
]

SHORTENING_SERVICES = re.compile(
    r'bit\.ly|goo\.gl|shorte\.st|go2l\.ink|x\.co|ow\.ly|t\.co|tinyurl|'
    r'tr\.im|is\.gd|cli\.gs|yfrog\.com|migre\.me|ff\.im|tiny\.cc|url4\.eu|'
    r'twit\.ac|su\.pr|twurl\.nl|snipurl\.com|short\.to|BudURL\.com|ping\.fm|'
    r'post\.ly|Just\.as|bkite\.com|snipr\.com|fic\.kr|loopt\.us|doiop\.com|'
    r'short\.ie|kl\.am|wp\.me|rubyurl\.com|om\.ly|to\.ly|bit\.do|lnkd\.in|'
    r'db\.tt|qr\.ae|adf\.ly|bitly\.com|cur\.lv|tinyurl\.com|ity\.im|q\.gs|'
    r'po\.st|bc\.vc|twitthis\.com|u\.to|j\.mp|buzurl\.com|cutt\.us|u\.bb|'
    r'yourls\.org|prettylinkpro\.com|scrnch\.me|filoops\.info|vzturl\.com|'
    r'qr\.net|1url\.com|tweez\.me|v\.gd|link\.zip\.net'
)

SUSPICIOUS_TLDS = {
    'fit', 'tk', 'gp', 'ga', 'work', 'ml', 'date', 'wang', 'men', 'icu',
    'online', 'click', 'country', 'stream', 'download', 'xin', 'racing',
    'jetzt', 'ren', 'mom', 'party', 'review', 'trade', 'accountants',
    'science', 'ninja', 'xyz', 'faith', 'zip', 'cricket', 'win',
    'accountant', 'realtor', 'top', 'christmas', 'gdn', 'link', 'asia',
    'club', 'la', 'ae', 'exposed', 'pe', 'audio', 'website', 'bj', 'mx',
    'media',
}

STATISTICAL_REPORT_URLS = re.compile(
    r'at\.ua|usa\.cc|baltazarpresentes\.com\.br|pe\.hu|esy\.es|hol\.es|'
    r'sweddy\.com|myjino\.ru|96\.lt|ow\.ly'
)

STATISTICAL_REPORT_IPS = re.compile(
    r'146\.112\.61\.108|213\.174\.157\.151|121\.50\.168\.88|192\.185\.217\.116|'
    r'78\.46\.211\.158|181\.174\.165\.13|46\.242\.145\.103|121\.50\.168\.40|'
    r'83\.125\.22\.219|46\.242\.145\.98|107\.151\.148\.44|107\.151\.148\.107|'
    r'64\.70\.19\.203|199\.184\.144\.27|107\.151\.148\.108|107\.151\.148\.109|'
    r'119\.28\.52\.61|54\.83\.43\.69|52\.69\.166\.231|216\.58\.192\.225|'
    r'118\.184\.25\.86|67\.208\.74\.71|23\.253\.126\.58|104\.239\.157\.210|'
    r'175\.126\.123\.219|141\.8\.224\.221|10\.10\.10\.10|43\.229\.108\.32|'
    r'103\.232\.215\.140|69\.172\.201\.153|216\.218\.185\.162|54\.225\.104\.146|'
    r'103\.243\.24\.98|199\.59\.243\.120|31\.170\.160\.61|213\.19\.128\.77|'
    r'62\.113\.226\.131|208\.100\.26\.234|195\.16\.127\.102|195\.16\.127\.157|'
    r'34\.196\.13\.28|103\.224\.212\.222|172\.217\.4\.225|54\.72\.9\.51|'
    r'192\.64\.147\.141|198\.200\.56\.183|23\.253\.164\.103|52\.48\.191\.26|'
    r'52\.214\.197\.72|87\.98\.255\.18|209\.99\.17\.27|216\.38\.62\.18|'
    r'104\.130\.124\.96|47\.89\.58\.141|78\.46\.211\.158|54\.86\.225\.156|'
    r'54\.82\.156\.19|37\.157\.192\.102|204\.11\.56\.48|110\.34\.231\.42'
)


# ---------------------------------------------------------------------------
# Feature order — MUST stay in sync with training column order
# ---------------------------------------------------------------------------
FEATURE_NAMES = [
    # structural
    'ip', 'https_token', 'prefix_suffix', 'shortening_service',
    'suspicious_tld', 'statistical_report',
    # statistical
    'length_url', 'length_hostname', 'nb_dots', 'nb_hyphens',
    'nb_qm', 'nb_percent', 'nb_slash', 'nb_www',
    'ratio_digits_url', 'ratio_digits_host',
    'char_repeat', 'avg_words_raw', 'avg_word_host', 'avg_word_path',
    'phish_hints',
]


# ---------------------------------------------------------------------------
# Individual feature functions (pure — no side effects, no I/O except
# statistical_report which does a DNS lookup)
# ---------------------------------------------------------------------------

def _having_ip(url: str) -> int:
    match = re.search(
        r'(([01]?\d\d?|2[0-4]\d|25[0-5])\.){3}([01]?\d\d?|2[0-4]\d|25[0-5])\/|'
        r'(0x[0-9a-fA-F]{1,2}\.){3}0x[0-9a-fA-F]{1,2}\/|'
        r'(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}|[0-9a-fA-F]{7}',
        url,
    )
    return 1 if match else 0


def _https_token(scheme: str) -> int:
    return 0 if scheme == 'https' else 1


def _prefix_suffix(url: str) -> int:
    return 1 if re.findall(r'https?://[^\-]+-[^\-]+/', url) else 0


def _shortening_service(url: str) -> int:
    return 1 if SHORTENING_SERVICES.search(url) else 0


def _suspicious_tld(tld: str) -> int:
    return 1 if tld in SUSPICIOUS_TLDS else 0


def _statistical_report(url: str, domain: str) -> int:
    if STATISTICAL_REPORT_URLS.search(url):
        return 1
    try:
        ip = socket.gethostbyname(domain)
        return 1 if STATISTICAL_REPORT_IPS.search(ip) else 0
    except Exception:
        return 2


def _ratio_digits(s: str) -> float:
    if not s:
        return 0.0
    return len(re.sub(r'[^0-9]', '', s)) / len(s)


def _char_repeat(words: list) -> int:
    def all_same(items):
        return all(x == items[0] for x in items)

    repeat = {2: 0, 3: 0, 4: 0, 5: 0}
    for word in words:
        for n in (2, 3, 4, 5):
            for i in range(len(word) - n + 1):
                if all_same(word[i: i + n]):
                    repeat[n] += 1
    return sum(repeat.values())


def _avg_word_length(words: list) -> float:
    if not words:
        return 0.0
    return sum(len(w) for w in words) / len(words)


def _count_www(words: list) -> int:
    return sum(1 for w in words if 'www' in w)


def _phish_hints(url: str) -> int:
    return sum(url.lower().count(hint) for hint in PHISH_HINTS)


def _words_raw(domain: str, subdomain: str, path: str):
    split = r'[-./?\=@&%:_]'
    w_domain    = [w for w in re.split(split, domain.lower())    if w]
    w_subdomain = [w for w in re.split(split, subdomain.lower()) if w]
    w_path      = [w for w in re.split(split, path.lower())      if w]
    return w_domain + w_path + w_subdomain, w_domain + w_subdomain, w_path


# ---------------------------------------------------------------------------
# Main public function
# ---------------------------------------------------------------------------

def extract_features(url: str) -> "pd.DataFrame":
    """
    Extract features from a single URL string.

    Returns
    -------
    pd.DataFrame of shape (1, 21)
        Columns follow the exact order in FEATURE_NAMES.
    """
    parsed          = urlparse(url)
    scheme          = parsed.scheme
    hostname        = parsed.hostname or ''
    ext             = tldextract.extract(url)
    domain_str      = f'{ext.domain}.{ext.suffix}' if ext.suffix else ext.domain
    subdomain       = ext.subdomain
    tld             = ext.suffix

    # Reconstruct path the same way as training code
    suffix_pos = url.find(ext.suffix)
    tmp        = url[suffix_pos:] if suffix_pos != -1 else ''
    pth_parts  = tmp.partition('/')
    path       = pth_parts[1] + pth_parts[2]

    words_raw, words_host, words_path = _words_raw(ext.domain, subdomain, pth_parts[2])

    features = [
        # ── Structural ──────────────────────────────────────────────────────
        _having_ip(url),                                    # ip
        _https_token(scheme),                               # https_token
        _prefix_suffix(url),                                # prefix_suffix
        _shortening_service(url),                           # shortening_service
        _suspicious_tld(tld),                               # suspicious_tld
        _statistical_report(url, domain_str),               # statistical_report

        # ── Statistical ─────────────────────────────────────────────────────
        float(len(url)),                                    # length_url
        float(len(hostname)),                               # length_hostname
        float(url.count('.')),                              # nb_dots
        float(url.count('-')),                              # nb_hyphens
        float(url.count('?')),                              # nb_qm
        float(url.count('%')),                              # nb_percent
        float(url.count('/')),                              # nb_slash
        float(_count_www(words_raw)),                       # nb_www
        _ratio_digits(url),                                 # ratio_digits_url
        _ratio_digits(hostname),                            # ratio_digits_host
        float(_char_repeat(words_raw)),                     # char_repeat
        _avg_word_length(words_raw),                        # avg_words_raw
        _avg_word_length(words_host),                       # avg_word_host
        _avg_word_length(words_path),                       # avg_word_path
        float(_phish_hints(url)),                           # phish_hints
    ]

    return pd.DataFrame([features], columns=FEATURE_NAMES)
