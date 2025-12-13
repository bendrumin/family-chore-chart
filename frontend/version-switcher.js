// Version Switcher for Vanilla JS Version
// Allows users to switch to the new React/Next.js version

(function() {
    'use strict';

    // Don't run if already on new version
    if (window.location.pathname.startsWith('/app')) {
        return;
    }

    // Check if we should show the promotional banner
    const shouldShowBanner = () => {
        // Check if user has dismissed it
        const dismissed = localStorage.getItem('chorestar_version_switcher_dismissed');
        if (dismissed === 'true') {
            return false;
        }
        
        // Check if shown in last 7 days
        const lastShown = localStorage.getItem('chorestar_version_switcher_last_shown');
        if (lastShown) {
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            if (parseInt(lastShown) > sevenDaysAgo) {
                return false;
            }
        }
        
        return true;
    };

    // Create permanent switch button (always visible)
    const createPermanentButton = () => {
        const button = document.createElement('button');
        button.id = 'version-switch-button';
        button.innerHTML = '✨ Try New Version';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        });

        button.addEventListener('click', () => {
            const currentPath = window.location.pathname;
            const newPath = currentPath === '/' ? '/app/dashboard' : `/app${currentPath}`;
            window.location.href = newPath;
        });

        document.body.appendChild(button);
    };

    // Create promotional banner (dismissible)
    const createBanner = () => {
        if (!shouldShowBanner()) {
            return;
        }

        const switcher = document.createElement('div');
        switcher.id = 'version-switcher';
        switcher.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 320px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: slideInUp 0.3s ease-out;
        `;

        switcher.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="font-size: 24px;">✨</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">
                        Try the New ChoreStar!
                    </div>
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 12px; line-height: 1.4;">
                        Experience improved performance and new features in our beta version.
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button id="switch-to-new" style="
                            background: white;
                            color: #667eea;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            font-weight: bold;
                            font-size: 12px;
                            cursor: pointer;
                            flex: 1;
                        ">Try New Version</button>
                        <button id="dismiss-switcher" style="
                            background: rgba(255,255,255,0.2);
                            color: white;
                            border: none;
                            padding: 8px 12px;
                            border-radius: 6px;
                            font-size: 12px;
                            cursor: pointer;
                        ">×</button>
                    </div>
                </div>
            </div>
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInUp {
                from {
                    transform: translateY(100px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(switcher);

        // Event listeners
        document.getElementById('switch-to-new').addEventListener('click', () => {
            const currentPath = window.location.pathname;
            const newPath = currentPath === '/' ? '/app/dashboard' : `/app${currentPath}`;
            window.location.href = newPath;
        });

        document.getElementById('dismiss-switcher').addEventListener('click', () => {
            localStorage.setItem('chorestar_version_switcher_dismissed', 'true');
            localStorage.setItem('chorestar_version_switcher_last_shown', Date.now().toString());
            switcher.style.animation = 'slideInUp 0.3s ease-out reverse';
            setTimeout(() => switcher.remove(), 300);
        });
    };

    // Initialize both button and banner
    const init = () => {
        createPermanentButton();
        createBanner();
    };

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

