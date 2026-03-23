# PowerShell script to create version with video in footer
$sourceFile = "index_draft_proper.html"
$outputFile = "index_video_footer.html"

# Read the entire file
$content = Get-Content $sourceFile -Raw

# Find the footer section (look for footer class or div)
$footerStart = $content.IndexOf('<footer')
$footerEnd = $content.IndexOf('</footer>') + 9

# Get the footer content
$footerContent = $content.Substring($footerStart, $footerEnd - $footerStart)

# Create modified footer with video
$newFooter = @'
<footer style="
    background: #000;
    border-top: 1px solid #222;
    padding: 30px 20px;
    margin-top: 40px;
">
    <div style="
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 40px;
    ">
        <!-- Left: Footer Logo -->
        <div style="flex: 0 0 auto;">
            <div class="footer-logo">
                <img src="media/new_wdhc_logo.jpg" alt="WDHC Logo" style="height: 60px;">
            </div>
        </div>
        
        <!-- Middle: Video -->
        <div style="flex: 1; max-width: 400px;">
            <div style="
                background: #111;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                border: 1px solid #333;
            ">
                <div style="padding: 10px; background: #0a0a0a; border-bottom: 1px solid #222;">
                    <h4 style="
                        font-family: 'Oswald', sans-serif;
                        font-size: 1rem;
                        color: #D4AF37;
                        margin: 0;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        text-align: center;
                    ">
                        Featured Dead Hang
                    </h4>
                </div>
                
                <!-- Try YouTube-style embed for better compatibility -->
                <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
                    <iframe 
                        src="https://drive.google.com/file/d/1xYlyMk_6_AtwPZrDnWZ8HjHAgyqcJIj7/preview" 
                        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
                        allow="autoplay; encrypted-media"
                        allowfullscreen
                        title="WDHC Featured Dead Hang">
                    </iframe>
                </div>
                
                <div style="padding: 8px; background: #0a0a0a; border-top: 1px solid #222; text-align: center;">
                    <a href="https://drive.google.com/file/d/1xYlyMk_6_AtwPZrDnWZ8HjHAgyqcJIj7/view" 
                       target="_blank"
                       style="
                           color: #888;
                           font-size: 0.7rem;
                           text-decoration: none;
                           font-family: 'Roboto Mono', monospace;
                       ">
                       Open in Google Drive ↗
                    </a>
                </div>
            </div>
        </div>
        
        <!-- Right: Footer Links -->
        <div style="flex: 0 0 auto;">
            <div class="footer-links" style="
                display: flex;
                flex-direction: column;
                gap: 10px;
                align-items: flex-end;
            ">
                <a href="index.html">Leaderboard</a>
                <a href="submit.html">Submit</a>
                <a href="rules.html">Rules</a>
                <a href="test.html">Test Your Grip</a>
                <a href="privacy.html">Privacy</a>
                <a href="terms.html">Terms</a>
            </div>
        </div>
    </div>
    
    <div class="footer-bottom" style="
        color: #666;
        font-size: 0.8rem;
        border-top: 1px solid #222;
        padding-top: 20px;
        margin-top: 30px;
        text-align: center;
    ">
        © 2026 World Dead Hang Championship. All rights reserved.
    </div>
</footer>
'@

# Replace the footer with new version
$newContent = $content.Remove($footerStart, $footerEnd - $footerStart)
$newContent = $newContent.Insert($footerStart, $newFooter)

# Write the new file
$newContent | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "Created $outputFile with video in footer"
Write-Host "File size: $((Get-Item $outputFile).Length) bytes"