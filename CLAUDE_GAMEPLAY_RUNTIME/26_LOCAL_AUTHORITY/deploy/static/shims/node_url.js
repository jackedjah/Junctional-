/* browser shim for node:url — a "file path" here is the site-relative URL pathname */
var BS = String.fromCharCode(92);
export function fileURLToPath(u) { return new URL(String(u), location.href).pathname; }
export function pathToFileURL(p) { return new URL(String(p).split(BS).join('/'), location.origin); }
export default { fileURLToPath: fileURLToPath, pathToFileURL: pathToFileURL, URL: URL };
