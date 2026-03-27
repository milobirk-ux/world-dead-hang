// TIER BADGE GENERATOR - MATCHES WEBSITE DESIGN
function getTierBadgeHTML(tierName) {
    const tierStyles = {
        "Freak": "background: #9900ff; color: #fff; box-shadow: 0 0 10px rgba(153, 0, 255, 0.4);",
        "Legend": "background: #D4AF37; color: #000; box-shadow: 0 0 10px rgba(212, 175, 55, 0.25);",
        "Elite": "background: #E0E0E0; color: #000;",
        "Pro": "background: #cc0000; color: #fff;",
        "Contender": "border: 1px solid #666; color: #ccc;",
        "Challenger": "border: 1px solid #1E8449; color: #1E8449;"
    };
    
    const style = tierStyles[tierName] || "background: #666; color: #fff;";
    
    return `<span style="display: inline-block; padding: 5px 10px; border-radius: 4px; font-family: 'Roboto Mono', monospace; font-size: 0.75rem; font-weight: 700; ${style}">${tierName.toUpperCase()}</span>`;
}

// UPDATED MOTIVATIONAL TEXT WITH TIER BADGES
function getMotivationalTextWithBadges(formattedTime, currentTier, nextTier, gap) {
    const currentTierBadge = getTierBadgeHTML(currentTier);
    const nextTierBadge = gap === -1 ? "" : getTierBadgeHTML(nextTier);
    
    if (gap === -1) {
        return `You're in the ${currentTierBadge} tier! You have officially transcended human limits.`;
    } else {
        return `Congrats on hitting <strong>${formattedTime}</strong>! You're in the ${currentTierBadge} tier, and you're only <strong>${formatSecondsToMinutes(gap)}</strong> away from leveling up to the ${nextTierBadge} tier. Keep going!`;
    }
}

// UPDATED EMAIL BODY WITH TIER BADGES
function getEmailBodyWithTierBadges(firstName, motivationalText, gripAgeDesc, gripAgeData, formattedTime, randomFact) {
    return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h2 style="color: #000;">Hey ${firstName},</h2>
        <p>This is Milo from the World Dead Hang Championship.</p>
        <p>I just wanted to personally let you know that we received your submission and our team is reviewing your video proof now.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #D4AF37; margin: 20px 0;">
            ${motivationalText}
        </div>
        
        <p>As ${gripAgeDesc} grip athlete${gripAgeData.age ? ` (Grip Age: ${gripAgeData.age}, Chronological: ${gripAgeData.chronologicalAge})` : ''}, your performance shows in that impressive ${formattedTime} hold! We review every single hang manually to protect the integrity of the leaderboard.</p>
        
        <p>You can expect to see your official ranking go live on <strong>worlddeadhang.com</strong> within 24-48 hours if everything looks good.</p>
        
        <p style="color: #777; font-size: 0.9em;"><em>${randomFact}</em></p>
        
        <br>
        <p>Stay gritty,<br>
        <strong>Milo</strong><br>
        Co-Founder, WDHC</p>
    </div>
    `;
}