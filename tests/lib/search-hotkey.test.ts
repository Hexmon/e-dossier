import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';

import { focusBestSearchTarget } from '@/lib/search-hotkey';

function createDocument(markup: string): Document {
  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`);
  return dom.window.document;
}

describe('focusBestSearchTarget', () => {
  it('focuses page search when no modal/dropdown is open', () => {
    const doc = createDocument(`
      <input id="page-search" data-search-target="true" data-search-scope="page" data-search-priority="30" />
    `);

    const focused = focusBestSearchTarget(doc);

    expect(focused).toBe(true);
    expect((doc.activeElement as HTMLElement | null)?.id).toBe('page-search');
  });

  it('focuses modal search over page search when modal is open', () => {
    const doc = createDocument(`
      <input id="page-search" data-search-target="true" data-search-scope="page" data-search-priority="40" />
      <div data-slot="dialog-content" data-state="open">
        <input id="modal-search" data-search-target="true" data-search-scope="modal" data-search-priority="80" />
      </div>
    `);

    const focused = focusBestSearchTarget(doc);

    expect(focused).toBe(true);
    expect((doc.activeElement as HTMLElement | null)?.id).toBe('modal-search');
  });

  it('focuses active dropdown search over modal/page search', () => {
    const doc = createDocument(`
      <input id="page-search" data-search-target="true" data-search-scope="page" data-search-priority="40" />
      <div data-slot="dialog-content" data-state="open">
        <input id="modal-search" data-search-target="true" data-search-scope="modal" data-search-priority="80" />
      </div>
      <div data-search-container="dropdown" data-open="true">
        <input id="dropdown-search" data-search-target="true" data-search-scope="dropdown" data-search-priority="100" />
      </div>
    `);

    const focused = focusBestSearchTarget(doc);

    expect(focused).toBe(true);
    expect((doc.activeElement as HTMLElement | null)?.id).toBe('dropdown-search');
  });

  it('ignores closed dropdown targets', () => {
    const doc = createDocument(`
      <div data-slot="dialog-content" data-state="open">
        <input id="modal-search" data-search-target="true" data-search-scope="modal" data-search-priority="80" />
      </div>
      <div data-search-container="dropdown" data-open="false">
        <input id="dropdown-search" data-search-target="true" data-search-scope="dropdown" data-search-priority="100" />
      </div>
    `);

    const focused = focusBestSearchTarget(doc);

    expect(focused).toBe(true);
    expect((doc.activeElement as HTMLElement | null)?.id).toBe('modal-search');
  });

  it('returns false when no target exists', () => {
    const doc = createDocument(`<div>No searchable input</div>`);
    expect(focusBestSearchTarget(doc)).toBe(false);
  });

  it('skips hidden, disabled, and readonly search candidates', () => {
    const doc = createDocument(`
      <input id="disabled-search" data-search-target="true" data-search-scope="page" data-search-priority="90" disabled />
      <input id="readonly-search" data-search-target="true" data-search-scope="page" data-search-priority="80" readonly />
      <input id="hidden-search" data-search-target="true" data-search-scope="page" data-search-priority="70" hidden />
      <input id="visible-search" data-search-target="true" data-search-scope="page" data-search-priority="60" />
    `);

    const focused = focusBestSearchTarget(doc);

    expect(focused).toBe(true);
    expect((doc.activeElement as HTMLElement | null)?.id).toBe('visible-search');
  });
});
