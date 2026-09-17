import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { db } from "../db/client.js";
import { provisionAdmin, upsertAdminAndRevokeSessions } from "./admin-create.helpers.js";

async function promptHidden(question: string): Promise<string> {
  if (!stdin.isTTY || !stdin.setRawMode) throw new Error("Admin creation requires an interactive terminal");
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
  const email = await prompts.question("Admin email: ");
  const name = await prompts.question("Admin name: ");
  const password = await promptHidden("Admin password: ");
  const result = await provisionAdmin({ email, name, password }, {
    upsertAdmin(input) {
      return upsertAdminAndRevokeSessions(db, input);
    },
  });
  console.log(`Admin ${result.created ? "created" : "updated"}.`);
} finally {
  prompts.close();
}
