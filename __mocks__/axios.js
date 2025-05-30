// Manual mock for axios to avoid ESM parsing issues in Jest
module.exports = {
  post: () => Promise.resolve({ data: {} }),
  get: () => Promise.resolve({ data: {} }),
}; 