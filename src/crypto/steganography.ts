/**
 * Steganography module for Cipherly
 * Hides secret data inside PNG images using LSB (Least Significant Bit) encoding,
 * or extracts embedded data from PNG images.
 */

// Format header signature to identify steganography payload: "CPHY" + 32-bit big endian length
const HEADER_SIG = [67, 80, 72, 89]; // 'C', 'P', 'H', 'Y'

/**
 * Embeds a text message (or encrypted ciphertext) into a cover PNG image canvas/ImageData
 */
export async function embedDataInImage(imageFile: File, secretPayload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D canvas context.'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data; // RGBA Uint8ClampedArray

        // Encode secret string to Uint8Array UTF-8 bytes
        const encoder = new TextEncoder();
        const payloadBytes = encoder.encode(secretPayload);

        // Prepare full payload with Header + 4-byte length + payload
        const totalPayloadLength = HEADER_SIG.length + 4 + payloadBytes.length;
        
        // Check capacity (3 bits stored per pixel in R, G, B channels)
        const availablePixels = img.width * img.height;
        const requiredPixels = Math.ceil((totalPayloadLength * 8) / 3);
        if (requiredPixels > availablePixels) {
          reject(new Error(`Image is too small. Required capacity: ${totalPayloadLength * 8} bits, available: ${availablePixels * 3} bits.`));
          return;
        }

        const fullBuffer = new Uint8Array(totalPayloadLength);
        fullBuffer.set(HEADER_SIG, 0);

        // 32-bit Big Endian length
        const len = payloadBytes.length;
        fullBuffer[4] = (len >> 24) & 0xff;
        fullBuffer[5] = (len >> 16) & 0xff;
        fullBuffer[6] = (len >> 8) & 0xff;
        fullBuffer[7] = len & 0xff;

        fullBuffer.set(payloadBytes, 8);

        // Embed bit by bit into LSB of RGB channels (skipping Alpha)
        let bitIndex = 0;
        const totalBits = totalPayloadLength * 8;

        for (let i = 0; i < data.length && bitIndex < totalBits; i++) {
          // Skip Alpha channel (i % 4 === 3)
          if (i % 4 === 3) continue;

          const byteIdx = Math.floor(bitIndex / 8);
          const bitIdxInByte = 7 - (bitIndex % 8); // MSB to LSB order
          const bit = (fullBuffer[byteIdx] >> bitIdxInByte) & 1;

          // Clear LSB and write new bit
          data[i] = (data[i] & 0xfe) | bit;

          bitIndex++;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => reject(new Error('Failed to load target image file.'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Extracts embedded steganography payload from a PNG image file
 */
export async function extractDataFromImage(imageFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D canvas context.'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        // First extract header (8 bytes = 64 bits) to verify signature & read payload length
        const headerBuffer = new Uint8Array(8);
        let bitIndex = 0;

        for (let i = 0; i < data.length && bitIndex < 64; i++) {
          if (i % 4 === 3) continue; // Skip Alpha

          const lsb = data[i] & 1;
          const byteIdx = Math.floor(bitIndex / 8);
          const bitIdxInByte = 7 - (bitIndex % 8);

          if (lsb === 1) {
            headerBuffer[byteIdx] |= (1 << bitIdxInByte);
          }

          bitIndex++;
        }

        // Verify Signature "CPHY"
        const hasSig = HEADER_SIG.every((b, idx) => headerBuffer[idx] === b);
        if (!hasSig) {
          reject(new Error('No steganographic Cipherly payload found in this image.'));
          return;
        }

        // Read payload length
        const payloadLength = (headerBuffer[4] << 24) |
                              (headerBuffer[5] << 16) |
                              (headerBuffer[6] << 8) |
                              headerBuffer[7];

        if (payloadLength <= 0 || payloadLength > 10 * 1024 * 1024) {
          reject(new Error('Invalid steganographic payload header length.'));
          return;
        }

        // Extract the payload bits
        const totalBitsNeeded = (8 + payloadLength) * 8;
        const fullBuffer = new Uint8Array(8 + payloadLength);
        fullBuffer.set(headerBuffer, 0);

        bitIndex = 64;
        let dataPixelIdx = 0;

        // Advance dataPixelIdx to where bitIndex 64 starts
        let currentBitsRead = 0;
        for (let i = 0; i < data.length; i++) {
          if (i % 4 === 3) continue;
          if (currentBitsRead === 64) {
            dataPixelIdx = i;
            break;
          }
          currentBitsRead++;
        }

        for (let i = dataPixelIdx; i < data.length && bitIndex < totalBitsNeeded; i++) {
          if (i % 4 === 3) continue;

          const lsb = data[i] & 1;
          const byteIdx = Math.floor(bitIndex / 8);
          const bitIdxInByte = 7 - (bitIndex % 8);

          if (lsb === 1) {
            fullBuffer[byteIdx] |= (1 << bitIdxInByte);
          }

          bitIndex++;
        }

        const payloadBytes = fullBuffer.subarray(8, 8 + payloadLength);
        const decoder = new TextDecoder();
        resolve(decoder.decode(payloadBytes));
      };

      img.onerror = () => reject(new Error('Failed to load image for extraction.'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(imageFile);
  });
}
