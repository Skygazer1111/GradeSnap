// @vitest-environment jsdom
import { act, createElement, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SaveCalculation } from '@/features/results/SaveCalculation';
import { SavedCalculations } from '@/features/semester/SavedCalculations';
import { SemesterCalculator } from '@/features/semester/SemesterCalculator';
import { loadSavedCalculations, saveCalculation, SAVED_CALCULATIONS_KEY } from '@/io/saved-calculations';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function render(element) {
  await act(async () => root.render(element));
}

async function submit() {
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}

async function enter(input, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function click(text) {
  const button = [...container.querySelectorAll('button')].find((element) => element.textContent.trim() === text);
  expect(button, `Button: ${text}`).toBeTruthy();
  await act(async () => button.click());
}

it('saves from a result, updates visible history, and restores it on a new visit', async () => {
  await render(createElement(Fragment, null,
    createElement(SaveCalculation, { gpa: 8.5, credits: 24, qualityPoints: 204 }),
    createElement(SavedCalculations, { onUseSemesters() {} }),
  ));
  await enter(container.querySelector('input'), '3');
  await submit();
  expect(container.querySelector('li').textContent).toContain('Semester 3');
  expect(container.querySelector('li').textContent).toContain('8.50');
  expect(loadSavedCalculations()).toHaveLength(1);

  await act(async () => root.unmount());
  root = createRoot(container);
  await render(createElement(SavedCalculations, { onUseSemesters() {} }));
  expect(container.querySelector('li').textContent).toContain('Semester 3');
  await act(async () => container.querySelector('[aria-label="Delete GPA for semester 3"]').click());
  expect(loadSavedCalculations()).toEqual([]);
  expect(container.textContent).toContain('No saved results yet');
});

it('loads saved semesters, recalculates after edits, and saves the overall result separately', async () => {
  saveCalculation({ kind: 'semester', semester: 1, gpa: 9, credits: 26, qualityPoints: 234 });
  saveCalculation({ kind: 'semester', semester: 3, gpa: 8, credits: 24, qualityPoints: 192 });
  await render(createElement(SemesterCalculator, { onBack() {} }));
  expect(container.querySelector('[aria-label="SGPA for semester 3"]').value).toBe('8.00');
  expect(container.querySelector('[aria-label="Credits for semester 1"]').value).toBe('26');

  await click('Calculate CGPA');
  await submit();
  expect(loadSavedCalculations().find((row) => row.kind === 'cumulative')).toMatchObject({ semester: 3, gpa: 8.52, credits: 50 });

  await enter(container.querySelector('[aria-label="SGPA for semester 1"]'), '10');
  expect(container.querySelector('form')).toBeNull();
  await click('Calculate CGPA');
  await click('Save semester GPAs locally');
  expect(loadSavedCalculations().find((row) => row.kind === 'semester' && row.semester === 1)).toMatchObject({ gpa: 10, qualityPoints: 260 });
  await submit();
  expect(loadSavedCalculations().find((row) => row.kind === 'cumulative').gpa).toBe(9.04);
});

it('does not report success when browser storage rejects a save', async () => {
  const { toast } = await import('sonner');
  vi.clearAllMocks();
  await render(createElement(SaveCalculation, { gpa: 9, credits: 20, qualityPoints: 180 }));
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
  await submit();
  expect(toast.error).toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
  expect(localStorage.getItem(SAVED_CALCULATIONS_KEY)).toBeNull();
});

it('refreshes visible history when another tab saves or clears results', async () => {
  await render(createElement(SavedCalculations, { onUseSemesters() {} }));
  await act(async () => {
    saveCalculation({ kind: 'semester', semester: 2, gpa: 9, credits: 20, qualityPoints: 180 });
    window.dispatchEvent(new StorageEvent('storage', { key: SAVED_CALCULATIONS_KEY }));
  });
  expect(container.querySelector('li').textContent).toContain('Semester 2');
  await act(async () => {
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
  });
  expect(container.textContent).toContain('No saved results yet');
});

it('rejects duplicate semester numbers before calculating or saving', async () => {
  const { toast } = await import('sonner');
  vi.clearAllMocks();
  await render(createElement(SemesterCalculator, { onBack() {} }));
  await enter(container.querySelector('[aria-label="SGPA for semester 1"]'), '9');
  await enter(container.querySelector('[aria-label="SGPA for semester 2"]'), '8');
  await enter(container.querySelector('[aria-label="Semester number for row 2"]'), '1');
  await click('Calculate CGPA');
  expect(toast.error).toHaveBeenCalledWith('Use a unique positive semester number for each row');
  expect(container.querySelector('form')).toBeNull();
  expect(loadSavedCalculations()).toEqual([]);
});
