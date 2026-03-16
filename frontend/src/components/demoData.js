/**
 * demoData.js
 * -----------
 * Realistic seed data so the dashboard looks live on first load.
 * Each entry mirrors the shape produced by the /predict endpoint
 * plus the derived fields the UI adds (id, timestamp, status).
 */
import { getStatus } from './featureMeta.js'

const ago = (days, hours = 0, mins = 0) =>
  new Date(Date.now() - days * 86_400_000 - hours * 3_600_000 - mins * 60_000).toISOString()

const mk = (id, url, label, risk_score, ts, features) => ({
  id,
  url,
  label,
  risk_score,
  risk_pct: Math.round(risk_score * 100),
  status: getStatus(risk_score),
  timestamp: ts,
  features,
  isDemo: true,
})

export const DEMO_SCANS = [
  mk('d01', 'http://secure-paypal-verify.tk/account/login',       'phishing',   0.93, ago(6, 8),  { ip:0, https_token:1, prefix_suffix:1, shortening_service:0, suspicious_tld:1, statistical_report:0, length_url:50, length_hostname:28, nb_dots:2, nb_hyphens:2, nb_qm:0, nb_percent:0, nb_slash:4, nb_www:0, ratio_digits_url:0, ratio_digits_host:0, char_repeat:3, avg_words_raw:7.5, avg_word_host:9.3, avg_word_path:5.5, phish_hints:2 }),
  mk('d02', 'https://www.google.com',                              'legitimate', 0.07, ago(6, 7),  { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:0, statistical_report:0, length_url:22, length_hostname:14, nb_dots:2, nb_hyphens:0, nb_qm:0, nb_percent:0, nb_slash:2, nb_www:1, ratio_digits_url:0, ratio_digits_host:0, char_repeat:2, avg_words_raw:4.5, avg_word_host:4.5, avg_word_path:0,   phish_hints:0 }),
  mk('d03', 'http://192.168.10.5/admin/wp-login.php',              'phishing',   0.88, ago(5, 14), { ip:1, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:0, statistical_report:0, length_url:38, length_hostname:12, nb_dots:3, nb_hyphens:1, nb_qm:0, nb_percent:0, nb_slash:3, nb_www:0, ratio_digits_url:0.26, ratio_digits_host:0.83, char_repeat:1, avg_words_raw:5.0, avg_word_host:0,   avg_word_path:5.0, phish_hints:2 }),
  mk('d04', 'https://github.com/microsoft/vscode',                 'legitimate', 0.05, ago(5, 10), { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:0, statistical_report:0, length_url:36, length_hostname:10, nb_dots:1, nb_hyphens:0, nb_qm:0, nb_percent:0, nb_slash:3, nb_www:0, ratio_digits_url:0, ratio_digits_host:0, char_repeat:2, avg_words_raw:5.5, avg_word_host:5.5, avg_word_path:5.0, phish_hints:0 }),
  mk('d05', 'https://bit.ly/3xAbcDefG',                            'phishing',   0.76, ago(5, 6),  { ip:0, https_token:0, prefix_suffix:0, shortening_service:1, suspicious_tld:0, statistical_report:0, length_url:24, length_hostname:6,  nb_dots:1, nb_hyphens:0, nb_qm:0, nb_percent:0, nb_slash:2, nb_www:0, ratio_digits_url:0.08, ratio_digits_host:0, char_repeat:1, avg_words_raw:3.0, avg_word_host:3.0, avg_word_path:0,   phish_hints:0 }),
  mk('d06', 'https://stackoverflow.com/questions/12345',           'legitimate', 0.09, ago(4, 20), { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:0, statistical_report:0, length_url:45, length_hostname:17, nb_dots:1, nb_hyphens:0, nb_qm:0, nb_percent:0, nb_slash:3, nb_www:0, ratio_digits_url:0.11, ratio_digits_host:0, char_repeat:2,   avg_words_raw:7.0, avg_word_host:7.0, avg_word_path:5.0, phish_hints:0 }),
  mk('d07', 'http://login-netflix-account-verify.ml/suspend',      'phishing',   0.97, ago(4, 15), { ip:0, https_token:0, prefix_suffix:1, shortening_service:0, suspicious_tld:1, statistical_report:0, length_url:53, length_hostname:36, nb_dots:1, nb_hyphens:4, nb_qm:0, nb_percent:0, nb_slash:2, nb_www:0, ratio_digits_url:0, ratio_digits_host:0, char_repeat:4,   avg_words_raw:8.8, avg_word_host:10.5, avg_word_path:7.0, phish_hints:1 }),
  mk('d08', 'https://www.amazon.com/dp/B09GK7V8QN',                'legitimate', 0.12, ago(4, 9),  { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:0, statistical_report:0, length_url:40, length_hostname:14, nb_dots:2, nb_hyphens:0, nb_qm:0, nb_percent:0, nb_slash:3, nb_www:1, ratio_digits_url:0.18, ratio_digits_host:0, char_repeat:2,   avg_words_raw:4.7, avg_word_host:3.5, avg_word_path:4.0, phish_hints:0 }),
  mk('d09', 'https://accounts-google-signin.xyz/oauth/auth',       'phishing',   0.91, ago(3, 18), { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:1, statistical_report:0, length_url:48, length_hostname:30, nb_dots:2, nb_hyphens:2, nb_qm:0, nb_percent:0, nb_slash:3, nb_www:0, ratio_digits_url:0, ratio_digits_host:0, char_repeat:3,   avg_words_raw:7.0, avg_word_host:7.5, avg_word_path:4.5, phish_hints:0 }),
  mk('d10', 'https://stripe.com/docs/api/charges/create',          'legitimate', 0.06, ago(3, 12), { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:0, statistical_report:0, length_url:43, length_hostname:10, nb_dots:1, nb_hyphens:0, nb_qm:0, nb_percent:0, nb_slash:4, nb_www:0, ratio_digits_url:0, ratio_digits_host:0, char_repeat:2,   avg_words_raw:5.5, avg_word_host:5.0, avg_word_path:5.5, phish_hints:0 }),
  mk('d11', 'http://dropbox-file-share.click/download/invoice.exe','phishing',   0.95, ago(2, 22), { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:1, statistical_report:0, length_url:58, length_hostname:25, nb_dots:2, nb_hyphens:2, nb_qm:0, nb_percent:0, nb_slash:3, nb_www:0, ratio_digits_url:0, ratio_digits_host:0, char_repeat:3,   avg_words_raw:7.2, avg_word_host:8.3, avg_word_path:7.0, phish_hints:2 }),
  mk('d12', 'https://notion.so/workspace/team-docs',               'legitimate', 0.08, ago(2, 14), { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:0, statistical_report:0, length_url:38, length_hostname:9,  nb_dots:1, nb_hyphens:1, nb_qm:0, nb_percent:0, nb_slash:3, nb_www:0, ratio_digits_url:0, ratio_digits_host:0, char_repeat:1,   avg_words_raw:5.0, avg_word_host:6.0, avg_word_path:4.5, phish_hints:0 }),
  mk('d13', 'http://microsoft-office365-cloud.work/signin/auth',   'phishing',   0.89, ago(2, 8),  { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:1, statistical_report:0, length_url:54, length_hostname:34, nb_dots:2, nb_hyphens:3, nb_qm:0, nb_percent:0, nb_slash:3, nb_www:0, ratio_digits_url:0, ratio_digits_host:0, char_repeat:3,   avg_words_raw:8.5, avg_word_host:9.5, avg_word_path:4.5, phish_hints:1 }),
  mk('d14', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',         'legitimate', 0.10, ago(1, 20), { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:0, statistical_report:0, length_url:43, length_hostname:15, nb_dots:2, nb_hyphens:0, nb_qm:1, nb_percent:0, nb_slash:2, nb_www:1, ratio_digits_url:0.12, ratio_digits_host:0, char_repeat:2,   avg_words_raw:4.3, avg_word_host:3.5, avg_word_path:5.0, phish_hints:0 }),
  mk('d15', 'https://tax-refund-irs-gov.xyz/claim?id=98765',       'phishing',   0.96, ago(1, 14), { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:1, statistical_report:0, length_url:52, length_hostname:26, nb_dots:3, nb_hyphens:3, nb_qm:1, nb_percent:0, nb_slash:2, nb_www:0, ratio_digits_url:0.1, ratio_digits_host:0, char_repeat:3,   avg_words_raw:6.5, avg_word_host:6.5, avg_word_path:5.5, phish_hints:0 }),
  mk('d16', 'https://cloudflare.com/learning/security/phishing',   'legitimate', 0.04, ago(1, 8),  { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:0, statistical_report:0, length_url:51, length_hostname:15, nb_dots:1, nb_hyphens:0, nb_qm:0, nb_percent:0, nb_slash:4, nb_www:0, ratio_digits_url:0, ratio_digits_host:0, char_repeat:2,   avg_words_raw:6.0, avg_word_host:5.5, avg_word_path:6.5, phish_hints:1 }),
  mk('d17', 'http://update-your-bank-details.ml/transfer',         'phishing',   0.98, ago(0, 6),  { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:1, statistical_report:0, length_url:47, length_hostname:31, nb_dots:1, nb_hyphens:5, nb_qm:0, nb_percent:0, nb_slash:2, nb_www:0, ratio_digits_url:0, ratio_digits_host:0, char_repeat:4,   avg_words_raw:9.3, avg_word_host:10.3, avg_word_path:8.0, phish_hints:0 }),
  mk('d18', 'https://developer.mozilla.org/en-US/docs/Web',        'legitimate', 0.05, ago(0, 3),  { ip:0, https_token:0, prefix_suffix:0, shortening_service:0, suspicious_tld:0, statistical_report:0, length_url:44, length_hostname:21, nb_dots:2, nb_hyphens:1, nb_qm:0, nb_percent:0, nb_slash:5, nb_www:0, ratio_digits_url:0, ratio_digits_host:0, char_repeat:2,   avg_words_raw:5.5, avg_word_host:4.5, avg_word_path:3.0, phish_hints:0 }),
]
