// `npm run dev` : serveur de tuiles local (tools/tile-server.mjs) + Next en mode dev.
import { spawn } from 'node:child_process';
const run = (cmd, args) => spawn(cmd, args, { stdio: 'inherit', shell: true });
const tiles = run('node', ['tools/tile-server.mjs']);
const next = run('npx', ['next', 'dev', '-H', '0.0.0.0', '-p', '5179']);
const stop = () => { tiles.kill(); next.kill(); };
next.on('exit', code => { tiles.kill(); process.exit(code ?? 0); });
process.on('SIGINT', stop); process.on('SIGTERM', stop);
