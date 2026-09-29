import os from "node:os";

function isIpv4(net) {
  return net.family === "IPv4" || net.family === 4;
}

function pickLanAddress() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (!isIpv4(net) || net.internal) continue;
      candidates.push(net.address);
    }
  }
  const privateFirst = candidates.find(
    (a) =>
      a.startsWith("192.168.") ||
      a.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(a),
  );
  return privateFirst ?? candidates[0] ?? null;
}

const port = process.env.PORT || "3000";
const ip = pickLanAddress();

console.log("");
console.log("  \x1b[33mBloom dev — acceso desde el celular (misma Wi‑Fi)\x1b[0m");
console.log(`  \x1b[1mhttp://${ip ?? "TU_IP_LAN"}:${port}\x1b[0m`);
if (!ip) {
  console.log("  \x1b[90m(No se detectó IPv4; usá ipconfig getifaddr en0 en la Mac.)\x1b[0m");
}
console.log("");
