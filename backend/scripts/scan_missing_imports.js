const fs = require("fs");
const path = require("path");

const RN_COMPONENTS = [
  "Platform",
  "ScrollView",
  "View",
  "Text",
  "StyleSheet",
  "SafeAreaView",
  "StatusBar",
  "TouchableOpacity",
  "Alert",
  "ActivityIndicator",
  "TextInput",
  "FlatList",
  "Image",
  "Dimensions",
  "Modal",
  "KeyboardAvoidingView",
];

function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f === "node_modules" || f === ".expo" || f === "dist") continue;
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      checkDir(full);
    } else if (/\.(jsx?|tsx?)$/.test(f)) {
      const content = fs.readFileSync(full, "utf8");

      // Extract all imports from react-native
      const rnMatches = content.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']react-native["']/g);
      const importedRN = new Set();
      for (const m of rnMatches) {
        m[1].split(",").forEach((s) => {
          const name = s.trim().split(/\s+as\s+/)[0].trim();
          if (name) importedRN.add(name);
        });
      }

      for (const comp of RN_COMPONENTS) {
        // Usage check
        const isTag = new RegExp(`<${comp}[\\s/>]`).test(content);
        const isMember = new RegExp(`\\b${comp}\\.`).test(content);
        if (isTag || isMember) {
          if (!importedRN.has(comp)) {
            // Check if imported from another module or defined locally
            const isOtherImport = new RegExp(`import\\s+.*\\b${comp}\\b.*from`).test(content);
            const isLocalDef = new RegExp(`(?:const|let|var|function|class)\\s+${comp}\\b`).test(content);
            if (!isOtherImport && !isLocalDef) {
              console.log(`[MISSING] ${comp} in ${full}`);
            }
          }
        }
      }
    }
  }
}

const mobileDir = path.resolve(__dirname, "../../mobile");
console.log("Scanning directory:", mobileDir);
checkDir(mobileDir);
console.log("Scan finished.");
