import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';

function Consumer() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div>
      <span>{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  it('defaults to the light theme and syncs it to the document', () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByText('light')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('medibook-theme')).toBe('light');
  });

  it('hydrates from localStorage and toggles between themes', () => {
    localStorage.setItem('medibook-theme', 'dark');

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByText('dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));

    expect(screen.getByText('light')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('medibook-theme')).toBe('light');
  });
});
