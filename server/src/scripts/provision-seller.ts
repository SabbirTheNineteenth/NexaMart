import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { db } from "../db/client.js";
import { runSellerProvisioning } from "./seller-provision.cli.js";
import { provisionSeller, upsertSellerAndRevokeSessions } from "./seller-provision.helpers.js";

async function promptHidden(question: string): Promise<string> {
  if (!stdin.isTTY || !stdin.setRawMode) throw new Error("Seller provisioning requires an interactive terminal");
  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve) => {
    let value = "";
    const onData = (chunk: Buffer) => {
      const key = chunk.toString("utf8");
      if (key === "\r" || key === "\n") {
        stdin.off("data", onData);
        stdin.setRawMode(false);
        stdout.write("\n");
        resolve(value);
      } else if (key === "\u0003") {
        stdin.off("data", onData);
        stdin.setRawMode(false);
        stdout.write("\n");
        process.exitCode = 130;
        resolve("");
      } else if (key === "\u007f" || key === "\b") value = value.slice(0, -1);
      else if (!key.startsWith("\u001b")) value += key;
    };
    stdin.on("data", onData);
  });
}

const prompts = createInterface({ input: stdin, output: stdout });
try {
  await runSellerProvisioning({
    question: (question) => prompts.question(question),
    hidden: promptHidden,
    provision: (input) => provisionSeller(input, { upsertSeller: (seller) => upsertSellerAndRevokeSessions(db, seller) }),
    write: (message) => stdout.write(message),
  });
} finally {
  prompts.close();
}
