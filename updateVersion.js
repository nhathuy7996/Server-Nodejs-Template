// updateVersion.js
const fs = require("fs");
const path = require("path");

const configPath = path.resolve(__dirname, "src/public/StreamingAssets/config.json");

if (!fs.existsSync(configPath)) {
  console.error("Không tìm thấy StreamingAssets/config.json");
  process.exit(1);
}

const raw = fs.readFileSync(configPath, "utf-8");
let config;
try {
  config = JSON.parse(raw);
} catch (e) {
  console.error("config.json không phải JSON hợp lệ");
  process.exit(1);
}

if (!config.VERSION || typeof config.VERSION !== "string") {
  console.error("Thiếu hoặc sai kiểu field VERSION trong config.json (cần string)");
  process.exit(1);
}

const semver = config.VERSION.trim();
const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(semver);
if (!m) {
  console.error(`VERSION "${semver}" không đúng định dạng x.y.z (vd: 1.0.0)`);
  process.exit(1);
}

// Chọn mức tăng: mặc định "patch"; có thể truyền qua env BUMP=minor/major/patch
const bump = (process.env.BUMP || "patch").toLowerCase();

let [_, major, minor, patch] = m.map(Number);
if (bump === "major") {
  major += 1; minor = 0; patch = 0;
} else if (bump === "minor") {
  minor += 1; patch = 0;
} else {
  patch += 1; // patch
}

const next = `${major}.${minor}.${patch}`;
config.VERSION = next;

// Ghi lại (giữ format đẹp)
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

console.log(`VERSION: ${semver} -> ${next}`);
