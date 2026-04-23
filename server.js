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

// ─── Header renderer ─────────────────────────────────────────────────────────
/**
 * Draws the two-panel header using absolute cursor positioning.
 *
 *   Left  (col 1 … ASCII_COL_WIDTH)    → ASCII portrait in cyan
 *   Right (col RIGHT_COL_START …)      → bold NAME_LINE, then dim bio lines
 *
 * Absolute positioning means the two panels are completely independent —
 * ANSI colour codes in the art never push the bio text out of alignment.
 *
 * Returns the 1-indexed row number of the first line BELOW the header.
 */
function drawHeader(stream) {
  // ── Left panel: braille portrait ─────────────────────────────────────────
  for (let i = 0; i < ASCII_ART.length; i++) {
    stream.write(moveTo(i + 1, 1));
    stream.write(`${COLORS.cyan}${ASCII_ART[i]}${COLORS.reset}`);
  }

  // ── Right panel ───────────────────────────────────────────────────────────
  let rightRow = 1;

  // Name: bold cyan — large visual anchor
  if (NAME_LINE) {
    if (Array.isArray(NAME_LINE)) {
      for (const line of NAME_LINE) {
        stream.write(moveTo(rightRow, RIGHT_COL_START));
        stream.write(`${COLORS.cyan}${COLORS.bold}${line}${COLORS.reset}`);
        rightRow++;
      }
      rightRow++;
    } else {
      stream.write(moveTo(rightRow, RIGHT_COL_START));
      stream.write(`${COLORS.cyan}${COLORS.bold}${NAME_LINE}${COLORS.reset}`);
      rightRow += 2;
    }
  }

  // Bio lines:
  //   ★prefix  → bold bright white  (matches "She also works…" bold in screenshot)
  //   ''        → blank row (paragraph gap)
  //   plain     → dim  (body copy)
  for (const line of PROFILE_TEXT_LINES) {
    if (!line) {
      rightRow++;   // blank spacer row
      continue;
    }
    stream.write(moveTo(rightRow, RIGHT_COL_START));
    if (line.startsWith('★')) {
      stream.write(`${COLORS.bold}${line.slice(1)}${COLORS.reset}`);
    } else {
      stream.write(`${COLORS.dim}${line}${COLORS.reset}`);
    }
    rightRow++;
  }

  const headerRows = Math.max(ASCII_ART.length, rightRow);
  return headerRows + 2;
}

// ─── Menu renderer ───────────────────────────────────────────────────────────
function drawMenu(stream, currentIndex, startRow) {
  const items = MENU_ITEMS.map((item, i) =>
    i === currentIndex
      ? `${COLORS.cyan}${COLORS.bold}[ ${item} ]${COLORS.reset}`
      : `${COLORS.dim}${item}${COLORS.reset}`
  );

  stream.write(moveTo(startRow, 1));
  stream.write(`  ${items.join(`  ${COLORS.dim}◆${COLORS.reset}  `)}`);

  stream.write(moveTo(startRow + 1, 1));
  stream.write(`  ${COLORS.dim}[← → to navigate · Enter to select · Q to quit]${COLORS.reset}`);
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

// ─── Generic list renderer ────────────────────────────────────────────────────
/**
 * Renders a navigable list.
 *
 * @param {object[]} items      - Array of { label, sublabel? }
 * @param {number}   selected   - Currently highlighted index
 * @param {number}   startRow   - Row to begin rendering (1-indexed)
 */
function drawList(stream, items, selected, startRow) {
  items.forEach((item, i) => {
    stream.write(moveTo(startRow + i * 2, 1));
    stream.write('\x1b[2K'); // clear line
    if (i === selected) {
      stream.write(`  ${COLORS.cyan}${COLORS.bold}✦ ${item.label}${COLORS.reset}`);
    } else {
      stream.write(`  ${COLORS.dim}  ${item.label}${COLORS.reset}`);
    }
    if (item.sublabel) {
      stream.write(moveTo(startRow + i * 2 + 1, 1));
      stream.write('\x1b[2K');
      stream.write(`    ${COLORS.dim}${item.sublabel}${COLORS.reset}`);
    }
  });
  // Footer hint
  const footerRow = startRow + items.length * 2 + 1;
  stream.write(moveTo(footerRow, 1));
  stream.write(`${COLORS.dim}[↑ ↓ to select · enter to open · esc back]${COLORS.reset}`);
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
  stream.write(`${COLORS.dim}[esc] back${COLORS.reset}`);
}

// ─── Section handlers ─────────────────────────────────────────────────────────
// Each returns a Promise that resolves when the user presses Esc (back).
// Navigation inside the section is handled internally.

async function runSection(stream, title, items, buildDetail) {
  // `items`       — array of raw data objects from DB
  // `buildDetail` — fn(item) → { title, bodyLines, linkLine }

  let selected = 0;
  let inDetail  = false;

  const LIST_START_ROW = 4;

  const renderList = () => {
    drawSectionHeader(stream, title);
    const listItems = items.map(buildDetail).map(d => ({ label: d.listLabel, sublabel: d.listSublabel }));
    drawList(stream, listItems, selected, LIST_START_ROW);
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
            // Left / right ignored inside section
            if (code === 0x43 || code === 0x44) { i += 3; continue; }
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
    listSublabel: skills,
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

// ─── Main session handler ────────────────────────────────────────────────────
async function handleSession(stream) {
  let currentMenuIndex = 0;
  let inputBuffer = '';
  let inSection = false; // true while a section's runSection() is active

  let menuStartRow = 0;

  const redrawFull = () => {
    clearScreen(stream);
    menuStartRow = drawHeader(stream);
    drawMenu(stream, currentMenuIndex, menuStartRow);
    stream.write(moveTo(menuStartRow + 3, 1));
  };

  const redrawMenuOnly = () => {
    stream.write(moveTo(menuStartRow, 1));
    stream.write('\x1b[2K');
    stream.write(moveTo(menuStartRow + 1, 1));
    stream.write('\x1b[2K');
    drawMenu(stream, currentMenuIndex, menuStartRow);
    stream.write(moveTo(menuStartRow + 3, 1));
  };

  redrawFull();

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
                result = await runSection(stream, 'Experiences', data, experienceDescriptor);
              } else if (currentMenuIndex === 3) {
                const data = await getCourses();
                result = await runSection(stream, 'Courses', data, courseDescriptor);
              } else if (currentMenuIndex === 4) {
                const data = await getCertificates();
                result = await runSection(stream, 'Certificates', data, certificateDescriptor);
              }
            } catch (err) {
              console.error('Section error:', err);
            }

            inSection = false;

            if (result === 'quit') {
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

    stream.on('close', resolve);
    stream.on('error', (err) => { console.error('Stream error:', err); resolve(); });
  });
}

// ─── SSH Server ───────────────────────────────────────────────────────────────
const port = process.env.PORT || 2222;

function createServer() {
  const hostKeyPath = getHostKeyPath();
  let hostKeyBuffer;
  
  try {
    hostKeyBuffer = readFileSync(hostKeyPath);
    console.log('[SSH] Host key loaded successfully, size:', hostKeyBuffer.length, 'bytes');
  } catch (err) {
    console.error('[SSH] Failed to load host key:', err.message);
    throw err;
  }

  const serverConfig = {
    hostKeys: [hostKeyBuffer],
  };

  const server = new Server(serverConfig, (client) => {
    console.log('[SSH] Client connected from:', client.remoteAddress);

    try {
      // Disable problematic socket operations that can hang
      if (client.socket) {
        try {
          client.socket.setNoDelay(true);
          client.socket.setKeepAlive(true, 60000);
        } catch (e) {
          console.warn('[SSH] Warning setting socket options:', e.message);
        }

        // Suppress any ToS-related errors or hangs
        const origSetTos = client.socket.setTosValue;
        if (origSetTos && typeof origSetTos === 'function') {
          client.socket.setTosValue = function(val) {
            try {
              return origSetTos.call(this, val);
            } catch (e) {
              console.warn('[SSH] Suppressed socket setTosValue error');
            }
          };
        }
      }
    } catch (err) {
      console.error('[SSH] Error configuring client socket:', err.message);
      client.end();
      return;
    }

    client.on('authentication', (ctx) => {
      try {
        console.log('[SSH] Authentication attempt');
        ctx.accept();
      } catch (err) {
        console.error('[SSH] Error handling authentication:', err.message);
      }
    });

    client.on('session', (accept) => {
      try {
        console.log('[SSH] Session requested');
        const session = accept();

        session.on('pty', (accept) => {
          try {
            console.log('[SSH] PTY requested');
            accept();
          } catch (err) {
            console.error('[SSH] Error handling PTY:', err.message);
          }
        });

        session.on('shell', (accept) => {
          try {
            console.log('[SSH] Shell requested - accepting');
            const stream = accept();
            console.log('[SSH] Shell stream opened');

            stream.write('\x1b[?1049h'); // alternate screen
            stream.write('\x1b[?25l');   // hide cursor
            stream.write('\x1b[2J\x1b[H');
            console.log('[SSH] Initial screen codes sent');

            setTimeout(() => {
              try {
                console.log('[SSH] Starting handleSession');
                handleSession(stream).catch((err) => {
                  console.error('[SSH] Session error:', err);
                  stream.end();
                });
              } catch (err) {
                console.error('[SSH] Error in handleSession:', err.message);
                stream.end();
              }
            }, 300);
          } catch (err) {
            console.error('[SSH] Error handling shell:', err.message);
          }
        });

        session.on('subsystem', (accept, name) => {
          try {
            console.log('[SSH] Subsystem requested:', name);
            accept();
          } catch (err) {
            console.error('[SSH] Error handling subsystem:', err.message);
          }
        });

        session.on('error', (err) => {
          console.error('[SSH] Session error:', err.message);
        });
      } catch (err) {
        console.error('[SSH] Error handling session:', err.message);
      }
    });

    client.on('error', (err) => {
      console.error('[SSH] Client error:', err.message, err.code);
    });
    client.on('close', () => console.log('[SSH] Client disconnected'));
  });

  // Handle server-level socket errors
  server.on('error', (err) => {
    console.error('[SSH Server Socket] Error:', err.message, err.code);
  });

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
    console.log(`  Your IPv4: 10.249.131.137`);

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