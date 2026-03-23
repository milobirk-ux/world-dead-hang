# PowerShell script to create proper draft with video
$sourceFile = "index_draft_proper.html"
$outputFile = "index_with_video_final.html"

# Read the entire file
$content = Get-Content $sourceFile -Raw

# Find where to insert the video section (after </nav> and before the main content)
# First, find the closing </nav> tag
$navEnd = $content.IndexOf('</nav>') + 6

# Find the next opening tag after </nav>
$afterNav = $content.Substring($navEnd, 200)
Write-Host "Content after nav: $afterNav"

# The structure should be: </nav> then marquee-container, then main content
# We'll insert the video section after the marquee-container

# Create video section HTML
$videoSection = @"

    <!-- Featured Video Section - DRAFT ADDITION -->
    <section class="featured-video-draft" style="
        background: linear-gradient(135deg, #0a0a0a 0%, #111 100%);
        padding: 40px 20px;
        border-bottom: 1px solid #222;
        text-align: center;
        margin: 20px auto;
        max-width: 1200px;
        border-radius: 12px;
        border: 1px solid #333;
    ">
        <h2 style="
            font-family: 'Oswald', sans-serif;
            font-size: 2rem;
            color: #D4AF37;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
        ">
            🎬 1-MINUTE MAXIMUM FORMULA
        </h2>
        
        <p style="
            font-size: 1.1rem;
            color: #888;
            margin-bottom: 30px;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
        ">
            Watch Milo Birk's vertical dead hang compressed from 4:33 to exactly 1:00
        </p>
        
        <div style="
            max-width: 800px;
            margin: 0 auto 30px;
            background: #000;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            border: 2px solid #D4AF37;
        ">
            <video style="width: 100%; height: 450px; background: #000;" controls 
                   poster="https://drive.google.com/thumbnail?id=1xYlyMk_6_AtwPZrDnWZ8HjHAgyqcJIj7&sz=w800">
                <source src="https://drive.google.com/uc?export=download&id=1xYlyMk_6_AtwPZrDnWZ8HjHAgyqcJIj7" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        </div>
        
        <div style="
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        ">
            <div style="
                background: rgba(255, 255, 255, 0.05);
                padding: 15px;
                border-radius: 8px;
                min-width: 150px;
                border: 1px solid #333;
            ">
                <div style="
                    font-family: 'Roboto Mono', monospace;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #D4AF37;
                    margin-bottom: 5px;
                ">4:33.00</div>
                <div style="
                    font-size: 0.9rem;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">Original</div>
            </div>
            
            <div style="
                background: rgba(255, 255, 255, 0.05);
                padding: 15px;
                border-radius: 8px;
                min-width: 150px;
                border: 1px solid #333;
            ">
                <div style="
                    font-family: 'Roboto Mono', monospace;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #D4AF37;
                    margin-bottom: 5px;
                ">1:00.00</div>
                <div style="
                    font-size: 0.9rem;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">Edited</div>
            </div>
            
            <div style="
                background: rgba(255, 255, 255, 0.05);
                padding: 15px;
                border-radius: 8px;
                min-width: 150px;
                border: 1px solid #333;
            ">
                <div style="
                    font-family: 'Roboto Mono', monospace;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #D4AF37;
                    margin-bottom: 5px;
                ">3:33.00</div>
                <div style="
                    font-size: 0.9rem;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">Time Saved</div>
            </div>
            
            <div style="
                background: rgba(255, 255, 255, 0.05);
                padding: 15px;
                border-radius: 8px;
                min-width: 150px;
                border: 1px solid #333;
            ">
                <div style="
                    font-family: 'Roboto Mono', monospace;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #D4AF37;
                    margin-bottom: 5px;
                ">78.0%</div>
                <div style="
                    font-size: 0.9rem;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">Faster</div>
            </div>
        </div>
        
        <div style="
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            border: 1px solid #333;
        ">
            <h3 style="
                font-family: 'Oswald', sans-serif;
                font-size: 1.2rem;
                color: #D4AF37;
                margin-bottom: 15px;
                text-transform: uppercase;
            ">NORMAL→FAST→NORMAL FORMULA</h3>
            
            <p style="color: #ccc; line-height: 1.6; margin-bottom: 15px;">
                <strong>Step 1:</strong> First 5 seconds normal speed (establishing)<br>
                <strong>Step 2:</strong> Middle 263 seconds at 5.26x speed (compressed to 50s)<br>
                <strong>Step 3:</strong> Last 5 seconds normal speed (finish)
            </p>
            
            <p style="color: #888; font-size: 0.9rem; font-style: italic;">
                This is a draft placement for the 1-minute video. Final position to be determined.
            </p>
        </div>
    </section>
    <!-- End Featured Video Section -->

"@

# Insert the video section after the closing </nav> tag
$newContent = $content.Insert($navEnd, $videoSection)

# Write the new file
$newContent | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "Created $outputFile with video section added"
Write-Host "File size: $((Get-Item $outputFile).Length) bytes"