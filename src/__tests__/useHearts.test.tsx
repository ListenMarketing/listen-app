import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { useHearts } from '@/lib/useHearts';

jest.mock('@/api/endpoints', () => ({ api: { giveHeart: jest.fn(), removeHeart: jest.fn() } }));
const mocked = api as jest.Mocked<typeof api>;

const items = [
  { id: 'a', hearted: true, hearts: 4 },
  { id: 'b', hearted: false, hearts: 2 },
];

describe('cuori confermati dal server', () => {
  beforeEach(() => jest.clearAllMocks());

  it('il cuore si vede subito e poi prende i numeri del server', async () => {
    mocked.giveHeart.mockResolvedValue({ available: 0, count: 3, given: true });
    const { result } = await renderHook(() => useHearts('beat', items, 1));
    await waitFor(() => expect(result.current.hearts.available).toBe(1));
    await act(async () => {
      await result.current.toggle('b');
    });
    expect(mocked.giveHeart).toHaveBeenCalledWith('beat', 'b', undefined);
    expect(result.current.hearts.given.b).toBe(true);
    expect(result.current.hearts.available).toBe(0);
    expect(result.current.hearts.counts.b).toBe(3);
    expect(result.current.error).toBeNull();
  });

  it('se il server rifiuta (cuori finiti) si torna indietro e si mostra il suo messaggio', async () => {
    mocked.giveHeart.mockRejectedValue(new ApiError({ message: 'Hai già dato tutti i tuoi cuori', status: 403, fromServer: true }));
    const { result } = await renderHook(() => useHearts('beat', items, 0));
    await waitFor(() => expect(result.current.hearts.available).toBe(0));
    await act(async () => {
      await result.current.toggle('b');
    });
    expect(result.current.hearts.given.b).toBeUndefined();
    expect(result.current.hearts.counts.b).toBe(2);
    expect(result.current.hearts.available).toBe(0);
    expect(result.current.error).toBe('Hai già dato tutti i tuoi cuori');
  });

  it('togliere un cuore chiama DELETE e lo restituisce', async () => {
    mocked.removeHeart.mockResolvedValue({ available: 2, count: 3, given: false });
    const { result } = await renderHook(() => useHearts('brano', items, 1, 'Lombardia'));
    await waitFor(() => expect(result.current.hearts.given.a).toBe(true));
    await act(async () => {
      await result.current.toggle('a');
    });
    expect(mocked.removeHeart).toHaveBeenCalledWith('brano', 'a');
    expect(result.current.hearts.given.a).toBeUndefined();
    expect(result.current.hearts.available).toBe(2);
  });
});
