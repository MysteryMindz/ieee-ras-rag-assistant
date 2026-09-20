import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {retrieve,buildPrompt,extractiveAnswer} from '../dist/rag.js';
const kb=JSON.parse(await readFile(new URL('../dist/data/kb.json',import.meta.url)));
assert.equal(retrieve('What is the mission of IEEE RAS?',kb)[0].id,'ras-mission');
assert.ok(['vit-branch','rascade','vit-inauguration'].includes(retrieve('Tell me about IEEE RAS VIT Chennai',kb)[0].id));
const hits=retrieve('RAS publications',kb,2);assert.ok(buildPrompt('RAS publications',hits).includes(hits[0].text));
assert.match(extractiveAnswer('cafeteria menu',[]),/could not find support/);
console.log('RAG retrieval tests passed');
