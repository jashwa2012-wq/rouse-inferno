const lightbox = document.querySelector('#journey-lightbox');
const photos = [...document.querySelectorAll('a[data-caption]')];
const preview = lightbox.querySelector('img');
const caption = lightbox.querySelector('figcaption');
const close = lightbox.querySelector('[data-close]');
let index = 0;
let opener;

function showPhoto(position) {
  index = (position + photos.length) % photos.length;
  const photo = photos[index];
  preview.src = photo.href;
  preview.alt = photo.querySelector('img').alt;
  caption.textContent = photo.dataset.caption;
}

photos.forEach((photo, position) => photo.addEventListener('click', event => {
  if (!lightbox.showModal || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  opener = photo;
  showPhoto(position);
  lightbox.showModal();
  close.focus();
}));

close.addEventListener('click', () => lightbox.close());
lightbox.querySelector('[data-previous]').addEventListener('click', () => showPhoto(index - 1));
lightbox.querySelector('[data-next]').addEventListener('click', () => showPhoto(index + 1));
lightbox.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showPhoto(index + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
lightbox.addEventListener('close', () => opener?.focus({ preventScroll: true }));

const turret = document.querySelector('#turret-demo');
const angle = turret.querySelector('#turret-angle');
const angleValue = turret.querySelector('#turret-angle-value');
const aim = turret.querySelector('#turret-aim');
const targets = [...turret.querySelectorAll('[data-bearing]')];
const launch = turret.querySelector('#turret-launch');
const pollen = turret.querySelector('.turret-pollen');
const shotResult = turret.querySelector('#turret-shot-result');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let flight;

function describeBearing(degrees) {
  if (degrees === 0) return 'forward';
  const magnitude = Math.abs(degrees);
  if (magnitude === 180) return 'to the rear';
  const side = degrees < 0 ? 'left' : 'right';
  return `${magnitude} ${magnitude === 1 ? 'degree' : 'degrees'} ${side} of front`;
}

function updateTurret() {
  const degrees = angle.valueAsNumber;
  const bearing = degrees === -180 ? 180 : degrees;
  const magnitude = Math.abs(degrees);
  turret.style.setProperty('--turret-angle', `${degrees}deg`);
  angleValue.textContent = `${degrees < 0 ? '−' : ''}${magnitude}°`;
  angle.setAttribute('aria-valuetext', describeBearing(degrees));

  const aligned = targets.find(target => Number(target.dataset.bearing) === bearing);
  for (const target of targets) target.setAttribute('aria-pressed', String(target === aligned));
  aim.textContent = aligned ? aligned.getAttribute('aria-label') : 'Between targets';
}

function shotPosition(radians, radius) {
  return {
    left: `${50 + Math.sin(radians) * radius}%`,
    top: `${50 - Math.cos(radians) * radius}%`,
  };
}

function launchPollen() {
  const degrees = angle.valueAsNumber;
  const radians = degrees * Math.PI / 180;
  const start = shotPosition(radians, 10);
  const end = shotPosition(radians, 27);
  const message = `Pollen traveled ${describeBearing(degrees)}.`;

  flight?.cancel();
  flight = undefined;
  shotResult.textContent = '';
  pollen.hidden = false;
  Object.assign(pollen.style, end);

  if (reducedMotion.matches || !pollen.animate) {
    shotResult.textContent = message;
    return;
  }
  flight = pollen.animate([start, end], { duration: 620, easing: 'ease-out' });
  flight.onfinish = () => {
    flight = undefined;
    shotResult.textContent = message;
  };
}

for (const target of targets) {
  target.disabled = false;
  target.addEventListener('click', () => {
    angle.value = target.dataset.bearing;
    updateTurret();
  });
}
angle.disabled = false;
angle.addEventListener('input', updateTurret);
launch.disabled = false;
launch.addEventListener('click', launchPollen);
updateTurret();
