import "@testing-library/jest-dom/vitest";

// jsdom does not implement matchMedia; components use it for
// prefers-reduced-motion checks. Default: motion allowed.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// Polyfill Blob.arrayBuffer for jsdom (not natively available)
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = async function arrayBuffer() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read blob as ArrayBuffer"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}
