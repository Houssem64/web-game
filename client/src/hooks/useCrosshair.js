import { useEffect } from 'react';

/**
 * Custom hook to manage crosshair interactions with UI elements
 * @param {boolean} active - Whether the crosshair should be active (true when in game, false in menu)
 */
export const useCrosshair = (active = true) => {
  useEffect(() => {
    // Only set up crosshair interaction if active
    if (!active) return;
    
    let isHandlingClick = false; // Flag to prevent recursion

    // Handle clicks on elements at the center of the screen
    const handleClick = (e) => {
      // Prevent recursive calls
      if (isHandlingClick) return;
      isHandlingClick = true;
      
      try {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        const elements = document.elementsFromPoint(centerX, centerY);
        console.log('Elements at crosshair:', elements.map(el => `${el.tagName}${el.className ? '.' + el.className : ''}`));
        
        // Find any clickable element
        const clickable = elements.find(el => {
          const isButton = el.tagName === 'BUTTON';
          const isAnswerButton = el.classList.contains('answer-button');
          const isMenuButton = el.classList.contains('menu-btn');
          const isReadyButton = el.id === 'ready-up-button';
          
          return isButton || isAnswerButton || isMenuButton || isReadyButton;
        });
        
        if (clickable) {
          console.log('Clicking element:', clickable);
          
          // Dispatch a native DOM event instead of calling click()
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          
          // Only trigger the event, don't call the click() method to avoid recursion
          clickable.dispatchEvent(clickEvent);
        }
      } catch (err) {
        console.error('Error in crosshair click handler:', err);
      } finally {
        // Always reset the flag when done
        isHandlingClick = false;
      }
    };

    // Handle hover effects for elements at the center of the screen
    const handleHover = () => {
      try {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        const elements = document.elementsFromPoint(centerX, centerY);
        
        // Clear previous hover effects
        document.querySelectorAll('.crosshair-hover').forEach(el => {
          el.classList.remove('crosshair-hover');
        });
        
        // Find interactive elements
        const interactive = elements.find(el => {
          return (
            el.tagName === 'BUTTON' || 
            el.classList.contains('answer-button') ||
            el.classList.contains('menu-btn') ||
            el.id === 'ready-up-button'
          );
        });
        
        if (interactive) {
          interactive.classList.add('crosshair-hover');
        }
      } catch (err) {
        console.error('Error in crosshair hover handler:', err);
      }
    };

    // Set up event listeners
    window.addEventListener('click', handleClick);
    
    // Poll for hover updates
    const hoverInterval = setInterval(handleHover, 50); // Check more frequently
    
    // Initial hover check
    handleHover();
    
    return () => {
      window.removeEventListener('click', handleClick);
      clearInterval(hoverInterval);
      
      // Clean up any hover effects
      document.querySelectorAll('.crosshair-hover').forEach(el => {
        el.classList.remove('crosshair-hover');
      });
    };
  }, [active]);
}; 