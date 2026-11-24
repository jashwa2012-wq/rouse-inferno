import { fundraising, renderSponsorshipTiers } from './fundraising.js?v=packet-v2';

renderSponsorshipTiers(document.querySelector('[data-sponsorship-tiers]'));

document.querySelector('#print').addEventListener('click', () => window.print());
if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fundraising.contactEmail)) {
  const email = document.createElement('a');
  email.textContent = fundraising.contactEmail;
  email.href = `mailto:${fundraising.contactEmail}?subject=FTC%20Team%2031989%20Sponsorship`;
  document.querySelector('#brief-contact').replaceChildren(email);
}
