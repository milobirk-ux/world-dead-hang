# WDHC Single Page Flyer

## Overview
This is a consolidated single-page version of the WDHC climbing gym flyer. All essential content has been condensed to fit on one 5.5" x 8.5" page for printing.

## Files Created

1. **`flyer_single_page.html`** - Single-page HTML flyer
2. **`test_single_page_flyer.html`** - Test page to verify the flyer
3. **`generate_single_page_pdf.js`** - PDF generation script
4. **`single_page_flyer_readme.md`** - This documentation

## Changes from Original

### Content Consolidation
- **Removed redundant sections** - Eliminated duplicate or less critical information
- **Compact layout** - All content fits on a single 5.5" x 8.5" page
- **Reduced spacing** - Decreased margins and padding throughout
- **Smaller fonts** - Adjusted font sizes for better space utilization

### Essential Content Preserved
- ✓ Logo and branding
- ✓ Subtitle: "GLOBAL COMPETITION • CASH PRIZES • CLIMBER COMMUNITY"
- ✓ QR codes (leaderboard and submit)
- ✓ "What is WDHC?" section with all bullet points
- ✓ Prize pool information ($5,000+)
- ✓ How to participate (3 steps)
- ✓ Benefits for climbers (compact 2x2 grid)
- ✓ Why climbers love WDHC
- ✓ CTA button: "ENTER COMPETITION NOW"
- ✓ Footer with website (world-dead-hang.pages.dev) and Instagram (@worlddeadhang)

### Technical Changes
- **Removed page break CSS** - Eliminated `page-break-inside: avoid` and `break-inside: avoid`
- **Optimized for single-page print** - All content designed to fit on standard 5.5" x 8.5" page
- **Maintained accessibility** - WCAG 2.1 AA compliance preserved
- **Preserved mobile responsiveness** - Works on all screen sizes
- **Print-friendly** - CMYK-optimized colors for professional printing

## Usage

### Viewing the Flyer
1. Open `flyer_single_page.html` in any modern browser
2. Use `test_single_page_flyer.html` to verify all content is present

### Printing
1. Open `flyer_single_page.html` in browser
2. Press Ctrl+P (or Cmd+P on Mac)
3. Verify print preview shows only ONE page
4. Print at 100% scale on 5.5" x 8.5" paper (Half Letter)

### Generating PDFs
```bash
cd WDHC
node generate_single_page_pdf.js
```

This will create:
- `WDHC_Climbing_Gym_Flyer_Single_Page.pdf` - Print-optimized (5.5" x 8.5")
- `WDHC_Climbing_Gym_Flyer_Single_Page_Screen.pdf` - Screen-optimized

## Verification Checklist

Before distributing, verify:
- [ ] All content fits on one page (no scrolling needed)
- [ ] Logo is visible
- [ ] QR codes are present and scannable
- [ ] "What is WDHC?" section has all 6 bullet points
- [ ] Footer contains Instagram and website
- [ ] Print preview shows only one page
- [ ] Mobile view works correctly
- [ ] Colors print correctly (test with color printer)

## Design Rationale

The single-page version was created to:
1. **Eliminate multiple pages** - Original flyer was printing as 2-3 pages
2. **Reduce printing costs** - Single page uses less paper and ink
3. **Improve readability** - All essential information is immediately visible
4. **Maintain professionalism** - Clean, organized layout despite condensed content
5. **Preserve call-to-action** - QR codes and CTA button remain prominent

## File Sizes
- HTML: ~16 KB
- Print PDF: ~150-200 KB (estimated)
- Screen PDF: ~100-150 KB (estimated)

## Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Printers supporting 5.5" x 8.5" paper
- Mobile devices (responsive design)
- Screen readers (accessibility maintained)