import { fundraising, renderSponsorshipTiers } from './fundraising.js?v=packet-v2';
import { roster } from './roster.js?v=packet-v2';

const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
renderSponsorshipTiers($('[data-sponsorship-tiers]'), { inquiry: true });

// Show roster members only when a display name or portrait has been supplied.
const rosterList = $('#roster-grid');
for (const member of roster) {
  if (!member.name && !member.photo) continue;
  const item = document.createElement('li');
  if (member.photo?.startsWith('assets/members/')) {
    const image = document.createElement('img');
    image.src = member.photo;
    image.alt = member.name ? '' : 'Rouse Inferno team member';
    image.loading = 'lazy';
    image.width = 198;
    image.height = 198;
    item.append(image);
  } else if (member.name) {
    const initials = document.createElement('div');
    initials.className = 'roster-monogram';
    initials.setAttribute('aria-hidden', 'true');
    initials.textContent = member.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('');
    item.append(initials);
  } else {
    continue;
  }
  const details = document.createElement('div');
  details.className = 'roster-card-details';
  if (member.name) {
    const name = document.createElement('h3');
    name.textContent = member.name;
    details.append(name);
  }
  if (member.role) {
    const role = document.createElement('p');
    role.className = 'roster-role';
    role.textContent = member.role;
    details.append(role);
  }
  const points = [...(member.responsibilities ?? []), ...(member.highlights ?? [])];
  if (points.length) {
    const highlights = document.createElement('ul');
    highlights.className = 'roster-highlights';
    for (const description of points) {
      const highlight = document.createElement('li');
      highlight.textContent = description;
      highlights.append(highlight);
    }
    details.append(highlights);
  }
  item.append(details);
  rosterList.append(item);
}
if (rosterList.children.length) {
  rosterList.hidden = false;
  $('#roster-pending').hidden = true;
}

// Keep the real CAD poster visible when WebGL is unavailable.
const stage = $('#stage');
const canvas = $('#robot-canvas');
const modelStatus = $('#model-status');
const loadModel = $('#load-model');
const modelHome = $('#model-home');
const modelViewer = $('#model-viewer');
const fullscreen = $('#model-fullscreen');
const resetCamera = $('#model-reset-camera');
const fullscreenDialog = $('#model-fullscreen-dialog');
const fullscreenControls = $('#model-fullscreen-controls');
const explodeControls = $('#model-explode');
const assemblyTools = $('#assembly-tools');
const slider = $('#explode-range');
const reset = $('#reset-model');
const inspect = $('#inspect-parts');
const search = $('#part-search');
const partList = $('#part-list');
const assemblies = [...document.querySelectorAll('.assembly')];
const initialExplosion = 0;
const pageSize = 6;
const sideDescription = 'Mecanum wheels, drive plates, pulleys, and the hardware that holds them together.';
const descriptions = {
  all: 'Drag to orbit, scroll or pinch to zoom, and select an assembly to inspect it.',
  frame: 'The chassis holds the subsystem mounts and joins the two sides of the robot.',
  'left-drive': sideDescription,
  'right-drive': sideDescription,
  intake: 'Rollers guide game pieces into the robot and move them toward the shooter.',
  electronics: 'The control hubs and other electronics that run the robot.',
  turret: 'The rotating support between the chassis and shooter.',
  shooter: 'The flywheel assembly and hood that guide Pollen out of the robot.',
};
let viewer;
let loading;
let activePart = 'all';
let details;
let detailRequest = 0;
let page = 0;
let selected = null;
let layout = true;
let openingFullscreen = false;

function setFullscreen(expanded) {
  modelViewer.toggleAttribute('data-expanded', expanded);
  fullscreen.textContent = expanded ? 'Exit full screen' : 'Full screen';
  resetCamera.hidden = !expanded;
  fullscreenControls.hidden = !expanded || stage.dataset.mode === 'parts';
  if (expanded) {
    if (!fullscreenControls.hidden) fullscreenControls.append(explodeControls);
  } else {
    assemblyTools.prepend(explodeControls);
    if (modelViewer.parentElement !== modelHome) modelHome.append(modelViewer);
    modelHome.style.minHeight = '';
  }
  fullscreen.focus({ preventScroll: true });
}

fullscreen.addEventListener('click', async () => {
  if (document.fullscreenElement === modelViewer) {
    await document.exitFullscreen();
    return;
  }
  if (fullscreenDialog.open) {
    fullscreenDialog.close();
    return;
  }
  if (openingFullscreen) return;
  openingFullscreen = true;
  modelHome.style.minHeight = `${modelHome.offsetHeight}px`;
  if (document.fullscreenEnabled && modelViewer.requestFullscreen) {
    try {
      await modelViewer.requestFullscreen({ navigationUI: 'hide' });
      return;
    } catch {
      // The viewport-sized dialog also works when native full screen is unavailable.
    } finally {
      openingFullscreen = false;
    }
  }
  fullscreenDialog.append(modelViewer);
  fullscreenDialog.showModal();
  setFullscreen(true);
  openingFullscreen = false;
});
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement === modelViewer) setFullscreen(true);
  else if (modelViewer.hasAttribute('data-expanded') && !fullscreenDialog.open) setFullscreen(false);
});
fullscreenDialog.addEventListener('close', () => setFullscreen(false));
resetCamera.addEventListener('click', () => viewer?.resetView());

function setPart(part) {
  detailRequest += 1;
  activePart = part;
  inspect.hidden = part === 'all' || !viewer;
  inspect.disabled = false;
  for (const button of assemblies) button.setAttribute('aria-pressed', String(button.dataset.part === part));
  $('#assembly-caption').textContent = descriptions[part];
  modelStatus.textContent = '';
  viewer?.focus(part);
}
function selectPiece(id) {
  selected = id;
  updateParts();
}
function updateParts() {
  if (!details) return;
  const tokens = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = details.items.filter(({ label, id }) => tokens.every((token) => `${label} ${id}`.toLowerCase().includes(token)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(page, totalPages - 1);
  const shown = layout ? filtered.slice(page * pageSize, (page + 1) * pageSize) : filtered;
  if (!shown.some((item) => item.id === selected)) selected = null;
  $('#layout-parts').setAttribute('aria-pressed', String(layout));
  $('#assemble-parts').setAttribute('aria-pressed', String(!layout));
  $('#prev-parts').disabled = page === 0;
  $('#next-parts').disabled = page === totalPages - 1;
  $('.part-pages').hidden = !layout;
  $('#part-summary').textContent = filtered.length === 0 ? 'No components match this search.' :
    layout ? `Parts ${page * pageSize + 1}–${page * pageSize + shown.length} of ${filtered.length}` : `${filtered.length} visible parts`;
  const resetOption = new Option(layout ? 'Show this page' : 'Show all matches', '');
  partList.replaceChildren(resetOption, ...shown.map(({ id, label }) => new Option(`${label} · ${id}`, String(id))));
  partList.value = selected === null ? '' : String(selected);
  const item = shown.find(({ id }) => id === selected);
  $('#part-info').textContent = item ? `${item.label}. Bounds: ${item.size.toArray().map((value) => (value * 1000).toFixed(1)).join(' × ')} mm.` :
    layout ? 'The layout sizes each part for inspection. Select a part to zoom in.' : 'The assembled view shows parts at their original scale and positions.';
  viewer.displayParts(details, shown.map(({ id }) => id), layout, selected);
}
function startViewer() {
  if (viewer || loading) return;
  loadModel.disabled = true;
  loadModel.textContent = 'Loading Full Bot…';
  modelStatus.textContent = 'Loading the 3D CAD model.';
  loading = import('./assets/viewer.js?v=step-ap242').then(async ({ createViewer }) => {
    canvas.hidden = false;
    viewer = await createViewer(canvas, stage, Number(slider.value) / 100, activePart);
    viewer.onPartPicked(selectPiece);
    stage.dataset.view = 'live';
    fullscreen.hidden = false;
    $('#model-launch').hidden = true;
    slider.disabled = reset.disabled = false;
    $('#view-mode').textContent = 'Assembly view';
    setPart(activePart);
  }).catch((error) => {
    console.warn('Full Bot viewer could not start', error);
    canvas.hidden = true;
    modelStatus.textContent = 'The interactive view couldn’t load. You can still see the CAD preview.';
    loadModel.textContent = 'Retry interactive 3D';
    loadModel.disabled = false;
  }).finally(() => { loading = undefined; });
}
loadModel.addEventListener('click', startViewer);
for (const button of assemblies) button.addEventListener('click', () => {
  setPart(button.dataset.part);
  if (!viewer) startViewer();
});
slider.addEventListener('input', () => {
  $('#explode-value').textContent = `${slider.value}%`;
  viewer?.explode(Number(slider.value) / 100);
});
reset.addEventListener('click', () => {
  slider.value = initialExplosion;
  $('#explode-value').textContent = `${initialExplosion}%`;
  setPart('all');
  viewer?.reset();
});
inspect.addEventListener('click', async () => {
  const version = ++detailRequest;
  const group = activePart;
  inspect.disabled = true;
  modelStatus.textContent = 'Loading individual CAD parts…';
  try {
    const result = await viewer.fetchParts(group);
    if (version !== detailRequest) return;
    details = result;
    page = 0;
    layout = true;
    selected = null;
    search.value = '';
    $('#active-assembly').textContent = assemblies.find((button) => button.dataset.part === group).textContent.trim();
    $('#assembly-tools').hidden = true;
    $('#part-tools').hidden = false;
    stage.dataset.mode = 'parts';
    $('#view-mode').textContent = 'Individual parts';
    modelStatus.textContent = '';
    updateParts();
    $('#back-to-assemblies').focus({ preventScroll: true });
  } catch (error) {
    if (version !== detailRequest) return;
    console.warn('Could not load individual CAD parts', error);
    modelStatus.textContent = 'The individual parts could not load. Try again.';
    inspect.disabled = false;
  }
});
$('#back-to-assemblies').addEventListener('click', () => {
  details = null;
  $('#assembly-tools').hidden = false;
  $('#part-tools').hidden = true;
  delete stage.dataset.mode;
  $('#view-mode').textContent = 'Assembly view';
  setPart(activePart);
  inspect.focus();
});
search.addEventListener('input', () => { page = 0; selected = null; updateParts(); });
partList.addEventListener('change', () => selectPiece(partList.value ? Number(partList.value) : null));
$('#layout-parts').addEventListener('click', () => { layout = true; page = 0; selected = null; updateParts(); });
$('#assemble-parts').addEventListener('click', () => { layout = false; selected = null; updateParts(); });
$('#prev-parts').addEventListener('click', () => { page -= 1; selected = null; updateParts(); });
$('#next-parts').addEventListener('click', () => { page += 1; selected = null; updateParts(); });

const readyEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fundraising.contactEmail);
const payment = (() => {
  try {
    const url = new URL(fundraising.donationUrl);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
})();
const giftOther = $('#gift-other');
const dialog = $('#inquiry');
const form = $('#inquiry-form');
let opener;
const inquiryStatus = $('#inquiry-status');
const subject = $('#inquiry-type');
const contactLink = $('#club-contact');
contactLink.href = fundraising.contactDirectory;

function openInquiry(reason, amount) {
  opener = document.activeElement;
  form.reset();
  inquiryStatus.textContent = '';
  subject.value = reason;
  if (amount) $('#inquiry-message').value = `I'd like to contribute ${money.format(amount)} to FTC Team 31989. Could you send the approved giving instructions?`;
  dialog.showModal();
  $('#inquiry-name').focus();
}
for (const button of document.querySelectorAll('[data-inquiry]')) button.addEventListener('click', () => openInquiry(button.dataset.inquiry));
dialog.querySelector('.close-button').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => opener?.focus());

if (payment) {
  $('#give').textContent = 'Open donation page';
  $('#giving-note').textContent = 'Enter your gift amount on the approved donation page.';
  $('#donate-answer').textContent = 'Use the donation button above to give through the team’s approved payment page.';
}
if (readyEmail) {
  $('#inquiry-submit').textContent = 'Open email draft';
  $('#contact-info').textContent = `Your email app will open a draft addressed to ${fundraising.contactEmail}.`;
} else {
  $('#contact-info').textContent = 'Copy your message, then use the Rouse club directory to find the Robotics contact.';
}
for (const input of document.querySelectorAll('[name="gift"]')) input.addEventListener('change', () => {
  const custom = $('[name="gift"]:checked').value === 'other';
  giftOther.hidden = $('#other-label').hidden = !custom;
  giftOther.required = custom;
  if (custom) giftOther.focus();
});
$('#give').addEventListener('click', () => {
  const selected = $('[name="gift"]:checked').value;
  if (selected === 'other' && !giftOther.reportValidity()) return;
  if (payment) window.location.assign(payment);
  else openInquiry('Donation inquiry', selected === 'other' ? Number(giftOther.value) : Number(selected));
});

async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const temporary = document.createElement('textarea');
    temporary.value = value;
    temporary.setAttribute('readonly', '');
    temporary.style.cssText = 'position:fixed;left:-999px;top:0';
    const container = dialog.open ? dialog : document.body;
    const previous = document.activeElement;
    container.append(temporary);
    temporary.select();
    const copied = document.execCommand('copy');
    temporary.remove();
    previous?.focus();
    return copied;
  }
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = $('#inquiry-name').value.trim();
  const message = $('#inquiry-message').value.trim();
  if (!name || !message) {
    inquiryStatus.textContent = 'Enter your name and a message first.';
    return;
  }
  const topic = `FTC Team 31989 — ${subject.value}`;
  const body = `Hello Rouse Inferno,\n\n${message}\n\nThank you,\n${name}`;
  if (readyEmail) {
    window.location.href = `mailto:${fundraising.contactEmail}?subject=${encodeURIComponent(topic)}&body=${encodeURIComponent(body)}`;
    inquiryStatus.textContent = 'Use your email app to send the draft.';
  } else {
    const copied = await copy(`${topic}\n\n${body}`);
    inquiryStatus.textContent = copied ? 'Inquiry copied. You can paste it into an email using the Robotics contact.' : 'Select and copy your message, then use the Rouse club directory.';
  }
});
$('#share').addEventListener('click', async () => {
  const url = new URL(location.href);
  url.hash = '';
  $('#share-status').textContent = await copy(url.href) ? 'Website link copied.' : `Copy this link: ${url.href}`;
});

if (Number.isFinite(fundraising.goalUsd) && fundraising.goalUsd > 0 && Number.isFinite(fundraising.raisedUsd) && fundraising.raisedUsd >= 0) {
  $('#campaign-progress').hidden = false;
  const progress = $('#campaign-progress progress');
  progress.max = fundraising.goalUsd;
  progress.value = fundraising.raisedUsd;
  $('#progress-caption').textContent = `${money.format(fundraising.raisedUsd)} raised toward ${money.format(fundraising.goalUsd)}`;
}
if (fundraising.sponsors.length) {
  $('#sponsor-recognition').hidden = false;
  for (const name of fundraising.sponsors) {
    const item = document.createElement('li');
    item.textContent = name;
    $('#sponsor-names').append(item);
  }
}

const sculptureCanvas = $('#sculpture-canvas');
if (sculptureCanvas) {
  const motionPreference = matchMedia('(prefers-reduced-motion: no-preference)');
  let started = false;
  const startSculpture = () => {
    if (started || !motionPreference.matches || navigator.connection?.saveData) return;
    started = true;
    import('./assets/sculpture.js?v=step-ap242')
      .then(({ mountSculpture }) => mountSculpture(sculptureCanvas, motionPreference))
      .catch(() => {
        // The CAD stills and the rest of the homepage remain usable.
      });
  };
  motionPreference.addEventListener('change', startSculpture);
  if ('requestIdleCallback' in window) requestIdleCallback(startSculpture, { timeout: 1200 });
  else setTimeout(startSculpture, 300);
}
