const reporter = require('cucumber-html-reporter');

const options = {
    theme: 'bootstrap',
    jsonFile: 'reports/cucumber_report.json',
    output: 'reports/cucumber_report.html',
    reportSuiteAsScenarios: true,
    scenarioTimestamp: true,
    launchReport: !process.env.CI,
    metadata: {
        'App Version': '1.0',
        'Test Environment': 'Local',
        Browser: 'Chromium',
        Platform: 'Windows',
        Executed: 'Local Machine'
    }
};

reporter.generate(options);
