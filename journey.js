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
