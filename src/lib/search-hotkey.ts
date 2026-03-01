type SearchScope = 'dropdown' | 'modal' | 'page';

const SEARCH_TARGET_SELECTOR = '[data-search-target="true"]';
const OPEN_DROPDOWN_SCOPE_SELECTOR = [
  '[data-slot="select-content"][data-state="open"]',
  '[data-slot="dropdown-menu-content"][data-state="open"]',
  '[data-search-container="dropdown"][data-open="true"]',
].join(', ');
const OPEN_MODAL_SCOPE_SELECTOR = [
  '[data-slot="dialog-content"][data-state="open"]',
  '[data-slot="sheet-content"][data-state="open"]',
].join(', ');

function toPriority(element: Element): number {
  const raw = element.getAttribute('data-search-priority');
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function isInstanceOfByName<T extends Element>(element: Element, className: string): element is T {
  const view = element.ownerDocument.defaultView as Record<string, unknown> | null;
  const ctor = view?.[className];
  return typeof ctor === 'function' && element instanceof (ctor as new (...args: unknown[]) => T);
}

function isElementFocusable(element: Element): element is HTMLElement {
  return isInstanceOfByName<HTMLElement>(element, 'HTMLElement') && !element.hasAttribute('disabled');
}

function isElementVisible(element: HTMLElement): boolean {
  if (element.hidden || element.closest('[hidden], [inert], [aria-hidden="true"]')) {
    return false;
  }

  if (isInstanceOfByName<HTMLInputElement>(element, 'HTMLInputElement') && element.type === 'hidden') {
    return false;
  }

  const view = element.ownerDocument.defaultView;
  if (!view) return true;

  let current: HTMLElement | null = element;
  while (current) {
    const styles = view.getComputedStyle(current);
    if (styles.display === 'none' || styles.visibility === 'hidden') {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}

function canReceiveSearchFocus(element: Element): element is HTMLInputElement | HTMLTextAreaElement {
  const isInput = isInstanceOfByName<HTMLInputElement>(element, 'HTMLInputElement');
  const isTextArea = isInstanceOfByName<HTMLTextAreaElement>(element, 'HTMLTextAreaElement');
  if (!isInput && !isTextArea) {
    return false;
  }

  const control = element as HTMLInputElement | HTMLTextAreaElement;
  if (control.disabled || control.readOnly) {
    return false;
  }
  return isElementVisible(control);
}

function domOrderSort(a: Element, b: Element): number {
  if (a === b) return 0;
  const position = a.compareDocumentPosition(b);
  // b follows a => a comes first.
  if (position & 4) return -1;
  return 1;
}

function sortCandidates<T extends Element>(candidates: T[]): T[] {
  return candidates.sort((a, b) => {
    const priorityDiff = toPriority(b) - toPriority(a);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return domOrderSort(a, b);
  });
}

function collectScopedTargets(root: ParentNode, scope: SearchScope): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll(`${SEARCH_TARGET_SELECTOR}[data-search-scope="${scope}"]`));
  return sortCandidates(nodes).filter(isElementFocusable).filter(isElementVisible);
}

function collectDropdownTargets(doc: Document): HTMLElement[] {
  const scopes = Array.from(doc.querySelectorAll(OPEN_DROPDOWN_SCOPE_SELECTOR));
  const candidates = scopes.flatMap((scope) => collectScopedTargets(scope, 'dropdown'));
  return sortCandidates(candidates);
}

function topMostModalScope(doc: Document): Element | null {
  const modals = Array.from(doc.querySelectorAll(OPEN_MODAL_SCOPE_SELECTOR)).filter(
    (modal): modal is HTMLElement => isElementFocusable(modal) && isElementVisible(modal)
  );
  if (modals.length === 0) return null;
  return modals[modals.length - 1];
}

function collectPageTargets(doc: Document): HTMLElement[] {
  const explicit = collectScopedTargets(doc, 'page');
  if (explicit.length > 0) {
    return explicit;
  }

  const fallback = Array.from(doc.querySelectorAll<HTMLElement>('input, textarea')).filter((element) => {
    if (!canReceiveSearchFocus(element)) {
      return false;
    }
    if (element.closest(OPEN_MODAL_SCOPE_SELECTOR) || element.closest(OPEN_DROPDOWN_SCOPE_SELECTOR)) {
      return false;
    }
    const placeholder = element.getAttribute('placeholder') ?? '';
    return placeholder.toLowerCase().includes('search');
  });

  return fallback;
}

function focusAndSelect(element: HTMLElement): boolean {
  if (!isElementVisible(element)) return false;

  element.focus({ preventScroll: false });

  const isInput = isInstanceOfByName<HTMLInputElement>(element, 'HTMLInputElement');
  const isTextArea = isInstanceOfByName<HTMLTextAreaElement>(element, 'HTMLTextAreaElement');
  if (isInput || isTextArea) {
    try {
      if (typeof element.select === 'function') {
        element.select();
      } else if (typeof element.setSelectionRange === 'function') {
        element.setSelectionRange(0, element.value.length);
      }
    } catch {
      // Ignore selection failures on unsupported input types.
    }
  }

  return true;
}

export function focusBestSearchTarget(doc: Document = document): boolean {
  const dropdownCandidates = collectDropdownTargets(doc).filter(canReceiveSearchFocus);
  if (dropdownCandidates.length > 0) {
    return focusAndSelect(dropdownCandidates[0]);
  }

  const activeModal = topMostModalScope(doc);
  if (activeModal) {
    const modalCandidates = collectScopedTargets(activeModal, 'modal').filter(canReceiveSearchFocus);
    if (modalCandidates.length > 0) {
      return focusAndSelect(modalCandidates[0]);
    }
    return false;
  }

  const pageCandidates = collectPageTargets(doc).filter(canReceiveSearchFocus);
  if (pageCandidates.length > 0) {
    return focusAndSelect(pageCandidates[0]);
  }

  return false;
}
