const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const reporter = require("cucumber-html-reporter");

const REPORTS_DIR = path.join(__dirname, "reports");
const JSON_REPORT_PATH = path.join(REPORTS_DIR, "cucumber_report.json");
const HTML_REPORT_PATH = path.join(REPORTS_DIR, "cucumber_report.html");


function sleep(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}


function writeFileSyncRetry(file, data, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            fs.writeFileSync(file, data, "utf8");
            return;
        } catch (e) {
            if (e.code !== "EBUSY") throw e;
            sleep(150);
        }
    }
}

function openReport(filePath) {
    if (process.env.CI || !fs.existsSync(filePath)) return;

    let command;
    let args;

    if (process.platform === "win32") {
        command = "cmd";
        args = ["/c", "start", "", filePath];
    } else if (process.platform === "darwin") {
        command = "open";
        args = [filePath];
    } else {
        command = "xdg-open";
        args = [filePath];
    }

    const child = spawn(command, args, {
        detached: true,
        stdio: "ignore"
    });

    child.on("error", (error) => {
        console.warn(`Unable to open report automatically: ${error.message}`);
    });

    child.unref();
}


function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);

    if (h) return `${h}h ${m % 60}m ${s % 60}s`;
    if (m) return `${m}m ${s % 60}s`;
    return `${s}s`;
}



function analyzeReport(features) {

    const stats = {
        features: features.length,
        scenarios: 0,
        steps: 0,
        passedScenarios: 0,
        failedScenarios: 0,
        skippedScenarios: 0,
        passedSteps: 0,
        failedSteps: 0,
        skippedSteps: 0,
        duration: 0,
        failures: []
    };


    for (const feature of features) {

        const scenarios = feature.elements || [];

        for (const scenario of scenarios) {

            stats.scenarios++;

            let failed = false;
            let skipped = false;

            for (const step of scenario.steps || []) {

                stats.steps++;

                const status = step.result?.status;
                const duration = step.result?.duration || 0;

                stats.duration += duration / 1000000;

                if (status === "passed") stats.passedSteps++;
                else if (status === "failed") {
                    stats.failedSteps++;
                    failed = true;
                }
                else skipped = true;

            }

            if (failed) {
                stats.failedScenarios++;
                stats.failures.push(scenario.name);
            }
            else if (skipped) stats.skippedScenarios++;
            else stats.passedScenarios++;

        }

    }

    stats.passRate = stats.scenarios
        ? ((stats.passedScenarios / stats.scenarios) * 100).toFixed(1)
        : 0;

    stats.durationText = formatDuration(stats.duration);

    return stats;
}



function buildDashboard(stats) {

    const status =
        stats.passRate > 95
            ? ["Healthy", "ok"]
            : stats.passRate > 80
                ? ["Stable", "warn"]
                : ["Critical", "bad"];

    const failures = stats.failures
        .slice(0, 5)
        .map(f => `<li>${f}</li>`)
        .join("");

    return `

<section class="qa-dashboard">

<div class="qa-header">

<div class="qa-title">
<h1>Go Ceylon Test Report</h1>
<span>End-to-End Quality Summary</span>
</div>

<div class="qa-health ${status[1]}">
${status[0]}
</div>

</div>


<div class="qa-metrics">

<div class="qa-card">
<label>Pass Rate</label>
<strong>${stats.passRate}%</strong>
</div>

<div class="qa-card">
<label>Total Scenarios</label>
<strong>${stats.scenarios}</strong>
</div>

<div class="qa-card">
<label>Total Steps</label>
<strong>${stats.steps}</strong>
</div>

<div class="qa-card">
<label>Execution Time</label>
<strong>${stats.durationText}</strong>
</div>

<div class="qa-card">
<label>Failures</label>
<strong>${stats.failedScenarios}</strong>
</div>

</div>

${stats.failures.length
            ? `<div class="qa-failures">
<h3>Failed Scenarios</h3>
<ul>${failures}</ul>
</div>`
            : ""
        }

</section>

`;
}




function applyStyling(stats) {

    if (!fs.existsSync(HTML_REPORT_PATH)) return;

    const style = `

<style id="qa-style">

body{
font-family: "Segoe UI", Arial, sans-serif;
background:#f6f8fb;
}

.qa-dashboard{
background:#ffffff;
border:1px solid #e4e7ec;
border-radius:4px;
padding:24px;
margin-bottom:20px;
}


.qa-header{
display:flex;
justify-content:space-between;
align-items:center;
margin-bottom:24px;
}

.qa-title h1{
margin:0;
font-size:22px;
font-weight:600;
color:#1f2937;
}

.qa-title span{
font-size:13px;
color:#6b7280;
}


.qa-health{
font-size:12px;
font-weight:600;
padding:5px 12px;
border-radius:4px;
border:1px solid;
}

.qa-health.ok{
color:#1f8f62;
background:#ecfdf5;
border-color:#a7f3d0;
}

.qa-health.warn{
color:#d97706;
background:#fffbeb;
border-color:#fde68a;
}

.qa-health.bad{
color:#c14137;
background:#fef2f2;
border-color:#fecaca;
}


.qa-metrics{
display:grid;
grid-template-columns:repeat(5,1fr);
gap:14px;
margin-bottom:18px;
}


.qa-card{
border:1px solid #e5e7eb;
border-radius:4px;
padding:16px;
background:#fafafa;
}

.qa-card label{
display:block;
font-size:12px;
color:#6b7280;
margin-bottom:6px;
}

.qa-card strong{
font-size:20px;
font-weight:600;
color:#0f5d8d;
}


.qa-failures{
border:1px solid #f3d1d1;
border-radius:4px;
padding:16px;
background:#fffafa;
}

.qa-failures h3{
margin-top:0;
font-size:15px;
color:#c14137;
}

.qa-failures ul{
padding-left:18px;
margin:8px 0 0;
}

.qa-failures li{
font-size:13px;
margin-bottom:4px;
}

</style>

`;

    const dashboard = buildDashboard(stats);

    let html = fs.readFileSync(HTML_REPORT_PATH, "utf8");

    html = html.replace("</head>", `${style}</head>`);

    html = html.replace(
        '<div class="count-wrapper mb-20px">',
        `${dashboard}\n<div class="count-wrapper mb-20px">`
    );

    writeFileSyncRetry(HTML_REPORT_PATH, html);

}



function main() {

    if (!fs.existsSync(JSON_REPORT_PATH)) {
        console.error("JSON report not found");
        process.exit(1);
    }

    const json = JSON.parse(fs.readFileSync(JSON_REPORT_PATH));

    const stats = analyzeReport(json);

    const options = {

        theme: "bootstrap",
        jsonFile: JSON_REPORT_PATH,
        output: HTML_REPORT_PATH,

        reportSuiteAsScenarios: true,
        scenarioTimestamp: true,

        launchReport: false,

        name: "Go Ceylon E2E Report",

        metadata: {
            Project: "Go Ceylon",
            Environment: process.env.CI ? "CI Pipeline" : "Local",
            Platform: os.platform(),
            Node: process.version
        }

    };


    reporter.generate(options);

    applyStyling(stats);

    openReport(HTML_REPORT_PATH);

    console.log("Professional report generated:", HTML_REPORT_PATH);

}


main();