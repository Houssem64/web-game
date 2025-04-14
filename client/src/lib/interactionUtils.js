/**
 * Utilities for handling interactions and debug text display
 */

/**
 * Shows debug text when hovering over an interactive element
 * @param {string} text - The text to display
 */
export const showDebugText = (text) => {
  const debugTextElement = document.getElementById('crosshair-debug-text');
  if (debugTextElement) {
    debugTextElement.textContent = text;
    debugTextElement.style.display = 'block';
  }
};

/**
 * Hides the debug text
 */
export const hideDebugText = () => {
  const debugTextElement = document.getElementById('crosshair-debug-text');
  if (debugTextElement) {
    debugTextElement.textContent = '';
    debugTextElement.style.display = 'none';
  }
}; 