/**
 * @module app
 * @description Main entry point for GradeSnap — the CGPA Calculator.
 * Orchestrates OCR, parsing, calculation, data table, and export.
 */

import { extractGrades } from './ocr/worker.js';
import { parseOcrText, GRADING_SCALES } from './ocr/parser.js';
import { calculateCGPA, getPerformanceLabel, getPerformanceBadgeClass, getResultMoodContent } from './core/calculator.js';
import DataTable from './ui/table.js';
import { copyToClipboard, exportAsPNG, generateShareLink, parseShareLink } from './services/exporter.js';

const state = {
  currentSection: 'hero-section',
  imageFile: null,
  imageBase64: null,
  imageMimeType: null,
  scaleId: localStorage.getItem('gradesnap_scale') || '10',
  result: null
};

let isProcessing = false;

const dataTable = new DataTable('subjects-tbody', {
  scaleId: state.scaleId,
  onChange: onTableChange
});

function showSection(sectionId) {
  const sections = document.querySelectorAll('.section');
  sections.forEach(sec => sec.classList.remove('active'));

  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.add('active');
  }

  state.currentSection = sectionId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => dismissToast(toast));

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('toast-enter');
  });

  const timer = setTimeout(() => dismissToast(toast), duration);
  toast._timer = timer;
}

function dismissToast(toast) {
  if (!toast || toast._dismissed) return;
  toast._dismissed = true;

  clearTimeout(toast._timer);
  toast.classList.remove('toast-enter');
  toast.classList.add('toast-exit');

  toast.addEventListener('animationend', () => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  });

  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 500);
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${size} ${units[i]}`;
}

function handleFile(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Invalid file type. Please upload a JPG, PNG, or WebP image.', 'error', 5000);
    return;
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast('File too large. Maximum size is 10 MB.', 'error', 5000);
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const dataUrl = reader.result;
    const base64 = dataUrl.split(',')[1];

    state.imageBase64 = base64;
    state.imageMimeType = file.type;
    state.imageFile = file;

    const imagePreview = document.getElementById('image-preview');
    const uploadPreview = document.getElementById('upload-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const uploadActions = document.getElementById('upload-actions');
    const fileNameEl = document.getElementById('file-name');
    const fileSizeEl = document.getElementById('file-size');

    if (imagePreview) imagePreview.src = dataUrl;
    if (uploadPreview) uploadPreview.hidden = false;
    if (uploadPlaceholder) uploadPlaceholder.hidden = true;
    if (uploadActions) uploadActions.hidden = false;
    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = formatFileSize(file.size);
  };

  reader.onerror = () => {
    showToast('Failed to read the file. Please try again.', 'error');
  };

  reader.readAsDataURL(file);
}

function resetUpload() {
  state.imageFile = null;
  state.imageBase64 = null;
  state.imageMimeType = null;

  const imagePreview = document.getElementById('image-preview');
  const uploadPreview = document.getElementById('upload-preview');
  const uploadPlaceholder = document.getElementById('upload-placeholder');
  const uploadActions = document.getElementById('upload-actions');
  const fileInput = document.getElementById('file-input');

  if (imagePreview) imagePreview.src = '';
  if (uploadPreview) uploadPreview.hidden = true;
  if (uploadPlaceholder) uploadPlaceholder.hidden = false;
  if (uploadActions) uploadActions.hidden = true;
  if (fileInput) fileInput.value = '';
}

function initUploadEvents() {
  const uploadZone = document.getElementById('upload-zone');
  const browseBtn = document.getElementById('browse-btn');
  const fileInput = document.getElementById('file-input');
  const changeImageBtn = document.getElementById('change-image-btn');
  const removeImageBtn = document.getElementById('remove-image-btn');

  if (!uploadZone || !fileInput) return;

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  uploadZone.addEventListener('click', (e) => {
    if (e.target.closest('.upload-actions') || e.target.closest('.btn')) return;
    fileInput.click();
  });

  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  if (changeImageBtn) {
    changeImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetUpload();
    });
  }
}

function updateProgressStep(stepNum, status) {
  const steps = document.querySelectorAll('.progress-step');
  const step = steps[stepNum - 1];
  if (!step) return;

  step.classList.remove('active', 'done', 'default');
  step.classList.add(status);

  const icon = step.querySelector('.step-dot');
  if (icon) {
    if (status === 'done') {
      icon.textContent = '✓';
    } else if (status === 'active') {
      icon.innerHTML = '<span class="spinner-small"></span>';
    }
  }
}

function resetProgressSteps() {
  const steps = document.querySelectorAll('.progress-step');
  steps.forEach((step, i) => {
    step.classList.remove('active', 'done');
    step.classList.add('default');
    const icon = step.querySelector('.step-icon');
    if (icon) {
      icon.textContent = i + 1;
    }
  });
  updateProgressStep(1, 'active');
}

function setProcessingStatus(message) {
  const eta = document.querySelector('.processing-eta');
  if (eta) {
    eta.textContent = message;
  }
}

async function processImage() {
  if (isProcessing) return;

  if (!state.imageBase64) {
    showToast('Please upload an image first.', 'warning');
    return;
  }

  isProcessing = true;
  showSection('processing-section');
  resetProgressSteps();
  setProcessingStatus('First run downloads the OCR engine (~15 MB)');

  try {
    await delay(300);
    updateProgressStep(1, 'done');
    updateProgressStep(2, 'active');

    const rawText = await extractGrades(
      state.imageBase64,
      state.imageMimeType,
      setProcessingStatus
    );

    updateProgressStep(2, 'done');
    updateProgressStep(3, 'active');

    console.log('[GradeSnap DEBUG] Raw OCR text:\n', rawText);

    await delay(200);
    const parsedData = parseOcrText(rawText);

    console.log('[GradeSnap DEBUG] Parsed subjects:', parsedData.map(r => ({ s: r.subject, c: r.credits, g: r.grade, f: r.flagged })));

    updateProgressStep(3, 'done');
    updateProgressStep(4, 'active');

    await delay(200);
    updateProgressStep(4, 'done');

    if (!parsedData || parsedData.length === 0) {
      throw new Error('No subjects were extracted from the image. Please try a clearer photo.');
    }

    dataTable.setScale(state.scaleId);
    dataTable.setData(parsedData);

    showSection('data-section');
    const flaggedCount = parsedData.filter((row) => row.flagged).length;
    const rectifiedCount = parsedData.filter((row) => row.rectified).length;
    let reviewHint = `Extracted ${parsedData.length} subjects`;
    if (rectifiedCount > 0) {
      reviewHint += ` (${rectifiedCount} OCR fix${rectifiedCount === 1 ? '' : 'es'} applied)`;
    }
    if (flaggedCount > 0) {
      reviewHint += `. ${flaggedCount} row(s) need review.`;
    } else {
      reviewHint += ' — review and edit if needed.';
    }
    showToast(reviewHint, flaggedCount > 0 ? 'warning' : 'success');
  } catch (err) {
    console.error('[GradeSnap] Processing error:', err);

    if (err.message?.includes('Could not detect subjects')) {
      dataTable.setScale(state.scaleId);
      dataTable.setData([]);
      showSection('data-section');
      showToast(err.message, 'warning', 6000);
    } else {
      showToast(err.message || 'An error occurred during processing.', 'error', 5000);
      showSection('upload-section');
    }
  } finally {
    isProcessing = false;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function onTableChange({ isValid }) {
  const calculateBtn = document.getElementById('calculate-btn');
  if (calculateBtn) {
    calculateBtn.disabled = !isValid;
    if (isValid) {
      calculateBtn.classList.remove('btn-disabled');
    } else {
      calculateBtn.classList.add('btn-disabled');
    }
  }
}

function initTableEvents() {
  const scaleSelect = document.getElementById('grading-scale-select');
  if (scaleSelect) {
    scaleSelect.value = state.scaleId;

    scaleSelect.addEventListener('change', () => {
      state.scaleId = scaleSelect.value;
      localStorage.setItem('gradesnap_scale', state.scaleId);
      dataTable.setScale(state.scaleId);
    });
  }

  const addRowBtn = document.getElementById('add-row-btn');
  if (addRowBtn) {
    addRowBtn.addEventListener('click', () => {
      dataTable.addRow();
    });
  }

  const backBtn = document.getElementById('back-to-upload-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showSection('upload-section');
    });
  }

  const calculateBtn = document.getElementById('calculate-btn');
  if (calculateBtn) {
    calculateBtn.addEventListener('click', () => {
      calculateAndShowResult();
    });
  }
}

function initExtractButton() {
  const extractBtn = document.getElementById('extract-btn');
  if (extractBtn) {
    extractBtn.addEventListener('click', () => {
      processImage();
    });
  }
}

function launchConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;

  container.innerHTML = '';
  const colors = ['#7c3aed', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa'];

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.animationDuration = `${2 + Math.random() * 2}s`;
    container.appendChild(piece);
  }

  setTimeout(() => {
    container.innerHTML = '';
  }, 4500);
}

function applyResultMood(result) {
  const banner = document.getElementById('result-mood-banner');
  const emojiEl = document.getElementById('result-mood-emoji');
  const titleEl = document.getElementById('result-mood-title');
  const messageEl = document.getElementById('result-mood-message');
  const resultCard = document.getElementById('result-card');

  if (!banner || !emojiEl || !titleEl || !messageEl || !resultCard) return;

  const moodContent = getResultMoodContent(
    result.performanceLevel,
    result.cgpa,
    result.maxPoints
  );

  banner.hidden = false;
  banner.className = `result-mood-banner mood-${moodContent.mood}`;
  resultCard.classList.remove('result-celebration', 'result-neutral', 'result-disappointment');
  resultCard.classList.add(`result-${moodContent.mood}`);

  emojiEl.textContent = moodContent.emoji;
  titleEl.textContent = moodContent.title;
  messageEl.textContent = moodContent.message;

  if (moodContent.mood === 'celebration') {
    launchConfetti();
  }
}

function calculateAndShowResult() {
  const subjects = dataTable.getData();

  if (subjects.length === 0) {
    showToast('No subjects to calculate.', 'warning');
    return;
  }

  const result = calculateCGPA(subjects, state.scaleId);
  state.result = result;

  showSection('results-section');
  applyResultMood(result);

  const cgpaEl = document.getElementById('cgpa-value');
  if (cgpaEl) {
    animateValue(cgpaEl, 0, result.cgpa, 1500);

    const performanceColors = {
      distinction: '#a78bfa',
      'first-class': '#60a5fa',
      'second-class': '#34d399',
      pass: '#fbbf24',
      fail: '#f87171'
    };
    cgpaEl.style.color = performanceColors[result.performanceLevel] || '#e2e8f0';
  }

  const cgpaMaxEl = document.getElementById('cgpa-max');
  if (cgpaMaxEl) {
    cgpaMaxEl.textContent = `/ ${result.maxPoints}`;
  }

  const badgeEl = document.getElementById('result-badge');
  if (badgeEl) {
    badgeEl.textContent = getPerformanceLabel(result.performanceLevel);
    badgeEl.className = 'result-badge';
    badgeEl.classList.add(getPerformanceBadgeClass(result.performanceLevel));
  }

  const totalCreditsEl = document.getElementById('total-credits');
  const totalGradePointsEl = document.getElementById('total-grade-points');
  const subjectsCountEl = document.getElementById('result-subjects-count');

  if (totalCreditsEl) totalCreditsEl.textContent = result.totalCredits;
  if (totalGradePointsEl) totalGradePointsEl.textContent = result.totalCreditPoints.toFixed(2);
  if (subjectsCountEl) subjectsCountEl.textContent = result.subjectsCount;

  if (result.gradeDistribution) {
    renderGradeChart(result.gradeDistribution, state.scaleId);
  }
}

function animateValue(element, start, end, duration) {
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * eased;
    element.textContent = current.toFixed(2);
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function renderGradeChart(distribution) {
  const chart = document.getElementById('grade-chart');
  if (!chart) return;

  chart.innerHTML = '';

  const maxCount = Math.max(...Object.values(distribution), 1);

  const gradeColors = {
    'O': '#7c3aed',
    'A+': '#6d28d9',
    'A': '#2563eb',
    'A-': '#3b82f6',
    'B+': '#06b6d4',
    'B': '#0891b2',
    'B-': '#0e7490',
    'C+': '#10b981',
    'C': '#059669',
    'C-': '#047857',
    'D+': '#f59e0b',
    'D': '#d97706',
    'D-': '#b45309',
    'P': '#f59e0b',
    'S': '#7c3aed',
    'E': '#ef4444',
    'F': '#ef4444'
  };

  const gradeOrder = {
    'O': 100, 'A+': 95, 'A': 90, 'A-': 85,
    'B+': 80, 'B': 75, 'B-': 70,
    'C+': 65, 'C': 60, 'C-': 55,
    'D+': 50, 'D': 45, 'D-': 40,
    'P': 35, 'S': 30, 'E': 10, 'F': 0
  };

  const sorted = Object.entries(distribution).sort((a, b) => {
    const orderA = gradeOrder[a[0]] !== undefined ? gradeOrder[a[0]] : -1;
    const orderB = gradeOrder[b[0]] !== undefined ? gradeOrder[b[0]] : -1;
    return orderB - orderA;
  });

  sorted.forEach(([grade, count], index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-bar-wrapper';

    const countLabel = document.createElement('span');
    countLabel.className = 'chart-count';
    countLabel.textContent = count;

    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    const height = (count / maxCount) * 80;
    bar.style.height = '0px';
    bar.style.backgroundColor = gradeColors[grade] || '#94a3b8';
    bar.style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';

    setTimeout(() => {
      bar.style.height = height + 'px';
    }, 100 + index * 60);

    const label = document.createElement('span');
    label.className = 'chart-label';
    label.textContent = grade;

    wrapper.append(countLabel, bar, label);
    chart.appendChild(wrapper);
  });
}

function initExportEvents() {
  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (!state.result) return;
      const subjects = dataTable.getData();
      const success = await copyToClipboard(state.result, subjects);
      if (success) {
        showToast('Result copied to clipboard!', 'success');
      } else {
        showToast('Failed to copy to clipboard.', 'error');
      }
    });
  }

  const exportPngBtn = document.getElementById('export-png-btn');
  if (exportPngBtn) {
    exportPngBtn.addEventListener('click', async () => {
      showToast('Generating PNG…', 'info', 2000);
      const success = await exportAsPNG('result-card');
      if (success) {
        showToast('PNG downloaded successfully!', 'success');
      } else {
        showToast('Failed to export as PNG.', 'error');
      }
    });
  }

  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const subjects = dataTable.getData();
      const shareUrl = generateShareLink(subjects, state.scaleId);
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Share link copied to clipboard!', 'success');
      } catch {
        window.prompt('Copy this share link:', shareUrl);
        showToast('Share link generated.', 'info');
      }
    });
  }

  const editDataBtn = document.getElementById('edit-data-btn');
  if (editDataBtn) {
    editDataBtn.addEventListener('click', () => {
      showSection('data-section');
    });
  }

  const newCalcBtn = document.getElementById('new-calc-btn');
  if (newCalcBtn) {
    newCalcBtn.addEventListener('click', () => {
      state.imageFile = null;
      state.imageBase64 = null;
      state.imageMimeType = null;
      state.result = null;

      resetUpload();
      dataTable.setData([]);
      showSection('hero-section');
    });
  }
}

function checkShareLink() {
  const url = window.location.href;
  const shareData = parseShareLink(url);

  if (shareData && shareData.subjects && shareData.subjects.length > 0) {
    state.scaleId = shareData.scaleId || '10';
    localStorage.setItem('gradesnap_scale', state.scaleId);

    const scaleSelect = document.getElementById('grading-scale-select');
    if (scaleSelect) {
      scaleSelect.value = state.scaleId;
    }

    dataTable.setScale(state.scaleId);
    dataTable.setData(shareData.subjects);

    showSection('data-section');
    showToast('Loaded shared data!', 'info');

    if (window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    return true;
  }

  return false;
}

function initHeroEvents() {
  const getStartedBtn = document.getElementById('get-started-btn');
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
      showSection('upload-section');
    });
  }
}



document.addEventListener('DOMContentLoaded', () => {
  const scaleSelect = document.getElementById('grading-scale-select');
  if (scaleSelect) {
    scaleSelect.value = state.scaleId;
  }

  initHeroEvents();
  initUploadEvents();
  initExtractButton();
  initTableEvents();
  initExportEvents();

  const loaded = checkShareLink();

  if (!loaded) {
    showSection('hero-section');
  }



  console.log('%c🎓 GradeSnap', 'font-size: 20px; font-weight: bold; color: #7c3aed;');
  console.log('%cCGPA Calculator with local OCR', 'font-size: 12px; color: #94a3b8;');
});
