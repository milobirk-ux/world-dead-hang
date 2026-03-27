# PowerShell script to create draft with video at bottom
$sourceFile = "index_draft_proper.html"
$outputFile = "index_video_bottom.html"

# Read the entire file
$content = Get-Content $sourceFile -Raw

# Find where to insert the video section (before </body> tag)
$bodyEnd = $content.IndexOf('</body>')

# Create smaller video section for bottom
$videoSection = @"

    <!-- Featured Video Section - Bottom Placement (DRAFT) -->
    <section class="featured-video-bottom" style="
        background: rgba(10, 10, 10, 0.8);
        padding: 30px 20px;
        border-top: 1px solid #333;
        text-align: center;
        margin: 40px auto 0;
        max-width: 1000px;
    ">
        <h3 style="
            font-family: 'Oswald', sans-serif;
            font-size: 1.5rem;
            color: #D4AF37;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
        ">
            🎬 Featured Dead Hang: 4:33 → 1:00
        </h3>
        
        <div style="
            max-width: 600px;
            margin: 0 auto 20px;
            background: #000;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            border: 1px solid #444;
        ">
            <video style="width: 100%; height: 300px; background: #000;" controls 
                   poster="https://drive.google.com/thumbnail?id=1xYlyMk_6_AtwPZrDnWZ8HjHAgyqcJIj7&sz=w600">
                <source src="https://drive.google.com/uc?export=download&id=1xYlyMk_6_AtwPZrDnWZ8HjHAgyqcJIj7" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        </div>
        
        <div style="
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        ">
            <div style="
                background: rgba(255, 255, 255, 0.03);
                padding: 10px 15px;
                border-radius: 6px;
                min-width: 120px;
                border: 1px solid #333;
            ">
                <div style="
                    font-family: 'Roboto Mono', monospace;
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #D4AF37;
                    margin-bottom: 3px;
                ">4:33.00</div>
                <div style="
                    font-size: 0.8rem;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">Original</div>
            </div>
            
            <div style="
                background: rgba(255, 255, 255, 0.03);
                padding: 10px 15px;
                border-radius: 6px;
                min-width: 120px;
                border: 1px solid #333;
            ">
                <div style="
                    font-family: 'Roboto Mono', monospace;
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #D4AF37;
                    margin-bottom: 3px;
                ">1:00.00</div>
                <div style="
                    font-size: 0.8rem;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">Edited</div>
            </div>
            
            <div style="
                background: rgba(255, 255, 255, 0.03);
                padding: 10px 15px;
                border-radius: 6px;
                min-width: 120px;
                border: 1px solid #333;
            ">
                <div style="
                    font-family: 'Roboto Mono', monospace;
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #D4AF37;
                    margin-bottom: 3px;
                ">78%</div>
                <div style="
                    font-size: 0.8rem;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">Faster</div>
            </div>
        </div>
        
        <div style="
            max-width: 600px;
            margin: 0 auto;
            padding: 15px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 6px;
            border: 1px solid #333;
            font-size: 0.9rem;
            color: #aaa;
        ">
            <p style="margin-bottom: 10px;">
                <strong>Normal→Fast→Normal Formula:</strong> 5s normal → 263s at 5.26x → 5s normal
            </p>
            <p style="font-size: 0.8rem; color: #666; font-style: italic;">
                This is a draft placement. Video shows Milo Birk's vertical dead hang.
            </p>
        </div>
    </section>
    <!-- End Featured Video Section -->

"@

# Insert the video section before the closing </body> tag
$newContent = $content.Insert($bodyEnd, $videoSection)

# Write the new file
$newContent | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "Created $outputFile with video at bottom"
Write-Host "File size: $((Get-Item $outputFile).Length) bytes"