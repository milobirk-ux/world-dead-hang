# PowerShell script to create version with direct video embed
$sourceFile = "index_draft_proper.html"
$outputFile = "index_video_direct.html"

# Read the entire file
$content = Get-Content $sourceFile -Raw

# Find where to insert the video section (before </body> tag)
$bodyEnd = $content.IndexOf('</body>')

# Create video section with direct embed
$videoSection = @"

    <!-- Video Only - Direct Embed (DRAFT) -->
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
        
        <!-- Try iframe embed for Google Drive -->
        <div style="
            background: #000;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            border: 1px solid #444;
        ">
            <iframe 
                src="https://drive.google.com/file/d/1xYlyMk_6_AtwPZrDnWZ8HjHAgyqcJIj7/preview" 
                style="width: 100%; height: 280px; border: none;"
                allow="autoplay"
                allowfullscreen>
            </iframe>
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
    <!-- End Video Section -->

"@

# Insert the video section before the closing </body> tag
$newContent = $content.Insert($bodyEnd, $videoSection)

# Write the new file
$newContent | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "Created $outputFile with direct iframe embed"
Write-Host "File size: $((Get-Item $outputFile).Length) bytes"