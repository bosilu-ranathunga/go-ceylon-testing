const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const reportsDir = path.join(__dirname, "reports");
const jsonReportPath = path.join(reportsDir, "cucumber_report.json");
const generateReportScript = path.join(__dirname, "generate-report.js");

function resolveCucumberBin() {
    const packageJsonPath = require.resolve("@cucumber/cucumber/package.json");
    return path.join(path.dirname(packageJsonPath), "bin", "cucumber-js");
}

function runNodeScript(scriptPath, args) {
    return spawnSync(process.execPath, [scriptPath, ...args], {
        cwd: __dirname,
        stdio: "inherit",
        env: process.env
    });
}

function exitWithResult(result) {
    if (result.error) {
        throw result.error;
    }

    if (typeof result.status === "number") {
        process.exit(result.status);
    }

    process.exit(1);
}

fs.mkdirSync(reportsDir, { recursive: true });

const cucumberArgs = [
    resolveCucumberBin(),
    "--require",
    "support/**/*.js",
    "--require",
    "step-definitions/**/*.js",
    "--format",
    "progress",
    "--format",
    "json:reports/cucumber_report.json"
];

const testResult = runNodeScript(cucumberArgs[0], cucumberArgs.slice(1));

if (fs.existsSync(jsonReportPath)) {
    const reportResult = runNodeScript(generateReportScript, []);

    if (reportResult.error) {
        console.warn(`Report generation failed: ${reportResult.error.message}`);
    }
}

exitWithResult(testResult);
