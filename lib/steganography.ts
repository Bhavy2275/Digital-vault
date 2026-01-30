/**
 * Image Steganography Utility (LSB Manipulation)
 * Academic Focus: Data Hiding and Pixel Manipulation
 */

const SEPARATOR = '###';

/**
 * Encodes a string into the least significant bits of an image.
 */
export const hideDataInImage = (imageData: ImageData, data: string): ImageData => {
    const binaryData = stringToBinary(data + SEPARATOR);
    const pixels = imageData.data;

    // We only use RGB channels (3 bits per pixel)
    if (binaryData.length > (pixels.length / 4) * 3) {
        throw new Error('Data too large for this image');
    }

    for (let i = 0; i < binaryData.length; i++) {
        const bit = parseInt(binaryData[i]);
        // Skip the Alpha channel (index 3, 7, 11...)
        const pixelIdx = Math.floor(i / 3) * 4 + (i % 3);
        pixels[pixelIdx] = (pixels[pixelIdx] & 0xFE) | bit;
    }

    return imageData;
};

/**
 * Extracts hidden data from the least significant bits of an image.
 */
export const extractDataFromImage = (imageData: ImageData): string => {
    const pixels = imageData.data;
    let binaryString = '';

    // We process pixels one by one to extract bits
    // This is highly efficient due to the terminator check
    for (let i = 0; i < pixels.length; i++) {
        if (i % 4 === 3) continue; // Skip Alpha

        binaryString += (pixels[i] & 1).toString();

        // Check for terminator every byte (8 bits) to save resources
        if (binaryString.length > 0 && binaryString.length % 8 === 0) {
            const lastChar = binaryFromByte(binaryString.slice(-8));
            // Optimization: If we find the final separator character, stop early
            if (lastChar === SEPARATOR[SEPARATOR.length - 1]) {
                const fullString = binaryToString(binaryString);
                if (fullString.endsWith(SEPARATOR)) {
                    return fullString.slice(0, -SEPARATOR.length);
                }
            }
        }
    }

    return '';
};

// Helpers
const stringToBinary = (str: string): string => {
    return str.split('').map(char => {
        return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join('');
};

const binaryFromByte = (byte: string): string => {
    return String.fromCharCode(parseInt(byte, 2));
};

const binaryToString = (binary: string): string => {
    let str = '';
    for (let i = 0; i < binary.length; i += 8) {
        const byte = binary.substr(i, 8);
        if (byte.length < 8) break;
        str += binaryFromByte(byte);
    }
    return str;
};
