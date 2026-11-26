import { renderHook, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/api/client';
import { writeCache } from '@/lib/cache';
import { useResource } from '@/lib/useResource';

describe('dati con copia locale', () => {
  it('appena arriva una chiave è «in caricamento»: mai «né dati né caricamento»', async () => {
    const seen: string[] = [];
    const fetcher = jest.fn(async () => ({ n: 1 }));
    const { result, rerender } = await renderHook(
      ({ k }: { k: string | null }) => {
        const r = useResource<{ n: number }>(k, fetcher);
        seen.push(`${k ?? 'null'}:${r.data ? 'dati' : r.loading ? 'carico' : 'vuoto'}`);
        return r;
      },
      { initialProps: { k: null as string | null } },
    );
    expect(result.current.loading).toBe(false);
    await rerender({ k: 'test.a' });
    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));
    expect(seen.filter((s) => s.startsWith('test.a'))).not.toContain('test.a:vuoto');
    expect(result.current.updatedAt).not.toBeNull();
  });

  it('senza rete mostra l’ultima versione salvata con la sua ora', async () => {
    await writeCache('test.b', { n: 7 });
    const fetcher = jest.fn(async () => {
      throw new ApiError({ message: 'Serve la connessione a internet.', status: 0, network: true });
    });
    const { result } = await renderHook(() => useResource<{ n: number }>('test.b', fetcher));
    await waitFor(() => expect(result.current.stale).toBe(true));
    expect(result.current.data).toEqual({ n: 7 });
    expect(result.current.updatedAt).not.toBeNull();
    expect(result.current.error).toBe('Serve la connessione a internet.');
    expect(result.current.loading).toBe(false);
  });

  it('cambiando chiave non mostra i dati di quella di prima', async () => {
    const fetcher = jest.fn(async () => ({ n: 2 }));
    const { result, rerender } = await renderHook(({ k }: { k: string }) => useResource<{ n: number }>(k, fetcher), { initialProps: { k: 'test.c' } });
    await waitFor(() => expect(result.current.data).toEqual({ n: 2 }));
    fetcher.mockImplementation(() => new Promise(() => {}));
    await rerender({ k: 'test.d' });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
