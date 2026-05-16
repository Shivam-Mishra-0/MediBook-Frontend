import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdminSidebar,
  Loader,
  NotificationBell,
  PatientSidebar,
  ProviderSidebar,
  PublicNav,
  Stars,
  StatusBadge,
  ThemeToggle,
  ToastContainer,
  Topbar,
  toast,
} from '../src/components/Layout';
import { ThemeProvider } from '../src/context/ThemeContext';

let mockUser = null;

const layoutApiMocks = vi.hoisted(() => ({
  clearAuth: vi.fn(),
  getUser: vi.fn(),
  getInitials: vi.fn(),
  notifAPI: {
    getByRecipient: vi.fn(),
    getUnreadCount: vi.fn(),
    markAllRead: vi.fn(),
    markRead: vi.fn(),
  },
}));

const clearAuth = layoutApiMocks.clearAuth;
const getUser = layoutApiMocks.getUser;
const getInitials = layoutApiMocks.getInitials;
const notifAPI = layoutApiMocks.notifAPI;

vi.mock('../src/utils/api', () => ({
  clearAuth: layoutApiMocks.clearAuth,
  getInitials: layoutApiMocks.getInitials,
  getUser: layoutApiMocks.getUser,
  notifAPI: layoutApiMocks.notifAPI,
}));

function renderWithRouter(ui, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>{ui}</ThemeProvider>
    </MemoryRouter>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe('layout components', () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockUser = null;
    clearAuth.mockReset();
    getUser.mockImplementation(() => mockUser);
    getInitials.mockImplementation((name) =>
      name ? name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2) : '?'
    );
    notifAPI.getByRecipient.mockReset();
    notifAPI.getUnreadCount.mockReset();
    notifAPI.markAllRead.mockReset();
    notifAPI.markRead.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('toggles the theme through ThemeToggle', () => {
    renderWithRouter(<ThemeToggle />);

    const toggleButton = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    fireEvent.click(toggleButton);

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
  });

  it('loads, refreshes, marks, and closes notifications', async () => {
    mockUser = { userId: 44, fullName: 'Patient Prime', role: 'Patient' };
    const intervalSpy = vi.spyOn(globalThis, 'setInterval');
    notifAPI.getByRecipient.mockResolvedValue({
      data: [
        { notificationId: 1, title: 'A', message: 'Message A', isRead: false, sentAt: '2026-05-11T10:00:00Z' },
        { notificationId: 2, title: 'B', message: 'Message B', isRead: true, sentAt: '2026-05-11T11:00:00Z' },
      ],
    });
    notifAPI.getUnreadCount.mockResolvedValue({ data: { unreadCount: 2 } });
    notifAPI.markAllRead.mockResolvedValue({});
    notifAPI.markRead.mockResolvedValue({});

    renderWithRouter(<NotificationBell />);

    await waitFor(() => {
      expect(notifAPI.getByRecipient).toHaveBeenCalledWith(44);
      expect(notifAPI.getUnreadCount).toHaveBeenCalledWith(44);
    });
    expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);

    expect(screen.getByText('2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Message A')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Mark all read'));
    await waitFor(() => expect(notifAPI.markAllRead).toHaveBeenCalledWith(44));
    expect(screen.queryByText('2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('A'));
    expect(notifAPI.markRead).toHaveBeenCalledWith(1);

    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByText('Notifications')).not.toBeInTheDocument());
  });

  it('renders an empty notification state and skips loading when no user is present', async () => {
    renderWithRouter(<NotificationBell />);
    expect(notifAPI.getByRecipient).not.toHaveBeenCalled();

    mockUser = { userId: 55, fullName: 'Quiet User', role: 'Patient' };
    notifAPI.getByRecipient.mockResolvedValue({ data: [] });
    notifAPI.getUnreadCount.mockResolvedValue({ data: { unreadCount: 0 } });

    renderWithRouter(<NotificationBell />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(await screen.findByText('No notifications')).toBeInTheDocument();
  });

  it('renders the patient sidebar and handles navigation plus logout', () => {
    mockUser = { fullName: 'Patient Prime', role: 'Patient' };

    render(
      <MemoryRouter initialEntries={['/patient']}>
        <ThemeProvider>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <PatientSidebar />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(getInitials).toHaveBeenCalledWith('Patient Prime');
    fireEvent.click(screen.getByText('My Appointments'));
    expect(screen.getByTestId('location')).toHaveTextContent('/patient/appointments');

    fireEvent.click(screen.getByText('Patient Prime'));
    expect(clearAuth).toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('renders the provider and admin sidebars with their navigation targets', () => {
    mockUser = { fullName: 'Doctor Demo', role: 'Provider' };

    const { rerender } = render(
      <MemoryRouter initialEntries={['/provider']}>
        <ThemeProvider>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <ProviderSidebar />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('My Schedule'));
    expect(screen.getByTestId('location')).toHaveTextContent('/provider/schedule');

    mockUser = { fullName: 'Admin Demo', role: 'Admin' };
    rerender(
      <MemoryRouter initialEntries={['/admin']}>
        <ThemeProvider>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <AdminSidebar />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Users'));
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/users');
  });

  it('renders topbar, stars, badges, and loaders', () => {
    mockUser = { userId: 1, fullName: 'Patient Prime', role: 'Patient' };
    notifAPI.getByRecipient.mockResolvedValue({ data: [] });
    notifAPI.getUnreadCount.mockResolvedValue({ data: { unreadCount: 0 } });

    renderWithRouter(
      <>
        <Topbar title="Dashboard" />
        <Stars rating={3.4} size={20} />
        <StatusBadge status="SUCCESS" />
        <StatusBadge status="UNKNOWN" />
        <StatusBadge status={false} />
        <Loader text="Loading dashboard" />
      </>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(document.querySelectorAll('.star').length).toBe(5);
    expect(screen.getByText('SUCCESS')).toHaveClass('badge', 'badge-green');
    expect(screen.getByText('UNKNOWN')).toHaveClass('badge', 'badge-gray');
    expect(screen.getByText('false')).toHaveClass('badge', 'badge-red');
    expect(screen.getByText('Loading dashboard')).toBeInTheDocument();
  });

  it('shows toast messages and dismisses them automatically', async () => {
    vi.useFakeTimers();

    renderWithRouter(<ToastContainer />);

    act(() => {
      toast.success('Saved');
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();

    act(() => {
      toast.error('Failed');
    });
    expect(screen.getByText('Failed')).toBeInTheDocument();

    act(() => {
      toast.info('Heads up');
    });
    expect(screen.getByText('Heads up')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });
    expect(screen.queryByText('Heads up')).not.toBeInTheDocument();
  });

  it('renders PublicNav for guests and routes authenticated users to the correct dashboard', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <PublicNav />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Find Doctors'));
    expect(screen.getByTestId('location')).toHaveTextContent('/find-doctors');

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/login');

    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/register');

    mockUser = { role: 'Patient' };
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <PublicNav />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/patient');

    mockUser = { role: 'Provider' };
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <PublicNav />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/provider');

    mockUser = { role: 'Admin' };
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <PublicNav />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/admin');

    mockUser = { role: 'Mystery' };
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <PublicNav />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});
