import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { HeartButton, HeartCounter, PlaylistConfirmButton } from '@/components/contest';

describe('contatore dei cuori', () => {
  it('mostra «Hai N cuori» con il numero del server', async () => {
    await render(<HeartCounter available={5} total={5} />);
    expect(screen.getByTestId('heart-counter')).toHaveTextContent('Hai 5 cuori');
    expect(screen.getByText('su 5 in questa fase')).toBeOnTheScreen();
  });

  it('usa il singolare con un cuore solo', async () => {
    await render(<HeartCounter available={1} />);
    expect(screen.getByTestId('heart-counter')).toHaveTextContent('Hai 1 cuore');
  });

  it('mostra anche zero cuori', async () => {
    await render(<HeartCounter available={0} />);
    expect(screen.getByTestId('heart-counter')).toHaveTextContent('Hai 0 cuori');
  });

  it('non mostra niente finché il server non ha detto quanti cuori ci sono', async () => {
    await render(<HeartCounter available={null} />);
    expect(screen.queryByTestId('heart-counter')).toBeNull();
  });
});

describe('bottone del cuore', () => {
  it('ha un’etichetta che dice cosa fa, per VoiceOver e TalkBack', async () => {
    const onPress = jest.fn();
    const view = await render(<HeartButton title="Cemento" hearted={false} onPress={onPress} />);
    const give = screen.getByRole('button', { name: 'Dai un cuore a Cemento' });
    await fireEvent.press(give);
    expect(onPress).toHaveBeenCalledTimes(1);
    await view.rerender(<HeartButton title="Cemento" hearted onPress={onPress} />);
    expect(screen.getByRole('button', { name: 'Togli il cuore a Cemento' })).toBeSelected();
  });
});

describe('bottone «L’ho seguita» della playlist', () => {
  it('resta spento finché il server non dice che il link è stato aperto', async () => {
    const onPress = jest.fn();
    await render(<PlaylistConfirmButton openedAt={null} onPress={onPress} />);
    const button = screen.getByTestId('playlist-confirm');
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByText('Prima di aprire il link questo bottone è grigio.')).toBeOnTheScreen();
  });

  it('si accende dopo il tocco sul link e chiama la conferma', async () => {
    const onPress = jest.fn();
    await render(<PlaylistConfirmButton openedAt="2027-01-10T16:42:00Z" onPress={onPress} />);
    const button = screen.getByTestId('playlist-confirm');
    expect(button).toBeEnabled();
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
