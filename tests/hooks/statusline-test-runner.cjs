#!/usr/bin/env node
/**
 * Test runner helper for statusline unit tests.
 * Usage: node statusline-test-runner.cjs <fnName> <arg1> [arg2] [arg3]
 * Outputs JSON-stringified result (with ANSI stripped) to stdout.
 */
const path = require('path');
const Module = require('module');

const HOOK_PATH = path.join(__dirname, '../../.claude/hooks/statusline.cjs');

// Stub hook-utils so statusline loads without a real session
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req.includes('hook-utils')) {
    return {
      findActiveSession: () => null,
      safeRead: () => null,
      extractYamlValue: () => null,
      countPattern: () => 0,
      PLUGIN_ROOT: path.join(__dirname, '../..'),
    };
  }
  return origLoad.call(this, req, ...rest);
};

const mod = require(HOOK_PATH);

function stripAnsi(str) {
  return typeof str === 'string' ? str.replace(/\x1b\[[0-9;]*m/g, '') : str;
}

const [, , fnName, ...rawArgs] = process.argv;

// Parse args: numbers stay numbers, strings stay strings
const args = rawArgs.map((a) => {
  const n = Number(a);
  return isNaN(n) ? a : n;
});

const result = mod[fnName](...args);
process.stdout.write(JSON.stringify(stripAnsi(result)));
