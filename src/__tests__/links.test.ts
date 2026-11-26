import { mapUrlToRoute } from '@/lib/links';

describe('link universali e schema dell’app', () => {
  it('riporta nell’app dopo il pagamento', () => {
    expect(mapUrlToRoute('https://www.listen-marketing.com/app/pagato')).toBe('/pagato');
    expect(mapUrlToRoute('https://www.listen-marketing.com/app/pagato?session_id=cs_test')).toBe('/pagato?session_id=cs_test');
    expect(mapUrlToRoute('listenmarketing://pagato')).toBe('/pagato');
    expect(mapUrlToRoute('/app/pagato')).toBe('/pagato');
  });

  it('apre la schermata giusta dalle notifiche', () => {
    expect(mapUrlToRoute('https://www.listen-marketing.com/app/brano')).toBe('/brano');
    expect(mapUrlToRoute('https://www.listen-marketing.com/app/classifica')).toBe('/classifica');
    expect(mapUrlToRoute('listenmarketing://artisti')).toBe('/artisti');
    expect(mapUrlToRoute('https://www.listen-marketing.com/app/cuori')).toBe('/');
  });

  it('tutto ciò che non conosce porta alla home', () => {
    expect(mapUrlToRoute('https://www.listen-marketing.com/app/qualcosa/altro')).toBe('/');
    expect(mapUrlToRoute('https://www.listen-marketing.com/app')).toBe('/');
    expect(mapUrlToRoute('')).toBe('/');
    expect(mapUrlToRoute(null)).toBe('/');
  });
});
