#!/usr/bin/env node
import { createCli } from "benchmark-core";
import { benchmark } from "./benchmark.js";
process.exitCode = await createCli(benchmark, { bin: "benchmark-instruction-hierarchy" }).main(process.argv.slice(2));
