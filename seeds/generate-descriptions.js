#!/usr/bin/env node
/**
 * generate-descriptions.js
 * ─────────────────────────────────────────────────────────────────
 * Génère des descriptions françaises pour les livres sans description
 * via Claude Haiku (API Anthropic directe).
 *
 * Prérequis :
 *   .env avec SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY
 *
 * Usage :
 *   node --env-file=.env seeds/generate-descriptions.js                    # dry-run
 *   node --env-file=.env seeds/generate-descriptions.js --apply
 *   node --env-file=.env seeds/generate-descriptions.js --apply --limit 500
 *   node --env-file=.env seeds/generate-descriptions.js --apply --offset 1000 --limit 500
 *   node --env-file=.env seeds/generate-descriptions.js --cost-only
 * ─────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

// ─── Env ─────────────────────────────────────────────────────────

const SUPABASE_URL  = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_KEY requis.');
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  console.error('ANTHROPIC_API_KEY requis.');
  process.exit(1);
}

// ─── CLI ─────────────────────────────────────────────────────────

const APPLY     = process.argv.includes('--apply');
const COST_ONLY = process.argv.includes('--cost-only');
const limIdx    = process.argv.indexOf('--limit');
const offIdx    = process.argv.indexOf('--offset');
const LIMIT     = limIdx !== -1 ? parseInt(process.argv[limIdx + 1], 10) : null;
const OFFSET    = offIdx !== -1 ? parseInt(process.argv[offIdx + 1], 10) : 0;

const CONCURRENCY       = 5;
const DELAY_BETWEEN_MS  = 50;
const BATCH_PAUSE_EVERY = 100;
const BATCH_PAUSE_MS    = 2000;
const RETRY_DELAY_MS    = 5000;
const MAX_RETRIES       = 2;
const PROGRESS_EVERY    = 200;

// Haiku pricing (per million tokens)
const PRICE_INPUT_PER_M  = 0.80;
const PRICE_OUTPUT_PER_M = 4.00;
const EST_INPUT_TOKENS   = 150;
const EST_OUTPUT_TOKENS  = 100;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Helpers ─────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', cyan: '\x1b[36m',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatAuthors(authors) {
  if (!authors) return 'inconnu';
  let list = authors;
  if (typeof authors === 'string') {
    try { list = JSON.parse(authors); } catch { return authors; }
  }
  if (!Array.isArray(list)) return 'inconnu';
  return list.join(', ') || 'inconnu';
}

function formatGenres(genres) {
  if (!genres) return 'non renseigne';
  let list = genres;
  if (typeof genres === 'string') {
    try { list = JSON.parse(genres); } catch { return genres; }
  }
  if (!Array.isArray(list) || list.length === 0) return 'non renseigne';
  return list.join(', ');
}

function costUsd(inputTokens, outputTokens) {
  return (inputTokens * PRICE_INPUT_PER_M + outputTokens * PRICE_OUTPUT_PER_M) / 1_000_000;
}

const SYSTEM_PROMPT = `Tu es un redacteur litteraire pour une application sociale de lecture francophone. Tu rediges des descriptions de livres : concises, elegantes, informatives. Jamais de spoilers. Jamais de formules commerciales ("un chef-d'oeuvre", "incontournable", "a lire absolument"). Ton style : factuel, sobre, litteraire. Tu donnes envie de lire sans survendre. 2 a 4 phrases maximum.`;

function buildUserPrompt(book) {
  const authors = formatAuthors(book.authors);
  const genres = formatGenres(book.genres);
  return `Genere une description en francais pour ce livre :
Titre : ${book.title}
Auteur : ${authors}
Editeur : ${book.publisher || 'inconnu'}
Date : ${book.publication_date || 'inconnue'}
Genres : ${genres}
Pages : ${book.page_count || 'inconnu'}
Reponds UNIQUEMENT avec la description, rien d'autre. Pas de guillemets autour. Pas de "Voici la description :". Juste le texte.`;
}

// ─── Anthropic API ───────────────────────────────────────────────

async function callHaiku(book, retries = 0) {
  const userPrompt = buildUserPrompt(book);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 429) {
      if (retries < MAX_RETRIES) {
        return { retry: true };
      }
      return { error: 'rate_limit_exhausted' };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { error: `HTTP ${res.status}: ${text.slice(0, 120)}` };
    }

    const data = await res.json();
    let description = data.content?.[0]?.text?.trim() || '';

    // Strip surrounding quotes
    if ((description.startsWith('"') && description.endsWith('"')) ||
        (description.startsWith('\u00ab') && description.endsWith('\u00bb'))) {
      description = description.slice(1, -1).trim();
    }

    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;

    return { description, inputTokens, outputTokens };
  } catch (e) {
    if (e.name === 'TimeoutError') return { error: 'timeout' };
    return { error: e.message };
  }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  console.log(`\n${C.bold}${C.cyan}======================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}  Generation descriptions via Claude Haiku              ${C.reset}`);
  console.log(`${C.bold}${C.cyan}======================================================${C.reset}\n`);
  console.log(`  Mode      : ${APPLY ? `${C.red}APPLY${C.reset}` : COST_ONLY ? `${C.yellow}COST-ONLY${C.reset}` : `${C.yellow}DRY-RUN${C.reset}`}`);
  if (LIMIT) console.log(`  Limite    : ${LIMIT}`);
  if (OFFSET) console.log(`  Offset    : ${OFFSET}`);
  console.log(`  Parallelisme : ${CONCURRENCY}`);
  console.log();

  // Fetch ALL candidates via pagination (Supabase caps at 1000 per query)
  console.log('  Chargement des livres sans description...');
  const candidates = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, authors, publisher, publication_date, genres, page_count, language')
      .is('description', null)
      .order('rating_count', { ascending: false, nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) { console.error('Supabase:', error.message); process.exit(1); }
    candidates.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    process.stdout.write(`\r  ... ${candidates.length} charges`);
  }

  let list = candidates;
  if (OFFSET) list = list.slice(OFFSET);
  if (LIMIT) list = list.slice(0, LIMIT);

  console.log(`  ${C.bold}${candidates.length}${C.reset} livres sans description au total`);
  console.log(`  ${C.bold}${list.length}${C.reset} a traiter dans cette execution\n`);

  // Cost estimate
  const estCostPerBook = costUsd(EST_INPUT_TOKENS, EST_OUTPUT_TOKENS);
  const estTotal = estCostPerBook * list.length;
  console.log(`  ${C.bold}Cout estime${C.reset}`);
  console.log(`    Par livre : ~$${estCostPerBook.toFixed(5)} (${EST_INPUT_TOKENS} in + ${EST_OUTPUT_TOKENS} out tokens)`);
  console.log(`    Total     : ~$${estTotal.toFixed(2)} pour ${list.length} livres`);
  console.log(`    Duree     : ~${Math.ceil(list.length / 10 / 60)} minutes\n`);

  if (COST_ONLY) return;

  if (!APPLY) {
    console.log(`${C.bold}Apercu (dry-run) — 10 premiers prompts :${C.reset}\n`);
    for (const b of list.slice(0, 10)) {
      const prompt = buildUserPrompt(b);
      console.log(`  ${C.cyan}---${C.reset} ${b.title}`);
      console.log(`  ${C.dim}${prompt.split('\n').slice(1, -1).join(' | ')}${C.reset}\n`);
    }
    if (list.length > 10) console.log(`  ${C.dim}... et ${list.length - 10} autres${C.reset}`);
    console.log(`\n  ${C.dim}Pour lancer : node --env-file=.env seeds/generate-descriptions.js --apply${C.reset}\n`);
    return;
  }

  // ─── Apply mode ───────────────────────────────────────────────

  let success = 0, errors = 0, warnings = 0;
  let totalInput = 0, totalOutput = 0;

  function saveProgress(i) {
    const progress = {
      processed: i,
      success,
      errors,
      warnings,
      cost_usd: parseFloat(costUsd(totalInput, totalOutput).toFixed(4)),
      input_tokens: totalInput,
      output_tokens: totalOutput,
      last_offset: OFFSET + i,
    };
    try {
      writeFileSync('seeds/descriptions-progress.json', JSON.stringify(progress, null, 2));
    } catch { /* ignore write errors */ }
  }

  async function processBook(b, idx) {
    let result = await callHaiku(b);

    // Retry on rate limit
    if (result.retry) {
      process.stdout.write(`\n  ${C.yellow}[RATE]${C.reset} Rate limit, pause ${RETRY_DELAY_MS / 1000}s...\n`);
      await sleep(RETRY_DELAY_MS);
      result = await callHaiku(b, 1);
      if (result.retry) {
        await sleep(RETRY_DELAY_MS);
        result = await callHaiku(b, 2);
      }
    }

    if (result.error) {
      errors++;
      process.stdout.write(`\n  ${C.red}[ERR]${C.reset}  "${b.title.slice(0, 50)}" — ${result.error}\n`);
      return;
    }

    totalInput += result.inputTokens;
    totalOutput += result.outputTokens;

    const desc = result.description;
    const len = desc.length;

    if (len < 50) {
      warnings++;
      process.stdout.write(`\n  ${C.yellow}[WARN]${C.reset} "${b.title.slice(0, 50)}" — trop court (${len} chars)\n`);
    } else if (len > 1000) {
      warnings++;
      process.stdout.write(`\n  ${C.yellow}[WARN]${C.reset} "${b.title.slice(0, 50)}" — trop long (${len} chars)\n`);
    }

    // Save regardless of length warnings
    const { error: updateErr } = await supabase
      .from('books')
      .update({ description: desc })
      .eq('id', b.id);

    if (updateErr) {
      errors++;
      process.stdout.write(`\n  ${C.red}[ERR]${C.reset}  "${b.title.slice(0, 50)}" — DB: ${updateErr.message}\n`);
    } else {
      success++;
    }
  }

  // Process in batches of CONCURRENCY
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const batch = list.slice(i, i + CONCURRENCY);
    const promises = batch.map((b, j) => {
      return sleep(j * DELAY_BETWEEN_MS).then(() => processBook(b, i + j));
    });

    await Promise.all(promises);

    // Progress line
    const cost = costUsd(totalInput, totalOutput);
    const done = Math.min(i + CONCURRENCY, list.length);
    process.stdout.write(
      `\r  [${String(done).padStart(5)}/${list.length}] ` +
      `${C.green}ok:${success}${C.reset} ${C.red}err:${errors}${C.reset} ` +
      `| $${cost.toFixed(2)}` +
      `  `.padEnd(20)
    );

    // Batch pause
    if (done % BATCH_PAUSE_EVERY === 0 && done < list.length) {
      process.stdout.write(` ${C.dim}(pause ${BATCH_PAUSE_MS / 1000}s)${C.reset}`);
      await sleep(BATCH_PAUSE_MS);
    }

    // Save progress checkpoint
    if (done % PROGRESS_EVERY === 0) {
      saveProgress(done);
    }
  }

  // Final progress save
  saveProgress(list.length);

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const totalCost = costUsd(totalInput, totalOutput);
  const avgCost = list.length > 0 ? totalCost / list.length : 0;

  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  console.log(`\n\n${C.bold}=== Resume ===${C.reset}\n`);
  console.log(`  ${C.green}Descriptions generees${C.reset} : ${success}`);
  console.log(`  ${C.yellow}Warnings${C.reset}              : ${warnings}`);
  console.log(`  ${C.red}Erreurs${C.reset}               : ${errors}`);
  console.log(`  Duree                 : ${minutes}m ${seconds}s`);
  console.log();
  console.log(`  ${C.bold}Cout${C.reset}`);
  console.log(`    Total     : $${totalCost.toFixed(4)}`);
  console.log(`    Input     : ${totalInput.toLocaleString()} tokens`);
  console.log(`    Output    : ${totalOutput.toLocaleString()} tokens`);
  console.log(`    Par livre : $${avgCost.toFixed(6)}`);
  console.log();
}

main().catch(e => { console.error(e); process.exit(1); });
