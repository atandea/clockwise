import { render, screen } from '@testing-library/svelte';
import ProgressBar from '../../src/components/progress-bar.component.svelte';
import { describe, it, expect } from 'vitest';

describe('ProgressBar Component', () => {
  it('should render correctly with 0% progress', () => {
    const { container } = render(ProgressBar, { progress: 0 });
    const bar = container.querySelector('.transition-transform');
    expect(bar).toHaveStyle('transform: scaleX(0)');
  });

  it('should render correctly with 50% progress', () => {
    const { container } = render(ProgressBar, { progress: 50 });
    const bar = container.querySelector('.transition-transform');
    expect(bar).toHaveStyle('transform: scaleX(0.5)');
  });

  it('should clamp progress to 100%', () => {
    const { container } = render(ProgressBar, { progress: 150 });
    const bar = container.querySelector('.transition-transform');
    expect(bar).toHaveStyle('transform: scaleX(1)');
  });

  it('should clamp progress to 0%', () => {
    const { container } = render(ProgressBar, { progress: -50 });
    const bar = container.querySelector('.transition-transform');
    expect(bar).toHaveStyle('transform: scaleX(0)');
  });
});
