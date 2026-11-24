// Add only a school or booster approved checkout URL and public team inbox.
// A checkout URL should support donor-entered amounts on its own page.
export const fundraising = Object.freeze({
  donationUrl: '',
  contactEmail: '',
  contactDirectory: 'https://sites.google.com/leanderisd.org/rhs-clubs/home',
  goalUsd: null,
  raisedUsd: null,
  sponsors: [],
});

const benefits = [
  'Sponsor banner', 'Feature in the team portfolio', 'Sponsor sticker handouts',
  'Featured spotlight post', 'Large logo on the robot', 'Premiere sponsor tag',
];

export function renderSponsorshipTiers(container, { inquiry = false } = {}) {
  const tiers = [
    { name: 'Jalapeño', minimum: 100, benefitCount: 2 },
    { name: 'Habanero', minimum: 300, benefitCount: 4 },
    { name: 'Ghost', minimum: 500, benefitCount: 6 },
  ];
  for (const tier of tiers) {
    const card = document.createElement('article');
    const title = document.createElement('h3');
    title.textContent = tier.name;
    const amount = document.createElement('p');
    amount.className = 'sponsor-price';
    amount.textContent = `$${tier.minimum}+`;
    const recognition = document.createElement('ul');
    for (const benefit of benefits.slice(0, tier.benefitCount)) {
      const item = document.createElement('li');
      item.textContent = benefit;
      recognition.append(item);
    }
    card.append(title, amount, recognition);
    if (inquiry) {
      const button = document.createElement('button');
      button.className = 'text-button';
      button.type = 'button';
      button.dataset.inquiry = `${tier.name} sponsorship`;
      button.textContent = `Inquire about ${tier.name}`;
      card.append(button);
    }
    container.append(card);
  }
}
