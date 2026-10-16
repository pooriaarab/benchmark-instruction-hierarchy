import { createMcpServer as create, startMcp as start } from "benchmark-core";
import { selectBenchmark, type BenchmarkSourceOptions } from "./benchmark.js";

export const createMcpServer = (options: BenchmarkSourceOptions = {}) => create(selectBenchmark(options));
export const startMcp = (options: BenchmarkSourceOptions = {}) => start(selectBenchmark(options));
