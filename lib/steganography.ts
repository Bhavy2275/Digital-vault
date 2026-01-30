/**
 * Image Steganography Utility (LSB Manipulation)
 * Academic Focus: Data Hiding and Pixel Manipulation
 */

/**
 * Encodes a string into the least significant bits of an image.
 */
export const hideDataInImage = (imageData: ImageData, data: string): ImageData => {
    const binaryData = stringToBinary(data + '###'); // Terminating sequence
    const pixels = imageData.data;

    if (binaryData.length > pixels.length * 0.75) {
        throw new Error('Data too large for this image');
    }

    for (let i = 0; i < binaryData.length; i++) {
        const bit = parseInt(binaryData[i]);
        // Only modify R, G, B channels (skipping Alpha)
        const pixelIndex = Math.floor(i / 3) * 4 + (i % 3);
        pixels[pixelIndex] = (pixels[pixelIndex] & 0xFE) | bit;
    }

    return imageData;
};

/**
 * Extracts hidden data from the least significant bits of an image.
 */
export const extractDataFromImage = (imageData: ImageData): string => {
    const pixels = imageData.data;
    let binaryString = '';
    const bitLimit = pixels.length * 0.75; // Optimization limit

    for (let i = 0; i < pixels.length; i++) {
        if (i % 4 === 3) continue; // Skip transparency
        binaryString += (pixels[i] & 1).toString();

        // Periodically check for terminator to avoid processing entire huge image
        if (binaryString.length % 800 === 0) {
            const currentData = binaryToString(binaryString);
            if (currentData.includes('###')) break;
        }

        if (binaryString.length > bitLimit) break;
    }

    const fullData = binaryToString(binaryString);
    const terminatorIndex = fullData.indexOf('###');

    if (terminatorIndex === -1) return '';
    return fullData.substring(0, terminatorIndex);
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
