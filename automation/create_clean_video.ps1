# PowerShell script to create clean video-only version
$sourceFile = "index_draft_proper.html"
$outputFile = "index_video_clean.html"

# Read the entire file
$content = Get-Content $sourceFile -Raw

# Find where to insert the video section (before </body> tag)
$bodyEnd = $content.IndexOf('</body>')

# Create clean video-only section for bottom
$videoSection = @"

    <!-- Video Only Section - Bottom (DRAFT) -->
    <div style="
        max-width: 500px;
        margin: 40px auto;
        padding: 20px;
        text-align: center;
    ">
        <h4 style="
            font-family: 'Oswald', sans-serif;
            font-size: 1.2rem;
            color: #D4AF37;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
        ">
            Featured Dead Hang
        </h4>
        
        <!-- Direct video embed - no Google Drive wrapper -->
        <div style="
            background: #000;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            border: 1px solid #444;
        ">
            <video style="width: 100%; height: 280px;" controls 
                   poster="https://drive.google.com/thumbnail?id=1xYlyMk_6_AtwPZrDnWZ8HjHAgyqcJIj7&sz=w500">
                <source src="https://drive.google.com/uc?export=download&id=1xYlyMk_6_AtwPZrDnWZ8HjHAgyqcJIj7" type="video/mp4">
                Your browser does not support HTML5 video. 
                <a href="https://drive.google.com/file/d/1xYlyMk_6_AtwPZrDnWZ8HjHAgyqcJIj7/view" target="_blank">Download video</a>
            </video>
        </div>
        
        <p style="
            margin-top: 10px;
            font-size: 0.8rem;
            color: #888;
            font-style: italic;
        ">
            Draft placement - 1-minute compressed version
        </p>
    </div>
    <!-- End Video Only Section -->

"@

# Insert the video section before the closing </body> tag
$newContent = $content.Insert($bodyEnd, $videoSection)

# Write the new file
$newContent | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "Created $outputFile with clean video-only section"
Write-Host "File size: $((Get-Item $outputFile).Length) bytes"