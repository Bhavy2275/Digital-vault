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

    // Extract all bits from RGB channels
    for (let i = 0; i < pixels.length; i++) {
        if (i % 4 === 3) continue; // Skip Alpha channel
        binaryString += (pixels[i] & 1).toString();

        // Check for terminator periodically (every 240 bits = ~30 characters)
        if (binaryString.length % 240 === 0 && binaryString.length > 0) {
            const currentText = binaryToString(binaryString);
            if (currentText.includes(SEPARATOR)) {
                const endIndex = currentText.indexOf(SEPARATOR);
                return currentText.substring(0, endIndex);
            }
        }
    }

    // Final check
    const fullText = binaryToString(binaryString);
    const endIndex = fullText.indexOf(SEPARATOR);

    if (endIndex === -1) return '';
    return fullText.substring(0, endIndex);
};

// Helpers
const stringToBinary = (str: string): string => {
    return str.split('').map(char => {
        return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join('');
};

const binaryToString = (binary: string): string => {
    let str = '';
    for (let i = 0; i < binary.length; i += 8) {
        const byte = binary.substr(i, 8);
        if (byte.length < 8) break;
        str += String.fromCharCode(parseInt(byte, 2));
    }
    return str;
};
