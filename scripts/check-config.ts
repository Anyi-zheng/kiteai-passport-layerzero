import {bridgeConfig} from "../src/bridge-config.js"; try{console.log(bridgeConfig());}catch(e){console.error(e instanceof Error?e.message:e);process.exitCode=1;}
