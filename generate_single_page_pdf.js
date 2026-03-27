const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePDF() {
    console.log('Starting PDF generation for single-page WDHC flyer...');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Load the single page flyer
        const flyerPath = path.join(__dirname, 'flyer_single_page.html');
        const fileUrl = `file://${flyerPath}`;
        
        console.log(`Loading flyer from: ${fileUrl}`);
        await page.goto(fileUrl, { waitUntil: 'networkidle0' });
        
        // Wait for fonts and images to load
        await page.waitForTimeout(1000);
        
        // Generate print-optimized PDF
        console.log('Generating print-optimized PDF...');
        await page.pdf({
            path: path.join(__dirname, 'WDHC_Climbing_Gym_Flyer_Single_Page.pdf'),
            format: 'Letter',
            printBackground: true,
            margin: {
                top: '0.5in',
                bottom: '0.5in',
                left: '0.375in',
                right: '0.375in'
            },
            scale: 0.96, // Scale to fit 5.5" x 8.5" on Letter paper
            preferCSSPageSize: true
        });
        
        console.log('✅ Print-optimized PDF generated: WDHC_Climbing_Gym_Flyer_Single_Page.pdf');
        
        // Generate screen-optimized PDF
        console.log('Generating screen-optimized PDF...');
        await page.pdf({
            path: path.join(__dirname, 'WDHC_Climbing_Gym_Flyer_Single_Page_Screen.pdf'),
            format: 'Letter',
            printBackground: true,
            margin: {
                top: '0.75in',
                bottom: '0.75in',
                left: '0.75in',
                right: '0.75in'
            },
            scale: 0.8, // Smaller scale for comfortable screen viewing
            preferCSSPageSize: true
        });
        
        console.log('✅ Screen-optimized PDF generated: WDHC_Climbing_Gym_Flyer_Single_Page_Screen.pdf');
        
        // Verify file sizes
        const printPdfPath = path.join(__dirname, 'WDHC_Climbing_Gym_Flyer_Single_Page.pdf');
        const screenPdfPath = path.join(__dirname, 'WDHC_Climbing_Gym_Flyer_Single_Page_Screen.pdf');
        
        if (fs.existsSync(printPdfPath)) {
            const stats = fs.statSync(printPdfPath);
            console.log(`📄 Print PDF size: ${(stats.size / 1024).toFixed(2)} KB`);
        }
        
        if (fs.existsSync(screenPdfPath)) {
            const stats = fs.statSync(screenPdfPath);
            console.log(`📄 Screen PDF size: ${(stats.size / 1024).toFixed(2)} KB`);
        }
        
        console.log('\n🎉 PDF generation complete!');
        console.log('\nFiles created:');
        console.log('1. WDHC_Climbing_Gym_Flyer_Single_Page.pdf - Print-optimized (5.5" x 8.5")');
        console.log('2. WDHC_Climbing_Gym_Flyer_Single_Page_Screen.pdf - Screen-optimized');
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

// Run the generation
generatePDF();