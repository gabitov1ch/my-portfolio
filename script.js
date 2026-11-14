const root = document.documentElement;
root.classList.add('js');

// Keep the explicit theme choice across visits when browser storage is available.
const themeToggle = document.querySelector('#theme-toggle');
const themeStorageKey = 'future-me-portfolio-theme';
let savedTheme;

try {
  savedTheme = localStorage.getItem(themeStorageKey);
} catch {
  // The switch still works for this visit if storage is restricted.
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  themeToggle?.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
}

applyTheme(savedTheme === 'light' ? 'light' : 'dark');

themeToggle?.addEventListener('click', () => {
  const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);

  try {
    localStorage.setItem(themeStorageKey, nextTheme);
  } catch {
    // Theme switching does not require browser storage.
  }
});

const header = document.querySelector('#site-header');
const navigation = document.querySelector('#main-navigation');
const menuToggle = document.querySelector('#menu-toggle');

if (header && navigation && menuToggle) {
  function setMenuOpen(open) {
    header.classList.toggle('menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }

  function isMenuOpen() {
    return menuToggle.getAttribute('aria-expanded') === 'true';
  }

  menuToggle.addEventListener('click', (event) => {
    const open = !isMenuOpen();
    setMenuOpen(open);
    if (open && event.detail === 0) navigation.querySelector('a')?.focus();
  });

  navigation.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !isMenuOpen()) return;

    setMenuOpen(false);
    const target = document.getElementById(link.hash.slice(1));
    if (target) {
      target.setAttribute('tabindex', '-1');
      // Move keyboard focus without interfering with native anchor scrolling.
      target.focus({ preventScroll: true });
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isMenuOpen()) {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (isMenuOpen() && !header.contains(event.target)) setMenuOpen(false);
  });

  window.addEventListener('resize', () => {
    if (isMenuOpen() && !menuToggle.getClientRects().length) setMenuOpen(false);
  });
}

const progress = document.querySelector('#scroll-progress');
const navigationLinks = [...document.querySelectorAll('.nav-link[href^="#"]')];
const navigationSections = navigationLinks.map((link) => ({
  link,
  section: document.getElementById(link.hash.slice(1)),
})).filter(({ section }) => section);

let scrollUpdatePending = false;
let activeSection;

function setActiveSection(section) {
  if (section === activeSection) return;
  activeSection = section;

  for (const entry of navigationSections) {
    if (entry.section === section) {
      entry.link.setAttribute('aria-current', 'location');
    } else {
      entry.link.removeAttribute('aria-current');
    }
  }
}

function updateScrollState() {
  const scrollableHeight = root.scrollHeight - window.innerHeight;
  const scrolled = Math.max(window.scrollY, 0);

  if (progress) {
    progress.value = scrollableHeight > 0 ? (scrolled / scrollableHeight) * progress.max : 0;
  }

  const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
  const activationLine = Math.max(headerBottom, 0) + 36;
  let current = null;
  let nearestTop = -Infinity;

  for (const { section } of navigationSections) {
    const top = section.getBoundingClientRect().top;
    if (top <= activationLine && top > nearestTop) {
      current = section;
      nearestTop = top;
    }
  }

  setActiveSection(current);
  scrollUpdatePending = false;
}

function scheduleScrollUpdate() {
  if (scrollUpdatePending) return;
  scrollUpdatePending = true;
  requestAnimationFrame(updateScrollState);
}

function syncNavigationToHash() {
  const match = navigationSections.find(({ link }) => link.hash === window.location.hash);
  if (match) setActiveSection(match.section);
  scheduleScrollUpdate();
}

window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
window.addEventListener('resize', scheduleScrollUpdate);
window.addEventListener('load', scheduleScrollUpdate);
window.addEventListener('hashchange', syncNavigationToHash);

if ('ResizeObserver' in window) {
  const layoutObserver = new ResizeObserver(scheduleScrollUpdate);
  layoutObserver.observe(document.body);
}

syncNavigationToHash();

const revealElements = [...document.querySelectorAll('[data-reveal]')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });

  for (const element of revealElements) observer.observe(element);

  reducedMotion.addEventListener('change', (event) => {
    if (!event.matches) return;
    observer.disconnect();
    for (const element of revealElements) element.classList.add('is-visible');
  });
} else {
  for (const element of revealElements) element.classList.add('is-visible');
}

for (const details of document.querySelectorAll('details[data-project-details]')) {
  details.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !details.open) return;
    details.open = false;
    details.querySelector('summary')?.focus();
  });
}

const form = document.querySelector('#contact-form');

if (form) {
  const formStatus = document.querySelector('#form-status');
  const contactMethods = [...form.querySelectorAll('input[name="contact-method"]')];

  function formField(id, requiredMessage, formatMessage) {
    return {
      controls: [document.getElementById(id)],
      error: document.getElementById(`${id}-error`),
      requiredMessage,
      formatMessage,
    };
  }

  const fields = [
    formField('full-name', 'Enter your full name.'),
    formField('email', 'Enter your email address.', 'Enter an email address in the format name@example.com.'),
    formField('subject', 'Choose a subject.'),
    formField('message', 'Enter a message.'),
    {
      controls: contactMethods,
      error: document.querySelector('#contact-method-error'),
      requiredMessage: 'Choose a preferred contact method.',
    },
    formField('agreement', 'Confirm that you understand this is a demo.'),
  ].filter(({ controls }) => controls.length && controls.every(Boolean));

  function validationMessage(field) {
    const control = field.controls[0];
    const isChoice = control.type === 'radio' || control.type === 'checkbox';
    const missingChoice = isChoice && !field.controls.some((option) => option.checked);
    const missingText = !isChoice && !control.value.trim();

    if (missingChoice || missingText) return field.requiredMessage;
    if (!control.validity.valid) return field.formatMessage ?? control.validationMessage;
    return '';
  }

  function showFieldError(field, message) {
    for (const control of field.controls) {
      if (message) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    }

    if (field.error) {
      field.error.textContent = message;
      field.error.hidden = !message;
    }
  }

  let submitted = false;
  form.noValidate = true;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitted = true;
    let firstInvalidControl;

    for (const field of fields) {
      const message = validationMessage(field);
      showFieldError(field, message);
      if (message && !firstInvalidControl) firstInvalidControl = field.controls[0];
    }

    if (formStatus) {
      formStatus.hidden = false;
      formStatus.dataset.state = firstInvalidControl ? 'error' : 'success';
      formStatus.textContent = firstInvalidControl
        ? 'Review the highlighted fields and try again.'
        : 'All fields passed validation. This demo did not send a message.';
    }

    firstInvalidControl?.focus();
  });

  function handleFieldEdit(event) {
    if (formStatus?.dataset.state === 'success') {
      formStatus.textContent = '';
      formStatus.hidden = true;
      delete formStatus.dataset.state;
    }

    if (!submitted) return;
    const field = fields.find(({ controls }) => controls.includes(event.target));
    if (field) showFieldError(field, validationMessage(field));
  }

  form.addEventListener('input', handleFieldEdit);
  form.addEventListener('change', handleFieldEdit);
  for (const button of form.querySelectorAll('[data-demo-submit]')) button.disabled = false;
}
