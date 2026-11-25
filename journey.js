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
const stage = turret.querySelector('.turret-stage');
const launch = turret.querySelector('#turret-launch');
const reset = turret.querySelector('#turret-reset');
const scoreValue = turret.querySelector('#turret-score');
const pollen = turret.querySelector('.turret-pollen');
const shotResult = turret.querySelector('#turret-shot-result');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let flight;
let litTarget;
let score = 0;

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

function shotPosition(direction, distance) {
  return {
    left: `${50 + direction.x * distance}%`,
    top: `${50 + direction.y * distance}%`,
  };
}

function findImpact(direction) {
  const board = stage.getBoundingClientRect();
  const toPercent = 100 / board.width;
  const ballRadius = pollen.getBoundingClientRect().width / 2;

  for (const target of targets) {
    const bounds = target.getBoundingClientRect();
    const x = (bounds.left + bounds.width / 2 - board.left) * toPercent - 50;
    const y = (bounds.top + bounds.height / 2 - board.top) * toPercent - 50;
    // Use a circle inside the target button, expanded by the ball radius for contact.
    const radius = (Math.min(bounds.width, bounds.height) / 2 + ballRadius) * toPercent;
    const alongShot = x * direction.x + y * direction.y;
    const acrossShot = x * direction.y - y * direction.x;
    if (alongShot > 0 && Math.abs(acrossShot) <= radius) {
      const distance = alongShot - Math.sqrt(radius ** 2 - acrossShot ** 2);
      return { target, distance };
    }
  }
}

function clearShot() {
  flight?.cancel();
  flight = undefined;
  litTarget?.classList.remove('is-hit');
  litTarget = undefined;
  shotResult.textContent = '';
}

function launchPollen() {
  const degrees = angle.valueAsNumber;
  const radians = degrees * Math.PI / 180;
  const direction = { x: Math.sin(radians), y: -Math.cos(radians) };

  clearShot();
  pollen.hidden = false;

  const impact = findImpact(direction);
  const start = shotPosition(direction, 10);
  const end = shotPosition(direction, impact?.distance ?? 38);
  Object.assign(pollen.style, end);

  const finishShot = () => {
    flight = undefined;
    litTarget = impact?.target;
    if (litTarget) {
      litTarget.classList.add('is-hit');
      score += 1;
      scoreValue.textContent = score;
      shotResult.textContent = `Hit the ${litTarget.getAttribute('aria-label').toLowerCase()}. +1 point.`;
    } else {
      shotResult.textContent = `Pollen traveled ${describeBearing(degrees)} and missed.`;
    }
  };

  if (reducedMotion.matches || !pollen.animate) {
    finishShot();
    return;
  }
  const animation = pollen.animate([start, end], { duration: 620, easing: 'ease-out' });
  flight = animation;
  animation.onfinish = () => {
    if (flight === animation) finishShot();
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
reset.disabled = false;
reset.addEventListener('click', () => {
  clearShot();
  score = 0;
  scoreValue.textContent = score;
  pollen.hidden = true;
  shotResult.textContent = 'Score reset to 0.';
});
updateTurret();
