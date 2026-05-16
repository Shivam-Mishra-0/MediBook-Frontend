import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../src/context/ThemeContext';

export function renderWithProviders(ui, { route = '/' } = {}) {
  window.history.replaceState({}, '', route);

  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>{ui}</ThemeProvider>
    </MemoryRouter>
  );
}
