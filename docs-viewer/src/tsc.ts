#! /usr/bin/env bun

const args = process.argv.slice(2).filter((arg) => arg !== '--build');

const proc = Bun.spawn(['glint', '--build', ...args], {
  stderr: 'inherit',
  stdout: 'inherit',
  stdin: 'inherit',
});

await proc.exited;
