import { render } from '@testing-library/svelte';
import ProgressBar from '../../../src/features/viewer/progress-bar.component.svelte';
import { describe, it, expect } from 'vitest';

describe('ProgressBar Component', () => {
  it('should render correctly with 0% progress', () => {
    const { container } = render(ProgressBar, { progress: 0 });
    const bar = container.querySelector('.h-full');
    expect(bar).toHaveStyle('width: 0%');
  });

  it('should render correctly with 50% progress', () => {
    const { container } = render(ProgressBar, { progress: 50 });
    const bar = container.querySelector('.h-full');
    expect(bar).toHaveStyle('width: 50%');
  });

  it('should clamp progress to 100%', () => {
    const { container } = render(ProgressBar, { progress: 150 });
    const bar = container.querySelector('.h-full');
    expect(bar).toHaveStyle('width: 100%');
  });

  it('should clamp progress to 0%', () => {
    const { container } = render(ProgressBar, { progress: -50 });
    const bar = container.querySelector('.h-full');
    expect(bar).toHaveStyle('width: 0%');
  });
});
