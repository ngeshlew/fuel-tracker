const fs = require('fs');
const puppeteer = require('puppeteer'); // v23.0.0 or later

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const timeout = 5000;
    page.setDefaultTimeout(timeout);

    const lhApi = await import('lighthouse'); // v10.0.0 or later
    const flags = {
        screenEmulation: {
            disabled: true
        }
    }
    const config = lhApi.desktopConfig;
    const lhFlow = await lhApi.startFlow(page, {name: 'Recording 11/23/2025 at 9:47:51 PM', config, flags});
    {
        const targetPage = page;
        await targetPage.setViewport({
            width: 1428,
            height: 404
        })
    }
    await lhFlow.startNavigation();
    {
        const targetPage = page;
        await targetPage.goto('https://fuel-tracker-up.netlify.app/');
    }
    await lhFlow.endNavigation();
    await lhFlow.startTimespan();
    {
        const targetPage = page;
        await puppeteer.Locator.race([
            targetPage.locator('::-p-aria(Add Topup)'),
            targetPage.locator('div.group\\/sidebar-wrapper button.bg-primary'),
            targetPage.locator('::-p-xpath(//*[@id=\\"root\\"]/div[1]/div/div[3]/div/main/header/div/div/div[2]/button[3])'),
            targetPage.locator(':scope >>> div.group\\/sidebar-wrapper button.bg-primary'),
            targetPage.locator('::-p-text(Add TopupAdd)')
        ])
            .setTimeout(timeout)
            .click({
              offset: {
                x: 69,
                y: 40,
              },
            });
    }
    {
        const targetPage = page;
        await puppeteer.Locator.race([
            targetPage.locator('::-p-aria(Try Again)'),
            targetPage.locator('button.bg-primary'),
            targetPage.locator('::-p-xpath(//*[@id=\\"root\\"]/div/div/div[2]/div/button[1])'),
            targetPage.locator(':scope >>> button.bg-primary'),
            targetPage.locator('::-p-text(Try Again)')
        ])
            .setTimeout(timeout)
            .click({
              offset: {
                x: 141,
                y: 28,
              },
            });
    }
    await lhFlow.endTimespan();
    await lhFlow.startNavigation();
    {
        const targetPage = page;
        const promises = [];
        const startWaitingForEvents = () => {
            promises.push(targetPage.waitForNavigation());
        }
        await puppeteer.Locator.race([
            targetPage.locator('::-p-aria(Refresh Page)'),
            targetPage.locator('button.border'),
            targetPage.locator('::-p-xpath(//*[@id=\\"root\\"]/div/div/div[2]/div/button[2])'),
            targetPage.locator(':scope >>> button.border'),
            targetPage.locator('::-p-text(Refresh Page)')
        ])
            .setTimeout(timeout)
            .on('action', () => startWaitingForEvents())
            .click({
              offset: {
                x: 80,
                y: 35,
              },
            });
        await Promise.all(promises);
    }
    await lhFlow.endNavigation();
    const lhFlowReport = await lhFlow.generateReport();
    fs.writeFileSync(__dirname + '/flow.report.html', lhFlowReport)

    await browser.close();

})().catch(err => {
    console.error(err);
    process.exit(1);
});
