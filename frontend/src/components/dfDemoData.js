/**
 * dfDemoData.js
 * -------------
 * Realistic seed data for the Deepfake Detective tab so the dashboard
 * looks populated on first load. Each entry mirrors the shape produced
 * by the /analyze endpoint from the deepfake backend (port 5002).
 */

const ago = (days, hours = 0, mins = 0) =>
  new Date(Date.now() - days * 86_400_000 - hours * 3_600_000 - mins * 60_000).toISOString()

const mk = (id, filename, file_type, final_score, ts, opts = {}) => {
  const risk_pct = Math.round(final_score * 100)
  const verdict = final_score >= 0.65 ? 'Deepfake' : final_score >= 0.35 ? 'Uncertain' : 'Real'

  return {
    id,
    filename,
    file_type,
    timestamp: ts,
    final_score: Math.round(final_score * 10000) / 10000,
    risk_pct,
    verdict,
    status: verdict,
    confidence: opts.confidence || `${risk_pct}% +/- ${Math.floor(Math.random() * 8 + 2)}%`,
    video_analysis: opts.video_analysis || null,
    audio_analysis: opts.audio_analysis || null,
    explanations: opts.explanations || [],
    fusion_alpha: opts.fusion_alpha ?? 0.6,
    fusion_beta: opts.fusion_beta ?? 0.4,
    isDemo: true,
  }
}

export const DEMO_DF_SCANS = [
  mk('df01', 'interview_clip_modified.mp4', 'video', 0.89, ago(6, 10), {
    confidence: '89% +/- 4%',
    video_analysis: {
      frame_count: 48,
      mc_mean: 0.89,
      mc_std: 0.04,
      faces_detected: true,
      mean_score: 0.87,
      max_score: 0.93,
    },
    audio_analysis: {
      combined_score: 0.72,
      anomalies: {
        pitch_stability: { detected: true, severity: 'High', explanation: 'Abnormal pitch stability detected — synthetic voice pattern' },
        spectral_flatness: { detected: true, severity: 'Medium', explanation: 'Spectral flatness exceeds natural speech thresholds' },
        breath_patterns: { detected: false, severity: 'OK', explanation: 'Breath patterns within normal range' },
        frequency_cutoff: { detected: false, severity: 'OK', explanation: 'Frequency response appears natural' },
      },
      triggered_count: 2,
      total_checks: 4,
    },
    explanations: [
      'Fused video (89%) and audio (72%) with weights 0.6/0.4',
      'Video model detected manipulation with 89% confidence (+/-4%)',
      'Face manipulation artifacts detected in facial region',
      'Abnormal pitch stability detected — synthetic voice pattern',
    ],
  }),

  mk('df02', 'press_conference_2024.mp4', 'video', 0.12, ago(6, 5), {
    confidence: '12% +/- 3%',
    video_analysis: {
      frame_count: 72,
      mc_mean: 0.12,
      mc_std: 0.03,
      faces_detected: true,
      mean_score: 0.11,
      max_score: 0.18,
    },
    explanations: ['Video-only analysis (no audio track found)', 'Video frames appear authentic'],
  }),

  mk('df03', 'suspicious_voicemail.wav', 'audio', 0.78, ago(5, 14), {
    confidence: '78% +/- 5%',
    fusion_alpha: 0,
    fusion_beta: 1,
    audio_analysis: {
      combined_score: 0.78,
      mean_score: 0.78,
      std_score: 0.05,
      anomalies: {
        pitch_stability: { detected: true, severity: 'High', explanation: 'Pitch stability patterns consistent with TTS systems' },
        breath_patterns: { detected: true, severity: 'High', explanation: 'Missing natural breathing patterns between phrases' },
        spectral_flatness: { detected: false, severity: 'OK', explanation: 'Spectral characteristics within bounds' },
        frequency_cutoff: { detected: true, severity: 'Medium', explanation: 'Sharp frequency cutoff at 8kHz suggests limited bandwidth synthesis' },
      },
      triggered_count: 3,
      total_checks: 4,
    },
    explanations: [
      'Audio-only analysis',
      'Pitch stability patterns consistent with TTS systems',
      'Missing natural breathing patterns between phrases',
      'Sharp frequency cutoff at 8kHz suggests limited bandwidth synthesis',
    ],
  }),

  mk('df04', 'family_reunion_video.mp4', 'video', 0.08, ago(5, 8), {
    confidence: '8% +/- 2%',
    video_analysis: {
      frame_count: 120,
      mc_mean: 0.08,
      mc_std: 0.02,
      faces_detected: true,
      mean_score: 0.07,
      max_score: 0.12,
    },
    audio_analysis: {
      combined_score: 0.05,
      anomalies: {
        pitch_stability: { detected: false, severity: 'OK', explanation: 'Natural pitch variation detected' },
        breath_patterns: { detected: false, severity: 'OK', explanation: 'Normal breathing pattern' },
        spectral_flatness: { detected: false, severity: 'OK', explanation: 'Natural spectral distribution' },
        frequency_cutoff: { detected: false, severity: 'OK', explanation: 'Full frequency range present' },
      },
      triggered_count: 0,
      total_checks: 4,
    },
    explanations: [
      'Fused video (8%) and audio (5%) with weights 0.6/0.4',
      'Video frames appear authentic',
    ],
  }),

  mk('df05', 'ceo_deepfake_scam.mp4', 'video', 0.95, ago(4, 18), {
    confidence: '95% +/- 3%',
    video_analysis: {
      frame_count: 36,
      mc_mean: 0.95,
      mc_std: 0.03,
      faces_detected: true,
      mean_score: 0.94,
      max_score: 0.97,
    },
    audio_analysis: {
      combined_score: 0.82,
      anomalies: {
        pitch_stability: { detected: true, severity: 'High', explanation: 'Synthetic pitch pattern with unnatural consistency' },
        breath_patterns: { detected: true, severity: 'High', explanation: 'No natural breathing artifacts detected' },
        spectral_flatness: { detected: true, severity: 'Medium', explanation: 'Flat spectral profile typical of voice cloning' },
        frequency_cutoff: { detected: true, severity: 'High', explanation: 'Abrupt frequency cutoff at 7.5kHz — synthesis artifact' },
      },
      triggered_count: 4,
      total_checks: 4,
    },
    explanations: [
      'Fused video (95%) and audio (82%) with weights 0.6/0.4',
      'Video model detected manipulation with 95% confidence (+/-3%)',
      'Face manipulation artifacts detected in facial region',
      'Synthetic pitch pattern with unnatural consistency',
      'No natural breathing artifacts detected',
    ],
  }),

  mk('df06', 'podcast_episode_42.mp3', 'audio', 0.15, ago(3, 11), {
    confidence: '15% +/- 4%',
    fusion_alpha: 0,
    fusion_beta: 1,
    audio_analysis: {
      combined_score: 0.15,
      mean_score: 0.15,
      std_score: 0.04,
      anomalies: {
        pitch_stability: { detected: false, severity: 'OK', explanation: 'Natural pitch variation' },
        breath_patterns: { detected: false, severity: 'OK', explanation: 'Normal breathing patterns present' },
        spectral_flatness: { detected: false, severity: 'OK', explanation: 'Natural spectral distribution' },
        frequency_cutoff: { detected: false, severity: 'OK', explanation: 'Wide frequency range present' },
      },
      triggered_count: 0,
      total_checks: 4,
    },
    explanations: ['Audio-only analysis', 'Audio appears authentic with natural speech patterns'],
  }),

  mk('df07', 'tiktok_faceswap_viral.mp4', 'video', 0.91, ago(2, 20), {
    confidence: '91% +/- 3%',
    video_analysis: {
      frame_count: 60,
      mc_mean: 0.91,
      mc_std: 0.03,
      faces_detected: true,
      mean_score: 0.90,
      max_score: 0.95,
    },
    explanations: [
      'Video-only analysis (no audio track found)',
      'Video model detected manipulation with 91% confidence (+/-3%)',
      'Face manipulation artifacts detected in facial region',
    ],
  }),

  mk('df08', 'wedding_toast_recording.wav', 'audio', 0.22, ago(2, 8), {
    confidence: '22% +/- 6%',
    fusion_alpha: 0,
    fusion_beta: 1,
    audio_analysis: {
      combined_score: 0.22,
      mean_score: 0.22,
      std_score: 0.06,
      anomalies: {
        pitch_stability: { detected: false, severity: 'OK', explanation: 'Natural pitch variation detected' },
        breath_patterns: { detected: false, severity: 'OK', explanation: 'Normal breathing artifacts present' },
        spectral_flatness: { detected: false, severity: 'OK', explanation: 'Spectral distribution within norms' },
        frequency_cutoff: { detected: false, severity: 'OK', explanation: 'Natural frequency response' },
      },
      triggered_count: 0,
      total_checks: 4,
    },
    explanations: ['Audio-only analysis', 'Audio characteristics consistent with authentic recording'],
  }),

  mk('df09', 'political_ad_suspect.mp4', 'video', 0.48, ago(1, 15), {
    confidence: '48% +/- 8%',
    video_analysis: {
      frame_count: 90,
      mc_mean: 0.52,
      mc_std: 0.08,
      faces_detected: true,
      mean_score: 0.50,
      max_score: 0.61,
    },
    audio_analysis: {
      combined_score: 0.41,
      anomalies: {
        pitch_stability: { detected: false, severity: 'OK', explanation: 'Pitch patterns inconclusive' },
        breath_patterns: { detected: false, severity: 'OK', explanation: 'Breathing patterns present but sparse' },
        spectral_flatness: { detected: true, severity: 'Medium', explanation: 'Spectral flatness slightly above threshold' },
        frequency_cutoff: { detected: false, severity: 'OK', explanation: 'Frequency range appears complete' },
      },
      triggered_count: 1,
      total_checks: 4,
    },
    explanations: [
      'Fused video (52%) and audio (41%) with weights 0.6/0.4',
      'Inconclusive — manual review recommended',
      'Spectral flatness slightly above threshold',
    ],
  }),

  mk('df10', 'ai_generated_voice_ad.mp3', 'audio', 0.85, ago(0, 6), {
    confidence: '85% +/- 4%',
    fusion_alpha: 0,
    fusion_beta: 1,
    audio_analysis: {
      combined_score: 0.85,
      mean_score: 0.85,
      std_score: 0.04,
      anomalies: {
        pitch_stability: { detected: true, severity: 'High', explanation: 'Pitch remains unnaturally steady across phrases' },
        breath_patterns: { detected: true, severity: 'High', explanation: 'Complete absence of natural breathing artifacts' },
        spectral_flatness: { detected: true, severity: 'Medium', explanation: 'Spectral profile consistent with neural TTS' },
        frequency_cutoff: { detected: false, severity: 'OK', explanation: 'Frequency response within normal bounds' },
      },
      triggered_count: 3,
      total_checks: 4,
    },
    explanations: [
      'Audio-only analysis',
      'Pitch remains unnaturally steady across phrases',
      'Complete absence of natural breathing artifacts',
      'Spectral profile consistent with neural TTS',
    ],
  }),
]
