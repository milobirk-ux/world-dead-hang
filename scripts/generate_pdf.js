const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generatePDF() {
    console.log('Starting PDF generation...');
    
    const htmlFile = path.join(__dirname, 'flyer_climbing_gym_optimized.html');
    const pdfFile = path.join(__dirname, 'WDHC_Climbing_Gym_Flyer_Optimized.pdf');
    
    // Read HTML content
    const htmlContent = fs.readFileSync(htmlFile, 'utf8');
    
    // Launch browser
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Set viewport to match flyer dimensions (5.5" x 8.5" at 96 DPI)
        await page.setViewport({
            width: 528,  // 5.5 inches at 96 DPI
            height: 816, // 8.5 inches at 96 DPI
            deviceScaleFactor: 2 // Higher resolution for better print quality
        });
        
        // Set HTML content
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });
        
        // Wait for fonts and images to load
        await page.evaluateHandle('document.fonts.ready');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Generating PDF with print-optimized settings...');
        
        // Generate PDF with print-optimized settings
        const pdf = await page.pdf({
            path: pdfFile,
            format: 'Letter', // US Letter size
            printBackground: true,
            displayHeaderFooter: false,
            margin: {
                top: '0.5in',
                bottom: '0.5in',
                left: '0.375in',
                right: '0.375in'
            },
            scale: 0.96, // Scale to fit 5.5" x 8.5" on Letter paper
            preferCSSPageSize: true,
            timeout: 30000
        });
        
        console.log(`PDF generated successfully: ${pdfFile}`);
        console.log(`PDF size: ${pdf.length} bytes`);
        
        // Also create a screen-optimized version
        const screenPdfFile = path.join(__dirname, 'WDHC_Climbing_Gym_Flyer_Screen.pdf');
        await page.pdf({
            path: screenPdfFile,
            format: 'Letter',
            printBackground: true,
            displayHeaderFooter: false,
            margin: {
                top: '0.5in',
                bottom: '0.5in',
                left: '0.5in',
                right: '0.5in'
            },
            scale: 0.8,
            preferCSSPageSize: false
        });
        
        console.log(`Screen-optimized PDF generated: ${screenPdfFile}`);
        
        return {
            printPdf: pdfFile,
            screenPdf: screenPdfFile,
            size: pdf.length
        };
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run if called directly
if (require.main === module) {
    generatePDF().then(result => {
        console.log('\n=== PDF Generation Complete ===');
        console.log('Print-optimized PDF:', result.printPdf);
        console.log('Screen-optimized PDF:', result.screenPdf);
        console.log('File size:', Math.round(result.size / 1024) + ' KB');
        process.exit(0);
    }).catch(error => {
        console.error('Failed to generate PDF:', error);
        process.exit(1);
    });
}

module.exports = { generatePDF };