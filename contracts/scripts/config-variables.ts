import { hooks } from "hardhat";
import { configVariable } from "hardhat/config";

/**
 * Resolves a Hardhat configuration variable the same way the config does:
 * environment variable first, then the keystore.
 */
export async function readConfigVariable(name: string): Promise<string> {
  if (process.env[name] !== undefined) {
    return process.env[name];
  }
  return hooks.runHandlerChain(
    "configurationVariables",
    "fetchValue",
    [configVariable(name)],
    async (_context, variable) => {
      throw new Error(`Configuration variable ${variable.name} is not set (environment or keystore)`);
    },
  );
}
