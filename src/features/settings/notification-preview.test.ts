import { notificationPreview } from './notification-preview';

describe('notificationPreview', () => {
  it('shows what a rule would send, with figures', () => {
    expect(notificationPreview('budgetNear', { masked: false, threshold: 80 })).toEqual({
      title: 'Budget quasi finito',
      body: 'Spesa alimentare è all’80% del budget: restano 63 € per 7 giorni.',
    });
  });

  it('drops every figure when privacy is on', () => {
    const preview = notificationPreview('budgetNear', { masked: true, threshold: 80 });
    expect(preview.body).toBe('Spesa alimentare è vicina al budget del mese.');
    for (const rule of ['budgetOver', 'subscriptionSoon', 'chargeCreated', 'largeExpense', 'weeklySummary', 'monthlySummary', 'eveningReminder', 'goals'] as const) {
      const { title, body } = notificationPreview(rule, { masked: true, threshold: 80 });
      expect(`${title} ${body}`).not.toMatch(/\d/);
    }
  });
});
