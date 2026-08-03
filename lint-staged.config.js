// Chunks file lists so Windows' 8191-char command-line limit isn't hit
// when many files are staged at once.
const CHUNK_SIZE = 30;

const chunk = (files) => {
  const out = [];
  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    out.push(files.slice(i, i + CHUNK_SIZE));
  }
  return out;
};

const quote = (f) => `"${f}"`;

const runChunked = (files, cmd) =>
  chunk(files).map((group) => `${cmd} ${group.map(quote).join(' ')}`);

module.exports = {
  'sem-backend/**/*.ts': (files) => [
    ...runChunked(files, 'eslint --fix'),
    ...runChunked(files, 'prettier --write'),
  ],
  'sem-frontend/**/*.ts': (files) => runChunked(files, 'prettier --write'),
  '**/*.{json,md,html,css}': (files) => runChunked(files, 'prettier --write'),
};
