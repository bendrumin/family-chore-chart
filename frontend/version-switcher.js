// Version Switcher for Vanilla JS Version
// Allows users to switch to the new React/Next.js version

(function() {
    'use strict';

    // Don't run if already on new version
    if (window.location.pathname.startsWith('/app')) {
        return;
    }

    // Create header button (non-intrusive, always visible)
    const createHeaderButton = () => {
        // Wait for header to be available
        const checkHeader = setInterval(() => {
            const headerRight = document.querySelector('.header-right');
            if (headerRight) {
                clearInterval(checkHeader);

                const button = document.createElement('button');
                button.id = 'version-switch-button';
                button.type = 'button';
                button.className = 'btn btn-primary';
                button.setAttribute('aria-label', 'Try the new ChoreStar experience');
                button.innerHTML = '<span style="margin-right: 4px;">✨</span> New Version';
                button.style.cssText = `
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                    font-family: inherit;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    display: inline-flex;
                    align-items: center;
                    margin-right: 8px;
                `;

                button.addEventListener('mouseenter', () => {
                    button.style.transform = 'translateY(-1px)';
                    button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                });

                button.addEventListener('mouseleave', () => {
                    button.style.transform = 'translateY(0)';
                    button.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                });

                button.addEventListener('click', () => {
                    // Track version switch
                    if (window.analytics) {
                        window.analytics.trackVersionUsage('react_nextjs', 'switch_to_new');
                    }
                    
                    const currentPath = window.location.pathname;
                    const newPath = currentPath === '/' ? '/app/dashboard' : `/app${currentPath}`;
                    window.location.href = newPath;
                });

                // Insert as first child in header-right (before hamburger menu)
                headerRight.insertBefore(button, headerRight.firstChild);
            }
        }, 100);

        // Timeout after 5 seconds if header not found
        setTimeout(() => clearInterval(checkHeader), 5000);
    };

    // Initialize header button only (removed duplicate promotional banner)
    const init = () => {
        createHeaderButton();
    };

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

