// packages/recorder/src/test/mocks/video.ts
// jsdom reports videoWidth/videoHeight = 0. The composer's cover-crop skips the
// camera draw when dimensions are 0, so tests must be able to set them.
let mockVideoWidth = 1280;
let mockVideoHeight = 720;

export function installVideoMocks(): void {
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
    configurable: true,
    get: () => mockVideoWidth,
  });
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
    configurable: true,
    get: () => mockVideoHeight,
  });
}

/** Set the dimensions every mock <video> reports. */
export function setMockVideoSize(width: number, height: number): void {
  mockVideoWidth = width;
  mockVideoHeight = height;
}

/** Reset to the default 1280x720. Call in afterEach where a test changed it. */
export function resetMockVideoSize(): void {
  mockVideoWidth = 1280;
  mockVideoHeight = 720;
}
