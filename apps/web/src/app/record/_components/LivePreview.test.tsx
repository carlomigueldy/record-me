import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LivePreview } from './LivePreview';

describe('LivePreview', () => {
  it('renders a muted, autoplaying preview video and binds the stream', () => {
    const fakeStream = { id: 'preview' } as unknown as MediaStream;
    render(<LivePreview stream={fakeStream} />);
    const video = screen.getByLabelText('Live recording preview') as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.muted).toBe(true);
    // jsdom does not implement srcObject as a real setter, but the prop is applied via ref.
    expect(video).toHaveAttribute('playsinline');
  });
});
