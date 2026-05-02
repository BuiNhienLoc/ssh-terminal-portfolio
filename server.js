import pkg from 'ssh2';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import postgres from 'postgres';
const { Server, utils } = pkg;
const { parseKey } = utils;

function getHostKeyType() {
  return process.env.SSH_HOST_KEY_TYPE || 'ed25519';
}

function getHostKeyPath() {
  return process.env.SSH_HOST_KEY_PATH || path.join(os.tmpdir(), 'ssh_host_key');
}

function loadDotenv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const contents = readFileSync(envPath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// ─── Traffic logger ──────────────────────────────────────────────────────────
function logTraffic(event, data = {}) {
  const entry = { time: new Date().toISOString(), event, ...data };
  console.log('[TRAFFIC]', JSON.stringify(entry));
}

// ─── Layout constants ────────────────────────────────────────────────────────
// After you drop in your real ASCII art, set ASCII_COL_WIDTH to the width
// (in characters) of your widest art line.  Everything else auto-follows.
const ASCII_COL_WIDTH = 72;             // width of left (art) panel
const RIGHT_COL_START = ASCII_COL_WIDTH + 3; // col where right panel begins (1-indexed)
const RIGHT_COL_WIDTH  = 46;             // max chars per line in right panel

// ─── Portfolio data ──────────────────────────────────────────────────────────
const MENU_ITEMS = ['Projects', 'Skills', 'Experiences', 'Courses', 'Certificates', 'Contact'];

const COLORS = {
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  yellow: '\x1b[33m',
};

// ─── ASCII Braille logos for tech stack ──────────────────────────────────────
// const TECH_LOGOS = {
//   'javascript': '⠠⠐⠠⠐\n⠋⠉⠋⠉\n⠹⠹⠹⠹\n⠸⠸⠸⠸',
//   'typescript': '⠠⠐⠠⠐\n⠞⠖⠞⠖\n⠖⠖⠖⠖\n⠖⠖⠖⠖',
//   'react': '⠺⠲⠢⠲\n⠸⠀⠀⠸\n⠈⠉⠁⠈\n⠀⠀⠀⠀',
//   'nodejs': '⠀⠢⠠⠀\n⠈⠢⠠⠁\n⠀⠲⠦⠀\n⠀⠀⠀⠀',
//   'python': '⠒⠒⠒⠒\n⠒⠀⠀⠒\n⠒⠀⠀⠒\n⠒⠒⠒⠒',
//   'django': '⠠⠠⠠⠠\n⠬⠬⠬⠬\n⠌⠋⠋⠋\n⠀⠀⠀⠀',
//   'mongodb': '⠉⠁⠁⠉\n⠛⠅⠅⠛\n⠉⠁⠁⠉\n⠀⠀⠀⠀',
//   'kubernetes': '⠠⠌⠠⠌\n⠸⠢⠸⠢\n⠘⠢⠘⠢\n⠀⠠⠀⠠',
//   'docker': '⠒⠒⠒⠒\n⠰⠤⠰⠤\n⠐⠒⠐⠒\n⠰⠰⠰⠰',
//   'aws': '⠛⠛⠛⠛\n⠸⠀⠀⠸\n⠈⠉⠉⠈\n⠀⠀⠀⠀',
//   'default': '⠈⠐⠈⠐\n⠋⠉⠋⠉\n⠹⠹⠹⠹\n⠸⠸⠸⠸',
// };

// ── Swap ASCII_ART with your ASCII Image Converter output ────────────────────
// Each string is one line of the portrait; leading spaces are intentional.
// Update ASCII_COL_WIDTH above to match the widest line after you swap it in.
const ASCII_ART = [
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢿⠛⡏⡋⠎⡒⢜⠨⡊⢏⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⣻⡫⡻⡹⡻⢻⠟⠍⢂⠂⠡⠈⢌⢊⠐⠠⢁⠊⡐⠅⣝⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢻⣨⡝⡮⠪⡊⡘⡘⡀⡂⠌⠠⠐⠀⡁⠄⠠⠈⠐⠐⢀⠐⠀⠄⡙⢻⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢣⠳⠱⡱⢩⠊⠄⠂⠄⡂⢔⡸⣼⢤⢅⠤⡐⡠⢈⠠⠈⢀⠀⠁⠄⠐⡀⡉⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢇⢅⠅⡣⡈⡂⠈⠄⡑⣨⡪⣣⣿⣽⣯⢯⣗⡷⣸⢰⢱⠨⡄⡐⠀⠂⠁⢀⠐⡀⠐⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠰⡐⢌⠐⠀⠄⠂⡑⡜⡆⡯⣗⣟⣟⢾⢝⢮⡫⡞⡎⡎⡎⡎⡌⡂⡁⠐⠀⡐⠀⡁⠐⣻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠨⢂⠃⠔⠈⡀⠐⢌⢎⢞⢮⢿⡽⣞⡾⡽⣕⣇⢧⡣⡣⡣⡣⡱⡑⡔⡐⠈⢀⠀⠂⠀⠂⠈⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣗⠨⠠⠈⠄⠁⠄⡡⡣⡳⣽⢽⣽⣿⣟⣿⣫⢷⡳⡯⣺⢽⡺⡜⡌⡎⡢⠪⡐⢀⠠⠈⠀⡁⠄⢹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠄⠁⠌⢀⠅⠡⡊⡮⣯⢟⡽⢝⠎⡃⡃⠣⢣⢣⢫⢪⢣⡣⡫⠪⡪⠊⡪⠨⡂⡀⠠⠀⠠⠀⢺⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠌⠄⠡⠂⠂⢡⢪⡯⠯⢏⠎⡎⠎⡎⠎⢎⠎⡜⡜⡕⢕⠕⡌⡢⡂⡆⢄⠅⡂⡢⠂⠐⠀⠂⣹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡧⢁⠂⠡⠁⡈⢔⠽⢜⡼⣕⠏⢎⢃⢃⠫⢒⠬⡈⣎⣎⢎⢊⢔⢔⢔⢔⢢⢅⠥⡈⡊⠀⠐⠀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣯⠠⠐⠈⡀⠄⡪⣿⣳⣻⡾⣞⣕⢕⢆⢇⢇⢇⢳⢰⢸⠨⡢⡱⡐⡄⡢⡡⡊⡪⠄⢸⠊⠆⢁⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠈⡂⢤⡀⠪⡽⣮⡳⣯⣟⣟⡮⡮⣣⢣⡣⡣⢣⡱⣕⢕⢱⠸⡸⡸⡸⡰⡱⡱⡑⡱⢀⠁⣺⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠌⡄⡇⡇⢕⢿⡽⣽⢺⣺⡺⡽⣽⣺⢕⢇⢇⢇⢗⡏⡇⡅⢇⢕⢕⢕⢕⢕⢕⢕⢕⠁⢬⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣗⢔⡵⣝⡼⣽⡽⣽⡳⣕⢵⢱⢕⢪⢊⢆⠗⠕⢕⢕⢕⠱⡑⡌⢕⢕⢝⢜⢜⠜⡌⡊⣽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣗⢕⡵⡱⡝⣗⡯⣗⢵⢱⢕⢕⢕⢕⢕⢢⢑⢌⢔⢐⠅⠢⢨⠨⡢⢣⢱⢱⢑⢕⠱⣑⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡕⣗⡷⡽⡽⣝⢮⡪⣣⢣⢣⢣⠱⡸⡨⡢⠣⡢⢱⢘⢌⢢⢑⢅⠣⡊⡎⡪⡪⡊⡲⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣯⡯⢯⢻⢺⢝⡎⡮⣪⢺⢸⡐⡅⡔⢌⠔⡅⢎⢔⠰⡠⡁⡂⡡⢑⢅⢇⢇⢎⠪⡺⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣾⣬⡉⢧⡫⡎⡮⡪⡪⡪⡪⡪⡣⡣⡣⡣⡱⡑⡌⡆⢎⢢⢑⢕⢱⠸⡰⣑⣽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣇⢕⢵⢹⢜⢎⢇⢇⡇⡧⡳⡹⡸⡸⡨⡪⡸⡨⡪⡸⡨⢪⠸⡸⡨⣮⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡸⡜⡎⡮⡪⡪⡣⡣⡳⡱⡕⡵⡱⡱⡱⡨⢢⢃⢎⠜⡌⢎⢊⣖⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢧⡣⡇⡇⡗⡕⡕⡕⡍⡎⡪⡊⢎⠪⡒⢜⠰⡑⢌⢪⠨⣪⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢟⢽⡪⡎⡮⡪⡪⡪⡪⡪⡊⡆⡣⡑⢕⢘⢌⠪⡨⢢⢑⢹⣽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⣕⣿⡽⡮⣣⢳⢱⡱⡕⡕⡜⡜⡌⡆⡣⡑⢅⢆⢣⠪⡢⢱⣹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⣝⢼⣻⣿⣝⡎⡧⡣⡇⡇⡇⡇⡇⡇⡣⡱⡸⡐⡕⢌⢪⠨⡢⢺⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣻⣽⣿⣟⡞⣜⣿⢾⡽⣻⣼⡱⡹⡸⡪⡪⡪⡪⢪⢊⢆⠇⡎⢎⢢⠣⡣⢑⢝⢽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣟⡿⣞⣿⣿⣿⢷⢝⢜⣾⢿⣝⢷⢽⢽⣪⡪⡪⡪⡪⢪⢪⠪⡢⢣⠣⡣⡱⡑⡌⡂⡊⣗⢽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⣯⣷⡿⣿⣟⣿⣿⢯⡯⣫⢇⢿⣽⣞⡯⡷⣝⡞⣞⢮⡸⡘⡜⢔⠕⡕⢕⢱⢑⠜⢔⠡⠀⡎⡮⣳⣻⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⣿⣿⣿⣿⣿⢿⡻⢝⣞⣯⡿⣾⣟⣯⣿⡿⡯⣟⡮⣳⢣⡹⡾⣞⣯⣟⣮⡯⡾⡵⣝⢮⣪⠸⡨⠪⡘⢔⡑⢍⠢⠡⡱⣹⣪⡳⣪⡻⣺⢽⣻⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⣿⣿⡿⡿⡻⡝⡎⡇⢇⢳⣿⣷⣻⣷⣿⣿⣻⢽⣫⢷⣝⢮⡳⣕⠝⣿⣽⣾⢷⣟⡿⣽⣪⢓⠡⡹⡸⡌⡎⡒⡜⡐⢅⢇⡯⣺⢜⢮⡳⣝⢮⡻⣺⢽⣺⢽⣻⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⠝⢕⢝⢭⢹⠸⡰⡘⢔⢱⡿⣟⡿⣯⢷⣻⡺⣽⣺⣳⢽⢵⢝⡮⣣⠪⢾⡯⣟⣾⢝⠎⡂⢂⠑⢈⠪⢈⠊⢎⢪⢲⠹⠵⠝⢊⢌⠣⡯⡮⡳⣝⢽⢝⡾⣝⢾⢽⣺⣻⡻⣿⣿⣿⣿⣿⣿⣿⣿⣿',
  '⠌⢌⠪⡊⡆⢇⠇⡪⠨⠢⣟⡯⣟⣞⡽⣪⢟⣞⣞⢾⢽⢽⢕⣯⡳⣝⢕⡻⣟⡕⡇⣂⠄⢀⠐⠀⠠⢀⠔⡔⠌⡀⠔⢜⢜⢢⢣⢕⢜⠭⣫⢮⠺⣝⢞⡽⣝⣗⣗⣗⣟⣮⡪⡍⠻⣿⣿⣿⣿⣿',
  '⢂⠅⡪⠨⠢⢑⠨⢈⠂⡯⣯⣳⡳⣝⣗⢯⢞⡮⡯⡯⡯⡯⣞⢾⢕⡧⠹⡸⡜⣎⢞⣜⢆⡆⢕⢡⠱⡱⡱⠁⠀⡀⢣⡳⡕⣕⢕⢕⢭⢢⡉⠓⠱⣫⣻⣺⣺⣺⣺⡺⡮⣯⣳⢕⠌ ⢿⣿⣿⣿',
  '⠀⢅⠂⠅⠨⠐⡀⡊⡀⢂⢺⣳⡳⣝⣞⢮⢯⣻⣺⢽⢽⢽⣝⢾⢝⣗⢯⡣⠱⡝⣎⢧⡳⡣⣏⢗⡔⢕⢕⠁⠄⠂⠠⡣⣳⡹⣜⢮⢳⢕⢧⡣⡐⠀⠱⣕⢗⣗⢗⡷⡽⣽⣺⡺⣝⣗⡄⢻⣿⣿',
];

// ── Right-panel content ───────────────────────────────────────────────────────
// NAME_LINE is shown bold+cyan as the first line; leave empty to omit.
// PROFILE_TEXT_LINES follow immediately below it in dim white.
// Lines are used as-is (no auto-wrap) — keep each under RIGHT_COL_WIDTH chars.
const NAME_LINE = [                                                 
  '    _/                             _/_/_/              _/',
  '   _/         _/_/      _/_/_/    _/    _/  _/    _/     ',
  '  _/       _/    _/  _/          _/_/_/    _/    _/  _/  ',
  ' _/       _/    _/  _/          _/    _/  _/    _/  _/   ',
  '_/_/_/_/   _/_/      _/_/_/    _/_/_/      _/_/_/  _/    ',
];

// const NAME_LINE = 'Loc Bui';   // ← replace with your figlet output split into lines,
//                              //   or just a plain name string

const PROFILE_TEXT_LINES = [
  '★is a software engineer & cybersecurity practitioner,',
  '★focused on building secure, scalable systems',
  '★and solving real-world problems through code.',
  '',
  '★He works across full-stack development and',
  '★security operations, with experience in',
  '★SOC monitoring, penetration testing, and',
  '★cloud-based system design.',
  '',
  'Previously, he developed production-grade',
  'applications using React, Django, and',
  'Kubernetes, and led projects in AI, IoT,',
  'and distributed systems.',
  '',
  'His work sits at the intersection of',
  'software engineering and cybersecurity,',
  'with a strong focus on system reliability,',
  'automation, and threat resilience.',
];

// ─── DB setup ────────────────────────────────────────────────────────────────
let sql = null;

async function initDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('⚠ DATABASE_URL not set - running without persistent data');
    return;
  }

  sql = postgres(dbUrl, {
    ssl: 'require',
    max: 5,
    idle_timeout: 30,
    connect_timeout: 10,
  });

  // Test the connection before allowing clients
  try {
    console.log('Testing database connection...');
    await sql`SELECT 1`;
    console.log('✓ Database connection successful');
  } catch (err) {
    console.warn('⚠ Database connection failed:', err.message);
    console.warn('  Running without persistent data');
  }
}

async function getProjects() {
  try {
    return await sql`
      SELECT p.id, p.title, p.description, p.repo_url,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', s.skill_id, 'name', s.skill_name))
          FILTER (WHERE s.skill_id IS NOT NULL), '[]'::json) AS skills
      FROM projects p
      LEFT JOIN project_skills ps ON ps.project_id = p.id
      LEFT JOIN skills s ON s.skill_id = ps.skill_id
      GROUP BY p.id ORDER BY p.id`;
  } catch { return []; }
}

async function getSkills() {
  try {
    return await sql`
      SELECT s.skill_id, s.skill_name, s.description, s."skill_yearStart",

      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', p.id,
            'name', p.title
          )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::json
      ) AS projects

      FROM skills s

      LEFT JOIN project_skills ps ON ps.skill_id = s.skill_id
      LEFT JOIN projects p ON p.id = ps.project_id

      GROUP BY s.skill_id
      ORDER BY s.skill_important DESC`;
  } catch { return []; }
}

async function getExperiences() {
  try { return await sql`SELECT * FROM experience ORDER BY exp_id`; }
  catch { return []; }
}

async function getCourses() {
  try {
    return await sql`
      SELECT c.course_id, c.course_name, c.course_description,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', e.edu_id, 'name', e.edu_name))
          FILTER (WHERE e.edu_id IS NOT NULL), '[]'::json) AS provider
      FROM courses c
      LEFT JOIN course_educations ce ON ce.course_id = c.course_id
      LEFT JOIN educations e ON e.edu_id = ce.education_id
      GROUP BY c.course_id ORDER BY c.course_id`;
  } catch { return []; }
}

async function getCertificates() {
  try { return await sql`SELECT * FROM certificates ORDER BY cert_id`; }
  catch { return []; }
}

// ─── Contact data + braille logos ────────────────────────────────────────────
const CONTACTS = [
  {
    // abbr: 'IG',
    platform: 'Instagram',
    url: 'instagram.com/nhienloc',
    logo: [
      '⢠⡶⠛⠛⠛⠛⠛⢛⢶⡄',
      '⣿⠀⠀⣤⠶⠶⣤⠛⠁⣿',
      '⣿⠀⢸⡇⠀⠀⢸⡇⠀⣿',
      '⣿⠀⠀⠛⠶⠶⠛⠀⠀⣿',
      '⠘⠷⣤⣤⣤⣤⣤⣤⠾⠋',
    ],
  },
  {
    // abbr: 'LI',
    platform: 'LinkedIn',
    url: 'linkedin.com/in/loc-bui-nhien',
    logo: [
      '⢠⢶⡢⠀⠀⠀⠀⠀⠀⠀',
      '⠀⣉⡁⢀⣀⡀⣀⣄⡀⠀',
      '⢈⣿⡇⠠⡿⡏⠋⢻⣟⡆',
      '⠠⣷⡇⠐⣿⠇⠀⢐⣿⡅',
      '⠐⠛⠃⠈⠛⠃⠀⠐⠛⠅',
    ],
  },
  {
    // abbr: 'GH',
    platform: 'GitHub',
    url: 'github.com/BuiNhienLoc',
    logo: [
      '⠀⢠⣴⣾⣟⣿⡾⣦⣀⠀',
      '⣰⣿⠂⠈⠁⠉⠁⠨⣿⡆',
      '⢿⣗⠀⠀⠀⠀⠀⠀⣳⣿',
      '⠹⣟⢦⡤⠀⠀⢤⣶⢿⠇',
      '⠀⠘⠲⢆⠀⠀⠽⠛⠁⠀',
    ],
  },
];

function getContacts() {
  return CONTACTS;
}

// ─── ANSI helpers ────────────────────────────────────────────────────────────

/** Move cursor to absolute row/col (1-indexed). */
function moveTo(row, col) {
  return `\x1b[${row};${col}H`;
}

/** Strip ANSI escape codes to get visible length. */
function visibleLen(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function clearScreen(stream) {
  stream.write('\x1b[2J\x1b[H');
}

// ─── Responsive layout ───────────────────────────────────────────────────────
// Called on every redraw with the live terminal width.
// Returns a layout object consumed by drawHeader and drawMenu.
//
//  cols ≥ 130  → full side-by-side (portrait left, bio right)
//  cols < 130  → narrow: hide portrait, full-width bio
//
function computeLayout(cols) {
  const c = cols || 130;
  if (c >= 130) {
    return {
      showArt:    true,
      artWidth:   ASCII_COL_WIDTH,
      rightStart: ASCII_COL_WIDTH + 3,
      rightWidth: Math.min(c - ASCII_COL_WIDTH - 4, 60),
    };
  }
  return {
    showArt:    false,
    artWidth:   0,
    rightStart: 3,
    rightWidth: c - 6,
  };
}

// ─── Header renderer ─────────────────────────────────────────────────────────
function drawHeader(stream, layout) {
  const { showArt, rightStart, rightWidth } = layout;

  // ── Left panel: braille portrait (only when terminal is wide enough) ──────
  if (showArt) {
    for (let i = 0; i < ASCII_ART.length; i++) {
      stream.write(moveTo(i + 1, 1));
      stream.write(`${COLORS.cyan}${ASCII_ART[i]}${COLORS.reset}`);
    }
  }

  // ── Right panel ───────────────────────────────────────────────────────────
  let rightRow = 1;

  if (NAME_LINE) {
    const nameLines = Array.isArray(NAME_LINE) ? NAME_LINE : [NAME_LINE];
    for (const line of nameLines) {
      stream.write(moveTo(rightRow, rightStart));
      const display = line.length > rightWidth ? line.slice(0, rightWidth) : line;
      stream.write(`${COLORS.cyan}${COLORS.bold}${display}${COLORS.reset}`);
      rightRow++;
    }
    rightRow++;
  }

  for (const line of PROFILE_TEXT_LINES) {
    if (!line) { rightRow++; continue; }
    stream.write(moveTo(rightRow, rightStart));
    const display = line.length > rightWidth ? line.slice(0, rightWidth) : line;
    if (display.startsWith('★')) {
      stream.write(`${COLORS.bold}${display.slice(1)}${COLORS.reset}`);
    } else {
      stream.write(`${COLORS.dim}${display}${COLORS.reset}`);
    }
    rightRow++;
  }

  const artRows = showArt ? ASCII_ART.length : 0;
  return Math.max(artRows, rightRow) + 2;
}

// ─── Menu renderer ───────────────────────────────────────────────────────────
function drawMenu(stream, currentIndex, startRow, layout) {
  const wide = layout ? layout.showArt : true;
  const items = MENU_ITEMS.map((item, i) =>
    i === currentIndex
      ? `${COLORS.cyan}${COLORS.bold}[ ${item} ]${COLORS.reset}`
      : `${COLORS.dim}${item}${COLORS.reset}`
  );
  const sep = `  ${COLORS.dim}◆${COLORS.reset}  `;

  stream.write(moveTo(startRow, 1));
  stream.write('[2K');

  if (wide) {
    // All items on one line
    stream.write(`  ${items.join(sep)}`);
    stream.write(moveTo(startRow + 1, 1));
    stream.write('[2K');
    stream.write(`  ${COLORS.yellow}${COLORS.bold}[Use ← → to navigate · Enter to select · Q to quit]${COLORS.reset}`);
  } else {
    // Two rows of 3 items each for narrow terminals
    stream.write(`  ${items.slice(0, 3).join(sep)}`);
    stream.write(moveTo(startRow + 1, 1));
    stream.write('[2K');
    stream.write(`  ${items.slice(3).join(sep)}`);
    stream.write(moveTo(startRow + 2, 1));
    stream.write('[2K');
    stream.write(`  ${COLORS.yellow}${COLORS.bold}[Use ← → to navigate · Enter to select · Q to quit]${COLORS.reset}`);
  }
}

// ─── Text helpers ────────────────────────────────────────────────────────────

/** Hard-wrap `text` to `width` chars, returning an array of lines. */
function hardWrap(text, width) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) { cur = w; continue; }
    if (cur.length + 1 + w.length <= width) { cur += ' ' + w; }
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

// ─── Section: minimal header (no portrait) ───────────────────────────────────
/**
 * Draws the compact section header used inside list/detail views.
 * No portrait — just a title + divider starting at row 1.
 * Returns the row after the divider (ready for content).
 */
function drawSectionHeader(stream, title) {
  clearScreen(stream);
  stream.write(moveTo(1, 1));
  stream.write(`${COLORS.cyan}${COLORS.bold}${title}${COLORS.reset}\n`);
  stream.write(`${COLORS.dim}${'─'.repeat(40)}${COLORS.reset}\n`);
  return 4; // content starts at row 4 (blank gap after divider)
}

// ─── Sparkle animation helper ────────────────────────────────────────────────
// const SPARKLES = ['✨', '⭐', '✦', '✧', '•', '◦'];
// let sparkleFrame = 0;
// function getSparkle() {
//   return SPARKLES[sparkleFrame++ % SPARKLES.length];
// }

// ─── Generic list renderer ────────────────────────────────────────────────────
/**
 * Renders a navigable list with overflow handling (pagination).
 *
 * @param {object[]} items      - Array of { label, sublabel? }
 * @param {number}   selected   - Currently highlighted index
 * @param {number}   startRow   - Row to begin rendering (1-indexed)
 * @param {object}   pagination - { page, itemsPerPage }
 * @returns {object} { totalPages, currentPage }
 */
function drawList(stream, items, selected, startRow, pagination = { page: 0, itemsPerPage: 10 }) {
  const { itemsPerPage } = pagination;
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const currentPage = pagination.page;
  const start = currentPage * itemsPerPage;
  const end = Math.min(start + itemsPerPage, items.length);
  const pageItems = items.slice(start, end);
  
  pageItems.forEach((item, i) => {
    const actualIndex = start + i;
    stream.write(moveTo(startRow + i * 2, 1));
    stream.write('\x1b[2K'); // clear line
    if (actualIndex === selected) {
      stream.write(`  ${COLORS.cyan}${COLORS.bold} ${item.label}${COLORS.reset}`);
    } else {
      stream.write(`  ${COLORS.dim}  ${item.label}${COLORS.reset}`);
    }
    if (item.sublabel) {
      stream.write(moveTo(startRow + i * 2 + 1, 1));
      stream.write('\x1b[2K');
      stream.write(`    ${COLORS.dim}${item.sublabel}${COLORS.reset}`);
    }
  });
  // Footer hint with pagination info
  const footerRow = startRow + pageItems.length * 2 + 1;
  stream.write(moveTo(footerRow, 1));
  stream.write('\x1b[2K');
  const pageInfo = totalPages > 1 ? ` · Page ${currentPage + 1}/${totalPages}` : '';
  stream.write(`${COLORS.yellow}${COLORS.bold}[Use ↑ ↓ to select · Enter to open · Esc to back${pageInfo}]${COLORS.reset}`);
  
  return { totalPages, currentPage, itemsPerPage, start, end };
}

// ─── Detail view renderer ─────────────────────────────────────────────────────
/**
 * Renders a full-screen detail view (no portrait header).
 * `fields` is an array of { label?, value } — label is optional dim prefix.
 */
function drawDetail(stream, title, bodyLines, linkLine) {
  clearScreen(stream);
  stream.write(moveTo(1, 1));
  stream.write(`${COLORS.cyan}${COLORS.bold}${title}${COLORS.reset}\n\n`);

  let row = 3;
  for (const line of bodyLines) {
    stream.write(moveTo(row, 1));
    stream.write(line);
    row++;
  }

  if (linkLine) {
    row++;
    stream.write(moveTo(row, 1));
    stream.write(`${COLORS.cyan}View → ${COLORS.reset}${COLORS.dim}${linkLine}${COLORS.reset}`);
    row++;
  }

  row += 2;
  stream.write(moveTo(row, 1));
  stream.write(`${COLORS.yellow}${COLORS.bold}[Use Esc to back]${COLORS.reset}`);
}

// ─── Section handlers ─────────────────────────────────────────────────────────
// Each returns a Promise that resolves when the user presses Esc (back).
// Navigation inside the section is handled internally.

async function runSection(stream, title, items, buildDetail) {
  // `items`       — array of raw data objects from DB
  // `buildDetail` — fn(item) → { title, bodyLines, linkLine }

  let selected = 0;
  let inDetail  = false;
  let currentPage = 0;
  const ITEMS_PER_PAGE = 10;
  const LIST_START_ROW = 4;

  const getVisibleIndex = () => {
    // Returns the index of the selected item in the full list
    return selected;
  };

  const renderList = () => {
    drawSectionHeader(stream, title);
    const listItems = items.map(buildDetail).map(d => ({ label: d.listLabel, sublabel: d.listSublabel }));
    
    // Auto-adjust page if selected item is out of current page
    const newPage = Math.floor(selected / ITEMS_PER_PAGE);
    if (newPage !== currentPage) {
      currentPage = newPage;
    }
    
    drawList(stream, listItems, selected, LIST_START_ROW, { page: currentPage, itemsPerPage: ITEMS_PER_PAGE });
  };

  const renderDetail = () => {
    const d = buildDetail(items[selected]);
    drawDetail(stream, d.detailTitle, d.bodyLines, d.linkLine);
  };

  renderList();

  return new Promise((resolve) => {
    const onData = (data) => {
      const buf = data.toString('utf8');

      // Parse key sequences
      for (let i = 0; i < buf.length; ) {
        // ESC sequences
        if (buf.charCodeAt(i) === 0x1b) {
          if (i + 2 < buf.length && buf.charCodeAt(i + 1) === 0x5b) {
            const code = buf.charCodeAt(i + 2);
            // Up arrow: ESC [ A
            if (code === 0x41 && !inDetail) {
              selected = (selected - 1 + items.length) % items.length;
              renderList();
              i += 3; continue;
            }
            // Down arrow: ESC [ B
            if (code === 0x42 && !inDetail) {
              selected = (selected + 1) % items.length;
              renderList();
              i += 3; continue;
            }
            // Left arrow: page up
            if (code === 0x44 && !inDetail && currentPage > 0) {
              currentPage--;
              selected = currentPage * ITEMS_PER_PAGE;
              renderList();
              i += 3; continue;
            }
            // Right arrow: page down
            if (code === 0x43 && !inDetail) {
              const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
              if (currentPage < totalPages - 1) {
                currentPage++;
                selected = currentPage * ITEMS_PER_PAGE;
                renderList();
              }
              i += 3; continue;
            }
            i += 3; continue;
          }
          // Bare ESC or ESC [ something-else → go back
          if (inDetail) { inDetail = false; renderList(); }
          else { stream.removeListener('data', onData); resolve(); }
          i++; continue;
        }

        const ch = buf[i];
        const cc = buf.charCodeAt(i);

        // Enter
        if (cc === 0x0d || cc === 0x0a) {
          if (!inDetail && items.length > 0) { inDetail = true; renderDetail(); }
          else if (inDetail) { inDetail = false; renderList(); }
          i++; continue;
        }

        // q / Q / ctrl-c → bubble up to quit
        if (ch === 'q' || ch === 'Q' || cc === 0x03) {
          stream.removeListener('data', onData);
          resolve('quit');
          return;
        }

        i++;
      }
    };

    stream.on('data', onData);
  });
}

// ── Per-section item descriptors ──────────────────────────────────────────────

function projectDescriptor(p) {
  const WRAP = 72;
  const skills = p.skills?.length ? p.skills.map(s => s.name).join(', ') : null;
  const bodyLines = [
    ...(p.description ? hardWrap(p.description, WRAP).map(l => l) : []),
    '',
    ...(skills ? [`${COLORS.dim}${skills}${COLORS.reset}`] : []),
  ];
  return {
    listLabel:    p.title,
    // listSublabel: skills,
    detailTitle:  p.title,
    bodyLines,
    linkLine:     p.repo_url || null,
  };
}

function skillDescriptor(s) {
  const WRAP = 72;
  const yr  = s.skill_yearStart
    ? `${new Date().getFullYear() - s.skill_yearStart} years`
    : null;
  const used = s.projects?.length ? s.projects.map(p => p.name).join(', ') : null;
  const bodyLines = [
    ...(yr ? [`${COLORS.dim}Experience: ${yr}${COLORS.reset}`] : []),
    '',
    ...(s.description ? hardWrap(s.description, 72) : []),
    '',
    ...(used ? [`${COLORS.dim}Used in: ${used}${COLORS.reset}`] : []),
  ];
  return {
    listLabel:    s.skill_name + ' - ' + yr,
    // listSublabel: yr,
    detailTitle:  s.skill_name,
    bodyLines,
    linkLine:     null,
  };
}

function experienceDescriptor(exp) {
  const WRAP = 72;
  const period = exp.exp_startYear
    ? `${exp.exp_startYear}${exp.exp_endYear ? ` – ${exp.exp_endYear}` : ' – present'}`
    : null;
  const bodyLines = [
    `${COLORS.dim}${exp.exp_company}${COLORS.reset}`,
    ...(period ? [`${COLORS.dim}${period}${COLORS.reset}`] : []),
    '',
    ...(exp.exp_description ? hardWrap(exp.exp_description, 72) : []),
  ];
  return {
    listLabel:    exp.exp_title,
    listSublabel: exp.exp_company,
    detailTitle:  exp.exp_title,
    bodyLines,
    linkLine:     null,
  };
}

function courseDescriptor(c) {
  const provider = c.provider?.length ? c.provider.map(p => p.name).join(', ') : null;
  const bodyLines = [
    ...(provider ? [`${COLORS.dim}${provider}${COLORS.reset}`] : []),
    '',
    ...(c.course_description ? hardWrap(c.course_description, 72) : []),
  ];
  return {
    listLabel:    c.course_name,
    listSublabel: provider,
    detailTitle:  c.course_name,
    bodyLines,
    linkLine:     null,
  };
}

function certificateDescriptor(c) {
  const bodyLines = [
    ...(c.cert_issuer ? [`${COLORS.dim}Issuer: ${c.cert_issuer}${COLORS.reset}`] : []),
    ...(c.cert_date   ? [`${COLORS.dim}Date:   ${c.cert_date}${COLORS.reset}`]   : []),
  ];
  return {
    listLabel:    c.cert_name,
    listSublabel: c.cert_issuer || null,
    detailTitle:  c.cert_name,
    bodyLines,
    linkLine:     c.cert_url || null,
  };
}

// ─── Custom Contact section renderer ─────────────────────────────────────────
// Displays all contacts at once with their braille logos — no list/detail nav.
// Layout (each contact block):
//
//   [LOGO col]  [ABBR]  [URL]
//   (5 rows)
//   (blank gap)
//
async function runContactSection(stream) {
  const contacts = getContacts();

  const render = () => {
    clearScreen(stream);

    // Section header
    stream.write(moveTo(1, 1));
    stream.write(`${COLORS.cyan}${COLORS.bold}Contacts${COLORS.reset}`);
    stream.write(moveTo(2, 1));
    stream.write(`${COLORS.dim}${'─'.repeat(40)}${COLORS.reset}`);

    const LOGO_COL   = 3;   // column where braille logo starts
    // const ABBR_COL   = 16;  // column for the short label (IG / LI / GH)
    const URL_COL    = 16;  // column for the URL
    const LOGO_ROWS  = 5;   // each logo is 5 rows tall
    const GAP        = 2;   // blank rows between contacts

    let row = 4;  // content starts here

    for (const c of contacts) {
      // Braille logo — cyan
      for (let i = 0; i < c.logo.length; i++) {
        stream.write(moveTo(row + i, LOGO_COL));
        stream.write(`${COLORS.cyan}${c.logo[i]}${COLORS.reset}`);
      }

      // Abbr — bold cyan, vertically centred on logo (row 2 of 5)
      const midRow = row + 2;
      // stream.write(moveTo(midRow, ABBR_COL));
      // stream.write(`${COLORS.cyan}${COLORS.bold}${c.abbr}${COLORS.reset}`);

      // URL — dim, same row as abbr
      stream.write(moveTo(midRow, URL_COL));
      stream.write(`${COLORS.dim}${c.url}${COLORS.reset}`);

      row += LOGO_ROWS + GAP;
    }

    // Footer
    stream.write(moveTo(row + 1, 1));
    stream.write(`${COLORS.yellow}${COLORS.bold}[Use Esc to back]${COLORS.reset}`);
  };

  render();

  return new Promise((resolve) => {
    const onData = (data) => {
      const buf = data.toString('utf8');
      for (let i = 0; i < buf.length; i++) {
        const cc = buf.charCodeAt(i);
        // ESC, q, Q, ctrl-c all go back / quit
        if (cc === 0x1b) { stream.removeListener('data', onData); resolve(); return; }
        if (buf[i] === 'q' || buf[i] === 'Q' || cc === 0x03) {
          stream.removeListener('data', onData); resolve('quit'); return;
        }
      }
    };
    stream.on('data', onData);
  });
}

// ─── Experience timeline ─────────────────────────────────────────────────────
function experienceTimelineDescriptor(exp) {
  const period = exp.exp_startYear
    ? `${exp.exp_startYear}${exp.exp_endYear ? ` – ${exp.exp_endYear}` : ' – Present'}`
    : '';
  return {
    title:       exp.exp_title,
    company:     exp.exp_company || '',
    period,
    description: exp.exp_description || '',
  };
}

function drawTimeline(stream, title, items, selected) {
  clearScreen(stream);
  let out = '';

  out += moveTo(1, 1);
  out += `${COLORS.cyan}${COLORS.bold}${title}${COLORS.reset}`;
  out += moveTo(2, 1);
  out += `${COLORS.dim}${'─'.repeat(50)}${COLORS.reset}`;

  let row = 4;

  items.forEach((item, i) => {
    const isSelected = i === selected;
    const isLast     = i === items.length - 1;

    const dot  = isSelected ? `${COLORS.cyan}${COLORS.bold}●${COLORS.reset}` : `${COLORS.dim}○${COLORS.reset}`;
    const pipe = isLast ? ' ' : `${COLORS.dim}│${COLORS.reset}`;

    // Title row
    out += moveTo(row, 3);
    out += dot;
    out += moveTo(row, 7);
    out += isSelected
      ? `${COLORS.cyan}${COLORS.bold}${item.title}${COLORS.reset}`
      : `${COLORS.bold}${item.title}${COLORS.reset}`;

    // Company · period
    out += moveTo(row + 1, 3);
    out += pipe;
    out += moveTo(row + 1, 7);
    out += `${COLORS.dim}${item.company} • ${item.period}${COLORS.reset}`;

    // Description (up to 3 lines)
    // const wrapped = hardWrap(item.description, 72).slice(0, 3);
    // for (let j = 0; j < wrapped.length; j++) {
    //   out += moveTo(row + 2 + j, 3);
    //   out += pipe;
    //   out += moveTo(row + 2 + j, 7);
    //   out += `${COLORS.dim}${wrapped[j]}${COLORS.reset}`;
    // }

    row += 3; // title + company + desc lines + gap
  });

  out += moveTo(row + 1, 1);
  out += `${COLORS.yellow}${COLORS.bold}[Use ↑ ↓ to select · Enter to open · Esc to back]${COLORS.reset}`;

  stream.write(out);
}

async function runTimelineSection(stream, title, rawItems, buildItem, sessionInfo = {}) {
  let selected = 0;
  let inDetail  = false;
  const items   = rawItems.map(buildItem);

  const renderTimeline = () => drawTimeline(stream, title, items, selected);

  const renderDetail = () => {
    const item = items[selected];
    const bodyLines = [
      `${COLORS.dim}${item.company}${COLORS.reset}`,
      `${COLORS.dim}${item.period}${COLORS.reset}`,
      '',
      ...hardWrap(item.description, 72),
    ];
    drawDetail(stream, item.title, bodyLines, null);
  };

  renderTimeline();

  return new Promise((resolve) => {
    const onData = (data) => {
      const buf = data.toString('utf8');
      for (let i = 0; i < buf.length;) {
        if (buf.charCodeAt(i) === 0x1b) {
          if (i + 2 < buf.length && buf.charCodeAt(i + 1) === 0x5b) {
            const code = buf.charCodeAt(i + 2);
            if (code === 0x41 && !inDetail) { // up
              selected = (selected - 1 + items.length) % items.length;
              renderTimeline(); i += 3; continue;
            }
            if (code === 0x42 && !inDetail) { // down
              selected = (selected + 1) % items.length;
              renderTimeline(); i += 3; continue;
            }
            i += 3; continue;
          }
          if (inDetail) { inDetail = false; renderTimeline(); }
          else { stream.removeListener('data', onData); resolve(); }
          i++; continue;
        }
        const ch = buf[i], cc = buf.charCodeAt(i);
        if (cc === 0x0d || cc === 0x0a) {
          if (!inDetail && items.length > 0) {
            inDetail = true;
            logTraffic('experience_opened', { ...sessionInfo, experience: items[selected].title });
            renderDetail();
          } else if (inDetail) { inDetail = false; renderTimeline(); }
          i++; continue;
        }
        if (ch === 'q' || ch === 'Q' || cc === 0x03) {
          stream.removeListener('data', onData); resolve('quit'); return;
        }
        i++;
      }
    };
    stream.on('data', onData);
  });
}

// ─── Full-screen size warning ────────────────────────────────────────────────
// Shown before the main UI if the terminal is too narrow.
// Returns a Promise that resolves when the user presses any key.
const MIN_COLS = 133;
const MIN_ROWS = 38;

async function showSizeWarning(stream, termSize) {
  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      clearInterval(resizeInterval);
      stream.removeListener('data', onKey);
      clearScreen(stream);
      resolve();
    };

    const render = () => {
      clearScreen(stream);

      const cols = termSize.cols;
      const rows = termSize.rows;

      const lines = [
        '',
        '  ┌─────────────────────────────────────────────┐',
        '  │                                             │',
        '  │   ⚠  Please resize your terminal window     │',
        '  │                                             │',
        `  │   Current : ${String(cols).padStart(3)} cols × ${String(rows).padStart(2)} rows              │`,
        `  │   Required: ${String(MIN_COLS).padStart(3)} cols × ${String(MIN_ROWS).padStart(2)} rows              │`,
        '  │                                             │',
        '  │   Expand to full screen for the best        │',
        '  │   experience, or press any key to continue. │',
        '  │                                             │',
        '  └─────────────────────────────────────────────┘',
      ];

      for (let i = 0; i < lines.length; i++) {
        stream.write(moveTo(i + 1, 1));
        stream.write(
          i === 3
            ? `${COLORS.yellow}${lines[i]}${COLORS.reset}`
            : `${COLORS.cyan}${lines[i]}${COLORS.reset}`
        );
      }

      const barFull = Math.round((cols / MIN_COLS) * 30);
      const barEmpty = 30 - barFull;
      const bar = '█'.repeat(Math.min(barFull, 30)) + '░'.repeat(Math.max(barEmpty, 0));

      stream.write(moveTo(14, 3));
      stream.write(`  ${COLORS.dim}Width: ${COLORS.reset}${COLORS.cyan}[${bar}]${COLORS.reset} ${cols}/${MIN_COLS}`);
    };

    const onKey = () => {
      cleanup();
    };

    const resizeInterval = setInterval(() => {
      if (termSize.cols >= MIN_COLS && termSize.rows >= MIN_ROWS) {
        cleanup();
        return;
      }

      render();
    }, 300);

    stream.on('data', onKey);
    render();
  });
}

// ─── Main session handler ────────────────────────────────────────────────────
async function handleSession(stream, termSize = { cols: 130, rows: 40 }, sessionInfo = {}) {
  let currentMenuIndex = 0;
  let inputBuffer = '';
  let inSection = false; // true while a section's runSection() is active

  // ── Size warning: show if terminal is too small ────────────────────────────
  if (termSize.cols < MIN_COLS || termSize.rows < MIN_ROWS) {
    await showSizeWarning(stream, termSize);
    // Re-hide cursor after warning (user may have pressed a key)
    stream.write('[?25l');
  }

  let menuStartRow = 0;

  // Always computed fresh so window-change events take effect immediately
  const getLayout = () => computeLayout(termSize.cols);

  const redrawFull = () => {
    const layout = getLayout();
    clearScreen(stream);
    menuStartRow = drawHeader(stream, layout);
    drawMenu(stream, currentMenuIndex, menuStartRow, layout);
    stream.write(moveTo(menuStartRow + 3, 1));
  };

  const redrawMenuOnly = () => {
    const layout = getLayout();
    stream.write(moveTo(menuStartRow, 1));
    stream.write('\x1b[2K');
    stream.write(moveTo(menuStartRow + 1, 1));
    stream.write('\x1b[2K');
    stream.write(moveTo(menuStartRow + 2, 1));
    stream.write('\x1b[2K');
    drawMenu(stream, currentMenuIndex, menuStartRow, layout);
    stream.write(moveTo(menuStartRow + 3, 1));
  };

  redrawFull();

  sessionInfo.onResize = () => {
    if (!inSection) {
        redrawFull();
    }
  };

  // ── Sparkle animation — positions derived from live layout ────────────────
  const SPARK_CHARS = ['✦', '✧', '⋆', '·', '˚', '*', '⭑', '✶'];
  let sparkTimer  = null;
  let sparkActive = [];

  const buildSparkPositions = () => {
    const { rightStart } = getLayout();
    const pos = [];
    for (let r = 0; r <= 6; r++) {
      if (rightStart > 4) {
        pos.push({ row: r + 1, col: rightStart - 2 });
        pos.push({ row: r + 1, col: rightStart - 4 });
      }
      pos.push({ row: r + 1, col: rightStart + 57 });
      pos.push({ row: r + 1, col: rightStart + 59 });
    }
    return pos;
  };

  const tickSparkle = () => {
    if (inSection) return;
    for (const s of sparkActive) { stream.write(moveTo(s.row, s.col) + ' '); }
    sparkActive = [];
    const positions = buildSparkPositions();
    const count     = Math.min(Math.floor(Math.random() * 3) + 3, positions.length);
    const shuffled  = [...positions].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      const pos = shuffled[i];
      const ch  = SPARK_CHARS[Math.floor(Math.random() * SPARK_CHARS.length)];
      stream.write(moveTo(pos.row, pos.col) + `${COLORS.cyan}${ch}${COLORS.reset}`);
      sparkActive.push(pos);
    }
    stream.write(moveTo(200, 1)); // park cursor
  };

  sparkTimer = setInterval(tickSparkle, 220);

  return new Promise((resolve) => {
    stream.on('data', async (data) => {
      if (inSection) return; // section owns the stream while active
      inputBuffer += data.toString('utf8');

      while (inputBuffer.length > 0) {
        let processed = false;

        if (inputBuffer.charCodeAt(0) === 0x1b) {
          if (inputBuffer.length < 3) return;
          if (inputBuffer.charCodeAt(1) === 0x5b) {
            const code = inputBuffer.charCodeAt(2);
            if (code === 0x44) { // left
              currentMenuIndex = (currentMenuIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
              redrawMenuOnly();
              inputBuffer = inputBuffer.slice(3); processed = true;
            } else if (code === 0x43) { // right
              currentMenuIndex = (currentMenuIndex + 1) % MENU_ITEMS.length;
              redrawMenuOnly();
              inputBuffer = inputBuffer.slice(3); processed = true;
            } else {
              inputBuffer = inputBuffer.slice(1); processed = true;
            }
          } else {
            inputBuffer = inputBuffer.slice(1); processed = true;
          }
        }

        if (!processed && inputBuffer.length > 0) {
          const char = inputBuffer[0];
          const charCode = inputBuffer.charCodeAt(0);

          if (char === 'q' || char === 'Q' || charCode === 0x03) {
            if (sparkTimer) clearInterval(sparkTimer);
            stream.write('\x1b[?1049l');
            stream.write('\x1b[?25h');
            stream.write('\n\nGoodbye!\n');
            stream.end();
            resolve();
            return;
          }

          if (charCode === 0x0d || charCode === 0x0a) {
            inSection = true;
            inputBuffer = '';
            logTraffic('menu_opened', { ...sessionInfo, section: MENU_ITEMS[currentMenuIndex] });

            // Load data and open section
            let result;
            try {
              if (currentMenuIndex === 0) {
                const data = await getProjects();
                result = await runSection(stream, 'Projects', data, projectDescriptor);
              } else if (currentMenuIndex === 1) {
                const data = await getSkills();
                result = await runSection(stream, 'Skills', data, skillDescriptor);
              } else if (currentMenuIndex === 2) {
                const data = await getExperiences();
                result = await runTimelineSection(stream, 'Experience Timeline', data, experienceTimelineDescriptor, sessionInfo);
              } else if (currentMenuIndex === 3) {
                const data = await getCourses();
                result = await runSection(stream, 'Courses', data, courseDescriptor);
              } else if (currentMenuIndex === 4) {
                const data = await getCertificates();
                result = await runSection(stream, 'Certificates', data, certificateDescriptor);
              } else if (currentMenuIndex === 5) {
                result = await runContactSection(stream);
              }
            } catch (err) {
              console.error('Section error:', err);
            }

            inSection = false;

            if (result === 'quit') {
              if (sparkTimer) clearInterval(sparkTimer);
              stream.write('\x1b[?1049l');
              stream.write('\x1b[?25h');
              stream.write('\n\nGoodbye!\n');
              stream.end();
              resolve();
              return;
            }

            redrawFull();
            processed = true;
          }

          if (!processed) inputBuffer = inputBuffer.slice(1);
        }
      }
    });

    stream.on('close', () => { if (sparkTimer) clearInterval(sparkTimer); resolve(); });
    stream.on('error', (err) => { if (sparkTimer) clearInterval(sparkTimer); console.error('Stream error:', err); resolve(); });
  });
}

// ─── SSH Server ───────────────────────────────────────────────────────────────
const port = process.env.PORT || 2222;

function createServer() {
  const hostKeyPath = getHostKeyPath();
  let hostKeyBuffer;

  try {
    hostKeyBuffer = readFileSync(hostKeyPath);
    console.log('[SSH] Host key loaded, size:', hostKeyBuffer.length, 'bytes');
  } catch (err) {
    console.error('[SSH] Failed to load host key:', err.message);
    throw err;
  }

  const server = new Server({ hostKeys: [hostKeyBuffer] }, (client) => {
    const clientIp =
        client._sock?.remoteAddress ||
        client.socket?.remoteAddress ||
        client.remoteAddress ||
        'unknown';
    let username   = 'anonymous';
    let termSize   = { cols: 80, rows: 24 };

    logTraffic('client_connected', { ip: clientIp });

    // ── Socket tweaks ───────────────────────────────────────────────────────
    try {
      if (client.socket) {
        try {
          client.socket.setNoDelay(true);
          client.socket.setKeepAlive(true, 60000);
        } catch (e) {
          console.warn('[SSH] Socket options warning:', e.message);
        }
        const origSetTos = client.socket.setTosValue;
        if (typeof origSetTos === 'function') {
          client.socket.setTosValue = function(val) {
            try { return origSetTos.call(this, val); }
            catch (e) { /* suppress ToS errors */ }
          };
        }
      }
    } catch (err) {
      console.error('[SSH] Socket config error:', err.message);
      client.end(); return;
    }

    // ── Auth — accept all, log username ────────────────────────────────────
    client.on('authentication', (ctx) => {
      try {
        username = ctx.username || 'anonymous';
        logTraffic('auth_attempt', { ip: clientIp, username, method: ctx.method });
        ctx.accept();
        logTraffic('auth_accepted', { ip: clientIp, username });
      } catch (err) {
        console.error('[SSH] Auth error:', err.message);
      }
    });

    // ── Session ────────────────────────────────────────────────────────────
    client.on('session', (accept) => {
        const session = accept();

        let termSize = { cols: 130, rows: 40 };

        const sessionInfo = {
            ip: clientIp,
            username,
            onResize: null,
        };

        session.on('pty', (accept, reject, info) => {
            termSize.cols = info.cols || termSize.cols;
            termSize.rows = info.rows || termSize.rows;

            logTraffic('pty', {
            ip: clientIp,
            username,
            cols: termSize.cols,
            rows: termSize.rows,
            });

            accept();
        });

        session.on('window-change', (accept, reject, info) => {
            termSize.cols = info.cols || termSize.cols;
            termSize.rows = info.rows || termSize.rows;

            logTraffic('resize', {
            ip: clientIp,
            username,
            cols: termSize.cols,
            rows: termSize.rows,
            });

            sessionInfo.onResize?.();

            if (accept) accept();
        });

        session.on('shell', (accept) => {
            const stream = accept();

            stream.write('\x1b[?1049h');
            stream.write('\x1b[?25l');
            stream.write('\x1b[2J\x1b[H');

            logTraffic('session_start', {
            ip: clientIp,
            username,
            cols: termSize.cols,
            rows: termSize.rows,
            });

            handleSession(stream, termSize, sessionInfo).catch((err) => {
            console.error('[SSH] Session error:', err);
            stream.end();
            });
        });
    });

    client.on('error', (err) => console.error('[SSH] Client error:', err.message, err.code));
    client.on('close', () => {
      logTraffic('client_disconnected', { ip: clientIp, username });
    });
  });

  server.on('error', (err) => console.error('[SSH Server] Error:', err.message, err.code));
  return server;
}

async function ensureHostKey() {
  const hostKeyPath = getHostKeyPath();
  const hostKeyType = getHostKeyType();

  if (existsSync(hostKeyPath)) {
    try {
      const parsed = parseKey(readFileSync(hostKeyPath));
      if (!(parsed instanceof Error)) return;
    } catch { /* fall through to regenerate */ }
  }

  console.log('Generating SSH host key…', hostKeyPath);
  try {
    const kp = utils.generateKeyPairSync(hostKeyType, { bits: hostKeyType === 'rsa' ? 2048 : undefined });
    writeFileSync(hostKeyPath, kp.private, { mode: 0o600 });
    console.log('SSH host key generated:', hostKeyPath);
  } catch (err) {
    console.error('Failed to generate SSH host key:', err);
    process.exit(1);
  }
}

async function start() {
  loadDotenv();
  await ensureHostKey();
  await initDatabase();
  const server = createServer();

  // Handle server socket errors (ToS setting, etc.)
  server.on('error', (err) => {
    console.error('[SSH Server] Error:', err);
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`✓ SSH Terminal Portfolio listening on port ${port}`);
    console.log(`  Connect with: ssh -p 2222 <machine-ip>`);
    // console.log(`  Your IPv4: 10.249.131.137`);

    // Monkey-patch to suppress ToS setting errors on the listening socket
    try {
      if (server.socket) {
        // Some systems have issues with setTosValue - suppress errors
        const originalSetTos = server.socket.setTosValue;
        if (originalSetTos) {
          server.socket.setTosValue = function() {
            try {
              return originalSetTos.apply(this, arguments);
            } catch (e) {
              console.warn('[SSH] Suppressed socket ToS error:', e.message);
            }
          };
        }
      }
    } catch (e) {
      // Ignore errors during monkey-patching
    }
  });
}

start().catch((err) => { console.error('Failed to start server:', err); process.exit(1); });