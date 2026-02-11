const VECTOR_SIZE = 256;

function hashToken(token) {
  let hash = 5381;
  for (let i = 0; i < token.length; i += 1) {
    hash = ((hash << 5) + hash) + token.charCodeAt(i);
  }
  return Math.abs(hash);
}

export async function getLocalEmbedding(text) {
  const vec = new Array(VECTOR_SIZE).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

  for (const token of tokens) {
    const idx = hashToken(token) % VECTOR_SIZE;
    vec[idx] += 1;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < VECTOR_SIZE; i += 1) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < VECTOR_SIZE; i += 1) {
    vec[i] /= norm;
  }

  return vec;
}
