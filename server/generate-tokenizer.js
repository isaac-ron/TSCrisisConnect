// Generate tokenizer.json from existing tokenizer files
// This script creates the missing tokenizer.json file needed by @xenova/transformers

import { writeFileSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nlpServiceDir = path.join(__dirname, '..', 'nlp-service');

console.log('🔧 Generating tokenizer.json...');
console.log(`📁 Looking for files in: ${nlpServiceDir}`);

try {
  // Read existing tokenizer config
  console.log('📖 Reading tokenizer_config.json...');
  const tokenizerConfigPath = path.join(nlpServiceDir, 'tokenizer_config.json');
  const tokenizerConfig = JSON.parse(readFileSync(tokenizerConfigPath, 'utf8'));

  // Read vocab
  console.log('📖 Reading vocab.json...');
  const vocabPath = path.join(nlpServiceDir, 'vocab.json');
  const vocab = JSON.parse(readFileSync(vocabPath, 'utf8'));
  console.log(`   Found ${Object.keys(vocab).length} vocabulary tokens`);

  // Read merges
  console.log('📖 Reading merges.txt...');
  const mergesPath = path.join(nlpServiceDir, 'merges.txt');
  const mergesContent = readFileSync(mergesPath, 'utf8');
  const merges = mergesContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'));
  console.log(`   Found ${merges.length} merge rules`);

  // Read special tokens
  console.log('📖 Reading special_tokens_map.json...');
  const specialTokensPath = path.join(nlpServiceDir, 'special_tokens_map.json');
  const specialTokens = JSON.parse(readFileSync(specialTokensPath, 'utf8'));

  // Construct tokenizer.json based on RoBERTa/GPT-2 BPE structure
  console.log('🏗️  Building tokenizer.json structure...');
  
  const tokenizerJson = {
    version: "1.0",
    truncation: null,
    padding: null,
    added_tokens: [
      {
        id: 0,
        content: specialTokens.pad_token || "<pad>",
        single_word: false,
        lstrip: false,
        rstrip: false,
        normalized: false,
        special: true
      },
      {
        id: 1,
        content: specialTokens.unk_token || "<unk>",
        single_word: false,
        lstrip: false,
        rstrip: false,
        normalized: false,
        special: true
      },
      {
        id: 2,
        content: specialTokens.bos_token || "<s>",
        single_word: false,
        lstrip: false,
        rstrip: false,
        normalized: false,
        special: true
      },
      {
        id: 3,
        content: specialTokens.eos_token || "</s>",
        single_word: false,
        lstrip: false,
        rstrip: false,
        normalized: false,
        special: true
      }
    ],
    normalizer: {
      type: "Sequence",
      normalizers: []
    },
    pre_tokenizer: {
      type: "ByteLevel",
      add_prefix_space: tokenizerConfig.add_prefix_space || false,
      trim_offsets: true,
      use_regex: true
    },
    post_processor: {
      type: "RobertaProcessing",
      sep: [specialTokens.sep_token || "</s>", 2],
      cls: [specialTokens.bos_token || "<s>", 0],
      trim_offsets: true,
      add_prefix_space: tokenizerConfig.add_prefix_space || false
    },
    decoder: {
      type: "ByteLevel",
      add_prefix_space: tokenizerConfig.add_prefix_space || false,
      trim_offsets: true,
      use_regex: true
    },
    model: {
      type: "BPE",
      dropout: null,
      unk_token: specialTokens.unk_token || "<unk>",
      continuing_subword_prefix: tokenizerConfig.continuing_subword_prefix || "",
      end_of_word_suffix: tokenizerConfig.end_of_word_suffix || "",
      fuse_unk: false,
      byte_fallback: false,
      vocab: vocab,
      merges: merges
    }
  };

  // Write tokenizer.json
  const outputPath = path.join(nlpServiceDir, 'tokenizer.json');
  console.log('💾 Writing tokenizer.json...');
  writeFileSync(outputPath, JSON.stringify(tokenizerJson, null, 2), 'utf8');

  console.log('✅ tokenizer.json generated successfully!');
  console.log(`📍 Location: ${outputPath}`);
  console.log('\n📊 Summary:');
  console.log(`   - Vocabulary size: ${Object.keys(vocab).length}`);
  console.log(`   - Merge rules: ${merges.length}`);
  console.log(`   - Special tokens: ${tokenizerJson.added_tokens.length}`);
  console.log('\n🚀 You can now use the CrisisTransformers model!');
  console.log('   Restart your server to load the complete model.');

} catch (error) {
  console.error('❌ Error generating tokenizer.json:', error.message);
  console.error('\nPlease ensure these files exist in nlp-service/:');
  console.error('  - tokenizer_config.json');
  console.error('  - vocab.json');
  console.error('  - merges.txt');
  console.error('  - special_tokens_map.json');
  process.exit(1);
}
