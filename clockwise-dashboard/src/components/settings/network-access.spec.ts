import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import NetworkAccess from './network-access.component.svelte';
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('NetworkAccessComponent', () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    localIp: '192.168.1.100',
    localAccessUrl: 'http://192.168.1.100:4100',
    copyText: vi.fn(),
    enabled: true,
    toggle: vi.fn(),
  };

  it('should render the component with correct props', () => {
    render(NetworkAccess, { ...defaultProps });
    expect(screen.getByText('Network Access')).toBeInTheDocument();
    expect(screen.getByText('Local Network URL')).toBeInTheDocument();
    expect(screen.getByText('http://192.168.1.100:4100')).toBeInTheDocument();
  });

  it('should show local access only when disabled', () => {
    render(NetworkAccess, { ...defaultProps, enabled: false });
    expect(screen.getByText('Local Access Only')).toBeInTheDocument();
    expect(screen.getByText('http://localhost:4100')).toBeInTheDocument();
    expect(screen.getByText('Access restricted to this computer only')).toBeInTheDocument();
  });

  it('should call toggle when button is clicked', async () => {
    render(NetworkAccess, { ...defaultProps });
    const toggleBtn = screen.getByLabelText('Toggle Network Access');
    await fireEvent.click(toggleBtn);
    expect(defaultProps.toggle).toHaveBeenCalled();
  });

  it('should call copyText when copy button is clicked', async () => {
    render(NetworkAccess, { ...defaultProps });
    const copyBtn = screen.getByLabelText('Copy URL');
    await fireEvent.click(copyBtn);
    expect(defaultProps.copyText).toHaveBeenCalledWith('http://192.168.1.100:4100', 'URL');
  });

  it('should show pulse when localIp is missing and enabled', () => {
    const { container } = render(NetworkAccess, { ...defaultProps, localIp: '' });
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
