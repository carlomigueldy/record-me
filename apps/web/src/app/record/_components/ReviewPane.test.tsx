import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReviewPane } from './ReviewPane';

describe('ReviewPane', () => {
  it('renders the recorded video with controls and the result URL', () => {
    render(<ReviewPane url="blob:abc" />);
    const video = screen.getByLabelText('Recorded video preview') as HTMLVideoElement;
    expect(video).toHaveAttribute('src', 'blob:abc');
    expect(video).toHaveAttribute('controls');
  });
});
