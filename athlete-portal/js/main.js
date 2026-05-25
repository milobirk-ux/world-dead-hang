// ==============================================
// WDHC Athlete Portal - Main JavaScript
// Landing Page Functionality
// ==============================================

/**
 * Initialize landing page
 */
document.addEventListener('DOMContentLoaded', function() {
    // Load leaderboard preview
    loadLeaderboardPreview();
    
    // Animate stats
    animateStats();
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Setup smooth scrolling
    setupSmoothScroll();
});

/**
 * Load leaderboard preview data
 */
function loadLeaderboardPreview() {
    const leaderboardData = [
        { rank: 1, name: 'Alex Chen', country: '🇺🇸 USA', time: '5:22', prs: 24 },
        { rank: 2, name: 'Maria Rodriguez', country: '🇪🇸 Spain', time: '5:18', prs: 19 },
        { rank: 3, name: 'Kenji Tanaka', country: '🇯🇵 Japan', time: '5:15', prs: 31 },
        { rank: 4, name: 'Sarah Johnson', country: '🇬🇧 UK', time: '5:08', prs: 16 },
        { rank: 5, name: 'Lars Schmidt', country: '🇩🇪 Germany', time: '5:05', prs: 22 }
    ];
    
    const container = document.getElementById('leaderboard-preview');
    if (!container) return;
    
    container.innerHTML = leaderboardData.map(athlete => `
        <div class="table-row ${athlete.rank <= 3 ? 'podium' : ''}">
            <div class="table-cell rank-cell">
                <span class="rank-number">${athlete.rank}</span>
                ${athlete.rank === 1 ? '' : athlete.rank === 2 ? '' : athlete.rank === 3 ? '' : ''}
            </div>
            <div class="table-cell athlete-cell">
                <div class="athlete-name">${athlete.name}</div>
            </div>
            <div class="table-cell country-cell">${athlete.country}</div>
            <div class="table-cell time-cell">${athlete.time}</div>
            <div class="table-cell prs-cell">${athlete.prs}</div>
        </div>
    `).join('');
}

/**
 * Animate stats counter
 */
function animateStats() {
    const stats = [
        { id: 'athlete-count', target: , suffix: '+' },
        { id: 'pr-count', target: 15000, suffix: '+' },
        { id: 'country-count', target: 85, suffix: '+' }
    ];
    
    stats.forEach(stat => {
        const element = document.getElementById(stat.id);
        if (!element) return;
        
        animateCounter(element, stat.target, stat.suffix, 2000);
    });
}

/**
 * Animate a number counter
 */
function animateCounter(element, target, suffix, duration) {
    const start = 0;
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (target - start) * easeOutQuart);
        
        element.textContent = current.toLocaleString() + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

/**
 * Setup mobile menu toggle
 */
function setupMobileMenu() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
}

/**
 * Setup smooth scrolling for anchor links
 */
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            e.preventDefault();
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                const navMenu = document.querySelector('.nav-menu');
                const navToggle = document.querySelector('.nav-toggle');
                if (navMenu && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    navToggle?.classList.remove('active');
                }
            }
        });
    });
}
