import "@testing-library/jest-dom/vitest";

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
