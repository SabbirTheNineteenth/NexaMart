"use strict";

// The Codex Windows sandbox runs as `codexsandboxoffline` while retaining the
// user's profile directory. libuv's Windows passwd lookup can report ENOMEM in
// that identity configuration. tsx needs only the username to derive a temp
// directory name; retain the native result everywhere else and supply the
// process identity only for that precise host failure.
const os = require("node:os");
const nativeUserInfo = os.userInfo;

try {
  nativeUserInfo();
} catch (error) {
  if (error?.syscall !== "uv_os_get_passwd" || error?.info?.code !== "ENOMEM") throw error;

  Object.defineProperty(os, "userInfo", {
    configurable: true,
    value(options) {
      try {
        return nativeUserInfo(options);
      } catch (retryError) {
        if (retryError?.syscall !== "uv_os_get_passwd" || retryError?.info?.code !== "ENOMEM") throw retryError;
        return {
          uid: -1,
          gid: -1,
          username: process.env.USERNAME || "codexsandboxoffline",
          homedir: process.env.USERPROFILE || os.homedir(),
          shell: null,
        };
      }
    },
  });
}
